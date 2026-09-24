import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
const categories = ['air_conditioning','brake_system','cooling_system','electrical_battery','engine_mechanical','tires_suspension','transmission'];

export default function MlModelPanel() {
  const { getAuthHeaders, handleAuthExpiry } = useApp();
  const [rows, setRows] = useState([]);
  const [report, setReport] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [output, setOutput] = useState('');
  async function api(path, method = 'GET', body) {
    const response = await fetch('/api/admin/ml/' + path, { method, headers: getAuthHeaders(),
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) handleAuthExpiry?.();
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }
  async function refresh() {
    const [candidates, evaluation, state] = await Promise.all([api('candidates'), api('evaluation'), api('model-info')]);
    setRows(candidates.map(c => ({ ...c, reviewedCategory: c.reviewedCategory || c.faultName || '' })));
    setReport(evaluation); setInfo(state);
  }
  useEffect(() => { refresh().catch(e => setError(e.message)); }, []);
  async function action(path, body) {
    setBusy(true); setError('');
    try {
      const result = await api(path, 'POST', body);
      setOutput(result.output || `Review saved: ${result.status}`);
      await refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  function edit(id, field, value) {
    setRows(prev => prev.map(row => row.diagnosisId === id ? { ...row, [field]: value } : row));
  }
  const metrics = report?.evaluation;
  return <section className="card" style={{ padding: '1.5rem' }}>
    <h2>ML model review and training</h2>
    <p>Review symptom text and correct its category before training. Remove names, contact details and other personal information. Use English text for this small English classifier.</p>
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    <p><strong>Serving model:</strong> {info?.servingVersion || 'Loading…'} · Last action: {info?.status || '—'}</p>
    {metrics && <div style={{ overflowX: 'auto' }}>
      <p>Accuracy: {(metrics.accuracy * 100).toFixed(2)}% · Macro-F1: {metrics.macro_f1.toFixed(4)} · Training: {report.train_samples} · Evaluation: {report.test_samples}</p>
      <p>These results are from a small development benchmark reused for model selection, not verified real-world diagnostic accuracy.</p>
      <table className="custom-table"><thead><tr><th>Actual / predicted</th>{metrics.classes.map(c => <th key={c}>{c.replaceAll('_',' ')}</th>)}</tr></thead>
        <tbody>{metrics.confusion_matrix.map((row, i) => <tr key={metrics.classes[i]}><th>{metrics.classes[i].replaceAll('_',' ')}</th>{row.map((n, k) => <td key={k}>{n}</td>)}</tr>)}</tbody>
      </table>
    </div>}
    <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', margin: '1rem 0' }}>
      <button className="btn btn-primary" disabled={busy} onClick={() => action('retrain')}>{busy ? 'Working…' : 'Train approved examples'}</button>
      <button className="btn btn-outline" disabled={busy} onClick={() => action('rollback')}>Restore baseline model</button>
      <button className="btn btn-outline" disabled={busy} onClick={() => refresh().catch(e => setError(e.message))}>Refresh</button>
    </div>
    {output && <details><summary>Last operation details</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{output}</pre></details>}
    <h3 style={{ marginTop: '1rem' }}>Review completed diagnoses</h3>
    {!rows.length && <p>No completed diagnoses to review yet.</p>}
    {rows.map(row => <div key={row.diagnosisId} style={{ borderTop: '1px solid #cbd5e1', padding: '1rem 0' }}>
      <p>Diagnosis #{row.diagnosisId} · {row.status}</p>
      <label>Reviewed symptom text<textarea style={{ width: '100%', minHeight: 85 }} maxLength={4000}
        value={row.symptomText || ''} disabled={busy} onChange={e => edit(row.diagnosisId, 'symptomText', e.target.value)} /></label>
      <label>Correct category <select value={row.reviewedCategory} disabled={busy} onChange={e => edit(row.diagnosisId, 'reviewedCategory', e.target.value)}>
        <option value="">Select category</option>{categories.map(c => <option key={c} value={c}>{c.replaceAll('_',' ')}</option>)}
      </select></label>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button className="btn btn-primary" disabled={busy || !row.reviewedCategory || !row.symptomText?.trim()}
          onClick={() => action(`candidates/${row.diagnosisId}/approve`, { reviewedCategory: row.reviewedCategory, symptomText: row.symptomText })}>Approve reviewed example</button>
        <button className="btn btn-outline" disabled={busy} onClick={() => action(`candidates/${row.diagnosisId}/reject`)}>Reject</button>
      </div>
    </div>)}
  </section>;
}
