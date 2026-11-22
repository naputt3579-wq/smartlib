const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middlewares/authMiddleware');

// ดึงรายการจองทั้งหมด
router.get('/', authenticateToken, (req, res) => {
  const sql = `
    SELECT bookings.*, users.name as user_name, rooms.room_name, rooms.location 
    FROM bookings
    JOIN users ON bookings.user_id = users.id
    JOIN rooms ON bookings.room_id = rooms.id
    ORDER BY booking_date DESC, start_time DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(rows);
  });
});

// สร้างการจองใหม่พร้อมเช็กเวลาชน
router.post('/', authenticateToken, (req, res) => {
  const { room_id, booking_date, start_time, end_time } = req.body;
  const user_id = req.user.id;

  const checkConflictSql = `
    SELECT * FROM bookings 
    WHERE room_id = ? AND booking_date = ? AND status IN ('confirmed', 'checked_in')
    AND ((start_time < ? AND end_time > ?))
  `;

  db.get(checkConflictSql, [room_id, booking_date, end_time, start_time], (err, row) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (row) {
      return res.status(400).json({ message: 'ช่วงเวลานี้ในห้องดังกล่าว มีผู้ใช้งานจองไว้เรียบร้อยแล้ว' });
    }

    const insertSql = `
      INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?, 'confirmed')
    `;
    db.run(insertSql, [user_id, room_id, booking_date, start_time, end_time], function(err) {
      if (err) return res.status(500).json({ message: 'ไม่สามารถสร้างการจองได้' });
      res.status(201).json({ message: 'สร้างการจองสำเร็จ', bookingId: this.lastID });
    });
  });
});

// 🟢 API Endpoint สำหรับ Check-in
router.patch('/:id/checkin', authenticateToken, (req, res) => {
  const bookingId = req.params.id;

  db.run(
    `UPDATE bookings SET status = 'checked_in' WHERE id = ? AND status = 'confirmed'`,
    [bookingId],
    function (err) {
      if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดทางเทคนิค' });
      if (this.changes === 0) return res.status(400).json({ message: 'ไม่พบรายการ หรือรายการนี้ถูกยกเลิกไปแล้ว' });

      res.json({ message: 'Check-in เรียบร้อยแล้ว' });
    }
  );
});

// ยกเลิกการจอง
router.delete('/:id', authenticateToken, (req, res) => {
  const bookingId = req.params.id;
  db.run(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`, [bookingId], function(err) {
    if (err) return res.status(500).json({ message: 'ไม่สามารถยกเลิกได้' });
    res.json({ message: 'ยกเลิกการจองเรียบร้อย' });
  });
});

// 🟢 Background Task: ตรวจสอบและยกเลิกการจองเกินเวลา 15 นาทีอัตโนมัติ (Ghost Booking Auto-Cancel)
setInterval(() => {
  const now = new Date();
  const currentDate = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);

  db.run(
    `UPDATE bookings 
     SET status = 'auto_cancelled' 
     WHERE booking_date = ? 
     AND time(start_time, '+15 minutes') <= time(?) 
     AND status = 'confirmed'`,
    [currentDate, currentTime],
    function (err) {
      if (!err && this.changes > 0) {
        console.log(`[SYSTEM] ยกเลิกการจองอัตโนมัติ ${this.changes} รายการเนื่องจากไม่มา Check-in ตามเวลา`);
      }
    }
  );
}, 60000); // ทำงานตรวจคิวทุกๆ 1 นาที

module.exports = router;