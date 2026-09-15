const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../services/db');
const { retrieve } = require('../services/ragRetriever');

const router = express.Router();

/**
 * Compose a grounded answer from retrieved passages.
 * If ANTHROPIC_API_KEY is set in the environment, this delegates the final
 * wording to Claude (still constrained to the retrieved context, i.e. still
 * RAG); otherwise it falls back to an extractive template so the project
 * runs with zero external dependencies or API keys.
 */
async function composeAnswer(question, passages) {
  if (!passages.length) {
    return "I couldn't find anything about that in your uploaded material yet — try uploading the relevant notes first, or rephrase the question.";
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const context = passages.map((p, i) => `[${i + 1}] (${p.sourceName}) ${p.text}`).join('\n\n');
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `Answer the student's question using ONLY the context below. Cite passage numbers like [1]. If the context doesn't cover it, say so.\n\nContext:\n${context}\n\nQuestion: ${question}`
          }]
        })
      });
      const data = await resp.json();
      const text = data?.content?.find(c => c.type === 'text')?.text;
      if (text) return text;
    } catch (err) {
      console.error('LLM call failed, falling back to extractive answer:', err.message);
    }
  }

  // Extractive fallback: no API key needed to run the project.
  const lead = passages[0];
  const rest = passages.slice(1);
  let answer = `Based on your notes (${lead.sourceName}): ${lead.text}`;
  if (rest.length) {
    answer += `\n\nRelated context: ` + rest.map(p => p.text).join(' ');
  }
  return answer;
}

// POST /api/chat — { studentId, question }
router.post('/', async (req, res) => {
  try {
    const { studentId = 'demo-student', question } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ error: 'question is required.' });

    const materials = db.get('materials').filter({ studentId }).value()
      .map(m => ({ materialId: m.materialId, sourceName: m.sourceName, text: m.text }));

    const passages = retrieve(materials, question, 3);
    const answer = await composeAnswer(question, passages);

    const entry = {
      id: nanoid(8),
      studentId,
      question,
      answer,
      sources: passages.map(p => ({ sourceName: p.sourceName, excerpt: p.text.slice(0, 160) })),
      askedAt: new Date().toISOString()
    };
    db.get('chats').push(entry).write();

    res.json({ answer, sources: entry.sources });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to answer question.', detail: err.message });
  }
});

// GET /api/chat?studentId=...  — chat history
router.get('/', (req, res) => {
  const studentId = req.query.studentId || 'demo-student';
  const chats = db.get('chats').filter({ studentId }).value();
  res.json({ chats });
});

module.exports = router;
