/**
 * topicExtractor.js — the "Summarizer / Topic Extraction" tool.
 *
 * Called by the planning agent (agent.js) during task decomposition.
 * Splits raw uploaded text (notes / syllabus / pasted PDF text) into
 * candidate topics + a short summary + a rough difficulty estimate, with no
 * external API dependency so the project runs standalone.
 *
 * Heuristics used (typical of a lightweight, non-LLM NLP pipeline):
 *  - Headings are detected as short lines, lines ending in ':', numbered/
 *    bulleted lines, or ALL-CAPS / Title Case lines.
 *  - Everything until the next heading becomes that topic's body.
 *  - A topic's "difficulty" is estimated from body length + count of
 *    technical-looking tokens (long words, numbers, symbols).
 */

const STOPWORDS = new Set(['the','a','an','is','are','was','were','of','to','in','on','and','or','for','with','as','by','that','this','it','be','at','from','will','can']);

function looksLikeHeading(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 90) return false;
  if (/^([0-9]+[.)]|[-*•]|Unit\s+\d+|Chapter\s+\d+|Module\s+\d+)/i.test(trimmed)) return true;
  if (/:$/.test(trimmed)) return true;
  const words = trimmed.split(/\s+/);
  const titleCaseWords = words.filter(w => /^[A-Z][a-zA-Z0-9]*$/.test(w));
  if (words.length <= 8 && titleCaseWords.length / words.length >= 0.6) return true;
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && words.length <= 8) return true;
  return false;
}

function cleanHeading(line) {
  return line.trim().replace(/^([0-9]+[.)]|[-*•])\s*/, '').replace(/:$/, '');
}

function estimateDifficulty(body) {
  const words = body.split(/\s+/).filter(Boolean);
  const longWords = words.filter(w => w.replace(/[^a-zA-Z]/g, '').length >= 8).length;
  const numeric = (body.match(/\d/g) || []).length;
  const score = words.length * 0.4 + longWords * 3 + numeric * 0.5;
  if (score < 40) return 'easy';
  if (score < 120) return 'medium';
  return 'hard';
}

function summarize(body, maxSentences = 2) {
  const sentences = body.replace(/\s+/g, ' ').split(/(?<=[.?!])\s+/).filter(Boolean);
  if (sentences.length <= maxSentences) return sentences.join(' ').trim();
  // naive extractive summary: score sentences by frequency of non-stopword tokens
  const freq = {};
  sentences.forEach(s => {
    s.toLowerCase().split(/\W+/).forEach(tok => {
      if (tok && !STOPWORDS.has(tok)) freq[tok] = (freq[tok] || 0) + 1;
    });
  });
  const scored = sentences.map((s, i) => {
    const score = s.toLowerCase().split(/\W+/).reduce((acc, tok) => acc + (freq[tok] || 0), 0);
    return { s, i, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, maxSentences).sort((a, b) => a.i - b.i);
  return top.map(t => t.s).join(' ').trim();
}

/**
 * @param {string} rawText
 * @returns {{title: string, body: string, summary: string, difficulty: 'easy'|'medium'|'hard'}[]}
 */
function extractTopics(rawText) {
  const lines = rawText.split(/\r?\n/);
  const sections = [];
  let current = { title: 'Overview', bodyLines: [] };

  for (const line of lines) {
    if (looksLikeHeading(line)) {
      if (current.bodyLines.join('').trim().length > 0 || current.title !== 'Overview') {
        sections.push(current);
      }
      current = { title: cleanHeading(line), bodyLines: [] };
    } else {
      current.bodyLines.push(line);
    }
  }
  sections.push(current);

  const topics = sections
    .map(sec => {
      const body = sec.bodyLines.join(' ').replace(/\s+/g, ' ').trim();
      if (!body && sec.title === 'Overview') return null;
      return {
        title: sec.title,
        body: body || sec.title,
        summary: summarize(body || sec.title),
        difficulty: estimateDifficulty(body || sec.title)
      };
    })
    .filter(Boolean);

  // Fallback: no headings detected at all -> chunk by paragraph
  if (topics.length <= 1) {
    const paras = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (paras.length > 1) {
      return paras.map((p, i) => ({
        title: `Topic ${i + 1}`,
        body: p,
        summary: summarize(p),
        difficulty: estimateDifficulty(p)
      }));
    }
  }
  return topics;
}

module.exports = { extractTopics, summarize, estimateDifficulty };
