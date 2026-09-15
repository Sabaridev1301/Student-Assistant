import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Upload({ onDone }) {
  const [text, setText] = useState('');
  const [sourceName, setSourceName] = useState('my-notes.txt');
  const [file, setFile] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = () => api.listMaterials().then(d => setMaterials(d.materials)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  async function handleUpload(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (file) {
        await api.uploadFile(file);
      } else {
        if (!text.trim()) throw new Error('Paste some notes or choose a file first.');
        await api.uploadText(text, sourceName);
      }
      setText('');
      setFile(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Upload Study Material</h1>
      <p className="subtitle">Paste your notes or upload a .pdf / .txt file. The agent will extract topics from this in the next step.</p>

      <form className="card" onSubmit={handleUpload}>
        <label>Source name</label>
        <input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="e.g. Operating-Systems-Unit3.txt" />

        <label>Paste notes</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'Paste your syllabus or notes here.\nTip: use short heading-style lines (e.g. "Deadlocks:") to help topic extraction.'}
        />

        <label>...or upload a file (.pdf / .txt)</label>
        <input type="file" accept=".pdf,.txt" onChange={e => setFile(e.target.files[0] || null)} />

        {error && <div className="error-box">{error}</div>}
        <button disabled={loading} type="submit">{loading ? 'Uploading...' : 'Upload material'}</button>
      </form>

      <h2>Uploaded material ({materials.length})</h2>
      <div className="card">
        {materials.length === 0 && <div className="empty-state">Nothing uploaded yet.</div>}
        {materials.map(m => (
          <div key={m.materialId} className="day-item">
            {m.sourceName} <span className="hours">— {m.chars} chars</span>
          </div>
        ))}
      </div>

      {materials.length > 0 && (
        <button className="secondary" onClick={onDone}>Continue to Study Plan →</button>
      )}
    </div>
  );
}
