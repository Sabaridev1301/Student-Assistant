const express = require('express');
const multer = require('multer');
const { nanoid } = require('nanoid');
const db = require('../services/db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function extractTextFromFile(file) {
  if (file.mimetype === 'application/pdf') {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(file.buffer);
    return data.text;
  }
  return file.buffer.toString('utf-8');
}

// POST /api/materials  — upload notes as raw text OR a file (txt/pdf)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const studentId = req.body.studentId || 'demo-student';
    let text = req.body.text;
    let sourceName = req.body.sourceName || 'pasted-notes';

    if (req.file) {
      text = await extractTextFromFile(req.file);
      sourceName = req.file.originalname;
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No text or file content provided.' });
    }

    const material = { materialId: nanoid(8), studentId, sourceName, text, uploadedAt: new Date().toISOString() };
    db.get('materials').push(material).write();
    res.json({ material: { materialId: material.materialId, sourceName, studentId, uploadedAt: material.uploadedAt, chars: text.length } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process material.', detail: err.message });
  }
});

// GET /api/materials?studentId=...
router.get('/', (req, res) => {
  const studentId = req.query.studentId || 'demo-student';
  const materials = db.get('materials').filter({ studentId }).value()
    .map(m => ({ materialId: m.materialId, sourceName: m.sourceName, uploadedAt: m.uploadedAt, chars: m.text.length }));
  res.json({ materials });
});

module.exports = router;
