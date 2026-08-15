import React, { useState, useEffect, useRef } from "react";
import { Menu, Sparkles, Send } from "lucide-react";
import { api } from "../api";
import { tokens } from "../styles";

function EvidenceCard({ source, index }) {
  return (
    <div
      style={{
        background: tokens.inkElevated,
        border: `1px solid ${tokens.border}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12.5,
        color: tokens.textMuted,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 600,
          color: tokens.teal,
        }}
      >
        <span>Source [{index + 1}]</span>
        {source.page && (
          <span style={{ fontSize: 11, color: tokens.textFaint }}>
            Page {source.page}
          </span>
        )}
      </div>
      <div style={{ lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
        {typeof source === 'string' ? source : source.text || source.snippet || JSON.stringify(source)}
      </div>
    </div>
  );
}

export default function ChatPanel({ document, onOpenSidebar }) {
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [thread, setThread] = useState([]);
  const threadEndRef = useRef(null);

  useEffect(() => {
    setThread([]);
    setQuestion('');
  }, [document?.documentId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread, asking]);

  async function handleAsk() {
    const q = question.trim();
    if (!document || !q) return;

    setThread((t) => [...t, { question: q, answer: null, sources: null, error: null }]);
    setQuestion('');
    setAsking(true);

    try {
      const response = await api.ask(document.documentId, q);
      const answer = response?.answer || (typeof response === 'string' ? response : 'No response text received.');
      const sources = response?.sources || [];

      setThread((t) => {
        const copy = [...t];
        copy[copy.length - 1] = { question: q, answer, sources, error: null };
        return copy;
      });
    } catch (err) {
      setThread((t) => {
        const copy = [...t];
        copy[copy.length - 1] = {
          question: q,
          answer: null,
          sources: null,
          error: err?.message || 'Failed to get answer. Please try again.',
        };
        return copy;
      });
    } finally {
      setAsking(false);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        position: 'relative',
        zIndex: 1,
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .chat-mobile-header { display: flex !important; }
          .chat-empty-cta { display: inline-flex !important; }
        }
        .chat-input:focus { border-color: ${tokens.teal} !important; }
        .chat-send-btn { transition: filter 0.15s ease, transform 0.1s ease; }
        .chat-send-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .chat-send-btn:active:not(:disabled) { transform: scale(0.97); }
      `}</style>

      <div
        className="chat-mobile-header"
        style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          marginBottom: 10,
          border: `1px solid ${tokens.border}`,
          background: tokens.surface,
          borderRadius: 8,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onOpenSidebar}
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: tokens.teal,
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '7px 12px',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 13,
            minHeight: 36,
          }}
        >
          <Menu size={18} />
          <span>Files</span>
        </button>

        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: tokens.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 160,
            whiteSpace: 'nowrap',
          }}
        >
          {document?.filename || 'No File Selected'}
        </span>
      </div>

      {!document ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.textFaint,
            fontSize: 14,
            background: tokens.surface,
            padding: 24,
            textAlign: 'center',
            borderRadius: 10,
            gap: 16,
            border: `1px solid ${tokens.border}`,
          }}
        >
          <p style={{ margin: 0, maxWidth: 320, lineHeight: 1.5 }}>
            Select a file from the menu, or upload a new PDF to start asking questions.
          </p>
          <button
            onClick={onOpenSidebar}
            type="button"
            className="chat-empty-cta"
            style={{
              display: 'none',
              alignItems: 'center',
              gap: 8,
              background: tokens.teal,
              color: '#ffffff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            <Menu size={16} />
            <span>Open Files Menu</span>
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              paddingRight: 4,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {document.summary && (
              <div
                style={{
                  background: tokens.surface,
                  border: `1px solid ${tokens.border}`,
                  borderLeft: `3px solid ${tokens.brass}`,
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: tokens.textFaint,
                    marginBottom: 6,
                  }}
                >
                  <Sparkles size={12} color={tokens.brass} />
                  Summary — {document.filename}
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: tokens.textMuted,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {document.summary}
                </div>
              </div>
            )}

            <div
              style={{
                flex: 1,
                background: tokens.surface,
                border: `1px solid ${tokens.border}`,
                borderRadius: 10,
                padding: thread.length ? '14px' : '0px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {thread.length === 0 ? (
                <div
                  style={{
                    margin: 'auto',
                    textAlign: 'center',
                    padding: '30px 16px',
                    color: tokens.textFaint,
                    fontSize: 13.5,
                  }}
                >
                  Ask any question about this document below.
                </div>
              ) : (
                thread.map((t, i) => (
                  <div key={i}>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: tokens.textFaint,
                        marginBottom: 4,
                      }}
                    >
                      Q{i + 1}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: tokens.text,
                        marginBottom: 8,
                      }}
                    >
                      {t.question}
                    </div>

                    {t.error ? (
                      <div style={{ fontSize: 13, color: tokens.danger }}>
                        {t.error}
                      </div>
                    ) : t.answer ? (
                      <>
                        <div
                          style={{
                            background: tokens.inkElevated,
                            border: `1px solid ${tokens.border}`,
                            borderLeft: `3px solid ${tokens.teal}`,
                            borderRadius: 8,
                            padding: '10px 12px',
                            fontSize: 13.5,
                            lineHeight: 1.6,
                            color: tokens.textMuted,
                            whiteSpace: 'pre-wrap',
                            marginBottom: t.sources?.length ? 12 : 0,
                          }}
                        >
                          {t.answer}
                        </div>

                        {t.sources?.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 10,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: tokens.textFaint,
                                marginBottom: 8,
                              }}
                            >
                              Citations ({t.sources.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {t.sources.map((s, si) => (
                                <EvidenceCard key={si} source={s} index={si} />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: tokens.textFaint }}>
                        Thinking…
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={threadEndRef} />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
              flexShrink: 0,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <textarea
              className="chat-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              placeholder="Ask a question..."
              rows={2}
              style={{
                flex: 1,
                resize: 'none',
                fontFamily: "'Inter', sans-serif",
                fontSize: 16,
                padding: '10px 12px',
                border: `1px solid ${tokens.border}`,
                borderRadius: 8,
                background: tokens.inkElevated,
                color: tokens.text,
                outline: 'none',
              }}
            />
            <button
              className="chat-send-btn"
              onClick={handleAsk}
              type="button"
              disabled={asking || !question.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: tokens.teal,
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '0 14px',
                height: 48,
                fontWeight: 600,
                fontSize: 13,
                cursor: asking || !question.trim() ? 'not-allowed' : 'pointer',
                opacity: asking || !question.trim() ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <Send size={15} />
              <span>Ask</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}