# PDF Chatbot (RAG) — Backend

Upload a PDF, get a quick summary of it, then ask questions about it. Answers are grounded only in the document's own content — the server retrieves the most relevant passages first, then sends just those to an AI model to answer, instead of dumping the whole PDF into the prompt.

This is a classic **RAG** (Retrieval-Augmented Generation) pipeline:

```
PDF → extract text → split into chunks → embed each chunk → store in Qdrant (vector database)

question → embed the question → Qdrant finds the closest chunks (cosine similarity)
        → those chunks + question sent to a chat model → final answer
```

## Tech stack

| Piece | Tool | Why |
|---|---|---|
| Server | Express (Node.js) | routing, file upload handling |
| PDF text extraction | `pdf-parse` v2 | reads PDF bytes → plain text |
| File upload | `multer` (memory storage) | keeps the PDF in RAM, never touches disk |
| Embeddings | Hugging Face — `BAAI/bge-small-en-v1.5` | text → 384-number vector, free tier |
| Chat/answers | Hugging Face — `Qwen/Qwen2.5-7B-Instruct` | generates the summary and final answers |
| Vector database | Qdrant Cloud | stores chunk vectors, does the similarity search |

## Why a vector database instead of MongoDB

MongoDB is built for exact lookups (`find where id = 5`). It's not built to answer "find me the text that *means* something similar to this question." Qdrant stores each chunk as a vector (a list of numbers representing its meaning) and can find the closest ones fast, even across huge collections, using an internal search index (HNSW) instead of comparing everything one by one.

## Setup

### 1. Install dependencies
```bash
npm install express multer cors dotenv pdf-parse@2.4.5 @huggingface/inference @qdrant/js-client-rest
```

### 2. Environment variables
Create a `.env` file in the project root:
```env
HF_TOKEN=your_hugging_face_token
QDRANT_URL=https://your-cluster-id.region.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key
```

- **HF_TOKEN** — https://huggingface.co → Settings → Access Tokens → create a "Read" token (free, no card needed)
- **QDRANT_URL** / **QDRANT_API_KEY** — https://cloud.qdrant.io → create a free cluster → copy the Endpoint and generate an API key

`.env` is already covered by `.gitignore` — never commit it.

### 3. Run the server
```bash
node index.js
```
Server starts on `http://localhost:3000`.

## API

### `POST /upload`
Upload a PDF and store its embedded chunks. Does **not** answer a question — this is a one-time setup step per document.

**Request:** `multipart/form-data` with a `pdf` field.

**Response:**
```json
{
  "documentId": "a1b2c3d4-...",
  "chunks": 12,
  "summary": "This document covers ..."
}
```

Save `documentId` on the client — it's reused for every question about this document.

### `POST /ask`
Ask a question about an already-uploaded document. No re-uploading, no re-embedding.

**Request:** `application/json`
```json
{
  "documentId": "a1b2c3d4-...",
  "question": "What does section 2 say about pricing?"
}
```

**Response:** plain text answer.

## Design notes

- **One shared Qdrant collection (`pdf_chunks`)** holds every uploaded document's chunks. Each chunk is tagged with a `documentId` in its payload, and `/ask` filters the search to just that tag — so documents never mix, but you don't pay the overhead of a new collection per upload.
- **Chunking** splits extracted text on blank lines (`\n\n`), then drops anything under 20 characters (empty/junk fragments from the split).
- **Cosine similarity** is the distance metric Qdrant uses to compare vectors — set once when the collection is created. All the actual similarity math happens inside Qdrant; this backend never computes it manually.
- **Memory storage for uploads** — `multer.memoryStorage()` keeps the PDF as an in-memory buffer instead of writing it to disk. This avoids a Windows-specific race condition (antivirus/cloud-sync locking a just-written file) that caused intermittent PDF-parsing errors during development.
- **Summary generation** uses the raw extracted text (capped at 8,000 characters), not the stored vectors — it's a one-off overview, not a retrieval step.

## Known gotchas

- `pdf-parse` has two incompatible major versions. This project uses **v2**, which exports a `PDFParse` class (`new PDFParse({ data: buffer })`). If you see `pdfparse is not a function` or `PDFParse is not a constructor`, your installed version and code don't match — run `npm ls pdf-parse` to check, and reinstall `pdf-parse@2.4.5` if needed.
- Embeddings and chat model dimensions must stay in sync — if you ever change the embedding model, update `EMBEDDING_DIM` and recreate the Qdrant collection (old vectors won't match the new size).
- CORS is wide open (`app.use(cors())`) for local development. Restrict it to your actual frontend's domain before deploying anywhere public.
