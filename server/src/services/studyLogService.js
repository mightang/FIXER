// server/services/studyLogService.js
import db from "../config/db.js";

// 유저별 전체 목록 조회
export function getStudyLogsByUser(userId) {
  const rows = db
    .prepare(
      `SELECT id, user_id, problem_id, title, language, code, is_solved, created_at, updated_at
       FROM study_logs
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(userId);

  return rows.map((row) => ({
    ...row,
    is_solved: !!row.is_solved,
  }));
}

// 새 로그 생성
export function createStudyLog(userId, payload = {}) {
  const { problemId, title, language, code, isSolved } = payload;

  const stmt = db.prepare(
    `INSERT INTO study_logs (user_id, problem_id, title, language, code, is_solved)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const info = stmt.run(
    userId,
    problemId ?? null,
    title ?? null,
    language ?? null,
    code ?? null,
    isSolved ? 1 : 0
  );

  const row = db
    .prepare(
      `SELECT id, user_id, problem_id, title, language, code, is_solved, created_at, updated_at
       FROM study_logs
       WHERE id = ?`
    )
    .get(info.lastInsertRowid);

  return { ...row, is_solved: !!row.is_solved };
}

// 기존 로그 수정
export function updateStudyLog(userId, logId, payload = {}) {
  const { problemId, title, language, code, isSolved } = payload;

  const stmt = db.prepare(
    `UPDATE study_logs
     SET
       problem_id = COALESCE(?, problem_id),
       title      = COALESCE(?, title),
       language   = COALESCE(?, language),
       code       = COALESCE(?, code),
       is_solved  = COALESCE(?, is_solved),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  );

  const info = stmt.run(
    problemId ?? null,
    title ?? null,
    language ?? null,
    code ?? null,
    typeof isSolved === "boolean" ? (isSolved ? 1 : 0) : null,
    logId,
    userId
  );

  if (info.changes === 0) return null;

  const row = db
    .prepare(
      `SELECT id, user_id, problem_id, title, language, code, is_solved, created_at, updated_at
       FROM study_logs
       WHERE id = ?`
    )
    .get(logId);

  return { ...row, is_solved: !!row.is_solved };
}

// 단일 로그 삭제
export function deleteStudyLog(userId, logId) {
  const stmt = db.prepare(
    `DELETE FROM study_logs
     WHERE id = ? AND user_id = ?`
  );
  const info = stmt.run(logId, userId);
  return info.changes > 0;
}

// 해당 유저 로그 전체 삭제
export function deleteAllStudyLogs(userId) {
  const stmt = db.prepare(
    `DELETE FROM study_logs
     WHERE user_id = ?`
  );
  stmt.run(userId);
}