const express = require('express');
const agent = require('../services/agent');

const router = express.Router();

// POST /api/quiz/generate — { topicId, count }
router.post('/generate', (req, res) => {
  try {
    const { topicId, count } = req.body;
    if (!topicId) return res.status(400).json({ error: 'topicId is required.' });
    const quiz = agent.createQuizForTopic(topicId, count || 5);
    // don't leak answers to the client before submission
    const safeQuiz = {
      ...quiz,
      questions: quiz.questions.map(({ answer, originalCasing, ...q }) => q)
    };
    res.json({ quiz: safeQuiz });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/quiz/submit — { quizId, answers: {questionId: answer} }
router.post('/submit', (req, res) => {
  try {
    const { quizId, answers } = req.body;
    if (!quizId) return res.status(400).json({ error: 'quizId is required.' });
    const { result, updatedPlan } = agent.submitQuiz(quizId, answers || {});
    res.json({ result, updatedPlan });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
