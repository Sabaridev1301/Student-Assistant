import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.getDashboard().then(setData).catch(err => setError(err.message));
  }
  useEffect(() => { load(); }, []);

  if (error) return <div className="error-box">{error}</div>;
  if (!data) return <div className="empty-state">Loading...</div>;

  return (
    <div>
      <h1>Progress Dashboard</h1>
      <p className="subtitle">Mastery score is the "memory" the agent uses to re-plan — it's an exponential moving average of your quiz results per topic.</p>

      <div className="card" style={{ display: 'flex', gap: 40 }}>
        <div>
          <div className="empty-state">Topics mastered</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{data.masteredTopics}/{data.totalTopics}</div>
        </div>
        <div>
          <div className="empty-state">Average mastery</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{Math.round(data.avgMastery * 100)}%</div>
        </div>
        {data.plan && (
          <div>
            <div className="empty-state">Active goal</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{data.plan.examName}</div>
          </div>
        )}
      </div>

      <h2>Per-topic mastery</h2>
      <div className="card">
        {data.progress.length === 0 && <div className="empty-state">Build a plan first.</div>}
        {data.progress.map(p => (
          <div key={p.topicId} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{p.title}</span>
              <span className="empty-state">{Math.round(p.mastery * 100)}% · {p.attempts} attempt{p.attempts === 1 ? '' : 's'}</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${Math.round(p.mastery * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {data.weakTopics.length > 0 && (
        <>
          <h2>Needs revision</h2>
          <div className="card">
            {data.weakTopics.map(t => (
              <div key={t.topicId} className="day-item">{t.title} — {Math.round(t.mastery * 100)}% mastery</div>
            ))}
          </div>
        </>
      )}

      <button className="secondary" onClick={load}>Refresh</button>
    </div>
  );
}
