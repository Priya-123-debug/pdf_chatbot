const mongoose = require('mongoose');

// --- Existing Schemas ---
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

const documentSchema = new mongoose.Schema({
  documentId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  filename: { type: String, required: true },
  chunks: { type: Number, required: true },
  summary: { type: String },
  uploadedAt: { type: String, default: () => new Date().toISOString() }
});

// --- NEW SCHEMAS FOR QUIZ FEATURE ---

const questionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswerIndex: { type: Number, required: true },
  explanation: { type: String }
}, { _id: false });

const quizSchema = new mongoose.Schema({
  quizId: { type: String, required: true, unique: true },
  documentId: { type: String, required: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  questions: [questionSchema],
  createdAt: { type: String, default: () => new Date().toISOString() }
});

const quizAttemptSchema = new mongoose.Schema({
  attemptId: { type: String, required: true, unique: true },
  quizId: { type: String, required: true },
  documentId: { type: String, required: true },
  userId: { type: String, required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  userAnswers: [{
    questionId: String,
    selectedIndex: Number,
    isCorrect: Boolean,
    correctIndex: Number
  }],
  completedAt: { type: String, default: () => new Date().toISOString() }
});

const User = mongoose.model('User', userSchema);
const Document = mongoose.model('Document', documentSchema);
const Quiz = mongoose.model('Quiz', quizSchema);
const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

// --- Helpers ---
async function getUserByEmail(email) { return await User.findOne({ email }); }
async function createUser(userData) { return await User.create(userData); }
async function addDocument(docData) { return await Document.create(docData); }
async function getDocumentsByUser(userId) { return await Document.find({ userId }); }
async function getDocumentById(documentId) { return await Document.findOne({ documentId }); }

// Quiz Helpers
async function createQuiz(quizData) { return await Quiz.create(quizData); }
async function getQuizById(quizId) { return await Quiz.findOne({ quizId }); }
async function createQuizAttempt(attemptData) { return await QuizAttempt.create(attemptData); }
async function getQuizAttemptsByUser(userId) { 
  return await QuizAttempt.find({ userId }).sort({ completedAt: -1 }); 
}

module.exports = {
  getUserByEmail,
  createUser,
  addDocument,
  getDocumentsByUser,
  getDocumentById,
  createQuiz,
  getQuizById,
  createQuizAttempt,
  getQuizAttemptsByUser,
};