// server/config/db.js
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 현재 파일: server/src/config/db.js
// ⇒ .. ⇒ server/src
// ⇒ .. ⇒ server
// ⇒ server/data/fixer.db 사용
const dbDir = path.join(__dirname, "..", "..", "data");

// data 디렉토리가 없으면 먼저 만들어 주기
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 여기서 경로 문자열을 만들고
const dbPath = path.join(dbDir, "fixer.db");

// 여기서 실제 DB 인스턴스를 만든다
const db = new Database(dbPath);

// 테이블 생성 (없으면 생성)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS study_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    problem_id TEXT,
    title TEXT,
    language TEXT,
    code TEXT,
    is_solved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

export default db;