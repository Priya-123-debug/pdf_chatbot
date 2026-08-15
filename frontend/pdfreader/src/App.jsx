import { useEffect, useState } from 'react';
import { Menu, MessageSquare, HelpCircle, History, FileText, Sparkles } from 'lucide-react';
import { api, loadSession } from './api';
import { tokens } from './styles';

import Login from './components/Login';
import Signup from './components/Signup';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import QuizGenerator from './components/QuizGenerator';
import QuizTake from './components/QuizTake';
import QuizHistory from './components/QuizHistory';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [authView, setAuthView] = useState('login');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Mobile Drawer State — Sidebar itself owns rendering the drawer/backdrop;
  // this is just the open/closed flag.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Quiz & Tab States
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'quiz' | 'history'
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setUser(session.user);
      setToken(session.token);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDoc(null);
      setActiveQuiz(null);
      return;
    }
    api.listDocuments().then((docs) => {
      setSelectedDoc(docs.find((d) => d.documentId === selectedId) || null);
    });
    setActiveQuiz(null);
    setSidebarOpen(false); // Close mobile drawer when document is selected
  }, [selectedId]);

  if (!user) {
    return authView === 'login' ? (
      <Login
        onAuth={(u) => {
          setUser(u);
          const session = loadSession();
          if (session) setToken(session.token);
        }}
        goToSignup={() => setAuthView('signup')}
      />
    ) : (
      <Signup
        onAuth={(u) => {
          setUser(u);
          const session = loadSession();
          if (session) setToken(session.token);
        }}
        goToLogin={() => setAuthView('login')}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: tokens.ink,
        color: tokens.text,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }

        .mobile-toggle-btn { display: none; }
        .user-name-desktop { display: inline; }
        .tab-label { display: inline; }

        @media (max-width: 768px) {
          .mobile-toggle-btn { display: flex !important; }
          .user-name-desktop { display: none !important; }
        }
        @media (max-width: 420px) {
          .tab-label { display: none !important; }
          .app-header-file { display: none !important; }
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .nav-tab { transition: background-color 0.15s ease, color 0.15s ease; }
      `}</style>

      {/* Sidebar owns its own drawer + backdrop behaviour on mobile; on
          desktop it just renders inline as a normal flex child. */}
      <Sidebar
        user={user}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onLogout={() => {
          setUser(null);
          setToken('');
          setSelectedId(null);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minWidth: 0,
          backgroundColor: tokens.ink,
        }}
      >
        <header
          style={{
            minHeight: 60,
            padding: '10px 16px',
            borderBottom: `1px solid ${tokens.border}`,
            backgroundColor: tokens.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              className="mobile-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle Files Menu"
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
                background: tokens.inkElevated,
                border: `1px solid ${tokens.border}`,
                borderRadius: 8,
                color: tokens.text,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Menu size={20} />
            </button>

            <div className="app-header-file" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <FileText size={18} color={tokens.teal} style={{ flexShrink: 0 }} />
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: selectedDoc ? tokens.text : tokens.textFaint,
                }}
              >
                {selectedDoc ? selectedDoc.filename : 'No File Selected'}
              </span>
            </div>
          </div>

          {selectedDoc && (
            <nav className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
              <button
                className="nav-tab"
                onClick={() => setActiveTab('chat')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: activeTab === 'chat' ? tokens.teal : 'transparent',
                  color: activeTab === 'chat' ? '#ffffff' : tokens.textMuted,
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minHeight: 34,
                }}
              >
                <MessageSquare size={15} />
                <span className="tab-label">Chat</span>
              </button>

              <button
                className="nav-tab"
                onClick={() => setActiveTab('quiz')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: activeTab === 'quiz' ? tokens.teal : 'transparent',
                  color: activeTab === 'quiz' ? '#ffffff' : tokens.textMuted,
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minHeight: 34,
                }}
              >
                <HelpCircle size={15} />
                <span className="tab-label">AI Quiz</span>
              </button>

              <button
                className="nav-tab"
                onClick={() => setActiveTab('history')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: activeTab === 'history' ? tokens.teal : 'transparent',
                  color: activeTab === 'history' ? '#ffffff' : tokens.textMuted,
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minHeight: 34,
                }}
              >
                <History size={15} />
                <span className="tab-label">History</span>
              </button>
            </nav>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: tokens.teal,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 16 }}>
          {!selectedDoc ? (
            <div
              style={{
                margin: 'auto',
                maxWidth: 420,
                width: '100%',
                textAlign: 'center',
                backgroundColor: tokens.surface,
                border: `1px solid ${tokens.border}`,
                borderRadius: 12,
                padding: '32px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  backgroundColor: tokens.inkElevated,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={24} color={tokens.teal} />
              </div>

              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 17, fontWeight: 600, color: tokens.text }}>
                  No Document Selected
                </h3>
                <p style={{ margin: 0, fontSize: 13.5, color: tokens.textFaint, lineHeight: 1.5 }}>
                  Select a document from the sidebar to start asking questions or generating quizzes.
                </p>
              </div>

              <button
                onClick={() => setSidebarOpen(true)}
                className="mobile-toggle-btn"
                style={{
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: tokens.teal,
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                <Menu size={18} />
                <span>Open Files & Menu</span>
              </button>
            </div>
          ) : activeTab === 'chat' ? (
            <ChatPanel
              document={selectedDoc}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
          ) : activeTab === 'quiz' ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!activeQuiz ? (
                <QuizGenerator
                  documentId={selectedDoc.documentId}
                  token={token}
                  onQuizGenerated={(quiz) => setActiveQuiz(quiz)}
                />
              ) : (
                <div>
                  <button
                    onClick={() => setActiveQuiz(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: tokens.teal,
                      cursor: 'pointer',
                      marginBottom: 12,
                      fontSize: 13,
                      padding: '6px 0',
                    }}
                  >
                    ← Back to Quiz Generator
                  </button>
                  <QuizTake
                    quiz={activeQuiz}
                    token={token}
                    onQuizSubmitted={() => setHistoryRefreshKey((prev) => prev + 1)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <QuizHistory key={historyRefreshKey} token={token} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}