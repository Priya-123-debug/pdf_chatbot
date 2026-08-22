const { HfInference } = require('@huggingface/inference');
const { QdrantClient } = require('@qdrant/js-client-rest');

// All the "AI + vector database" logic lives in this one file, separate
// from routes (HTTP handling) and db.js (user/document ownership).
//
// Chat completion (summary, Q&A, quiz) -> Groq (free tier, no HF credit limit)
// Embeddings (text -> vector) -> Hugging Face (separate free quota, unaffected)

const hf = new HfInference(process.env.HF_TOKEN);

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false, // skip the client/server version ping — it was crashing the process on startup
  port: 443,
});

const EMBEDDING_DIM = 384; // BAAI/bge-small-en-v1.5 output vector size
const COLLECTION_NAME = 'pdf_chunks'; // one shared collection for every user's pdfs, filtered by documentId
const GROQ_MODEL = 'llama-3.1-8b-instant'; // fast + free on Groq; swap to 'llama-3.3-70b-versatile' for stronger reasoning

async function ensureCollection() {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: { size: EMBEDDING_DIM, distance: 'Cosine' },
    });
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'documentId',
      field_schema: 'keyword',
      wait: true, // must finish before any search runs against this field
    });
  }
}

// text -> vector (meaning represented as numbers)
async function getEmbedding(text) {
  const result = await hf.featureExtraction({
    model: 'BAAI/bge-small-en-v1.5',
    inputs: text,
  });
  return Array.from(result);
}

// naive but effective: split on blank lines, drop junk/too-short fragments
function chunkText(text) {
  return text
    .split('\n\n')
    .map((c) => c.trim())
    .filter((c) => c.length > 20);
}

// Single place that talks to Groq's OpenAI-compatible chat completion endpoint.
// Every text-generation call (summary, Q&A, quiz) goes through this.
async function callGroq(prompt, maxTokens) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Groq API error:', data);
    throw new Error(data.error?.message || 'Groq inference failed');
  }

  return data.choices[0].message.content;
}

// one-off overview generated from the raw text, not from the stored vectors
async function generateSummary(fullText) {
  const trimmed = fullText.slice(0, 8000); // keep the prompt small/cheap
  const prompt = `Summarize the following document in 4-6 sentences so someone can quickly understand what it's about. Do not add opinions, only summarize what's actually in the text.\n\nDocument:\n${trimmed}`;
  return callGroq(prompt, 300);
}

// context = the retrieved chunks, joined together
async function generateAnswer(context, question) {
  const prompt = `Answer the question using only the context below.\n\nContext:\n${context}\n\nQuestion: ${question}`;
  return callGroq(prompt, 500);
}

async function generateQuizFromText(textContext) {
  const prompt = `
You are an expert educator. Based on the following document context, generate 5 multiple-choice quiz questions.

Output ONLY valid JSON with no conversational text or markdown around it. Use this exact JSON structure:
[
  {
    "questionText": "What is the primary topic of the document?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "explanation": "Brief explanation of why Option A is correct."
  }
]

Context:
${textContext.slice(0, 3000)}
`;

  try {
    const responseText = await callGroq(prompt, 1000);

    // Extract JSON block in case the LLM wraps it in markdown ```json ... ```
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse clean JSON from LLM quiz response.');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Quiz Generation Error:', err);
    throw new Error('Could not generate quiz from document text.');
  }
}

module.exports = {
  qdrant,
  COLLECTION_NAME,
  ensureCollection,
  getEmbedding,
  chunkText,
  generateSummary,
  generateAnswer,
  generateQuizFromText,
};