// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const PostModel = require('../models/postModel');
const CommentModel = require('../models/CommentModel');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// ------------------- POSTS ------------------- //

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post (Student/Admin)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Hỏi về EXE 11"
 *               content:
 *                 type: string
 *                 example: "Các bạn có thể giải thích về team request không?"
 *     responses:
 *       200:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 post:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 25
 *                     authorId:
 *                       type: string
 *                       example: "SE123456"
 *                     title:
 *                       type: string
 *                       example: "Hỏi về EXE 11"
 *                     content:
 *                       type: string
 *                       example: "Các bạn có thể giải thích về team request không?"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     authorRole:
 *                       type: string
 *                       example: "Student"
 *                     authorName:
 *                       type: string
 *                       example: "Nguyễn Tân Thuận"
 *       400:
 *         description: Title and content required
 *       500:
 *         description: Failed to create post
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content)
      return res.status(400).json({ message: 'Title and content required' });

    const post = await PostModel.create({
      authorId: req.user.id,
      authorRole: req.user.role,
      title,
      content,
    });

    // 👇 Emit event cho tất cả client
    const io = req.app.get("io");
    io.emit("post_created", post);

    res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create post' });
  }
});



/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 25
 *                       authorId:
 *                         type: string
 *                         example: "SE123456"
 *                       title:
 *                         type: string
 *                         example: "Hỏi về EXE 11"
 *                       content:
 *                         type: string
 *                         example: "Các bạn có thể giải thích về team request không?"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       authorRole:
 *                         type: string
 *                         example: "Student"
 *                       authorName:
 *                         type: string
 *                         example: "Nguyễn Tân Thuận"
 *       500:
 *         description: Failed to fetch posts
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const posts = await PostModel.getAll();
    res.json({ success: true, posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Update a post (only author or Admin)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the post to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Updated post title"
 *               content:
 *                 type: string
 *                 example: "Updated post content"
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 post:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 25
 *                     title:
 *                       type: string
 *                       example: "Updated post title"
 *                     content:
 *                       type: string
 *                       example: "Updated post content"
 *                     authorId:
 *                       type: string
 *                       example: "SE123456"
 *                     authorRole:
 *                       type: string
 *                       example: "Student"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: Access denied (not author or admin)
 *       404:
 *         description: Post not found
 *       500:
 *         description: Failed to update post
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const post = await PostModel.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.authorId !== req.user.id && req.user.role !== 'Admin')
      return res.status(403).json({ message: 'Access denied' });

    const { title, content } = req.body;
    const updated = await PostModel.update(id, { title, content });
    
    // ✅ Thêm socket emit
    const io = req.app.get("io");
    io.emit("post_updated", updated);
    
    res.json({ success: true, post: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update post' });
  }
});

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Delete a post (only author or Admin)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the post to delete
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Post deleted successfully"
 *       403:
 *         description: Access denied (not author or admin)
 *       404:
 *         description: Post not found
 *       500:
 *         description: Failed to delete post
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const post = await PostModel.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.authorId !== req.user.id && req.user.role !== 'Admin')
      return res.status(403).json({ message: 'Access denied' });

    await PostModel.delete(id);
    
    // ✅ Thêm socket emit
    const io = req.app.get("io");
    io.emit("post_deleted", { id: parseInt(id) }); // Gửi id của post bị xóa
    
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete post' });
  }
});

// ------------------- COMMENTS ------------------- //

/**
 * @swagger
 * /api/posts/{postId}/comments:
 *   post:
 *     summary: Create a comment for a post (Admin or Student)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the post to comment on
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "This is my comment"
 *     responses:
 *       200:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 comment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     postId:
 *                       type: integer
 *                     authorId:
 *                       type: string
 *                     content:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *       400:
 *         description: Content required
 *       404:
 *         description: Post not found
 *       500:
 *         description: Failed to create comment
 */
router.post('/:postId/comments', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Content required' });

    const post = await PostModel.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await CommentModel.create({
      postId,
      authorId: req.user.id,
      content,
    });

    // 👇 Emit event realtime
    const io = req.app.get("io");
    io.emit("comment_created", comment);

    res.json({ success: true, comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create comment' });
  }
});


/**
 * @swagger
 * /api/posts/{postId}/comments:
 *   get:
 *     summary: Get all comments for a specific post
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the post to fetch comments
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       postId:
 *                         type: integer
 *                       authorId:
 *                         type: string
 *                       authorName:
 *                         type: string
 *                       authorRole:
 *                         type: string
 *                       content:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *       404:
 *         description: Post not found
 *       500:
 *         description: Failed to fetch comments
 */
router.get('/:postId/comments', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await PostModel.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comments = await CommentModel.getByPost(postId);
    res.json({ success: true, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

/**
 * @swagger
 * /api/posts/{postId}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment (only author or Admin)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the post the comment belongs to
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the comment to delete
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Comment deleted successfully
 *       403:
 *         description: Access denied (not author or Admin)
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Failed to delete comment
 */
router.delete('/:postId/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const commentData = await CommentModel.findById(commentId);
    if (!commentData) return res.status(404).json({ message: 'Comment not found' });

    if (commentData.authorId !== req.user.id && req.user.role !== 'Admin')
      return res.status(403).json({ message: 'Access denied' });

    await CommentModel.delete(commentId);
    
    // ✅ Thêm socket emit
    const io = req.app.get("io");
    io.emit("comment_deleted", { postId: parseInt(postId), commentId: parseInt(commentId) });
    
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

module.exports = router;

