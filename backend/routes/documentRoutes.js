const express = require('express');
const multer = require('multer');
const { PDFParse } = require('pdf-parse'); // v2: class-based api
const { randomUUID } = require('crypto');
const { verifyToken } = require('../middleware/authMiddleware');
const { addDocument, getDocumentsByUser, getDocumentById } = require('../db');
const {
  qdrant,
  COLLECTION_NAME,
  ensureCollection,
  getEmbedding,
  chunkText,
  generateSummary,
  generateAnswer,
} = require('../services/ragService');

const router = express.Router();

// Memory storage: keeps the pdf as an in-memory buffer, never touches disk
const upload = multer({ storage: multer.memoryStorage() });

// Every route below requires a valid login token
router.use(verifyToken);


router.get('/', async (req, res) => {
  try {
    // Fetches the array of documents owned by req.userId
    const documents = await getDocumentsByUser(req.userId);
    res.json(documents || []);
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch documents' });
  }
});




router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No pdf file uploaded, field name must be 'pdf'" });
    }

    const parser = new PDFParse({ data: req.file.buffer });
    const pdfdata = await parser.getText();
    await parser.destroy();
    const text = pdfdata.text;

    const cleanChunks = chunkText(text);
    if (cleanChunks.length === 0) {
      return res.status(400).json({ error: 'Could not extract readable text from this pdf' });
    }

    await ensureCollection();

    const documentId = randomUUID();

    // Chunk -> Vector -> Store in Qdrant
    const points = [];
    for (const c of cleanChunks) {
      const vec = await getEmbedding(c);
      points.push({ id: randomUUID(), vector: vec, payload: { text: c, documentId } });
    }
    await qdrant.upsert(COLLECTION_NAME, { points });

    const summary = await generateSummary(text);

  
    await addDocument({
      documentId,
      userId: req.userId,
      filename: req.file.originalname,
      chunks: cleanChunks.length,
      summary,
      uploadedAt: new Date().toISOString(),
    });

    res.json({ documentId, chunks: cleanChunks.length, summary, filename: req.file.originalname });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: err.message || 'Something went wrong during upload' });
  }
});


router.post('/ask', async (req, res) => {
  try {
    const { documentId, question } = req.body;
    if (!documentId) return res.status(400).json({ error: 'documentId is required' });

    // ✅ FIXED: Added 'await' for MongoDB async lookup
    const doc = await getDocumentById(documentId);
    if (!doc || doc.userId !== req.userId) {
      return res.status(404).json({ error: 'Document not found or unauthorized access' });
    }

    const finalQuestion = question || 'explain this pdf in simple text';
    const questionVector = await getEmbedding(finalQuestion);

    const searchResult = await qdrant.search(COLLECTION_NAME, {
      vector: questionVector,
      limit: 3, // top 3 most relevant chunks
      filter: { must: [{ key: 'documentId', match: { value: documentId } }] },
      with_payload: true,
    });

    if (searchResult.length === 0) {
      return res.status(404).json({ error: 'No relevant text chunks found for this document' });
    }

    const sources = searchResult.map((r) => ({ text: r.payload.text, score: r.score }));
    const context = sources.map((s) => s.text).join('\n\n');

    const answer = await generateAnswer(context, finalQuestion);

    res.json({ answer, sources });
  } catch (err) {
    console.error('Ask Error:', err);
    res.status(500).json({ error: err.message || 'Something went wrong processing question' });
  }
});

module.exports = router;