import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { tokens } from '../styles';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function QuizHistory({ token }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/quizzes/history/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  if (loading) return <p style={{ fontSize: 14, color: tokens.textFaint }}>Loading score history...</p>;

  return (
    <div style={{ marginTop: '24px', maxWidth: 780, marginLeft: 'auto', marginRight: 'auto' }}>
      <style>{`
        .history-table { display: table; }
        .history-cards { display: none; }
        @media (max-width: 640px) {
          .history-table { display: none; }
          .history-cards { display: flex; }
        }
      `}</style>

      <h3 style={{ marginBottom: '16px', fontSize: 'clamp(16px, 4vw, 18px)', color: tokens.text }}>
        📊 Quiz Performance History
      </h3>

      {history.length === 0 ? (
        <p style={{ fontSize: 14, color: tokens.textFaint }}>No quiz attempts yet.</p>
      ) : (
        <>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table
              className="history-table"
              style={{
                width: '100%',
                minWidth: '480px',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '14px',
                background: tokens.surface,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: tokens.surfaceHi, color: tokens.text }}>
                  <th style={{ padding: '12px 14px', borderBottom: `1px solid ${tokens.border}` }}>Date</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1px solid ${tokens.border}` }}>Score</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1px solid ${tokens.border}` }}>Percentage</th>
                  <th style={{ padding: '12px 14px', borderBottom: `1px solid ${tokens.border}` }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((att) => (
                  <tr key={att.attemptId} style={{ borderBottom: `1px solid ${tokens.border}` }}>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: tokens.textMuted }}>
                      {new Date(att.completedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 14px', color: tokens.textMuted }}>
                      {att.score} / {att.totalQuestions}
                    </td>
                    <td style={{ padding: '12px 14px', color: tokens.textMuted }}>
                      {att.percentage}%
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        fontWeight: 'bold',
                        color: att.percentage >= 60 ? tokens.success : tokens.danger,
                      }}
                    >
                      {att.percentage >= 60 ? 'PASSED' : 'FAILED'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="history-cards" style={{ flexDirection: 'column', gap: 10 }}>
            {history.map((att) => (
              <div
                key={att.attemptId}
                style={{
                  background: tokens.surface,
                  border: `1px solid ${tokens.border}`,
                  borderLeft: `3px solid ${att.percentage >= 60 ? tokens.success : tokens.danger}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: tokens.textMuted }}>
                    {new Date(att.completedAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 14, color: tokens.text, marginTop: 2 }}>
                    {att.score} / {att.totalQuestions} · {att.percentage}%
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: att.percentage >= 60 ? tokens.success : tokens.danger,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {att.percentage >= 60 ? 'PASSED' : 'FAILED'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}