const express = require('express');
const agent = require('../services/agent');

const router = express.Router();

// GET /api/progress?studentId=...
router.get('/', (req, res) => {
  const studentId = req.query.studentId || 'demo-student';
  const dashboard = agent.getDashboard(studentId);
  res.json(dashboard);
});

module.exports = router;
