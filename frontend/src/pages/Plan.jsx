import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Plan({ onGoToQuiz }) {
  const [examName, setExamName] = useState('');
  const [days, setDays] = useState(5);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [plan, setPlan] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPlan().then(d => { setPlan(d.plan); setTopics(d.topics || []); }).catch(() => {});
  }, []);

  async function handleBuild(e) {
    e.preventDefault();
    setError('');
    if (!examName.trim()) return setError('Give your exam/goal a name.');
    setLoading(true);
    try {
      const d = await api.buildPlan(examName, Number(days), Number(hoursPerDay));
      setPlan(d.plan);
      setTopics(d.topics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Study Plan</h1>
      <p className="subtitle">State your goal. The planning agent breaks it into topics and builds a day-wise schedule (Tools: Summarizer + Scheduler).</p>

      <form className="card" onSubmit={handleBuild}>
        <label>Exam / goal name</label>
        <input value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Operating Systems Mid-Semester Exam" />
        <label>Days available</label>
        <input type="number" min="1" max="30" value={days} onChange={e => setDays(e.target.value)} />
        <label>Hours available per day</label>
        <input type="number" min="0.5" max="12" step="0.5" value={hoursPerDay} onChange={e => setHoursPerDay(e.target.value)} />
        {error && <div className="error-box">{error}</div>}
        <button disabled={loading} type="submit">{loading ? 'Planning...' : plan ? 'Rebuild plan from scratch' : 'Build my plan'}</button>
      </form>

      {plan && (
        <>
          <h2>{plan.examName} — {plan.schedule.length}-day plan ({plan.hoursPerDay} hrs/day)</h2>
          <div className="day-grid">
            {plan.schedule.map(d => (
              <div className="day-col" key={d.day}>
                <div className="day-title">Day {d.day} <span className="hours">({d.totalHours}h)</span></div>
                {d.items.map((it, i) => (
                  <div className="day-item" key={i}>
                    {it.title}
                    <div className="hours">{it.hours}h</div>
                  </div>
                ))}
                {d.items.length === 0 && <div className="empty-state">Free day</div>}
              </div>
            ))}
          </div>

          <h2>Topics extracted ({topics.length})</h2>
          <div className="card">
            {topics.map(t => (
              <div key={t.id} className="day-item">
                <strong>{t.title}</strong>
                <span className={`pill ${t.difficulty}`}>{t.difficulty}</span>
                <div style={{ marginTop: 6, color: 'var(--muted)' }}>{t.summary}</div>
              </div>
            ))}
          </div>

          <button className="secondary" onClick={onGoToQuiz}>Continue to Quiz →</button>
        </>
      )}
    </div>
  );
}
