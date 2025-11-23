// src/services/runService.js
import { JDOODLE_CLIENT_ID, JDOODLE_CLIENT_SECRET } from "../config/env.js";

/**
 * JDoodle에서 사용하는 언어/버전 매핑
 * 필요하면 나중에 언어 더 추가 가능
 */
const LANGUAGE_MAP = {
  cpp: { language: "cpp17", versionIndex: "0" },
  c: { language: "c", versionIndex: "5" },
  python: { language: "python3", versionIndex: "3" },
};

/**
 * 외부 코드 실행 서비스 (JDoodle)
 * @param {object} params
 * @param {string} params.language - "cpp" | "python" 등 (우리가 정한 코드)
 * @param {string} params.source   - 전체 소스 코드
 * @param {string} params.stdin    - 표준 입력
 */
export async function runCode(params = {}) {
  const {
    language = "cpp",
    source = "",
    stdin = "",
  } = params;

  if (!JDOODLE_CLIENT_ID || !JDOODLE_CLIENT_SECRET) {
    const err = new Error("JDoodle API 자격 증명이 설정되지 않았습니다.");
    err.status = 500;
    throw err;
  }

  const mapped = LANGUAGE_MAP[language];
  if (!mapped) {
    const err = new Error(`지원하지 않는 언어입니다: ${language}`);
    err.status = 400;
    throw err;
  }

  const payload = {
    clientId: JDOODLE_CLIENT_ID,
    clientSecret: JDOODLE_CLIENT_SECRET,
    script: source,
    stdin,
    language: mapped.language,
    versionIndex: mapped.versionIndex,
  };

  const response = await fetch("https://api.jdoodle.com/v1/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err = new Error(
      `JDoodle API 호출 실패 (status ${response.status}): ${text || "no body"}`
    );
    err.status = 502;
    throw err;
  }

  const data = await response.json();

  // JDoodle 기본 응답: output, statusCode, memory, cpuTime, error 등
  const stdout = data.output || "";
  const stderr = data.error || "";
  const statusCode = data.statusCode ?? "";

  return {
    ok: true,
    language,
    stdin,
    stdout,
    stderr,
    statusCode,
    cpuTime: data.cpuTime ?? "",
    memory: data.memory ?? "",
    raw: data, // 필요하면 프론트에서 디버깅용으로 볼 수 있게
  };
}