const { HfInference } = require('@huggingface/inference');
const { QdrantClient } = require('@qdrant/js-client-rest');

// All the "AI + vector database" logic lives in this one file, separate
// from routes (HTTP handling) and db.js (user/document ownership).

const hf = new HfInference(process.env.HF_TOKEN);

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false, // skip the client/server version ping — it was crashing the process on startup
  port: 443,
});

const EMBEDDING_DIM = 384; // BAAI/bge-small-en-v1.5 output vector size
const COLLECTION_NAME = 'pdf_chunks'; // one shared collection for every user's pdfs, filtered by documentId

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

// one-off overview generated from the raw text, not from the stored vectors
async function generateSummary(fullText) {
  const trimmed = fullText.slice(0, 8000); // keep the prompt small/cheap
  const response = await hf.chatCompletion({
    model: 'Qwen/Qwen2.5-7B-Instruct',
      provider: 'together',
    messages: [
      {
        role: 'user',
        content: `Summarize the following document in 4-6 sentences so someone can quickly understand what it's about. Do not add opinions, only summarize what's actually in the text.\n\nDocument:\n${trimmed}`,
      },
    ],
    max_tokens: 300,
  });
  return response.choices[0].message.content;
}

// context = the retrieved chunks, joined together
async function generateAnswer(context, question) {
  const response = await hf.chatCompletion({
    model: 'Qwen/Qwen2.5-7B-Instruct',
     provider: 'together',
    messages: [
      {
        role: 'user',
        content: `Answer the question using only the context below.\n\nContext:\n${context}\n\nQuestion: ${question}`,
      },
    ],
    max_tokens: 500,
  });
  return response.choices[0].message.content;
}


// Add this function to services/ragService.js

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
    // Generate text using your existing LLM provider / Hugging Face model
    const responseText = await generateAnswer(textContext.slice(0, 3000), prompt);

    // Extract JSON block in case the LLM wraps it in markdown ```json ... ```
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse clean JSON from LLM quiz response.");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Quiz Generation Error:", err);
    throw new Error("Could not generate quiz from document text.");
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