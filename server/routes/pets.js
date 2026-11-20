const express = require("express");
const Pet = require("../models/Pet");
const Appointment = require("../models/Appointment");
const Prescription = require("../models/Prescription");
const pickFields = require("../utils/pickFields");

const router = express.Router();
const petFields = ["name", "species", "breed", "age", "sex", "weight", "notes"];

router.get("/", async (req, res, next) => {
  try {
    const pets = await Pet.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ pets });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const pet = await Pet.create({ ...pickFields(req.body, petFields), owner: req.user.id });
    res.status(201).json({ pet });
  } catch (error) { next(error); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const updates = pickFields(req.body, petFields);
    if (!Object.keys(updates).length) return res.status(400).json({ error: "Provide at least one pet detail to update." });
    const pet = await Pet.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      updates,
      { new: true, runValidators: true, strict: "throw" }
    );
    if (!pet) return res.status(404).json({ error: "Pet not found." });
    res.json({ pet });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const pet = await Pet.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!pet) return res.status(404).json({ error: "Pet not found." });
    await Promise.all([
      Appointment.deleteMany({ owner: req.user.id, pet: pet.id }),
      Prescription.deleteMany({ owner: req.user.id, pet: pet.id })
    ]);
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
