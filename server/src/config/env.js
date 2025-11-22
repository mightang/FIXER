// backend/src/config/env.js
import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
export const NODE_ENV = process.env.NODE_ENV || "development";