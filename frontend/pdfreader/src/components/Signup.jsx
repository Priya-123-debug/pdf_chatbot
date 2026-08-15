import { useState } from 'react';
import { api, saveSession } from '../api';
import { tokens } from '../styles';
import AuthShell, { inputStyle, buttonStyle, linkStyle } from './AuthShell';

export default function Signup({ onAuth, goToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.signup(name, email, password);
      saveSession(token, user);
      onAuth(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create an account" subtitle="Your uploaded PDFs stay tied to your account only.">
      <form onSubmit={handleSubmit}>
        <input
          className="auth-input"
          style={inputStyle}
          type="text"
          autoComplete="name"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="auth-input"
          style={inputStyle}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="auth-input"
          style={inputStyle}
          type="password"
          autoComplete="new-password"
          placeholder="Password (min 6 characters)"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div style={{ color: tokens.danger, fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <button className="auth-btn" style={buttonStyle} disabled={loading}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p style={{ fontSize: 13, color: tokens.textMuted, marginTop: 16, textAlign: 'center' }}>
        Already have an account? <span style={linkStyle} onClick={goToLogin}>Log in</span>
      </p>
    </AuthShell>
  );
}