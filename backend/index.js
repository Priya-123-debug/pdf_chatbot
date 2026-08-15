const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const cors = require('cors'); // allows the frontend (different port) to call this api
require('dotenv').config();


const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const quizRoutes=require('./routes/quizRoutes');
const mongoose = require('mongoose');

const app = express();

app.use(cors()); // dev-friendly: allows requests from any origin, e.g. http://localhost:5173
app.use(express.json());


mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('hey base router');
});

// /auth/signup, /auth/login
app.use('/auth', authRoutes);

// /documents/upload, /documents (list), /documents/ask  — all require login
app.use('/documents', documentRoutes);
app.use('/quizzes', quizRoutes);

app.listen(3000, () => {
  console.log('server is running at port 3000');
});