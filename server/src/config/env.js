// backend/src/config/env.js
import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
export const NODE_ENV = process.env.NODE_ENV || "development";

// JDoodle 코드 실행 API용
export const JDOODLE_CLIENT_ID = process.env.JDOODLE_CLIENT_ID || "";
export const JDOODLE_CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET || "";

// Google OAuth용
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
export const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:3000/auth/google/callback"; // 로컬 기본값

// 세션, 프론트엔드 주소
export const SESSION_SECRET =
  process.env.SESSION_SECRET || "fixer-session-secret";
export const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5500/index.html"; // 로컬 개발 시 프론트 주소
