const express = require('express')
const multer = require("multer")
const app = express();
const { PDFParse } = require("pdf-parse") // pdf-parse v2: class-based api, uses modern pdfjs-dist internally (v1's bundled parser was too old to read some valid pdfs)
const fs = require("fs");
const { HfInference } = require('@huggingface/inference');
const { QdrantClient } = require('@qdrant/js-client-rest'); // vector database client
const { randomUUID } = require('crypto'); // qdrant point ids must be uuid or unsigned int
const cors = require('cors'); // allows the frontend (different port) to call this api
require('dotenv').config();

app.use(cors()); // dev-friendly: allows requests from any origin, e.g. http://localhost:5173

const hf = new HfInference(process.env.HF_TOKEN);
// it is free so we use it 

// ---- qdrant client setup ----
// qdrant cloud free tier -> we store vector data here instead of mongodb
// mongodb is good for normal data, not built for fast vector similarity search
const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,       // e.g. https://xxxx.cloud.qdrant.io
    apiKey: process.env.QDRANT_API_KEY,
});

const EMBEDDING_DIM = 384; // BAAI/bge-small-en-v1.5 output vector size

// ---- one shared collection for every pdf ----
// instead of making + deleting a collection per upload, we keep ONE collection forever
// and tag every chunk with a documentId in its payload, so searches can be filtered
// down to just one pdf's chunks. this means an uploaded pdf's vectors stick around so
// you can ask more questions later without re-embedding the pdf again.
const COLLECTION_NAME = "pdf_chunks";

async function ensureCollection() {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (!exists) {
        // 1. Create collection with 384 dimensions
        await qdrant.createCollection(COLLECTION_NAME, {
            vectors: {
                size: EMBEDDING_DIM, // 384
                distance: "Cosine",
            },
        });
        console.log(`Created Qdrant collection '${COLLECTION_NAME}' with size ${EMBEDDING_DIM}`);

        // 2. Create payload index and WAIT for completion
        await qdrant.createPayloadIndex(COLLECTION_NAME, {
            field_name: "documentId",
            field_schema: "keyword",
            wait: true, // MUST be true so Qdrant finishes creating the index before any search runs
        });
        console.log("Created payload index for 'documentId'");
    } else {
        // Backup check: If collection exists but index wasn't created, ensure it now
        try {
            await qdrant.createPayloadIndex(COLLECTION_NAME, {
                field_name: "documentId",
                field_schema: "keyword",
                wait: true,
            });
        } catch (e) {
            // Index already exists, ignore error
        }
    }
}

app.use(express.json()); // needed so req.body.question works (form-data text fields also land in req.body via multer)

// memory storage: multer keeps the uploaded file as a buffer in RAM (req.file.buffer)
// instead of writing it to disk first. avoids a disk write/read race that can happen
// on windows (antivirus scan, onedrive sync, etc. locking the file mid-write), which
// was causing intermittent "bad XRef entry" errors when the pdf was read back too early.
const upload = multer({ storage: multer.memoryStorage() })

app.get('/', (req, res) => {
    res.send("hey base router");
})

// ---- embedding helper ----
// embedding model purpose: text -> vector (meaning represented as numbers)
// this is separate from the chat/generation model because
// generating text != measuring semantic similarity, different optimization goal
async function getEmbedding(text) {
    const result = await hf.featureExtraction({
        model: 'BAAI/bge-small-en-v1.5',
        inputs: text,
    });
    return Array.from(result);
}

// ---- summary helper ----
// gives the user a quick idea of what the pdf covers, before they've asked anything.
// uses the raw extracted text (truncated), not the chunks/vectors — this is a
// one-time overview, not a retrieval step, so it doesn't touch qdrant at all.
async function generateSummary(fullText) {
    const MAX_CHARS = 8000; // keep the prompt small/cheap, a summary doesn't need the whole doc
    const trimmed = fullText.slice(0, MAX_CHARS);

    const response = await hf.chatCompletion({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [
            {
                role: 'user',
                content: `Summarize the following document in 4-6 sentences so someone can quickly understand what it's about and decide what to ask about it. Do not add opinions, only summarize what's actually in the text.\n\nDocument:\n${trimmed}`
            }
        ],
        max_tokens: 300,
    });

    return response.choices[0].message.content;
}

// ---- /upload: embed a pdf ONCE and store it in the shared collection ----
// this route does NOT answer a question. it just chunks + embeds + stores,
// then hands back a documentId the frontend should keep and reuse in /ask
app.post('/upload', upload.single("pdf"), async (req, res) => {
    // route handler needed "async" because we use "await" inside it

    // we do not send all pdf to ai model so we convert into chunk form 
    // to find relevant information 
    // chunking splitting text
    // rerival finding relevant chunks 
    // context chunks sent to ai 
    // tokens small pieces ai reads internally 
    // rag retrieval augmented generation 
    // retrieval means finding relevant information 
    // augmented adding extra context 
    // generation ai generating answer 
    try {
        console.log(req.file);
        if (!req.file) {
            return res.status(400).send("No pdf file uploaded, field name must be 'pdf'");
        }

        // req.file.buffer is already the raw pdf bytes in memory, no disk read needed
        const parser = new PDFParse({ data: req.file.buffer }); // v2 api: instantiate with the buffer
        const pdfdata = await parser.getText(); // returns { text, ... }
        await parser.destroy(); // v2 requires explicit cleanup of its internal resources
        const text = pdfdata.text;

        const chunk = text.split('\n\n'); // this increase and preserve the chunks meaning 

        // filter out empty/whitespace-only/too-short chunks that split('\n\n') can produce
        const cleanChunks = chunk.map(c => c.trim()).filter(c => c.length > 20);

        if (cleanChunks.length === 0) {
            return res.status(400).send("Could not extract readable text from this pdf");
        }

        await ensureCollection(); // make sure the shared collection exists (only creates it the first time)

        // documentId is the "name tag" every chunk from this pdf will carry in its payload
        const documentId = randomUUID();

        // ---- embedding model se vector me convert karege ----
        // embed every chunk (chunk -> vector) and upsert into the shared qdrant collection
        const points = [];
        for (const c of cleanChunks) {
            const vec = await getEmbedding(c);
            points.push({
                id: randomUUID(),
                vector: vec,
                payload: { text: c, documentId }, // documentId tag lets /ask search only this pdf's chunks
            });
        }
        await qdrant.upsert(COLLECTION_NAME, { points }); // store chunk vectors in the vector db

        // ---- generate a quick summary so the user knows what's in the pdf ----
        const summary = await generateSummary(text);

        // no disk cleanup needed — the file only ever existed in memory
        res.json({ documentId, chunks: cleanChunks.length, summary }); // frontend must save this documentId and send it to /ask
    }
    catch (err) {
        console.log(err);
        res.status(500).send(err.message || "something went wrong");
    }
})

// ---- /ask: ask a question about an already-uploaded pdf ----
// no pdf, no re-embedding — just documentId + question, every time
app.post('/ask', async (req, res) => {
    try {
        const { documentId, question } = req.body;

        if (!documentId) {
            return res.status(400).send("documentId is required, get it from /upload's response");
        }

        const finalQuestion = question || "explain this pdf in simple text";

        // embed the question (question -> vector)
        const questionVector = await getEmbedding(finalQuestion);

        // ---- similarity search ----
        // qdrant compares the question vector against stored chunk vectors using the
        // cosine rule (set when the collection was created) and returns the closest ones.
        // no manual math happens in this backend — qdrant does the comparison internally.
        const searchResult = await qdrant.search(COLLECTION_NAME, {
            vector: questionVector,
            limit: 3, // take top 3 most relevant chunks as context
            filter: {
                must: [{ key: "documentId", match: { value: documentId } }],
            },
            with_payload: true,
        });

        if (searchResult.length === 0) {
            return res.status(404).send("No chunks found for this documentId, did you upload it first?");
        }

        const topChunks = searchResult.map(r => r.payload.text);
        const context = topChunks.join("\n\n");

        // ---- context chunks sent to ai, ai generates final answer ----
        const response = await hf.chatCompletion({
            model: 'Qwen/Qwen2.5-7B-Instruct',
            messages: [
                {
                    role: 'user',
                    content: `Answer the question using only the context below.\n\nContext:\n${context}\n\nQuestion: ${finalQuestion}`
                }
            ],
            max_tokens: 500,
        });

        res.send(response.choices[0].message.content)
    }
    catch (err) {
        console.log(err);
        res.status(500).send(err.message || "something went wrong");
    }
})

app.listen(3000, () => {
    console.log("server is running at port 3000");
})