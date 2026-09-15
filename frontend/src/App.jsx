import { useState } from 'react';
import Upload from './pages/Upload.jsx';
import Plan from './pages/Plan.jsx';
import Quiz from './pages/Quiz.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Chat from './pages/Chat.jsx';

const TABS = [
  { key: 'upload', label: '1. Upload Material' },
  { key: 'plan', label: '2. Study Plan' },
  { key: 'quiz', label: '3. Quiz' },
  { key: 'dashboard', label: '4. Dashboard' },
  { key: 'chat', label: '5. Ask a Doubt' }
];

export default function App() {
  const [tab, setTab] = useState('upload');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">AI Study Assistant</div>
        <div className="brand-sub">Agentic AI · RAG + Memory + Tools</div>
        {TABS.map(t => (
          <div
            key={t.key}
            className={`nav-link ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </div>
        ))}
      </aside>
      <main className="main">
        {tab === 'upload' && <Upload onDone={() => setTab('plan')} />}
        {tab === 'plan' && <Plan onGoToQuiz={() => setTab('quiz')} />}
        {tab === 'quiz' && <Quiz onDone={() => setTab('dashboard')} />}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'chat' && <Chat />}
      </main>
    </div>
  );
}
