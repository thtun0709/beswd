const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const AdminModel = require('../models/adminModel');
const { verifyToken } = require('../middlewares/authMiddleware');

dotenv.config();

/**
 * ✅ Middleware kiểm tra quyền Admin
 */
function isAdmin(req, res, next) {
  const user = req.user;
  if (!user || user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin only',
    });
  }
  next();
}

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: API dành cho Admin quản lý giảng viên (Lecturer)
 */

/**
 * @swagger
 * /api/admin/create-lecturer:
 *   post:
 *     summary: Admin tạo tài khoản Lecturer mới
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maGV
 *               - full_name
 *               - email
 *               - password
 *             properties:
 *               maGV:
 *                 type: string
 *                 example: GV001
 *               full_name:
 *                 type: string
 *                 example: Nguyen Van A
 *               email:
 *                 type: string
 *                 example: lecturer1@example.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       201:
 *         description: Lecturer created successfully
 *       400:
 *         description: Missing fields or lecturer already exists
 *       403:
 *         description: Access denied (Admin only)
 *       500:
 *         description: Server error
 */
router.post('/create-lecturer', verifyToken, isAdmin, async (req, res) => {
  try {
    const { maGV, full_name, email, password } = req.body;

    if (!maGV || !full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

   const lecturer = await AdminModel.createLecturer({
  maGV,
  hoTen: full_name,
  email,
  matKhau: password,
});


    return res.status(201).json({
      success: true,
      message: 'Lecturer created successfully',
      lecturer,
    });
  } catch (err) {
    console.error('❌ Error creating lecturer:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
});

/**
 * @swagger
 * /api/admin/lecturers:
 *   get:
 *     summary: Lấy danh sách toàn bộ giảng viên (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách giảng viên
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 lecturers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       maGV:
 *                         type: string
 *                         example: GV001
 *                       full_name:
 *                         type: string
 *                         example: Nguyen Van A
 *                       email:
 *                         type: string
 *                         example: lecturer@example.com
 *                       role:
 *                         type: string
 *                         example: Lecturer
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.get('/lecturers', verifyToken, isAdmin, async (req, res) => {
  try {
    const list = await AdminModel.getAllLecturers();
    res.status(200).json({
      success: true,
      lecturers: list,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
});

router.put('/lecturers/:maGV', verifyToken, isAdmin, async (req, res) => {
  try {
    const { maGV } = req.params;
    const { hoTen, email, matKhau } = req.body;
    const updated = await AdminModel.updateLecturer(maGV, { hoTen, email, matKhau });
    res.status(200).json({ success: true, message: 'Lecturer updated successfully', updated });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});


/**
 * @swagger
 * /api/admin/lecturers/{maGV}:
 *   delete:
 *     summary: Xoá giảng viên theo mã MaGV (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: maGV
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: GV001
 *     responses:
 *       200:
 *         description: Lecturer deleted successfully
 *       404:
 *         description: Lecturer not found
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.delete('/lecturers/:maGV', verifyToken, isAdmin, async (req, res) => {
  try {
    const { maGV } = req.params;
    await AdminModel.deleteLecturer(maGV);
    res.status(200).json({
      success: true,
      message: 'Lecturer deleted successfully',
    });
  } catch (err) {
    console.error('❌ Delete lecturer error:', err);

    if (err.message === 'Lecturer not found') {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
});


module.exports = router;
