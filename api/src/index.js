require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { pool, initDB } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Health check for RDS connectivity evidence
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

// CREATE: POST /equipment
app.post("/equipment", async (req, res) => {
  const {
    equipmentId,
    equipmentName,
    category,
    brand,
    availability = "AVAILABLE",
  } = req.body;
  if (!equipmentId || !equipmentName || !category || !brand) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    await pool.query(
      `INSERT INTO equipment (equipmentId, equipmentName, category, brand, availability)
       VALUES (?, ?, ?, ?, ?)`,
      [equipmentId, equipmentName, category, brand, availability],
    );
    res.status(201).json({ message: "Equipment created", equipmentId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ: GET /equipment
app.get("/equipment", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM equipment");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE: PUT /equipment/:equipmentId
app.put("/equipment/:equipmentId", async (req, res) => {
  const { equipmentId } = req.params;
  const {
    equipmentName,
    category,
    brand,
    availability,
    borrowerName,
    borrowerId,
    borrowDate,
    dueDate,
  } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE equipment
       SET equipmentName = COALESCE(?, equipmentName),
           category = COALESCE(?, category),
           brand = COALESCE(?, brand),
           availability = COALESCE(?, availability),
           borrowerName = ?,
           borrowerId = ?,
           borrowDate = ?,
           dueDate = ?
       WHERE equipmentId = ?`,
      [
        equipmentName,
        category,
        brand,
        availability,
        availability === "AVAILABLE" ? null : borrowerName || null,
        availability === "AVAILABLE" ? null : borrowerId || null,
        availability === "AVAILABLE" ? null : borrowDate || null,
        availability === "AVAILABLE" ? null : dueDate || null,
        equipmentId,
      ],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Not found" });
    res.json({ message: "Equipment updated", equipmentId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: DELETE /equipment/:equipmentId
app.delete("/equipment/:equipmentId", async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM equipment WHERE equipmentId = ?",
      [req.params.equipmentId],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Not found" });
    res.json({
      message: "Equipment deleted",
      equipmentId: req.params.equipmentId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
initDB()
  .then(() =>
    app.listen(PORT, () =>
      console.log(`Equipment API running on port ${PORT}`),
    ),
  )
  .catch((err) => {
    console.error("Failed to initialize DB:", err);
    process.exit(1);
  });
