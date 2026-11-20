const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
  medication: { type: String, required: true, trim: true, maxlength: 120 },
  dosage: { type: String, required: true, trim: true, maxlength: 120 },
  frequency: { type: String, required: true, trim: true, maxlength: 120 },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  veterinarian: { type: String, trim: true, maxlength: 80, default: "" },
  instructions: { type: String, trim: true, maxlength: 1000, default: "" }
}, { timestamps: true });

module.exports = mongoose.models.Prescription || mongoose.model("Prescription", prescriptionSchema);
