const mongoose = require("mongoose");

const petSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  species: { type: String, required: true, enum: ["Dog", "Cat", "Bird", "Rabbit", "Other"] },
  breed: { type: String, trim: true, maxlength: 80, default: "" },
  age: { type: Number, min: 0, max: 100, default: 0 },
  sex: { type: String, enum: ["Female", "Male", "Unknown"], default: "Unknown" },
  weight: { type: Number, min: 0, max: 1000, default: 0 },
  notes: { type: String, trim: true, maxlength: 2000, default: "" }
}, { timestamps: true });

module.exports = mongoose.models.Pet || mongoose.model("Pet", petSchema);
