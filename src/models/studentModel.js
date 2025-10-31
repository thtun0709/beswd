const db = require('../config/db');

const StudentModel = {

  // 🔍 Tìm sinh viên theo email
  async findByEmail(email) {
    const [rows] = await db.query(
      'SELECT * FROM Student WHERE Email = ? LIMIT 1',
      [email]
    );
    return rows[0] || null;
  },

  // 🔍 Tìm sinh viên theo mã SV
  async findById(maSV) {
    const [rows] = await db.query(
      'SELECT * FROM Student WHERE MaSV = ? LIMIT 1',
      [maSV]
    );
    return rows[0] || null;
  },

// 🧩 Tạo mới sinh viên
async create({ maSV, email, password, full_name, role = 'Student', major = null, team = null, status = null }) {
  const allowedMajors = ["SE","AI","SA","SS","IB"];
  const allowedStatuses = ["K15","K16","K17","K18","K19","K20","K21","K22"];
  const allowedRoles = ["Student", "Leader", "Admin", "Lecturer"];  // ✅ enum roles

  const safeMajor = allowedMajors.includes(major) ? major : null;
  const safeStatus = allowedStatuses.includes(status) ? status : null;
  const safeRole = allowedRoles.includes(role) ? role : 'Student';

  console.log('Creating student:', { maSV, email, full_name, role: safeRole, major: safeMajor, status: safeStatus });

  await db.execute(
    `INSERT INTO Student (MaSV, Email, MatKhau, HoTen, Role, Major, Team, Status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [maSV, email, password, full_name, safeRole, safeMajor, team, safeStatus]
  );

  const [rows] = await db.execute(
    `SELECT MaSV AS maSV, Email AS email, HoTen AS full_name, Role AS role, Major AS major, Team AS team, Status AS status
     FROM Student
     WHERE MaSV = ?`,
    [maSV]
  );

  if (!rows[0]) throw new Error('Failed to fetch student after insert');
  return rows[0];
},



  // 📋 Lấy tất cả sinh viên
  async getAll() {
    const [rows] = await db.query(
      `SELECT MaSV AS maSV, Email AS email, HoTen AS full_name, Role AS role, Major AS major, Team AS team, Status AS status 
       FROM Student`
    );
    return rows;
  },

  // 🔑 Lưu reset code và thời gian hết hạn
  async updateResetCode(maSV, resetCode, resetExpires) {
    const sql = `
      UPDATE Student 
      SET resetPasswordCode = ?, resetPasswordExpires = ? 
      WHERE MaSV = ?
    `;
    await db.query(sql, [resetCode, resetExpires, maSV]);
  },

  // ❌ Xoá reset code và thời gian hết hạn
  async clearResetCode(maSV) {
    const sql = `
      UPDATE Student 
      SET resetPasswordCode = NULL, resetPasswordExpires = NULL 
      WHERE MaSV = ?
    `;
    await db.query(sql, [maSV]);
  },

  // 🔒 Cập nhật mật khẩu
  async updatePassword(maSV, hashedPassword) {
    const sql = `UPDATE Student SET MatKhau = ? WHERE MaSV = ?`;
    await db.query(sql, [hashedPassword, maSV]);
  },

  // ⚡ Cập nhật role
async updateRole(maSV, newRole) {
  const allowedRoles = ['Admin', 'Leader', 'Student', 'Lecturer'];
  if (!allowedRoles.includes(newRole)) throw new Error(`Invalid role: ${newRole}`);
  const sql = `UPDATE Student SET Role = ? WHERE MaSV = ?`;
  await db.query(sql, [newRole, maSV]);
},


  // ⚡ Cập nhật team
  async updateTeam(maSV, team) {
    const sql = `UPDATE Student SET Team = ? WHERE MaSV = ?`;
    await db.query(sql, [team, maSV]);
  },

  // ⚡ Cập nhật major
  async updateMajor(maSV, major) {
    const allowedMajors = ["SE","AI","SA","SS","IB"];
    if (!allowedMajors.includes(major)) throw new Error(`Invalid major: ${major}`);
    const sql = `UPDATE Student SET Major = ? WHERE MaSV = ?`;
    await db.query(sql, [major, maSV]);
  },

  // ⚡ Cập nhật status
  async updateStatus(maSV, status) {
    const allowedStatuses = ["K15","K16","K17","K18","K19","K20","K21","K22"];
    if (!allowedStatuses.includes(status)) throw new Error(`Invalid status: ${status}`);
    const sql = `UPDATE Student SET Status = ? WHERE MaSV = ?`;
    await db.query(sql, [status, maSV]);
  },

  // Kiểm tra Student có đang ở team nào không
async findTeam(maSV) {
  const [rows] = await db.query(
    `SELECT Team AS team FROM Student WHERE MaSV = ? LIMIT 1`,
    [maSV]
  );
  return rows[0]?.team || null;
},

// Lấy danh sách tất cả student trong team
async getMembersByTeam(teamId) {
  const [rows] = await db.query(
    `SELECT MaSV AS maSV, HoTen AS full_name, Email AS email, Role AS role 
     FROM Student WHERE Team = ?`,
    [teamId]
  );
  return rows;
},

// Lưu request tham gia team (nếu dùng bảng team_requests)
async addJoinRequest(teamId, studentId, fullName) {
  const [rows] = await db.query(
    `INSERT INTO team_requests (teamId, studentId, full_name, status) VALUES (?, ?, ?, 'pending')`,
    [teamId, studentId, fullName]
  );
  return rows;
},

async getJoinRequests(teamId) {
  const [rows] = await db.query(
    `SELECT * FROM team_requests WHERE teamId = ? AND status = 'pending'`,
    [teamId]
  );
  return rows;
},

async assignStudentToTeam(maSV, teamId) {
  await this.updateTeam(maSV, teamId);

  // Đồng thời update role nếu cần (ví dụ: 'Leader' nếu là leader)
  await db.query(
    `UPDATE Student SET Role = 'Student' WHERE MaSV = ?`,
    [maSV]
  );
},

async joinTeam(studentId, teamId) {
  const [result] = await db.execute(
    `UPDATE Student SET Team = ? WHERE MaSV = ?`,
    [teamId, studentId]
  );
  return result;
},

async joinTeamAndUpdateStatus(studentId, teamId) {
  await this.joinTeam(studentId, teamId);
  const team = await this.findById(teamId);
  if (team.SoLuongThanhVienHienTai >= team.SoLuongThanhVienToiDa) {
    await this.updateStatus(teamId, 'Voting');
    team.TrangThaiNhom = 'Voting';
  }
  return team;
}


};

module.exports = StudentModel;
