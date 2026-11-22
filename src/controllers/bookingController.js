const db = require('../config/db');

// ดึงรายการจอง ( Admin ดูได้ทั้งหมด / Student ดูได้เฉพาะของตัวเอง )[cite: 2]
exports.getBookings = (req, res) => {
  let sql = `
    SELECT b.*, r.room_name, r.location, u.name as user_name, u.email as user_email
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN users u ON b.user_id = u.id
  `;
  const params = [];

  if (req.user.role !== 'admin') {
    sql += ` WHERE b.user_id = ?`;
    params.push(req.user.id);
  }

  sql += ` ORDER BY b.booking_date DESC, b.start_time ASC`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

// สร้างรายการจอง + ระบบป้องกันการจองเวลาซ้ำ (Phase 4)[cite: 3, 4]
exports.createBooking = (req, res) => {
  const { room_id, booking_date, start_time, end_time } = req.body;
  const user_id = req.user.id;

  if (!room_id || !booking_date || !start_time || !end_time) {
    return res.status(400).json({ message: 'Please provide all booking details.' });
  }

  // 1. ตรวจสอบเวลาซ้ำ (Overlap logic)
  const checkOverlapSql = `
    SELECT * FROM bookings
    WHERE room_id = ?
      AND booking_date = ?
      AND status = 'confirmed'
      AND (
        (start_time < ? AND end_time > ?)
      )
  `;

  db.all(checkOverlapSql, [room_id, booking_date, end_time, start_time], (err, conflicts) => {
    if (err) return res.status(500).json({ message: err.message });

    if (conflicts.length > 0) {
      return res.status(400).json({ message: 'ช่วงเวลานี้มีการจองห้องแล้ว กรุณาเลือกช่วงเวลาอื่น' });
    }

    // 2. ถ้าเวลาไม่ซ้ำ ให้บันทึกการจอง
    const insertSql = `
      INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.run(insertSql, [user_id, room_id, booking_date, start_time, end_time], function (err) {
      if (err) return res.status(500).json({ message: err.message });
      res.status(201).json({
        message: 'Booking created successfully!',
        bookingId: this.lastID
      });
    });
  });
};

// ยกเลิกการจอง (Student ยกเลิกของตัวเองได้ / Admin ยกเลิกได้ทุกรายการ)[cite: 2, 4]
exports.cancelBooking = (req, res) => {
  const bookingId = req.params.id;

  db.get(`SELECT * FROM bookings WHERE id = ?`, [bookingId], (err, booking) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    // ตรวจสอบสิทธิ์
    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to cancel this booking.' });
    }

    const updateSql = `UPDATE bookings SET status = 'cancelled' WHERE id = ?`;
    db.run(updateSql, [bookingId], function (err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Booking cancelled successfully.' });
    });
  });
};