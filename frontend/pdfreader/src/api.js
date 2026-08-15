const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error((body && body.error) || body || `Request failed (${res.status})`);
  }
  return body;
}

export const api = {
  signup: (name, email, password) =>
    fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    }).then(handle),

  login: (email, password) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handle),

  listDocuments: () => fetch(`${API_BASE}/documents`, { headers: authHeaders() }).then(handle),

  uploadPdf: (file) => {
    const form = new FormData();
    form.append('pdf', file);
    return fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    }).then(handle);
  },

  ask: (documentId, question) =>
    fetch(`${API_BASE}/documents/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ documentId, question }),
    }).then(handle),
};

export function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function loadSession() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return token && user ? { token, user: JSON.parse(user) } : null;
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}