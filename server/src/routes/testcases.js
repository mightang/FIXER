// src/routes/testcases.js
import express from "express";
import { generateTestcases } from "../services/testcaseService.js";

const router = express.Router();

// POST /api/testcases
router.post("/", async (req, res, next) => {
  try {
    const params = req.body || {};
    const result = await generateTestcases(params);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;