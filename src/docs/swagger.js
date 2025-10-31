const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EXE101 Group Management API',
      version: '1.0.0',
      description: `
Hệ thống quản lý nhóm cho môn EXE101 — nơi sinh viên có thể tạo nhóm, tham gia nhóm, 
giảng viên làm mentor, và admin giám sát toàn bộ.  
Bao gồm các role: **Student**, **Leader**, **Lecturer**, **Admin**.
      `,
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập token nhận được sau khi đăng nhập',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  // 🔍 Tự động quét tất cả route để hiển thị docs
  apis: ['./src/routes/*.js', './routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(options);

module.exports = { swaggerUi, swaggerDocs };
