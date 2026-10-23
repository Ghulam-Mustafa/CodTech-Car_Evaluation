import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { sign } from "../middleware/auth.js";

const router = express.Router();

router.post("/:mode(register|login)", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: "Enter an email and a password of 6+ characters." });
  }
  const normalizedEmail = email.toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE email=?").get(normalizedEmail);
  if (req.params.mode === "register") {
    if (user) return res.status(409).json({ error: "That email is already registered." });
    const id = db.prepare("INSERT INTO users(email,hash) VALUES(?,?)")
      .run(normalizedEmail, bcrypt.hashSync(password, 10)).lastInsertRowid;
    return res.json({ token: sign({ id }) });
  }
  if (!user || !bcrypt.compareSync(password, user.hash)) {
    return res.status(401).json({ error: "Wrong email or password." });
  }
  res.json({ token: sign(user) });
});

export default router;
