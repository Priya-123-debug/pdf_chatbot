const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { getUserByEmail, createUser } = require('../db');

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    
    if (await getUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // never store plain-text passwords — bcrypt hashes + salts it
    const passwordHash = await bcrypt.hash(password, 10);

    // ✅ FIXED: Added 'await' so user resolves to the actual created document
    const user = await createUser({
      id: randomUUID(),
      name,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    // Fallback safely in case your DB helper uses _id vs id
    const userId = user.id || user._id;

    const token = signToken(userId);
    res.json({ token, user: { id: userId, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    // Fallback safely in case your DB helper uses _id vs id
    const userId = user.id || user._id;

    const token = signToken(userId);
    res.json({ token, user: { id: userId, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;