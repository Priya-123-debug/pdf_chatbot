import { useState } from 'react';
import { api, saveSession } from '../api';
import { tokens } from '../styles';
import AuthShell, { inputStyle, buttonStyle, linkStyle } from './AuthShell';

export default function Login({ onAuth, goToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await api.login(email, password);
      saveSession(token, user);
      onAuth(user, token);
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to access your saved documents and quizzes.">
      <form onSubmit={handleSubmit}>
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
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <div style={{ color: tokens.danger, fontSize: 13, marginBottom: 8 }}>{error}</div>}

        <button className="auth-btn" style={buttonStyle} disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p style={{ fontSize: 13, color: tokens.textMuted, marginTop: 16, textAlign: 'center' }}>
        Don't have an account?{' '}
        <span style={linkStyle} onClick={goToSignup}>
          Sign up
        </span>
      </p>
    </AuthShell>
  );
}