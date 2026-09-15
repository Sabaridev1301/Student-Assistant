/**
 * db.js — persistence layer.
 *
 * The project report (and README) describe this as a MERN-stack app, and the
 * schemas below are written the way Mongoose schemas would be, on purpose:
 * swapping this file for a real `mongoose.connect(...)` + models is a drop-in
 * change (see README "Swapping in MongoDB"). For a 5-day build/demo, a
 * JSON-file store (lowdb) removes the need for a running Mongo instance while
 * keeping the exact same data shapes and the exact same "memory" behaviour
 * the agent relies on (mastery scores, chat history, plans all persist
 * across restarts).
 */
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, '..', 'data', 'db.json'));
const db = low(adapter);

db.defaults({
  materials: [],   // uploaded notes/syllabus text, chunked
  topics: [],      // topics extracted from materials
  plans: [],       // day-wise study plans (one active per student)
  quizzes: [],     // generated quizzes + student answers
  progress: [],    // per-topic mastery scores ("memory" of how the student is doing)
  chats: []        // RAG chat history, grounded in materials
}).write();

module.exports = db;
