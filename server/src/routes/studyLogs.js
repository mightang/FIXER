// server/routes/studyLogs.js
import express from "express";
import { requireLogin } from "../middlewares/requireLogin.js";
import {
  getStudyLogsByUser,
  createStudyLog,
  updateStudyLog,
  deleteStudyLog,
  deleteAllStudyLogs,
} from "../services/studyLogService.js";

const router = express.Router();

// JSON 바디 파싱
router.use(express.json());

// GET /api/study-logs  → 로그인한 유저의 학습 기록 목록
router.get("/", requireLogin, (req, res) => {
  const userId = req.user.id;
  const logs = getStudyLogsByUser(userId);
  res.json({ ok: true, logs });
});

// POST /api/study-logs  → 로그인한 유저의 새 학습 기록 추가
router.post("/", requireLogin, (req, res) => {
  const userId = req.user.id;
  const log = createStudyLog(userId, req.body);
  res.status(201).json({ ok: true, log });
});

// PUT /api/study-logs/:id  → 기존 기록 수정
router.put("/:id", requireLogin, (req, res) => {
  const userId = req.user.id;
  const logId = Number(req.params.id);
  if (!Number.isInteger(logId)) {
    return res.status(400).json({ ok: false, message: "잘못된 기록 ID입니다." });
  }

  const updated = updateStudyLog(userId, logId, req.body);
  if (!updated) {
    return res
      .status(404)
      .json({ ok: false, message: "해당 기록을 찾을 수 없습니다." });
  }

  res.json({ ok: true, log: updated });
});

// DELETE /api/study-logs/:id  → 해당 기록 삭제
router.delete("/:id", requireLogin, (req, res) => {
  const userId = req.user.id;
  const logId = Number(req.params.id);
  if (!Number.isInteger(logId)) {
    return res.status(400).json({ ok: false, message: "잘못된 기록 ID입니다." });
  }

  const ok = deleteStudyLog(userId, logId);
  if (!ok) {
    return res
      .status(404)
      .json({ ok: false, message: "해당 기록을 찾을 수 없습니다." });
  }

  res.json({ ok: true });
});

// DELETE /api/study-logs  → 내 학습 기록 전체 삭제
router.delete("/", requireLogin, (req, res) => {
  const userId = req.user.id;
  deleteAllStudyLogs(userId);
  res.json({ ok: true });
});

export default router;