// src/routes/run.js
import express from "express";
import { runCode } from "../services/runService.js";

const router = express.Router();

// POST /api/run
router.post("/", async (req, res, next) => {
  try {
    const { language, source, stdin } = req.body || {};

    if (!source || typeof source !== "string") {
      const err = new Error("source(코드)가 비어 있습니다.");
      err.status = 400;
      throw err;
    }

    const result = await runCode({ language, source, stdin });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;