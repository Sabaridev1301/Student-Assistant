import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Chat() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getChatHistory().then(d => setHistory(d.chats || [])).catch(() => {});
  }, []);

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setError('');
    setLoading(true);
    const q = question;
    setQuestion('');
    try {
      const d = await api.askChat(q);
      setHistory(h => [...h, { question: q, answer: d.answer, sources: d.sources }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Ask a Doubt</h1>
      <p className="subtitle">Retrieval-augmented chat, grounded only in your uploaded material (RAG). Set ANTHROPIC_API_KEY on the backend for LLM-composed answers; otherwise runs fully offline.</p>

      <div className="card">
        {history.length === 0 && <div className="empty-state">Ask something about your uploaded notes.</div>}
        {history.map((c, i) => (
          <div key={i} className="chat-msg">
            <div className="chat-q">Q: {c.question}</div>
            <div className="chat-a">{c.answer}</div>
            {c.sources?.length > 0 && (
              <div className="chat-sources">Grounded in: {c.sources.map(s => s.sourceName).join(', ')}</div>
            )}
          </div>
        ))}
      </div>

      <form className="card" onSubmit={handleAsk} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <input
          style={{ flex: 1 }}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="e.g. What are the conditions for a deadlock?"
        />
        <button disabled={loading} type="submit" style={{ marginTop: 0 }}>{loading ? '...' : 'Ask'}</button>
      </form>
      {error && <div className="error-box">{error}</div>}
    </div>
  );
}
