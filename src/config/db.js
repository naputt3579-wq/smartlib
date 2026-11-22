const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

const schemaPath = path.resolve(__dirname, '../models/schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

db.exec(schemaSql, async (err) => {
  if (err) {
    console.error('Error initializing schema:', err.message);
  } else {
    const adminEmail = 'admin@university.ac.th';
    db.get(`SELECT * FROM users WHERE email = ?`, [adminEmail], async (err, row) => {
      if (!row) {
        const hash = await bcrypt.hash('admin123', 10);
        db.run(
          `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
          ['Admin User', adminEmail, hash, 'admin']
        );
      }
    });

    // เพิ่มรายการห้องอ่านหนังสือเริ่มต้น
    db.run(`DELETE FROM rooms`, [], () => {
      const uniqueRooms = [
        ['📘 Study Pod A1 (โซนอ่านเดี่ยว)', 'ชั้น 5 โซน Silent Zone', 1],
        ['💻 Focus Room A2 (ห้องค้นคว้าส่วนตัว)', 'ชั้น 5 โซน Silent Zone', 2],
        ['👥 Co-Working Room B1 (ห้องติวกลุ่มย่อย)', 'ชั้น 2 โซน Co-Working Space', 4], 
        ['📊 Project Studio B2 (ห้องทำงานกลุ่ม)', 'ชั้น 2 โซน Co-Working Space', 5],
        ['🖥️ Smart Meeting Room C1 (ห้องประชุมพร้อมจอ TV)', 'ชั้น 3 อาคารหอสมุดกลาง', 6],
        ['🏢 Seminar & Conference Room C2', 'ชั้น 3 อาคารหอสมุดกลาง', 8]  
      ];

      const stmt = db.prepare(`INSERT INTO rooms (room_name, location, capacity) VALUES (?, ?, ?)`);
      uniqueRooms.forEach(room => stmt.run(room));
      stmt.finalize();
      console.log('อัปเดตรายชื่อห้องอ่านหนังสือคลาสสิกเรียบร้อย!');
    });
  }
});

module.exports = db;