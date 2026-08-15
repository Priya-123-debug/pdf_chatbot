const mongoose = require('mongoose');

// defines the shape every user document must follow in MongoDB
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },       // our own uuid, not mongo's _id
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },     // unique: true also creates an index for fast lookup
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);