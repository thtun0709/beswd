const express = require('express');
const router = express.Router();
const studentModel = require('../models/studentModel');
const teamModel = require('../models/teamModel');
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /students/me:
 *   get:
 *     summary: Lấy thông tin sinh viên hiện tại
 *     description: Sinh viên đăng nhập (Student role) có thể lấy thông tin cá nhân của mình.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin sinh viên thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 student:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     MaSV:
 *                       type: string
 *                     HoTen:
 *                       type: string
 *                     Email:
 *                       type: string
 *                     Team:
 *                       type: string
 *                     Role:
 *                       type: string
 *       404:
 *         description: Sinh viên không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const studentId = req.user.id; // thay vì req.user.maSV
    const student = await studentModel.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    return res.json({ success: true, student });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


/**
 * @swagger
 * /students:
 *   get:
 *     summary: Lấy tất cả sinh viên
 *     description: Chỉ Admin mới có quyền xem toàn bộ danh sách sinh viên.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách sinh viên thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 students:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       MaSV:
 *                         type: string
 *                       HoTen:
 *                         type: string
 *                       Email:
 *                         type: string
 *                       Team:
 *                         type: string
 *                       Role:
 *                         type: string
 *       403:
 *         description: Không có quyền truy cập (không phải Admin)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const students = await studentModel.getAll();
    return res.json({ success: true, students });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /students/teams:
 *   get:
 *     summary: Lấy tất cả nhóm có sẵn
 *     description: Sinh viên có thể xem danh sách tất cả nhóm. Nếu sinh viên chưa có team, frontend có thể hiển thị nút join hoặc create.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách nhóm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 teams:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       teamId:
 *                         type: string
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                       description:
 *                         type: string
 *                       membersCount:
 *                         type: integer
 *                       maxMembers:
 *                         type: integer
 *                       leaderId:
 *                         type: string
 *                       leaderName:
 *                         type: string
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.get('/teams', verifyToken, async (req, res) => {
  try {
    const [teams] = await db.query(`
      SELECT 
        t.MaTeam AS teamId,
        t.TenTeam AS name,
        t.TrangThaiNhom AS status,
        t.MoTaNhom AS description,
        (
          SELECT COUNT(*) 
          FROM Student s 
          WHERE s.Team = t.MaTeam
        ) AS membersCount,
        t.SoLuongThanhVienToiDa AS maxMembers,
        t.LeaderID AS leaderId,
        t.LeaderName AS leaderName
      FROM Team t
    `);

    return res.json({ success: true, teams });
  } catch (err) {
    console.error("Error fetching teams:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


/**
 * @swagger
 * /students/requests:
 *   get:
 *     summary: Lấy các request tham gia nhóm của sinh viên hiện tại
 *     description: Sinh viên đăng nhập có thể xem danh sách các request đã gửi để tham gia nhóm.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách request thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 requests:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: ID của request
 *                       teamId:
 *                         type: string
 *                         description: ID của team
 *                       teamName:
 *                         type: string
 *                         description: Tên team
 *                       status:
 *                         type: string
 *                         description: Trạng thái request (pending, approved, rejected)
 *                       requested_at:
 *                         type: string
 *                         format: date-time
 *                         description: Thời điểm gửi request
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.get('/requests', verifyToken, async (req, res) => {
  try {
    const studentId = req.user.id;
    const [requests] = await db.query(
      `SELECT tr.id, tr.teamId, t.TenTeam AS teamName, tr.status, tr.requested_at
       FROM team_requests tr
       JOIN Team t ON tr.teamId = t.MaTeam
       WHERE tr.studentId = ?`,
      [studentId]
    );
    return res.json({ success: true, requests });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


/**
 * @swagger
 * /students/join-team/{teamId}:
 *   post:
 *     summary: Tham gia một team
 *     description: Sinh viên đăng nhập có thể gửi yêu cầu tham gia một team nếu chưa thuộc team nào và team còn chỗ trống.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của team muốn tham gia
 *     responses:
 *       200:
 *         description: Tham gia team thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 team:
 *                   type: object
 *                   properties:
 *                     teamId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     status:
 *                       type: string
 *                     description:
 *                       type: string
 *                     membersCount:
 *                       type: integer
 *                     maxMembers:
 *                       type: integer
 *                     leaderId:
 *                       type: string
 *                     leaderName:
 *                       type: string
 *       400:
 *         description: Sinh viên đã có team hoặc team full
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Sinh viên hoặc team không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/join-team/:teamId', verifyToken, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { teamId } = req.params;

    const student = await studentModel.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (student.Team) {
      return res.status(400).json({ success: false, message: 'You are already in a team' });
    }

    const team = await teamModel.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.SoLuongThanhVienHienTai >= team.SoLuongThanhVienToiDa) {
      return res.status(400).json({ success: false, message: 'Team is full' });
    }

    await studentModel.joinTeam(studentId, teamId);
    const updatedTeam = await teamModel.findById(teamId);

    if (updatedTeam.SoLuongThanhVienHienTai >= updatedTeam.SoLuongThanhVienToiDa) {
      await teamModel.updateStatus(teamId, 'Voting');
      updatedTeam.TrangThaiNhom = 'Voting';
    }

    return res.json({ 
      success: true, 
      message: 'You have joined the team successfully', 
      team: updatedTeam 
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


/**
 * @swagger
 * /students/team/{teamId}:
 *   get:
 *     summary: Lấy chi tiết một team cùng danh sách thành viên
 *     description: Sinh viên đăng nhập có thể xem thông tin chi tiết của một team và danh sách thành viên của team đó.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của team cần lấy chi tiết
 *     responses:
 *       200:
 *         description: Lấy chi tiết team thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 team:
 *                   type: object
 *                   properties:
 *                     teamId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     status:
 *                       type: string
 *                     description:
 *                       type: string
 *                     maxMembers:
 *                       type: integer
 *                     leaderId:
 *                       type: string
 *                     leaderName:
 *                       type: string
 *                     currentMembers:
 *                       type: integer
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           studentId:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                           email:
 *                             type: string
 *                           role:
 *                             type: string
 *       404:
 *         description: Team không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.get('/team/:teamId', verifyToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const [teamRows] = await db.query(
      `SELECT 
        t.MaTeam AS teamId,
        t.TenTeam AS name,
        t.TrangThaiNhom AS status,
        t.MoTaNhom AS description,
        t.SoLuongThanhVienToiDa AS maxMembers,
        t.LeaderID AS leaderId,
        t.LeaderName AS leaderName,
        t.MentorID AS mentorId,       -- Thêm
        t.MentorName AS mentorName,   -- Thêm
        (
          SELECT COUNT(*) FROM Student s WHERE s.Team = t.MaTeam
        ) AS currentMembers
      FROM Team t
      WHERE t.MaTeam = ?`,
      [teamId]
    );

    if (!teamRows.length)
      return res.status(404).json({ success: false, message: "Team not found" });

    const team = teamRows[0];

    const [members] = await db.query(
      `SELECT 
        s.MaSV AS studentId,
        s.HoTen AS fullName,
        s.Email AS email,
        s.Role AS role
      FROM Student s
      WHERE s.Team = ?`,
      [teamId]
    );

    return res.json({
      success: true,
      team: {
        ...team,
        members
      }
    });
  } catch (err) {
    console.error("Error fetching team detail:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


/**
 * @swagger
 * /students/leave-team/{teamId}:
 *   post:
 *     summary: Rời khỏi team
 *     description: Sinh viên đăng nhập có thể rời khỏi team. Nếu sinh viên là leader và còn thành viên khác, leader sẽ được chuyển cho thành viên đầu tiên còn lại. Nếu không còn ai, team sẽ bị xóa.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của team muốn rời
 *     responses:
 *       200:
 *         description: Rời team thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Sinh viên không thuộc team
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Sinh viên hoặc team không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post("/leave-team/:teamId", verifyToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const studentId = req.user.id;

    const [studentRows] = await db.query(
      "SELECT Team FROM Student WHERE MaSV = ?",
      [studentId]
    );

    if (!studentRows.length)
      return res.status(404).json({ success: false, message: "Student not found" });

    if (studentRows[0].Team !== teamId)
      return res.status(400).json({ success: false, message: "You are not in this team" });

    const [teamRows] = await db.query(
      "SELECT LeaderID, SoLuongThanhVienToiDa FROM Team WHERE MaTeam = ?",
      [teamId]
    );

    if (!teamRows.length)
      return res.status(404).json({ success: false, message: "Team not found" });

    const team = teamRows[0];

    if (team.LeaderID === studentId) {
      const [otherMembers] = await db.query(
        "SELECT MaSV FROM Student WHERE Team = ? AND MaSV != ?",
        [teamId, studentId]
      );

      if (otherMembers.length > 0) {
        const newLeaderId = otherMembers[0].MaSV;
        const [[newLeader]] = await db.query(
          "SELECT HoTen FROM Student WHERE MaSV = ?",
          [newLeaderId]
        );
        await db.query(
          "UPDATE Team SET LeaderID = ?, LeaderName = ? WHERE MaTeam = ?",
          [newLeaderId, newLeader.HoTen, teamId]
        );
      } else {
        await db.query("DELETE FROM Team WHERE MaTeam = ?", [teamId]);
      }
    }

    await db.query("UPDATE Student SET Team = NULL WHERE MaSV = ?", [studentId]);

    return res.json({
      success: true,
      message: "You have left the team successfully",
    });
  } catch (err) {
    console.error("Error leaving team:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while leaving team",
    });
  }
});

/**
 * @swagger
 * /students/create-team:
 *   post:
 *     summary: Sinh viên tạo nhóm mới
 *     description: Sinh viên chỉ có thể tạo nhóm khi chưa thuộc nhóm nào. 
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - maxMembers
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên nhóm
 *               description:
 *                 type: string
 *                 description: Mô tả nhóm (tùy chọn)
 *               maxMembers:
 *                 type: integer
 *                 description: Số lượng thành viên tối đa
 *     responses:
 *       200:
 *         description: Tạo nhóm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 team:
 *                   type: object
 *                   properties:
 *                     teamId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                     maxMembers:
 *                       type: integer
 *                     leaderId:
 *                       type: string
 *                     leaderName:
 *                       type: string
 *       400:
 *         description: Thiếu thông tin hoặc sinh viên đã thuộc nhóm
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Sinh viên không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post("/create-team", verifyToken, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { name, description, maxMembers } = req.body;

    if (!name || !maxMembers) {
      return res.status(400).json({
        success: false,
        message: "Team name and maximum members are required",
      });
    }

    const [[student]] = await db.query(
      "SELECT HoTen, Team FROM Student WHERE MaSV = ?",
      [studentId]
    );

    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    if (student.Team)
      return res.status(400).json({ success: false, message: "You already belong to a team" });

    const [result] = await db.query(
      `INSERT INTO Team (TenTeam, MoTaNhom, TrangThaiNhom, SoLuongThanhVienToiDa, LeaderID, LeaderName)
       VALUES (?, ?, 'Pending', ?, ?, ?)`,
      [name, description || "", maxMembers, studentId, student.HoTen]
    );

    const newTeamId = result.insertId;

    await db.query("UPDATE Student SET Team = ? WHERE MaSV = ?", [newTeamId, studentId]);

    const [[newTeam]] = await db.query(
      `SELECT 
        MaTeam AS teamId,
        TenTeam AS name,
        MoTaNhom AS description,
        TrangThaiNhom AS status,
        SoLuongThanhVienToiDa AS maxMembers,
        LeaderID AS leaderId,
        LeaderName AS leaderName
       FROM Team
       WHERE MaTeam = ?`,
      [newTeamId]
    );

    return res.json({
      success: true,
      message: "Team created successfully",
      team: newTeam,
    });
  } catch (err) {
    console.error("Error creating team:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating team",
    });
  }
});

module.exports = router;
