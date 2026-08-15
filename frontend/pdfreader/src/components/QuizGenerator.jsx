import React, { useState } from 'react';
import axios from 'axios';
import { tokens } from '../styles';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function QuizGenerator({ documentId, token, onQuizGenerated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateQuiz = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(
        `${API_BASE}/quizzes/generate/${documentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onQuizGenerated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: '16px 0', maxWidth: 680, marginLeft: 'auto', marginRight: 'auto' }}>
      <button
        onClick={handleGenerateQuiz}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px 18px',
          backgroundColor: tokens.teal,
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 14.5,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          minHeight: 48,
        }}
      >
        {loading ? 'Generating Quiz with AI…' : '🎯 Take Quiz on this PDF'}
      </button>
      {error && <p style={{ color: tokens.danger, fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}