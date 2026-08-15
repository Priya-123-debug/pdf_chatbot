import { tokens } from '../styles';

const GlobalAuthStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

    * { box-sizing: border-box; }

    .auth-input:focus-visible,
    .auth-btn:focus-visible {
      outline: 2px solid ${tokens.teal};
      outline-offset: 2px;
    }
    .auth-input {
      transition: border-color 0.15s ease;
    }
    .auth-input:focus {
      border-color: ${tokens.teal} !important;
    }
    .auth-btn {
      transition: filter 0.15s ease, transform 0.1s ease;
    }
    .auth-btn:hover:not(:disabled) {
      filter: brightness(1.08);
    }
    .auth-btn:active:not(:disabled) {
      transform: scale(0.98);
    }
    .auth-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .auth-card {
      width: 100%;
      max-width: 380px;
      background: ${tokens.surface};
      border-radius: ${tokens.radiusLg}px;
      padding: 36px 32px;
      border: 1px solid ${tokens.border};
      box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.6);
    }

    @media (max-width: 480px) {
      .auth-card {
        padding: 26px 20px;
        border-radius: 12px;
        max-width: 100%;
      }
      .auth-title {
        font-size: 22px !important;
      }
    }
  `}</style>
);

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: `radial-gradient(circle at 20% 0%, ${tokens.surfaceHi} 0%, ${tokens.ink} 55%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        padding: '20px',
        WebkitTextSizeAdjust: '100%',
      }}
    >
      <GlobalAuthStyles />

      <div className="auth-card">
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.14em',
            color: tokens.textFaint,
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.teal, display: 'inline-block' }}
          />
          PDF RAG
        </div>

        <h1
          className="auth-title"
          style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, margin: 0, color: tokens.text }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 13.5, color: tokens.textMuted, marginTop: 8, marginBottom: 22, lineHeight: 1.5 }}>
          {subtitle}
        </p>

        {children}
      </div>
    </div>
  );
}

export const inputStyle = {
  width: '100%',
  fontSize: 16, // 16px prevents iOS Safari from auto-zooming on focus
  padding: '12px 13px',
  border: `1px solid ${tokens.border}`,
  borderRadius: 8,
  background: tokens.inkElevated,
  color: tokens.text,
  marginBottom: 10,
  outline: 'none',
};

export const buttonStyle = {
  width: '100%',
  background: tokens.teal,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '13px 14px',
  fontWeight: 600,
  fontSize: 14.5,
  cursor: 'pointer',
  marginTop: 4,
  minHeight: 46,
};

export const linkStyle = { color: tokens.teal, cursor: 'pointer', fontWeight: 600 };