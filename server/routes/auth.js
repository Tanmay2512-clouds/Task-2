const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { createToken, setAuthCookie, requireAuth } = require("../middleware/auth");

const router = express.Router();
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" };

function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

router.post("/register", async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!name || name.length > 80) return res.status(400).json({ error: "Enter your name (up to 80 characters)." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ error: "Password must be between 8 and 72 characters." });
    if (await User.exists({ email })) return res.status(409).json({ error: "An account with that email already exists." });

    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    setAuthCookie(res, createToken(user.id));
    res.status(201).json({ user: safeUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "An account with that email already exists." });
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    setAuthCookie(res, createToken(user.id));
    res.json({ user: safeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: safeUser(req.user) }));

router.post("/logout", (req, res) => {
  res.clearCookie("pawcare_token", cookieOptions);
  res.status(204).end();
});

module.exports = router;
