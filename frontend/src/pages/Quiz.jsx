import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Quiz({ onDone }) {
  const [topics, setTopics] = useState([]);
  const [topicId, setTopicId] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPlan().then(d => setTopics(d.topics || [])).catch(() => {});
  }, []);

  async function handleGenerate() {
    if (!topicId) return setError('Pick a topic first.');
    setError('');
    setResult(null);
    setAnswers({});
    setLoading(true);
    try {
      const d = await api.generateQuiz(topicId, 5);
      setQuiz(d.quiz);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const d = await api.submitQuiz(quiz.id, answers);
      setResult(d.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Quiz</h1>
      <p className="subtitle">Auto-generated per topic from your own notes. Submitting feeds the mastery score and re-plans your remaining schedule.</p>

      <div className="card">
        <label>Topic</label>
        <select value={topicId} onChange={e => setTopicId(e.target.value)}>
          <option value="">Select a topic...</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        {error && <div className="error-box">{error}</div>}
        <button disabled={loading} onClick={handleGenerate}>{loading ? 'Working...' : 'Generate quiz'}</button>
      </div>

      {quiz && (
        <div className="card">
          {quiz.questions.map(q => (
            <div className="quiz-q" key={q.id}>
              <div><strong>{q.prompt}</strong></div>
              {q.type === 'mcq' ? (
                q.options.map(opt => {
                  const selected = answers[q.id] === opt;
                  const graded = result?.results?.find(r => r.id === q.id);
                  const cls = graded ? (selected ? (graded.correct ? 'correct' : 'incorrect') : '') : (selected ? 'selected' : '');
                  return (
                    <div
                      key={opt}
                      className={`quiz-opt ${cls}`}
                      onClick={() => !result && setAnswers(a => ({ ...a, [q.id]: opt }))}
                    >
                      {opt}
                    </div>
                  );
                })
              ) : (
                <input
                  disabled={!!result}
                  placeholder="Type your answer..."
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                />
              )}
            </div>
          ))}

          {!result ? (
            <button onClick={handleSubmit} disabled={loading}>{loading ? 'Grading...' : 'Submit quiz'}</button>
          ) : (
            <>
              <div className="card" style={{ background: 'var(--panel-2)' }}>
                Score: <strong>{result.correct}/{result.total}</strong> ({Math.round(result.score * 100)}%)
                — your schedule has been re-planned based on this attempt.
              </div>
              <button className="secondary" onClick={onDone}>See updated dashboard →</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
