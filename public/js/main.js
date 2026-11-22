const API_URL = '/api';
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let token = localStorage.getItem('jwt_token') || null;
let currentCheckInBookingId = null;

if (token && currentUser) {
  showMainApp();
}

function switchPage(pageId, btnElement) {
  document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(pageId).classList.remove('hidden');
  if (btnElement) btnElement.classList.add('active');

  if (pageId === 'profilePage') {
    updateProfileStats();
  }
}

function showZoneInfo(zone) {
  const title = document.getElementById('zoneTitle');
  const desc = document.getElementById('zoneDesc');

  if (zone === 'zone1') {
    title.innerText = '🏢 ชั้น 5 - โซนอ่านหนังสือเดี่ยว (Silent Zone)';
    desc.innerText = 'พื้นที่เงียบสงบ เหมาะสำหรับการอ่านหนังสือเตรียมสอบหรือทำวิจัยที่ต้องการสมาธิสูง';
  } else if (zone === 'zone2') {
    title.innerText = '👥 ชั้น 2 - โซนติวกลุ่มและประชุม (Co-Working Zone)';
    desc.innerText = 'พื้นที่สำหรับทำงานกลุ่ม ประชุมโปรเจกต์ หรือติวหนังสือร่วมกัน สามารถพูดคุยปรึกษากันได้ มีปลั๊กไฟบริการทุกโต๊ะ';
  } else if (zone === 'zone3') {
    title.innerText = '💻 ชั้น 1 - โซนค้นคว้าและสื่อดิจิทัล (Media Zone)';
    desc.innerText = 'พื้นที่พร้อมคอมพิวเตอร์และสื่อดิจิทัล เหมาะสำหรับการค้นคว้าข้อมูลและทำรายงาน';
  }
}

function addReview() {
  const text = document.getElementById('reviewText').value;
  if (!text) return alert('กรุณากรอกข้อความ');

  const list = document.getElementById('reviewList');
  const today = new Date().toLocaleDateString('th-TH');

  list.innerHTML = `
    <div class="room-card" style="border-left: 3px solid var(--primary-blue);">
      <p style="margin: 0; color: var(--text-main);">"${text}"</p>
      <small style="color: var(--text-muted);">- โดย ${currentUser.name} (${today})</small>
    </div>
  ` + list.innerHTML;

  document.getElementById('reviewText').value = '';
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();

  if (res.ok) {
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showMainApp();
  } else {
    alert(data.message);
  }
}

async function register() {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await res.json();
  alert(data.message);
}

function logout() {
  localStorage.clear();
  location.reload();
}

function showMainApp() {
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('topNav').classList.remove('hidden');
  document.getElementById('bookingPage').classList.remove('hidden');

  document.getElementById('userInfo').innerHTML = `
    สวัสดี, ${currentUser.name} (${currentUser.role}) 
    <button onclick="logout()" style="background:#ef4444; margin-left:10px; width:auto; padding:5px 12px;">ออกจากระบบ</button>
  `;

  if (currentUser.role === 'admin') {
    document.getElementById('adminControls').classList.remove('hidden');
  }

  loadRooms();
  loadBookings();
}

async function loadRooms() {
  const res = await fetch(`${API_URL}/rooms`);
  const rooms = await res.json();
  const roomList = document.getElementById('roomList');
  const select = document.getElementById('bookingRoomSelect');

  roomList.innerHTML = '';
  select.innerHTML = '<option value="">-- กรุณาเลือกห้องอ่านหนังสือ --</option>';

  rooms.forEach(room => {
    roomList.innerHTML += `
      <div class="room-card" data-capacity="${room.capacity}">
        <h4>${room.room_name}</h4>
        <p>สถานที่: ${room.location}</p>
        <p>ความจุ: ${room.capacity} คน</p>
        <p>สถานะ: <strong>${room.status}</strong></p>
        ${currentUser.role === 'admin' ? `<button onclick="deleteRoom(${room.id})" style="background:#ef4444; margin-top:8px;">ลบห้อง</button>` : ''}
      </div>
    `;

    if (room.status === 'available') {
      select.innerHTML += `<option value="${room.id}">${room.room_name} (ความจุ ${room.capacity} คน)</option>`;
    }
  });
}

async function addRoom() {
  const room_name = document.getElementById('newRoomName').value;
  const location = document.getElementById('newLocation').value;
  const capacity = document.getElementById('newCapacity').value;

  const res = await fetch(`${API_URL}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ room_name, location, capacity })
  });

  if (res.ok) {
    loadRooms();
  } else {
    alert('ไม่สามารถเพิ่มห้องได้');
  }
}

async function deleteRoom(id) {
  if (!confirm('ยืนยันการลบห้อง?')) return;
  await fetch(`${API_URL}/rooms/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  loadRooms();
}

async function createBooking(e) {
  e.preventDefault();
  const room_id = document.getElementById('bookingRoomSelect').value;
  const booking_date = document.getElementById('bookingDate').value;
  const start_time = document.getElementById('startTime').value;
  const end_time = document.getElementById('endTime').value;

  const res = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ room_id, booking_date, start_time, end_time })
  });

  const data = await res.json();
  if (res.ok) {
    alert('จองห้องสำเร็จ!');
    loadBookings();
  } else {
    alert(`ข้อผิดพลาด: ${data.message}`);
  }
}

async function loadBookings() {
  const res = await fetch(`${API_URL}/bookings`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const bookings = await res.json();
  window.allBookings = bookings;
  const tbody = document.getElementById('bookingList');
  tbody.innerHTML = '';

  bookings.forEach(b => {
    let statusText = `<span style="color: #60a5fa; font-weight: 500;">${b.status}</span>`;
    if (b.status === 'checked_in') {
      statusText = `<span style="color: #10b981; font-weight: bold;">✅ เข้าใช้แล้ว</span>`;
    } else if (b.status === 'auto_cancelled') {
      statusText = `<span style="color: #ef4444; font-size:0.85em;">❌ ขาดลงชื่อ (ยกเลิกอัตโนมัติ)</span>`;
    }

    tbody.innerHTML += `
      <tr>
        <td>${b.user_name}</td>
        <td>${b.room_name} (${b.location})</td>
        <td>${b.booking_date}</td>
        <td>${b.start_time} - ${b.end_time}</td>
        <td>${statusText}</td>
        <td>
          ${b.status === 'confirmed' ? `
            <button onclick="showQRCode(${b.id}, '${b.room_name}', '${b.booking_date}', '${b.start_time}')" style="background:#10b981; color:white; width:auto; padding:5px 10px; margin-right:4px;">📱 Check-in</button>
            <button onclick="cancelBooking(${b.id})" style="background:#ef4444; color:white; width:auto; padding:5px 10px;">ยกเลิก</button>
          ` : '-'}
        </td>
      </tr>
    `;
  });
}

async function cancelBooking(id) {
  if (!confirm('ต้องการยกเลิกการจองนี้ใช่หรือไม่?')) return;
  const res = await fetch(`${API_URL}/bookings/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (res.ok) {
    loadBookings();
  } else {
    const data = await res.json();
    alert(data.message);
  }
}

function showQRCode(bookingId, roomName, bookingDate, startTime) {
  currentCheckInBookingId = bookingId;
  const modal = document.getElementById('qrModal');
  const qrContainer = document.getElementById('qrcode');
  const infoText = document.getElementById('qrBookingInfo');

  qrContainer.innerHTML = '';
  infoText.innerText = `${roomName} (${bookingDate} เวลา ${startTime})`;

  new QRCode(qrContainer, {
    text: `SMARTLIB_CHECKIN_${bookingId}_${Date.now()}`,
    width: 160,
    height: 160
  });

  modal.classList.remove('hidden');
}

function closeQRModal() {
  document.getElementById('qrModal').classList.add('hidden');
  currentCheckInBookingId = null;
}

async function confirmCheckIn() {
  if (!currentCheckInBookingId) return;

  const res = await fetch(`${API_URL}/bookings/${currentCheckInBookingId}/checkin`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await res.json();
  if (res.ok) {
    alert('✅ Check-in เข้าใช้ห้องสำเร็จ!');
    closeQRModal();
    loadBookings();
  } else {
    alert(`ข้อผิดพลาด: ${data.message}`);
  }
}

function updateProfileStats() {
  document.getElementById('profName').innerText = currentUser.name;
  document.getElementById('profEmail').innerText = currentUser.email;

  const bookings = window.allBookings || [];
  const count = bookings.length;
  document.getElementById('statTotalBookings').innerText = count;
  document.getElementById('statActiveBookings').innerText = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length;
  document.getElementById('statCancelledBookings').innerText = bookings.filter(b => b.status === 'cancelled' || b.status === 'auto_cancelled').length;

  const badge = document.getElementById('profBadge');
  if (count >= 5) {
    badge.innerText = '🌟 สมาชิกระดับแพลตินัม (Platinum Member)';
  } else if (count >= 2) {
    badge.innerText = '📘 สมาชิกระดับโกลด์ (Gold Member)';
  } else {
    badge.innerText = '👤 สมาชิกทั่วไป (Standard Member)';
  }
}

function filterRooms() {
  const searchText = document.getElementById('searchRoom').value.toLowerCase();
  const minCap = parseInt(document.getElementById('filterCapacity').value);
  const cards = document.querySelectorAll('#roomList .room-card');

  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    const cap = parseInt(card.dataset.capacity || 0);
    const capMatch = cap >= minCap;
    const textMatch = text.includes(searchText);

    if (capMatch && textMatch) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

function exportBookingsCSV() {
  const bookings = window.allBookings || [];
  if (bookings.length === 0) return alert('ไม่มีข้อมูลการจองสำหรับส่งออก');

  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  csvContent += "ID,ผู้จอง,ห้องอ่านหนังสือ,สถานที่,วันที่,เวลาเริ่มต้น,เวลาสิ้นสุด,สถานะ\n";

  bookings.forEach(b => {
    csvContent += `${b.id},"${b.user_name}","${b.room_name}","${b.location}",${b.booking_date},${b.start_time},${b.end_time},${b.status}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `รายงานการจองหอสมุด_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}