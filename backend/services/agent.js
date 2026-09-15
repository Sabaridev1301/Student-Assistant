/**
 * agent.js — the central planning agent described in the project report.
 *
 * This is the piece that makes the app "agentic" rather than a plain CRUD
 * app: given a goal (exam date / days available / hours per day) plus
 * uploaded material, it decomposes the goal into sub-tasks and calls the
 * specialised tools in sequence:
 *
 *    intake -> extractTopics (Summarizer tool)
 *           -> build (Scheduler tool)
 *           -> generateQuiz (Quiz Generator tool, per topic, on demand)
 *
 * and on every quiz submission runs the feedback loop:
 *
 *    gradeAttempt -> update mastery ("memory") -> replan (Scheduler tool)
 *
 * All state (topics, plans, mastery/progress, chat history) is persisted
 * via db.js, which is what gives the agent "Memory" across sessions.
 */
const db = require('./db');
const { extractTopics } = require('./topicExtractor');
const scheduler = require('./scheduler');
const { generateQuiz, gradeAttempt } = require('./quizGenerator');
const { nanoid } = require('nanoid');

function planGoal({ studentId, examName, days, hoursPerDay, materials }) {
  // 1. Task decomposition: topic extraction across all supplied materials
  const topics = [];
  materials.forEach(mat => {
    extractTopics(mat.text).forEach(t => {
      topics.push({
        id: nanoid(8),
        studentId,
        materialId: mat.materialId,
        title: t.title,
        body: t.body,
        summary: t.summary,
        difficulty: t.difficulty
      });
    });
  });
  db.get('topics').push(...topics).write();

  // 2. Tool invocation: Scheduler tool builds the day-wise plan
  const schedule = scheduler.build(topics, days, hoursPerDay, {});

  const plan = {
    id: nanoid(8),
    studentId,
    examName,
    days,
    hoursPerDay,
    createdAt: new Date().toISOString(),
    schedule,
    active: true
  };
  // Only one active plan per student
  db.get('plans').find({ studentId, active: true }).assign({ active: false }).write();
  db.get('plans').push(plan).write();

  // Initialize mastery/progress records at 0 ("memory" seed)
  topics.forEach(t => {
    db.get('progress').push({ studentId, topicId: t.id, title: t.title, mastery: 0, attempts: 0 }).write();
  });

  return { plan, topics };
}

function createQuizForTopic(topicId, count = 5) {
  const topic = db.get('topics').find({ id: topicId }).value();
  if (!topic) throw new Error('Topic not found');
  const questions = generateQuiz(topic, count);
  const quiz = { id: nanoid(8), topicId, studentId: topic.studentId, questions, createdAt: new Date().toISOString() };
  db.get('quizzes').push(quiz).write();
  return quiz;
}

/** Feedback loop: grade -> update mastery ("memory") -> re-plan remaining days */
function submitQuiz(quizId, answers) {
  const quiz = db.get('quizzes').find({ id: quizId }).value();
  if (!quiz) throw new Error('Quiz not found');
  const result = gradeAttempt(quiz.questions, answers);

  db.get('quizzes').find({ id: quizId }).assign({ answers, result, submittedAt: new Date().toISOString() }).write();

  // Update mastery score: exponential moving average so repeated attempts smooth out
  const progressEntry = db.get('progress').find({ topicId: quiz.topicId }).value();
  if (progressEntry) {
    const prevMastery = progressEntry.mastery || 0;
    const newMastery = prevMastery * 0.4 + result.score * 0.6;
    db.get('progress').find({ topicId: quiz.topicId }).assign({
      mastery: +newMastery.toFixed(3),
      attempts: (progressEntry.attempts || 0) + 1,
      lastScore: result.score
    }).write();
  }

  // Re-plan: rebuild the schedule for this student using updated mastery
  const studentId = quiz.studentId;
  const activePlan = db.get('plans').find({ studentId, active: true }).value();
  let updatedPlan = null;
  if (activePlan) {
    const topics = db.get('topics').filter({ studentId }).value();
    const masteryByTopicId = {};
    db.get('progress').filter({ studentId }).value().forEach(p => { masteryByTopicId[p.topicId] = p.mastery; });

    const daysElapsed = 1; // demo: always re-plan from "today" for the remaining span
    const remainingDays = Math.max(activePlan.days - daysElapsed, 1);
    const newSchedule = scheduler.replan(topics, remainingDays, activePlan.hoursPerDay, masteryByTopicId);

    updatedPlan = db.get('plans').find({ id: activePlan.id }).assign({
      schedule: newSchedule,
      lastReplannedAt: new Date().toISOString()
    }).write();
  }

  return { result, updatedPlan };
}

function getDashboard(studentId) {
  const progress = db.get('progress').filter({ studentId }).value();
  const plan = db.get('plans').find({ studentId, active: true }).value();
  const totalTopics = progress.length;
  const masteredTopics = progress.filter(p => p.mastery >= 0.75).length;
  const weakTopics = progress.filter(p => p.mastery < 0.5).sort((a, b) => a.mastery - b.mastery).slice(0, 5);
  const avgMastery = totalTopics ? progress.reduce((s, p) => s + p.mastery, 0) / totalTopics : 0;

  return {
    plan,
    totalTopics,
    masteredTopics,
    avgMastery: +avgMastery.toFixed(3),
    weakTopics,
    progress
  };
}

module.exports = { planGoal, createQuizForTopic, submitQuiz, getDashboard };
