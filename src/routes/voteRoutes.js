const express = require("express");
const router = express.Router();
const teamModel = require("../models/teamModel");
const db = require("../config/db");

// Middleware
const { verifyToken, verifyAdmin } = require("../middlewares/authMiddleware");

/**
 * @swagger
 * /leader:
 *   post:
 *     summary: Vote cho Leader trong team
 *     description: Sinh viên vote cho một thành viên khác trong cùng team để chọn leader.
 *     tags: [Team Votes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamId
 *               - candidateId
 *             properties:
 *               teamId:
 *                 type: string
 *                 description: ID của team
 *               candidateId:
 *                 type: string
 *                 description: ID của thành viên được vote
 *     responses:
 *       200:
 *         description: Vote thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 msg:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ hoặc vote bản thân
 *       403:
 *         description: Sinh viên không thuộc team
 *       500:
 *         description: Lỗi server
 */
router.post("/leader", verifyToken, async (req, res) => {
  try {
    const voterId = req.user.id;
    const { teamId, candidateId } = req.body;

    if (!teamId || !candidateId) {
      return res.status(400).json({ status: "error", msg: "Missing team or candidate" });
    }

    if (voterId === candidateId) {
      return res.status(400).json({ status: "error", msg: "You cannot vote for yourself" });
    }

    const [[voter]] = await db.execute(
      "SELECT Team FROM Student WHERE MaSV = ?",
      [voterId]
    );

    if (!voter || voter.Team != teamId) {
      return res.status(403).json({ status: "error", msg: "You are not in this team" });
    }

    const result = await teamModel.voteLeader(teamId, voterId, candidateId);

    if (result.status === "leader_chosen") {
      return res.json({
        status: "leader_chosen",
        msg: "Leader selected successfully!",
        data: result
      });
    }

    return res.json({
      status: "voted",
      msg: "Vote recorded successfully",
      data: result
    });

  } catch (err) {
    console.error("❌ Vote Leader Error:", err);
    return res.status(500).json({ status: "error", msg: "Vote failed" });
  }
});


/**
 * @swagger
 * /leader/{teamId}:
 *   get:
 *     summary: Lấy kết quả vote Leader trong team
 *     description: Sinh viên hoặc Admin xem kết quả vote của team. Sinh viên chỉ xem được team của mình, Admin xem được tất cả.
 *     tags: [Team Votes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của team
 *     responses:
 *       200:
 *         description: Lấy danh sách phiếu vote thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 teamId:
 *                   type: string
 *                 totalVotes:
 *                   type: integer
 *                 votes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       teamId:
 *                         type: string
 *                       voterId:
 *                         type: string
 *                       voterName:
 *                         type: string
 *                       candidateId:
 *                         type: string
 *                       candidateName:
 *                         type: string
 *       403:
 *         description: Sinh viên không được quyền xem team khác
 *       404:
 *         description: Sinh viên không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get("/leader/:teamId", verifyToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    if (requesterRole !== "Admin") {
      const [[student]] = await db.execute(
        "SELECT Team FROM Student WHERE MaSV = ?",
        [requesterId]
      );

      if (!student) {
        return res.status(404).json({
          status: "error",
          msg: "Student not found"
        });
      }

      if (String(student.Team) !== String(teamId)) {
        return res.status(403).json({
          status: "error",
          msg: "You don't have access to view this team's votes"
        });
      }
    }

    const [rows] = await db.execute(`
      SELECT 
        v.teamId,
        v.voterId,
        sv.HoTen AS voterName,
        v.candidateId,
        sc.HoTen AS candidateName
      FROM TeamVotes v
      LEFT JOIN Student sv ON sv.MaSV = v.voterId
      LEFT JOIN Student sc ON sc.MaSV = v.candidateId
      WHERE v.teamId = ?
    `, [teamId]);

    return res.status(200).json({
      status: "success",
      teamId,
      totalVotes: rows.length,
      votes: rows
    });

  } catch (err) {
    console.error("❌ Get Votes Error:", err);
    return res.status(500).json({
      status: "error",
      msg: "Cannot get votes for this team",
      error: err.message
    });
  }
});

module.exports = router;
