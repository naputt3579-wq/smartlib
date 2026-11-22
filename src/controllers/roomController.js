const db = require('../config/db');

// ดึงรายการห้องทั้งหมด (สำหรับนักศึกษาและ Admin)[cite: 2]
exports.getAllRooms = (req, res) => {
  const sql = `SELECT * FROM rooms ORDER BY id DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

// เพิ่มห้องใหม่ (Admin Only)[cite: 2, 3]
exports.createRoom = (req, res) => {
  const { room_name, location, capacity } = req.body;

  if (!room_name || !location || !capacity) {
    return res.status(400).json({ message: 'Please provide room name, location, and capacity.' });
  }

  const sql = `INSERT INTO rooms (room_name, location, capacity) VALUES (?, ?, ?)`;
  db.run(sql, [room_name, location, capacity], function (err) {
    if (err) return res.status(500).json({ message: err.message });
    res.status(201).json({
      message: 'Room created successfully!',
      room: { id: this.lastID, room_name, location, capacity, status: 'available' }
    });
  });
};

// แก้ไขข้อมูลห้อง (Admin Only)[cite: 2, 3]
exports.updateRoom = (req, res) => {
  const { id } = req.params;
  const { room_name, location, capacity, status } = req.body;

  const sql = `UPDATE rooms SET room_name = ?, location = ?, capacity = ?, status = ? WHERE id = ?`;
  db.run(sql, [room_name, location, capacity, status, id], function (err) {
    if (err) return res.status(500).json({ message: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Room not found.' });
    res.json({ message: 'Room updated successfully!' });
  });
};

// ลบห้อง (Admin Only)[cite: 2, 3]
exports.deleteRoom = (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM rooms WHERE id = ?`;
  db.run(sql, [id], function (err) {
    if (err) return res.status(500).json({ message: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Room not found.' });
    res.json({ message: 'Room deleted successfully!' });
  });
};