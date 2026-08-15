const mongoose = require('mongoose');

// defines the shape every uploaded-file record must follow in MongoDB
const documentSchema = new mongoose.Schema({
  documentId: { type: String, required: true, unique: true }, // matches the id used as the tag in Qdrant
  userId: { type: String, required: true },                    // ties this file to the user who uploaded it
  filename: { type: String, required: true },
  chunks: { type: Number, required: true },
  summary: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Document', documentSchema);