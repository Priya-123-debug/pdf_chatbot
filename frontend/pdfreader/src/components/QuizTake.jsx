import React, { useState } from 'react';
import axios from 'axios';
import { tokens } from '../styles';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function QuizTake({ quiz, token, onQuizSubmitted }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleOptionSelect = (questionId, optionIndex) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    const formattedAnswers = Object.keys(answers).map((qId) => ({
      questionId: qId,
      selectedIndex: answers[qId],
    }));

    if (formattedAnswers.length < quiz.questions.length) {
      if (!window.confirm("You haven't answered all questions. Submit anyway?")) return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_BASE}/quizzes/${quiz.quizId}/submit`,
        { userAnswers: formattedAnswers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
      if (onQuizSubmitted) onQuizSubmitted();
    } catch (err) {
      alert('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '680px',
        width: '100%',
        margin: '16px auto',
        padding: '22px 18px',
        borderRadius: '14px',
        backgroundColor: tokens.surface,
        border: `1px solid ${tokens.border}`,
        color: tokens.text,
        boxSizing: 'border-box',
      }}
    >
      <h2 style={{ color: tokens.text, marginTop: 0, marginBottom: '20px', fontSize: 'clamp(19px, 4vw, 23px)' }}>
        {quiz.title}
      </h2>

      {result && (
        <div
          style={{
            backgroundColor: tokens.inkElevated,
            border: `1px solid ${result.percentage >= 60 ? tokens.success : tokens.danger}`,
            padding: '16px',
            borderRadius: '10px',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ margin: 0, color: result.percentage >= 60 ? tokens.success : tokens.danger, fontSize: 'clamp(16px, 4vw, 18px)' }}>
            Score: {result.score} / {result.totalQuestions} ({result.percentage}%)
          </h3>
          <p style={{ color: tokens.textMuted, margin: '8px 0 0 0', fontSize: '14px' }}>
            {result.percentage >= 60 ? '🎉 Great Job!' : '📖 Review the explanations below:'}
          </p>
        </div>
      )}

      {quiz.questions.map((q, qIndex) => {
        const gradedInfo = result?.breakdown?.find((b) => b.questionId === q.questionId);

        return (
          <div
            key={q.questionId}
            style={{
              marginBottom: '24px',
              borderBottom: `1px solid ${tokens.border}`,
              paddingBottom: '20px',
            }}
          >
            <p style={{ color: tokens.text, fontSize: '15px', lineHeight: 1.5, marginBottom: '14px' }}>
              <strong>Q{qIndex + 1}: {q.questionText}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {q.options.map((opt, oIndex) => {
                const isSelected = answers[q.questionId] === oIndex;

                let bgColor = tokens.inkElevated;
                let borderColor = tokens.border;
                let textColor = tokens.text;

                if (result && gradedInfo) {
                  if (oIndex === gradedInfo.correctIndex) {
                    bgColor = tokens.successSoft;
                    borderColor = tokens.success;
                    textColor = tokens.text;
                  } else if (isSelected && !gradedInfo.isCorrect) {
                    bgColor = tokens.dangerSoft;
                    borderColor = tokens.danger;
                    textColor = tokens.text;
                  }
                } else if (isSelected) {
                  bgColor = tokens.tealSoft;
                  borderColor = tokens.teal;
                  textColor = tokens.text;
                }

                return (
                  <button
                    key={oIndex}
                    onClick={() => handleOptionSelect(q.questionId, oIndex)}
                    style={{
                      padding: '13px 14px',
                      textAlign: 'left',
                      backgroundColor: bgColor,
                      border: `2px solid ${borderColor}`,
                      color: textColor,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: result ? 'default' : 'pointer',
                      transition: 'all 0.15s ease-in-out',
                      minHeight: '46px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {gradedInfo && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  backgroundColor: tokens.inkElevated,
                  borderRadius: '6px',
                  borderLeft: `4px solid ${tokens.brass}`,
                }}
              >
                <p style={{ margin: 0, fontSize: '13.5px', color: tokens.textMuted, fontStyle: 'italic' }}>
                  💡 {gradedInfo.explanation}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {!result && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: tokens.success,
            color: '#0C0A08',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: submitting ? 'not-allowed' : 'pointer',
            marginTop: '10px',
            minHeight: 50,
          }}
        >
          {submitting ? 'Grading Answers...' : 'Submit Quiz'}
        </button>
      )}
    </div>
  );
}