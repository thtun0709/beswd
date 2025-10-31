// models/CommentModel.js
const db = require('../config/db');

const CommentModel = {
  // ------------------ CREATE ------------------ //
  async create({ postId, authorId, content }) {
    const [result] = await db.execute(
      `INSERT INTO Comment (postId, authorId, content) VALUES (?, ?, ?)`,
      [postId, authorId, content]
    );

    const commentId = result.insertId;

    // Lấy lại comment kèm thông tin người đăng
    const [rows] = await db.query(
      `SELECT 
          c.*, 
          s.HoTen AS authorName,
          s.Role AS authorRole
       FROM Comment c
       LEFT JOIN Student s ON c.authorId = s.MaSV
       WHERE c.id = ?`,
      [commentId]
    );

    return rows[0];
  },

  // ------------------ FIND BY ID ------------------ //
  async findById(id) {
    const [rows] = await db.query(
      `SELECT 
          c.*, 
          s.HoTen AS authorName,
          s.Role AS authorRole
       FROM Comment c
       LEFT JOIN Student s ON c.authorId = s.MaSV
       WHERE c.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  // ------------------ GET BY POST ------------------ //
  async getByPost(postId) {
    const [rows] = await db.query(
      `SELECT 
          c.*, 
          s.HoTen AS authorName,
          s.Role AS authorRole
       FROM Comment c
       LEFT JOIN Student s ON c.authorId = s.MaSV
       WHERE c.postId = ?
       ORDER BY c.createdAt ASC`,
      [postId]
    );
    return rows;
  },

  // ------------------ DELETE ------------------ //
  async delete(id) {
    const [result] = await db.execute(`DELETE FROM Comment WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },
};

module.exports = CommentModel;
