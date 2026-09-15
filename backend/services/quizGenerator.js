/**
 * quizGenerator.js — the "Quiz Generator" tool.
 *
 * Given a topic's body text, produces multiple-choice and short-answer
 * questions by masking key terms in extracted sentences (classic
 * template-based quiz generation — no external API required).
 */
const STOPWORDS = new Set(['the','a','an','is','are','was','were','of','to','in','on','and','or','for','with','as','by','that','this','it','be','at','from','will','can','these','those','their','its']);

function pickKeyTerms(body, count) {
  const words = body.match(/[A-Za-z][A-Za-z-]{3,}/g) || [];
  const freq = {};
  words.forEach(w => {
    const lw = w.toLowerCase();
    if (STOPWORDS.has(lw)) return;
    freq[lw] = (freq[lw] || 0) + 1;
  });
  const ranked = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([w]) => w);
  return ranked.slice(0, count);
}

function findOriginalCasing(body, lowerTerm) {
  const re = new RegExp(`\\b${lowerTerm}\\b`, 'i');
  const match = body.match(re);
  return match ? match[0] : lowerTerm;
}

function makeDistractors(term, pool) {
  const others = pool.filter(w => w.toLowerCase() !== term.toLowerCase());
  const shuffled = others.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

/**
 * @param {{title:string, body:string}} topic
 * @param {number} count
 */
function generateQuiz(topic, count = 5) {
  const sentences = topic.body.replace(/\s+/g, ' ').split(/(?<=[.?!])\s+/).filter(s => s.split(' ').length >= 6);
  const keyTerms = pickKeyTerms(topic.body, Math.max(count * 2, 8));
  const questions = [];

  for (const sentence of sentences) {
    if (questions.length >= count) break;
    const termHit = keyTerms.find(t => new RegExp(`\\b${t}\\b`, 'i').test(sentence));
    if (!termHit) continue;
    const original = findOriginalCasing(sentence, termHit);
    const blanked = sentence.replace(new RegExp(`\\b${termHit}\\b`, 'i'), '_____');
    const distractors = makeDistractors(termHit, keyTerms);
    if (distractors.length < 2) continue;
    const options = [...distractors, termHit].map(w => w).sort(() => Math.random() - 0.5);
    questions.push({
      id: `${topic.title}-${questions.length + 1}`.toLowerCase().replace(/\s+/g, '-'),
      type: 'mcq',
      prompt: blanked,
      options,
      answer: termHit,
      originalCasing: original
    });
  }

  // Fill remaining slots with short-answer "define this term" questions
  let ti = 0;
  while (questions.length < count && ti < keyTerms.length) {
    const term = keyTerms[ti++];
    if (questions.some(q => q.answer === term)) continue;
    questions.push({
      id: `${topic.title}-sa-${questions.length + 1}`.toLowerCase().replace(/\s+/g, '-'),
      type: 'short-answer',
      prompt: `In your own words, explain the role of "${term}" in "${topic.title}".`,
      answer: term
    });
  }

  return questions;
}

/** Grade a submitted quiz attempt; short-answer questions get partial credit if the key term appears. */
function gradeAttempt(questions, answers) {
  let correct = 0;
  const results = questions.map(q => {
    const given = (answers[q.id] || '').toString().trim().toLowerCase();
    let isCorrect;
    if (q.type === 'mcq') {
      isCorrect = given === q.answer.toLowerCase();
    } else {
      isCorrect = given.includes(q.answer.toLowerCase());
    }
    if (isCorrect) correct++;
    return { id: q.id, correct: isCorrect };
  });
  const score = questions.length ? correct / questions.length : 0;
  return { score, correct, total: questions.length, results };
}

module.exports = { generateQuiz, gradeAttempt };
