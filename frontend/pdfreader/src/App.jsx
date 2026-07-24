import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, Send, Loader2, X, RotateCcw } from "lucide-react";


const tokens = {
  bg: "#0A0B10",
  bgElevated: "#12141C",
  surface: "#181B25",
  surfaceHi: "#1F2330",
  border: "#282C3A",
  borderHi: "#383D4E",
  text: "#EDEEF3",
  textMuted: "#8B90A3",
  textFaint: "#5B5F70",
  violet: "#7C6FEE",
  violetSoft: "#3A3468",
  amber: "#E8AC3E",
};

const API_BASE = "http://localhost:3000";

export default function PdfRagApp() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState("idle"); // idle | uploading | ready | error
  const [uploadError, setUploadError] = useState("");
  const [documentId, setDocumentId] = useState(null);
  const [chunkCount, setChunkCount] = useState(null);
  const [summary, setSummary] = useState("");

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [thread, setThread] = useState([]); // [{ question, answer, error }]

  const inputRef = useRef(null);
  const threadEndRef = useRef(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, asking]);

  function pickFile(f) {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setUploadError("Only PDF files are accepted.");
      return;
    }
    setUploadError("");
    setFile(f);
    setUploadState("idle");
    setDocumentId(null);
    setSummary("");
    setThread([]);
  }

  async function handleUpload() {
    if (!file) {
      setUploadError("Choose a PDF first.");
      return;
    }
    setUploadState("uploading");
    setUploadError("");

    try {
      const form = new FormData();
      form.append("pdf", file);

      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.text()) || `Upload failed (${res.status})`);

      const data = await res.json(); // { documentId, chunks, summary }
      setDocumentId(data.documentId);
      setChunkCount(data.chunks);
      setSummary(data.summary || "");
      setUploadState("ready");
    } catch (err) {
      setUploadError(err.message || "Could not reach the server.");
      setUploadState("error");
    }
  }

  async function handleAsk() {
    const q = question.trim();
    if (!documentId) {
      setUploadError("Upload a document before asking.");
      return;
    }
    if (!q) return;

    setThread((t) => [...t, { question: q, answer: null, error: null }]);
    setQuestion("");
    setAsking(true);

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, question: q }),
      });
      if (!res.ok) throw new Error((await res.text()) || `Request failed (${res.status})`);
      const answer = await res.text();
      setThread((t) => {
        const copy = [...t];
        copy[copy.length - 1] = { question: q, answer, error: null };
        return copy;
      });
    } catch (err) {
      setThread((t) => {
        const copy = [...t];
        copy[copy.length - 1] = { question: q, answer: null, error: err.message || "Something went wrong." };
        return copy;
      });
    } finally {
      setAsking(false);
    }
  }

  function changeDocument() {
    setFile(null);
    setUploadState("idle");
    setUploadError("");
    setDocumentId(null);
    setChunkCount(null);
    setSummary("");
    setThread([]);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: tokens.bg,
        color: tokens.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        justifyContent: "center",
        padding: "44px 20px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: ${tokens.violetSoft}; }
        .focus-ring:focus-visible { outline: 2px solid ${tokens.violet}; outline-offset: 2px; }
        .btn { transition: filter 0.15s ease, transform 0.1s ease; }
        .btn:hover:not(:disabled) { filter: brightness(1.1); }
        .btn:active:not(:disabled) { transform: scale(0.98); }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .drop { transition: border-color 0.15s ease, background 0.15s ease; }
        .pulse-dot { animation: pulse 1.3s ease-in-out infinite; }
        .pulse-dot:nth-child(2) { animation-delay: 0.15s; }
        .pulse-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes pulse { 0%, 60%, 100% { opacity: 0.25; transform: scale(0.8); } 30% { opacity: 1; transform: scale(1); } }
        @media (max-width: 820px) { .rag-grid { grid-template-columns: 1fr !important; } }
        @media (prefers-reduced-motion: reduce) { .btn, .drop, .pulse-dot { animation: none !important; transition: none !important; } }
      `}</style>

      <div style={{ width: "100%", maxWidth: 1000 }}>
        {/* header */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              color: tokens.textFaint,
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: tokens.violet, display: "inline-block" }} />
            Vector search over your document
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 34,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Ask your PDF anything.
          </h1>
          <p style={{ fontSize: 14.5, color: tokens.textMuted, marginTop: 8, maxWidth: 560, lineHeight: 1.6 }}>
            Upload once. Each question is matched against the closest passages
            in the document, not the whole file — so you can keep asking
            without re-uploading.
          </p>
        </div>

        <div className="rag-grid" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>
          {/* left: document panel */}
          <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: tokens.textFaint, marginBottom: 12 }}>
              Document
            </div>

            {uploadState === "ready" && documentId ? (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    background: tokens.bgElevated,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: 8,
                    padding: 14,
                  }}
                >
                  <FileText size={18} color={tokens.violet} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {file?.name}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: tokens.textFaint, marginTop: 4 }}>
                      {chunkCount} chunks embedded · ready
                    </div>
                  </div>
                </div>
                <button
                  onClick={changeDocument}
                  className="btn focus-ring"
                  style={{
                    marginTop: 12,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: "transparent",
                    border: `1px solid ${tokens.border}`,
                    borderRadius: 7,
                    padding: "9px 14px",
                    fontSize: 13,
                    color: tokens.textMuted,
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={13} />
                  Use a different document
                </button>
              </div>
            ) : (
              <>
                <div
                  className="drop focus-ring"
                  tabIndex={0}
                  role="button"
                  aria-label="Choose a PDF"
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                  style={{
                    border: `1.5px dashed ${dragOver ? tokens.violet : tokens.border}`,
                    background: dragOver ? tokens.violetSoft : tokens.bgElevated,
                    borderRadius: 8,
                    padding: "24px 14px",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  <input ref={inputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => pickFile(e.target.files?.[0])} />
                  {!file ? (
                    <>
                      <UploadCloud size={20} color={tokens.textMuted} style={{ marginBottom: 8 }} />
                      <div style={{ fontSize: 13.5, color: tokens.textMuted }}>Drop a PDF, or click to browse</div>
                    </>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13.5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <FileText size={17} color={tokens.violet} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{file.name}</span>
                      </div>
                      <X size={15} color={tokens.textMuted} onClick={(e) => { e.stopPropagation(); pickFile(null); setFile(null); }} style={{ cursor: "pointer", flexShrink: 0 }} />
                    </div>
                  )}
                </div>

                {uploadError && <div style={{ fontSize: 13, color: tokens.amber, marginTop: 10 }}>{uploadError}</div>}

                <button
                  onClick={handleUpload}
                  disabled={!file || uploadState === "uploading"}
                  className="btn focus-ring"
                  style={{
                    marginTop: 14,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: tokens.violet,
                    color: "#0A0B10",
                    border: "none",
                    borderRadius: 7,
                    padding: "11px 14px",
                    fontWeight: 600,
                    fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  {uploadState === "uploading" ? (
                    <>
                      <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                      Embedding document…
                    </>
                  ) : (
                    "Upload & prepare"
                  )}
                </button>
              </>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
          </div>

          {/* right: question + answer thread */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 420 }}>
            {summary && (
              <div
                style={{
                  background: tokens.surface,
                  border: `1px solid ${tokens.border}`,
                  borderLeft: `2px solid ${tokens.amber}`,
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: tokens.textFaint,
                    marginBottom: 8,
                  }}
                >
                  What this document covers
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.65, color: tokens.textMuted, whiteSpace: "pre-wrap" }}>
                  {summary}
                </div>
              </div>
            )}
            <div
              style={{
                flex: 1,
                background: tokens.surface,
                border: `1px solid ${tokens.border}`,
                borderRadius: 10,
                padding: thread.length ? 20 : 0,
                marginBottom: 14,
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              {thread.length === 0 ? (
                <div style={{ margin: "auto", textAlign: "center", padding: "60px 30px", color: tokens.textFaint, fontSize: 14 }}>
                  {documentId ? "Ask a question about the document below." : "Upload a document to start asking questions."}
                </div>
              ) : (
                thread.map((t, i) => (
                  <div key={i}>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11.5,
                        color: tokens.textFaint,
                        marginBottom: 6,
                        letterSpacing: "0.04em",
                      }}
                    >
                      Q{i + 1}
                    </div>
                    <div style={{ fontSize: 14.5, color: tokens.text, marginBottom: 10 }}>{t.question}</div>

                    {t.error ? (
                      <div style={{ fontSize: 13.5, color: tokens.amber }}>{t.error}</div>
                    ) : t.answer ? (
                      <div
                        style={{
                          background: tokens.bgElevated,
                          border: `1px solid ${tokens.border}`,
                          borderLeft: `2px solid ${tokens.violet}`,
                          borderRadius: 7,
                          padding: "12px 14px",
                          fontSize: 14,
                          lineHeight: 1.65,
                          color: tokens.textMuted,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {t.answer}
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 5, padding: "6px 2px" }}>
                        <span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: tokens.violet }} />
                        <span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: tokens.violet }} />
                        <span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: tokens.violet }} />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={threadEndRef} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <textarea
                className="focus-ring"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                placeholder={documentId ? "e.g. What does section 3 recommend?" : "Upload a document first…"}
                disabled={!documentId}
                rows={2}
                style={{
                  flex: 1,
                  resize: "none",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  padding: "12px 14px",
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 8,
                  background: tokens.bgElevated,
                  color: tokens.text,
                }}
              />
              <button
                onClick={handleAsk}
                disabled={!documentId || asking || !question.trim()}
                className="btn focus-ring"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: tokens.violet,
                  color: "#0A0B10",
                  border: "none",
                  borderRadius: 8,
                  padding: "0 20px",
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Send size={14} />
                Ask
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}