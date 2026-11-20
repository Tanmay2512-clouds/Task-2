const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
  clinic: { type: String, required: true, trim: true, maxlength: 120 },
  veterinarian: { type: String, trim: true, maxlength: 80, default: "" },
  reason: { type: String, required: true, trim: true, maxlength: 160 },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ["Upcoming", "Completed", "Cancelled"], default: "Upcoming" },
  notes: { type: String, trim: true, maxlength: 2000, default: "" }
}, { timestamps: true });

module.exports = mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);
