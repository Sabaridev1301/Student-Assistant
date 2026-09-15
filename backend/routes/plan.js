const express = require('express');
const db = require('../services/db');
const agent = require('../services/agent');

const router = express.Router();

// POST /api/plan — goal intake: { studentId, examName, days, hoursPerDay, materialIds: [] }
router.post('/', (req, res) => {
  try {
    const { studentId = 'demo-student', examName, days, hoursPerDay, materialIds } = req.body;
    if (!examName || !days || !hoursPerDay) {
      return res.status(400).json({ error: 'examName, days and hoursPerDay are required.' });
    }
    let materials = db.get('materials').filter({ studentId }).value();
    if (Array.isArray(materialIds) && materialIds.length) {
      materials = materials.filter(m => materialIds.includes(m.materialId));
    }
    if (!materials.length) {
      return res.status(400).json({ error: 'Upload at least one material before planning.' });
    }

    const { plan, topics } = agent.planGoal({
      studentId,
      examName,
      days: Number(days),
      hoursPerDay: Number(hoursPerDay),
      materials
    });

    res.json({ plan, topics });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to build study plan.', detail: err.message });
  }
});

// GET /api/plan?studentId=...  — active plan + its topics
router.get('/', (req, res) => {
  const studentId = req.query.studentId || 'demo-student';
  const plan = db.get('plans').find({ studentId, active: true }).value();
  const topics = db.get('topics').filter({ studentId }).value();
  res.json({ plan: plan || null, topics });
});

module.exports = router;
