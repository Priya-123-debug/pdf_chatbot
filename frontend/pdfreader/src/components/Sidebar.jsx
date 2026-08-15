import { useEffect, useRef, useState } from 'react';
import { UploadCloud, FileText, Loader2, LogOut, X } from 'lucide-react';
import { api, clearSession } from '../api';
import { tokens } from '../styles';

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// NOTE ON THE MOBILE-DRAWER FIX
// Previously both App.jsx *and* Sidebar.jsx tried to own the slide-in-drawer
// behaviour on mobile: App.jsx wrapped Sidebar in its own `.app-sidebar`/
// `.app-sidebar.open` classes + its own backdrop, while Sidebar.jsx's own
// media query moved `.sidebar-container` with `transform: translateX(-100%)`
// unconditionally — but App.jsx never passed `isOpen`/`onClose` down, so
// Sidebar's half of that logic never actually toggled. Result: two
// competing positioning systems, one of them permanently stuck. Sidebar is
// now the single source of truth for the drawer; App.jsx just passes
// `isOpen`/`onClose` and renders nothing else around it.
export default function Sidebar({ user, selectedId, onSelect, onLogout, isOpen, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function refresh() {
    try {
      setLoadingList(true);
      const docs = await api.listDocuments();
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch documents.');
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleFilePicked(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const data = await api.uploadPdf(file);
      await refresh();
      onSelect(data.documentId);
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function handleLogout() {
    clearSession();
    if (onLogout) onLogout();
  }

  return (
    <>
      <style>{`
        .sidebar-backdrop { display: none; }

        @media (max-width: 768px) {
          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 999;
            animation: fadeIn 0.2s ease;
          }
          .sidebar-container {
            position: fixed !important;
            top: 0;
            bottom: 0;
            left: 0;
            width: 82vw !important;
            max-width: 300px;
            transform: translateX(-100%);
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
            z-index: 1000 !important;
            transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar-container.open {
            transform: translateX(0) !important;
          }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .doc-row {
          transition: background-color 0.15s ease;
        }
        .doc-row:hover {
          background: ${tokens.surfaceHi} !important;
        }
        .upload-btn {
          transition: filter 0.15s ease, transform 0.1s ease;
        }
        .upload-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .upload-btn:active:not(:disabled) { transform: scale(0.98); }
      `}</style>

      {isOpen && <div onClick={onClose} className="sidebar-backdrop" aria-hidden="true" />}

      <aside
        className={`sidebar-container ${isOpen ? 'open' : ''}`}
        style={{
          width: 280,
          flexShrink: 0,
          background: tokens.surface,
          borderRight: `1px solid ${tokens.border}`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px', borderBottom: `1px solid ${tokens.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: tokens.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name || 'User'}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close sidebar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: tokens.textMuted,
                  cursor: 'pointer',
                  padding: 6,
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                color: tokens.textFaint,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {user?.email || ''}
            </span>
            <button
              onClick={handleLogout}
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                color: tokens.textMuted,
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 4,
                flexShrink: 0,
              }}
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>

        <div style={{ padding: 14, borderBottom: `1px solid ${tokens.border}`, flexShrink: 0 }}>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => handleFilePicked(e.target.files?.[0])}
          />
          <button
            className="upload-btn"
            onClick={() => inputRef.current?.click()}
            type="button"
            disabled={uploading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: tokens.teal,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px',
              fontWeight: 600,
              fontSize: 13.5,
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.7 : 1,
              minHeight: 44,
            }}
          >
            {uploading ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <UploadCloud size={16} />
            )}
            {uploading ? 'Indexing…' : 'Upload PDF'}
          </button>
          {error && (
            <div style={{ color: tokens.danger, fontSize: 12, marginTop: 8 }}>
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: tokens.textFaint,
            padding: '12px 16px 6px',
            flexShrink: 0,
          }}
        >
          Your files ({documents.length})
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px', WebkitOverflowScrolling: 'touch' }}>
          {loadingList ? (
            <div style={{ padding: 16, fontSize: 13, color: tokens.textFaint }}>
              Loading…
            </div>
          ) : documents.length === 0 ? (
            <div style={{ padding: '12px 8px', fontSize: 13, color: tokens.textFaint }}>
              No files yet — upload a PDF to get started.
            </div>
          ) : (
            documents.map((doc) => {
              const active = doc.documentId === selectedId;
              return (
                <button
                  key={doc.documentId}
                  type="button"
                  className="doc-row"
                  onClick={() => {
                    onSelect(doc.documentId);
                    if (onClose) onClose();
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    background: active ? tokens.tealSoft : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    marginBottom: 4,
                    minHeight: 44,
                  }}
                >
                  <FileText
                    size={16}
                    color={active ? tokens.teal : tokens.textFaint}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        color: active ? tokens.text : tokens.textMuted,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {doc.filename}
                    </div>
                    <div style={{ fontSize: 11, color: tokens.textFaint, marginTop: 2 }}>
                      {doc.chunks ? `${doc.chunks} chunks · ` : ''}
                      {timeAgo(doc.uploadedAt)}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}