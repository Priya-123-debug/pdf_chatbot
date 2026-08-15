const express = require('express');
const { randomUUID } = require('crypto');
const { verifyToken } = require('../middleware/authMiddleware');
const { 
  getDocumentById, 
  createQuiz, 
  getQuizById, 
  createQuizAttempt, 
  getQuizAttemptsByUser 
} = require('../db');
const { qdrant, COLLECTION_NAME, generateQuizFromText } = require('../services/ragService');

const router = express.Router();
router.use(verifyToken);


router.post('/generate/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    // Verify document ownership
    const doc = await getDocumentById(documentId);
    if (!doc || doc.userId !== req.userId) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    // Retrieve document chunks from Qdrant
    const searchResult = await qdrant.scroll(COLLECTION_NAME, {
      filter: { must: [{ key: 'documentId', match: { value: documentId } }] },
      limit: 10,
      with_payload: true,
    });

    if (!searchResult.points || searchResult.points.length === 0) {
      return res.status(404).json({ error: 'No text content found in vector DB for this document' });
    }

    const fullContext = searchResult.points.map(p => p.payload.text).join('\n\n');

    // Call LLM to generate questions
    const rawQuestions = await generateQuizFromText(fullContext);

    const questions = rawQuestions.map((q) => ({
      questionId: randomUUID(),
      questionText: q.questionText,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation,
    }));

    const quizId = randomUUID();
    const newQuiz = await createQuiz({
      quizId,
      documentId,
      userId: req.userId,
      title: `Quiz: ${doc.filename}`,
      questions,
    });

    // Strip correctAnswerIndex so users cannot see answers via browser inspect
    const sanitizedQuestions = questions.map(({ correctAnswerIndex, ...q }) => q);

    res.json({
      quizId: newQuiz.quizId,
      title: newQuiz.title,
      questions: sanitizedQuestions,
    });
  } catch (err) {
    console.error('Quiz Generation Route Error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate quiz' });
  }
});


router.get('/:quizId', async (req, res) => {
  try {
    const quiz = await getQuizById(req.params.quizId);
    if (!quiz || quiz.userId !== req.userId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const sanitizedQuestions = quiz.questions.map(q => ({
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options
    }));

    res.json({
      quizId: quiz.quizId,
      title: quiz.title,
      questions: sanitizedQuestions
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});


router.post('/:quizId/submit', async (req, res) => {
  try {
    const { userAnswers } = req.body; // Array of { questionId, selectedIndex }
    if (!Array.isArray(userAnswers)) {
      return res.status(400).json({ error: 'userAnswers array is required' });
    }

    const quiz = await getQuizById(req.params.quizId);
    if (!quiz || quiz.userId !== req.userId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    let correctCount = 0;
    const gradedAnswers = quiz.questions.map((q) => {
      const submitted = userAnswers.find(u => u.questionId === q.questionId);
      const selectedIndex = submitted ? submitted.selectedIndex : -1;
      const isCorrect = selectedIndex === q.correctAnswerIndex;

      if (isCorrect) correctCount++;

      return {
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        selectedIndex,
        correctIndex: q.correctAnswerIndex,
        isCorrect,
        explanation: q.explanation
      };
    });

    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    const attempt = await createQuizAttempt({
      attemptId: randomUUID(),
      quizId: quiz.quizId,
      documentId: quiz.documentId,
      userId: req.userId,
      score: correctCount,
      totalQuestions,
      percentage,
      userAnswers: gradedAnswers,
    });

    res.json({
      attemptId: attempt.attemptId,
      score: correctCount,
      totalQuestions,
      percentage,
      breakdown: gradedAnswers
    });
  } catch (err) {
    console.error('Quiz Submit Error:', err);
    res.status(500).json({ error: 'Failed to process quiz submission' });
  }
});


router.get('/history/all', async (req, res) => {
  try {
    const history = await getQuizAttemptsByUser(req.userId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz history' });
  }
});

module.exports = router;