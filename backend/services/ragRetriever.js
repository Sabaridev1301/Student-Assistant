/**
 * ragRetriever.js — the retrieval half of the "RAG-based chat assistant".
 *
 * Chunks every uploaded material into passages and scores them against the
 * student's question with TF-IDF-style term overlap. The top passages are
 * returned as grounded context; chat.js's route composes the final answer
 * from that context (and will call out to an LLM instead, if
 * ANTHROPIC_API_KEY is set — see chat.js).
 */
const STOPWORDS = new Set(['the','a','an','is','are','was','were','of','to','in','on','and','or','for','with','as','by','that','this','it','be','at','from','will','can','what','how','why','does','do','explain','tell','me','about']);

function chunk(text, maxWords = 60) {
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.?!])\s+/).filter(Boolean);
  const chunks = [];
  let buf = [];
  let wc = 0;
  for (const s of sentences) {
    const words = s.split(' ').length;
    if (wc + words > maxWords && buf.length) {
      chunks.push(buf.join(' '));
      buf = [];
      wc = 0;
    }
    buf.push(s);
    wc += words;
  }
  if (buf.length) chunks.push(buf.join(' '));
  return chunks;
}

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z][a-z-]{2,}/g) || []).filter(w => !STOPWORDS.has(w));
}

/**
 * @param {Array<{materialId, sourceName, text}>} materials
 * @param {string} question
 * @param {number} topK
 */
function retrieve(materials, question, topK = 3) {
  const qTokens = tokenize(question);
  if (!qTokens.length) return [];

  const allChunks = [];
  materials.forEach(m => {
    chunk(m.text).forEach((c, idx) => {
      allChunks.push({ materialId: m.materialId, sourceName: m.sourceName, chunkIndex: idx, text: c });
    });
  });

  const scored = allChunks.map(c => {
    const cTokens = tokenize(c.text);
    const cSet = new Set(cTokens);
    let overlap = 0;
    qTokens.forEach(t => { if (cSet.has(t)) overlap++; });
    const score = overlap / Math.sqrt(cTokens.length || 1);
    return { ...c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(c => c.score > 0).slice(0, topK);
}

module.exports = { retrieve, chunk, tokenize };
