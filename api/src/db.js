const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS equipment (
      equipmentId VARCHAR(50) PRIMARY KEY,
      equipmentName VARCHAR(150) NOT NULL,
      category VARCHAR(100) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      availability ENUM('AVAILABLE', 'BORROWED', 'MAINTENANCE', 'DAMAGED') DEFAULT 'AVAILABLE',
      borrowerName VARCHAR(150) NULL,
      borrowerId VARCHAR(50) NULL,
      borrowDate DATETIME NULL,
      dueDate DATETIME NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

module.exports = { pool, initDB };
