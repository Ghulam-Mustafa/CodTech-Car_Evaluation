import jwt from "jsonwebtoken";
import { config } from "../config.js";

export const sign = user => jwt.sign({ id: user.id }, config.secret, { expiresIn: "7d" });

export const auth = (req, res, next) => {
  try {
    req.uid = jwt.verify((req.headers.authorization || "").replace("Bearer ", ""), config.secret).id;
    next();
  } catch {
    res.status(401).json({ error: "Please sign in again." });
  }
};
