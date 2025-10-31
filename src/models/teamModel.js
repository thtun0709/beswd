const db = require('../config/db');

const teamModel = {
  async getAll() {
    const [rows] = await db.execute(`
      SELECT 
        t.MaTeam,
        t.TenTeam,
        t.TrangThaiNhom,
        t.MoTaNhom,
        t.SoLuongThanhVienToiDa,
        t.LeaderID,
        t.LeaderName,
        CAST(COUNT(s.MaSV) AS SIGNED) AS SoLuongThanhVienHienTai
      FROM Team t
      LEFT JOIN Student s ON s.Team = t.MaTeam
      GROUP BY t.MaTeam, t.TenTeam, t.TrangThaiNhom, t.MoTaNhom, t.SoLuongThanhVienToiDa, t.LeaderID, t.LeaderName
      ORDER BY t.MaTeam ASC
    `);
    return rows;
  },

  async findById(maTeam) {
    const [rows] = await db.execute(`
      SELECT 
        t.MaTeam,
        t.TenTeam,
        t.TrangThaiNhom,
        t.MoTaNhom,
        t.SoLuongThanhVienToiDa,
        t.LeaderID,
        t.LeaderName,
        COUNT(s.MaSV) AS SoLuongThanhVienHienTai
      FROM Team t
      LEFT JOIN Student s ON s.Team = t.MaTeam
      WHERE t.MaTeam = ?
      GROUP BY t.MaTeam, t.TenTeam, t.TrangThaiNhom, t.MoTaNhom, t.SoLuongThanhVienToiDa, t.LeaderID, t.LeaderName
    `, [maTeam]);
    return rows[0];
  },

  async create({ maTeam, tenTeam, trangThaiNhom, moTaNhom, soLuongThanhVienToiDa = 5, leaderID = null, leaderName = null }) {
    const [result] = await db.execute(`
      INSERT INTO Team 
        (MaTeam, TenTeam, TrangThaiNhom, MoTaNhom, SoLuongThanhVienToiDa, LeaderID, LeaderName)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [maTeam, tenTeam, trangThaiNhom, moTaNhom, soLuongThanhVienToiDa, leaderID, leaderName]);
    return result;
  },

  async update({ maTeam, tenTeam, trangThaiNhom, moTaNhom, soLuongThanhVienToiDa, leaderID = null, leaderName = null }) {
    const [result] = await db.execute(`
      UPDATE Team 
      SET TenTeam = ?, TrangThaiNhom = ?, MoTaNhom = ?, SoLuongThanhVienToiDa = ?, LeaderID = ?, LeaderName = ?
      WHERE MaTeam = ?
    `, [tenTeam, trangThaiNhom, moTaNhom, soLuongThanhVienToiDa, leaderID, leaderName, maTeam]);
    return result;
  },

  async delete(maTeam) {
    const [result] = await db.execute('DELETE FROM Team WHERE MaTeam = ?', [maTeam]);
    return result;
  },

async updateStatus(maTeam, status) {
  const [result] = await db.execute(`
    UPDATE Team SET TrangThaiNhom = ? WHERE MaTeam = ?
  `, [status, maTeam]);
  return result;
},

async voteLeader(teamId, voterId, candidateId) {
  // ❌ Không cho tự vote chính mình (nếu muốn)
  if (voterId === candidateId) {
    return { status: "error", msg: "You cannot vote for yourself" };
  }

  // ✅ Kiểm tra ứng viên có trong team hay không
  const [[candidate]] = await db.execute(`
    SELECT HoTen FROM Student 
    WHERE MaSV = ? AND Team = ?
  `, [candidateId, teamId]);

  if (!candidate) {
    return { status: "error", msg: "Candidate not in team" };
  }

  // ✅ Lưu hoặc cập nhật vote
  await db.execute(`
    INSERT INTO TeamVotes (teamId, voterId, candidateId)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE candidateId = VALUES(candidateId)
  `, [teamId, voterId, candidateId]);

  // ✅ Đếm số vote cho ứng viên
  const [[voteCount]] = await db.execute(`
    SELECT COUNT(*) AS votes
    FROM TeamVotes
    WHERE teamId = ? AND candidateId = ?
  `, [teamId, candidateId]);

  const votes = voteCount.votes;

  // ✅ Tổng số thành viên team
  const [[memberCount]] = await db.execute(`
    SELECT COUNT(*) AS total
    FROM Student WHERE Team = ?
  `, [teamId]);

  const totalMembers = memberCount.total;

  // ✅ Nếu quá 50% thì cập nhật leader
  if (votes > totalMembers / 2) {
    await db.execute(`
      UPDATE Team
      SET LeaderID = ?, LeaderName = ?
      WHERE MaTeam = ?
    `, [candidateId, candidate.HoTen, teamId]);

    return {
      status: "leader_chosen",
      leaderID: candidateId,
      leaderName: candidate.HoTen,
      votes,
      totalMembers,
    };
  }

  return {
    status: "voted",
    votes,
    totalMembers,
  };
},





async sendRequestToLecturer(teamId, leaderId, lecturerId) {
  // 1️⃣ Kiểm tra team và leader
  const [team] = await db.execute(
    'SELECT LeaderID, MentorID FROM Team WHERE MaTeam = ?',
    [teamId]
  );
  if (!team[0]) throw new Error('Team not found');
  if (team[0].LeaderID !== leaderId) throw new Error('Only leader can send request');

  // 2️⃣ Kiểm tra nếu team đã có giảng viên đồng ý
  if (team[0].MentorID) {
    const [[mentor]] = await db.execute(
      'SELECT HoTen FROM Lecture WHERE MaGV = ?',
      [team[0].MentorID]
    );
    throw new Error(`Team này đã có giảng viên đồng ý: ${mentor.HoTen}`);
  }

  // 3️⃣ Kiểm tra nếu có request đang pending
  const [pending] = await db.execute(
    'SELECT * FROM TeamRequests WHERE teamId = ? AND status = "pending"',
    [teamId]
  );
  if (pending.length > 0) {
    throw new Error('Team này đang chờ phản hồi từ giảng viên khác');
  }

  // 4️⃣ Tạo request mới
  await db.execute(
    `INSERT INTO TeamRequests (teamId, lecturerId, status, createdAt, updatedAt)
     VALUES (?, ?, 'pending', NOW(), NOW())`,
    [teamId, lecturerId]
  );

  // 5️⃣ Lấy lại request vừa tạo để trả về
  const [rows] = await db.execute(
    'SELECT * FROM TeamRequests WHERE teamId = ? AND lecturerId = ? ORDER BY createdAt DESC LIMIT 1',
    [teamId, lecturerId]
  );

  return rows[0];
},

async getRequestsForLecturer(lecturerId) {
  const [rows] = await db.execute(`
    SELECT tr.id AS requestId,
           tr.teamId,
           tr.status,
           tr.createdAt,
           tr.updatedAt,
           t.TenTeam,
           s.HoTen AS LeaderName
    FROM TeamRequests tr
    JOIN Team t ON tr.teamId = t.MaTeam
    JOIN Student s ON t.LeaderID = s.MaSV
    WHERE tr.lecturerId = ?
    ORDER BY tr.createdAt DESC
  `, [lecturerId]);

  return rows;
},

async respondRequest(requestId, lecturerId, action) {
  // 1️⃣ Chỉ cho phép accept hoặc reject
  if (!["accept", "reject"].includes(action)) {
    throw new Error("Invalid action");
  }

  // 2️⃣ Chuyển action thành status
  const status = action === "accept" ? "accepted" : "rejected";

  // 3️⃣ Cập nhật status cho request
  const [result] = await db.execute(
    `UPDATE TeamRequests
     SET status = ?, updatedAt = NOW()
     WHERE id = ? AND lecturerId = ?`,
    [status, requestId, lecturerId]
  );

  if (result.affectedRows === 0) {
    throw new Error("Request not found or you are not authorized");
  }

  // 4️⃣ Nếu accept, cập nhật luôn MentorID cho Team
if (status === "accepted") {
  const [[request]] = await db.execute(
    'SELECT teamId FROM TeamRequests WHERE id = ?',
    [requestId]
  );

  if (request) {
    // Lấy tên giảng viên từ bảng Lecture
    const [[lecturer]] = await db.execute(
      'SELECT HoTen FROM Lecture WHERE MaGV = ?',
      [lecturerId]
    );

    await db.execute(
      'UPDATE Team SET MentorID = ?, MentorName = ? WHERE MaTeam = ?',
      [lecturerId, lecturer.HoTen, request.teamId]
    );
  }
}


  // 5️⃣ Trả về dữ liệu request sau khi update (có thể dùng cho frontend Table)
  const [updated] = await db.execute(
    `SELECT tr.id AS requestId,
            tr.teamId,
            tr.status,
            tr.createdAt,
            tr.updatedAt,
            t.TenTeam,
            s.HoTen AS LeaderName
     FROM TeamRequests tr
     JOIN Team t ON tr.teamId = t.MaTeam
     JOIN Student s ON t.LeaderID = s.MaSV
     WHERE tr.id = ?`,
    [requestId]
  );

  return updated[0];
},



};


module.exports = teamModel;
