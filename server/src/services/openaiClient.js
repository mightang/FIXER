// src/services/openaiClient.js
import OpenAI from "openai/index.js";
import { OPENAI_API_KEY } from "../config/env.js";

if (!OPENAI_API_KEY) {
  console.warn(
    "[openaiClient] OPENAI_API_KEY가 설정되지 않았습니다. 실제 호출 시 오류가 발생합니다."
  );
}

// 클라이언트 한 번만 만들어서 export
export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY || undefined, // env에서 자동으로 읽기도 함
});