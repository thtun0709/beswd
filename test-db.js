const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: Number(process.env.DB_PORT || 3306)
    });

    console.log('✅ Kết nối thành công!');
    const [rows] = await connection.query("SELECT NOW() AS currentTime");
    console.log('⏰ Thời gian từ DB:', rows[0].currentTime);

    await connection.end();
  } catch (error) {
    console.error('❌ Kết nối thất bại:', error.message);
  }
}

testConnection();
