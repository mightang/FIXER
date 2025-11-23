// backend/src/config/env.js
import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
export const NODE_ENV = process.env.NODE_ENV || "development";

// JDoodle 코드 실행 API용
export const JDOODLE_CLIENT_ID = process.env.JDOODLE_CLIENT_ID || "84040c830118814f67f2be92f38726d6";
export const JDOODLE_CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET || "b086213ad4c4d76889d7ab0ecc52baf9989f26d74ff2ced04d62a4705772b773";