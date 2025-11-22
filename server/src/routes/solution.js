// src/routes/solution.js
import express from "express";
import { generateSolution } from "../services/solutionService.js";

const router = express.Router();

// POST /api/solution
router.post("/", async (req, res, next) => {
  try {
    const params = req.body || {};
    const result = await generateSolution(params);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;