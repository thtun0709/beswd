const express = require('express');
const router = express.Router();
const teamModel = require('../models/teamModel');
const { verifyToken } = require('../middlewares/authMiddleware');
const db = require('../config/db');

/**
 * ✅ Middleware kiểm tra quyền Admin (nếu muốn)
 */
function isAdmin(req, res, next) {
  const user = req.user;
  if (!user || user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
  }
  next();
}

/**
 * @swagger
 * tags:
 *   name: Teams
 *   description: API quản lý Team
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Team:
 *       type: object
 *       required:
 *         - maTeam
 *         - tenTeam
 *       properties:
 *         maTeam:
 *           type: string
 *           description: Mã Team
 *         tenTeam:
 *           type: string
 *           description: Tên Team
 *         trangThaiNhom:
 *           type: string
 *           description: Trạng thái Team (Active, Locked, Voting, Open)
 *         moTaNhom:
 *           type: string
 *           description: Mô tả Team
 *         soLuongThanhVienToiDa:
 *           type: integer
 *           description: Số lượng thành viên tối đa
 *         leaderID:
 *           type: string
 *           description: ID Leader
 *         leaderName:
 *           type: string
 *           description: Tên Leader
 */

/**
 * @swagger
 * /api/teams:
 *   get:
 *     summary: Lấy danh sách tất cả team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách Team
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Team'
 *       500:
 *         description: Lỗi server
 */
router.get('/', async (req, res) => {
  try {
    const teams = await teamModel.getAll();
    res.json({ success: true, data: teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/teams/{id}:
 *   get:
 *     summary: Lấy thông tin team theo mã
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã Team
 *     responses:
 *       200:
 *         description: Thông tin Team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Team'
 *       404:
 *         description: Team không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/:id', async (req, res) => {
  try {
    const team = await teamModel.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/teams:
 *   post:
 *     summary: Tạo mới Team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Team'
 *     responses:
 *       200:
 *         description: Team tạo thành công
 *       400:
 *         description: Thiếu trường bắt buộc
 *       500:
 *         description: Lỗi server
 */
/**
 * @swagger
 * /api/teams:
 *   post:
 *     summary: Tạo mới Team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Team'
 *     responses:
 *       200:
 *         description: Team tạo thành công
 *       400:
 *         description: Thiếu trường bắt buộc
 *       500:
 *         description: Lỗi server
 */
router.post('/', async (req, res) => {
  try {
    const { maTeam, tenTeam, trangThaiNhom, moTaNhom, soLuongThanhVienToiDa } = req.body;

    // ✅ Validation
    if (!maTeam || !tenTeam) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: maTeam, tenTeam' 
      });
    }

    // ✅ Kiểm tra trùng lặp
    const existing = await teamModel.findById(maTeam);
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: 'Team ID already exists' 
      });
    }

    // ✅ Chuẩn bị dữ liệu
    const teamData = {
      maTeam,
      tenTeam,
      trangThaiNhom: trangThaiNhom || 'Open',
      moTaNhom: moTaNhom || '',
      soLuongThanhVienToiDa: soLuongThanhVienToiDa || 5,
      leaderID: null,
      leaderName: null,
    };

    // ✅ Tạo team
    await teamModel.create(teamData);

    // ✅ Trả về ngay dữ liệu vừa tạo (không cần query lại)
    res.json({ 
      success: true, 
      message: 'Team created successfully',
      data: {
        MaTeam: teamData.maTeam,
        TenTeam: teamData.tenTeam,
        TrangThaiNhom: teamData.trangThaiNhom,
        MoTaNhom: teamData.moTaNhom,
        SoLuongThanhVienToiDa: teamData.soLuongThanhVienToiDa,
        LeaderID: teamData.leaderID,
        LeaderName: teamData.leaderName,
        SoLuongThanhVienHienTai: 0  // Team mới luôn có 0 members
      }
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

/**
 * @swagger
 * /api/teams/{id}:
 *   put:
 *     summary: Cập nhật Team
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã Team
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Team'
 *     responses:
 *       200:
 *         description: Team cập nhật thành công
 *       404:
 *         description: Team không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.put('/:id', async (req, res) => {
  try {
    const {
      tenTeam,
      trangThaiNhom,
      moTaNhom,
      soLuongThanhVienToiDa,
      leaderID,
      leaderName,
      status, // ✅ Thêm cột Status
    } = req.body;
    const { id } = req.params;

    const oldTeam = await teamModel.findById(id);
    if (!oldTeam)
      return res.status(404).json({ success: false, message: 'Team not found' });

    await teamModel.update({
      maTeam: id,
      tenTeam: tenTeam ?? oldTeam.TenTeam,
      trangThaiNhom: trangThaiNhom ?? oldTeam.TrangThaiNhom,
      moTaNhom: moTaNhom ?? oldTeam.MoTaNhom,
      soLuongThanhVienToiDa: soLuongThanhVienToiDa ?? oldTeam.SoLuongThanhVienToiDa,
      leaderID: leaderID ?? oldTeam.LeaderID,
      leaderName: leaderName ?? oldTeam.LeaderName,
      status: status ?? oldTeam.Status, // ✅ Cập nhật thêm cột Status
    });

    res.json({ success: true, message: 'Team updated successfully' });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


/**
 * @swagger
 * /api/teams/{id}:
 *   delete:
 *     summary: Xoá Team
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã Team
 *     responses:
 *       200:
 *         description: Team xoá thành công
 *       404:
 *         description: Team không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.delete('/:id', async (req, res) => {
  const teamId = req.params.id;

  console.log('🗑️ DELETE request for team:', teamId); // Debug

  try {
    // ✅ Kiểm tra team có tồn tại không
    const existingTeam = await teamModel.findById(teamId);
    
    if (!existingTeam) {
      console.log(`❌ Team ${teamId} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    console.log(`✅ Team ${teamId} found, proceeding to delete`);

    // 1️⃣ Reset team của tất cả student trong team đó
    await db.execute('UPDATE Student SET Team = NULL WHERE Team = ?', [teamId]);

    // 2️⃣ Xoá votes liên quan (nếu có)
    try {
      await db.execute('DELETE FROM TeamVotes WHERE teamId = ?', [teamId]);
    } catch (voteErr) {
      console.warn('⚠️ No votes to delete or table does not exist:', voteErr.message);
    }

    // 3️⃣ Xoá team
    const result = await teamModel.delete(teamId);
    
    if (result.affectedRows === 0) {
      console.log(`❌ Team ${teamId} delete failed - no rows affected`);
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found or already deleted' 
      });
    }

    console.log(`✅ Team ${teamId} deleted successfully`);
    
    res.json({ 
      success: true, 
      message: 'Team deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting team:', error.message, error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});



module.exports = router;
