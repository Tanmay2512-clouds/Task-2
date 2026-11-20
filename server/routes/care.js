const express = require("express");
const Appointment = require("../models/Appointment");
const Prescription = require("../models/Prescription");
const Pet = require("../models/Pet");
const pickFields = require("../utils/pickFields");

const router = express.Router();
const appointmentFields = ["pet", "clinic", "veterinarian", "reason", "scheduledAt", "status", "notes"];
const prescriptionFields = ["pet", "medication", "dosage", "frequency", "startDate", "endDate", "veterinarian", "instructions"];

async function verifyPet(owner, petId) {
  if (typeof petId !== "string" || !/^[a-f\d]{24}$/i.test(petId)) return false;
  return Boolean(await Pet.exists({ _id: petId, owner }));
}

router.get("/appointments", async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ owner: req.user.id }).populate("pet", "name species").sort({ scheduledAt: 1 });
    res.json({ appointments });
  } catch (error) { next(error); }
});

router.post("/appointments", async (req, res, next) => {
  try {
    if (!(await verifyPet(req.user.id, req.body.pet))) return res.status(400).json({ error: "Choose one of your pets." });
    const appointment = await Appointment.create({ ...pickFields(req.body, appointmentFields), owner: req.user.id });
    await appointment.populate("pet", "name species");
    res.status(201).json({ appointment });
  } catch (error) { next(error); }
});

router.patch("/appointments/:id", async (req, res, next) => {
  try {
    const updates = pickFields(req.body, appointmentFields);
    if (!Object.keys(updates).length) return res.status(400).json({ error: "Provide at least one appointment detail to update." });
    if (updates.pet && !(await verifyPet(req.user.id, updates.pet))) return res.status(400).json({ error: "Choose one of your pets." });
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      updates,
      { new: true, runValidators: true, strict: "throw" }
    ).populate("pet", "name species");
    if (!appointment) return res.status(404).json({ error: "Appointment not found." });
    res.json({ appointment });
  } catch (error) { next(error); }
});

router.delete("/appointments/:id", async (req, res, next) => {
  try {
    const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!appointment) return res.status(404).json({ error: "Appointment not found." });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get("/prescriptions", async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ owner: req.user.id }).populate("pet", "name species").sort({ startDate: -1 });
    res.json({ prescriptions });
  } catch (error) { next(error); }
});

router.post("/prescriptions", async (req, res, next) => {
  try {
    if (!(await verifyPet(req.user.id, req.body.pet))) return res.status(400).json({ error: "Choose one of your pets." });
    const prescription = await Prescription.create({ ...pickFields(req.body, prescriptionFields), owner: req.user.id });
    await prescription.populate("pet", "name species");
    res.status(201).json({ prescription });
  } catch (error) { next(error); }
});

router.patch("/prescriptions/:id", async (req, res, next) => {
  try {
    const updates = pickFields(req.body, prescriptionFields);
    if (!Object.keys(updates).length) return res.status(400).json({ error: "Provide at least one prescription detail to update." });
    if (updates.pet && !(await verifyPet(req.user.id, updates.pet))) return res.status(400).json({ error: "Choose one of your pets." });
    const prescription = await Prescription.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      updates,
      { new: true, runValidators: true, strict: "throw" }
    ).populate("pet", "name species");
    if (!prescription) return res.status(404).json({ error: "Prescription not found." });
    res.json({ prescription });
  } catch (error) { next(error); }
});

router.delete("/prescriptions/:id", async (req, res, next) => {
  try {
    const prescription = await Prescription.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!prescription) return res.status(404).json({ error: "Prescription not found." });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get("/history", async (req, res, next) => {
  try {
    const [appointments, prescriptions] = await Promise.all([
      Appointment.find({ owner: req.user.id, status: "Completed" }).populate("pet", "name").lean(),
      Prescription.find({ owner: req.user.id }).populate("pet", "name").lean()
    ]);
    const entries = [
      ...appointments.map((item) => ({
        id: item._id, type: "Appointment", title: item.reason, detail: item.clinic,
        pet: item.pet?.name || "Pet", date: item.scheduledAt, notes: item.notes
      })),
      ...prescriptions.map((item) => ({
        id: item._id, type: "Prescription", title: item.medication, detail: `${item.dosage} · ${item.frequency}`,
        pet: item.pet?.name || "Pet", date: item.startDate, notes: item.instructions
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ entries });
  } catch (error) { next(error); }
});

module.exports = router;
