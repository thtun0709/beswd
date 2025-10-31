const db = require('../config/db');

const PostModel = {
  // ------------------ CREATE ------------------ //
  async create({ authorId, authorRole, title, content }) {
    const [result] = await db.execute(
      `INSERT INTO Post (authorId, authorRole, title, content)
       VALUES (?, ?, ?, ?)`,
      [authorId, authorRole, title, content]
    );

    const postId = result.insertId;

    // Lấy lại thông tin kèm tên người đăng
    const [rows] = await db.query(
      `SELECT 
          p.*, 
          s.HoTen AS authorName,
          s.Role AS authorRole
       FROM Post p
       LEFT JOIN Student s ON p.authorId = s.MaSV
       WHERE p.id = ?
       LIMIT 1`,
      [postId]
    );

    return rows[0];
  },

  // ------------------ GET ALL ------------------ //
  async getAll() {
    const [rows] = await db.query(
      `SELECT 
          p.*, 
          s.HoTen AS authorName,
          s.Role AS authorRole
       FROM Post p
       LEFT JOIN Student s ON p.authorId = s.MaSV
       ORDER BY p.createdAt DESC`
    );
    return rows;
  },

  // ------------------ FIND BY ID ------------------ //
  async findById(id) {
    const [rows] = await db.query(
      `SELECT 
          p.*, 
          s.HoTen AS authorName,
          s.Role AS authorRole
       FROM Post p
       LEFT JOIN Student s ON p.authorId = s.MaSV
       WHERE p.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  // ------------------ UPDATE ------------------ //
  async update(id, { title, content }) {
    await db.execute(
      `UPDATE Post SET title = ?, content = ? WHERE id = ?`,
      [title, content, id]
    );
    return this.findById(id);
  },

  // ------------------ DELETE ------------------ //
  async delete(id) {
    const [result] = await db.execute(`DELETE FROM Post WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },
};

module.exports = PostModel;
