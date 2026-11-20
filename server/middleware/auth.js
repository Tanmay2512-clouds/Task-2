const jwt = require("jsonwebtoken");
const User = require("../models/User");

function getSecret() {
  if (!process.env.JWT_SECRET) {
    const error = new Error("JWT_SECRET is not configured.");
    error.status = 503;
    throw error;
  }
  return process.env.JWT_SECRET;
}

function createToken(userId) {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: "7d" });
}

function setAuthCookie(res, token) {
  res.cookie("pawcare_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.pawcare_token;
    if (!token) return res.status(401).json({ error: "Please sign in to continue." });
    const payload = jwt.verify(token, getSecret());
    const user = await User.findById(payload.sub).select("name email");
    if (!user) return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }
    next(error);
  }
}

module.exports = { createToken, setAuthCookie, requireAuth };
