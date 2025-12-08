// src/services/testcaseService.js
import { openai } from "./openaiClient.js";

/**
 * 테스트 케이스 생성 서비스
 * @param {object} params 프론트에서 넘어온 정보
 */
// src/services/testcaseService.js
function looksLikeGarbage(text = "") {
  const trimmed = text.trim();
  if (!trimmed) return true;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (trimmed.length < 30 || wordCount < 5) return true;
  const normalized = trimmed.replace(/\s+/g, "");
  if (/^[a-zA-Z]+$/.test(normalized) && normalized.length <= 8) return true;
  return false;
}

export async function generateTestcases(params = {}) {
  const {
    site = "BOJ",
    statement = "",
    difficulty = "auto",
    style = "mixed",
    examples = [],
  } = params;

  if (looksLikeGarbage(statement)) {
    return {
      ok: false,
      message:
        "문제 설명이 너무 짧거나 의미를 파악하기 어렵습니다.\n" +
        "알고리즘 문제 전체를 붙여 넣어 주세요.",
    };
  }

  // 1) 모델에게 줄 설명 (역할)
  const instructions = `
너는 알고리즘 온라인 저지(BOJ, Programmers, LeetCode 등) 문제를 위한 테스트 케이스를 설계하는 도우미이다.
반드시 JSON 형식으로만 응답해야 한다. 마크다운, 설명 문장, 코드블록(\`\`\`)은 쓰지 마라.

응답 형식은 정확히 다음과 같아야 한다:

{
  "cases": [
    {
      "input": "입력 예시(개행 포함)",
      "output": "정답 출력 예시(개행 포함)",
      "note": "이 케이스의 의도나 특징(엣지 케이스, 최대값 등)"
    },
    ...
  ]
}

- cases 배열 길이는 보통 3~6개 정도로 만들어라.
- 입력/출력은 실제 온라인 저지에서 그대로 복붙해서 쓸 수 있는 형식으로 작성해라.
- 아래에 주어지는 문제 설명, 입력/출력 형식, 제약 조건에 **없는 내용은 새로 상상해서 만들지 마라.**
- 특히 변수의 범위, 입력 개수, 자료형 등은 반드시 주어진 정보 안에서만 가정해라.
- 사용자가 제공한 예시 테스트 케이스와 모순되는 출력이나 형식은 절대 만들지 마라.
`;

  // 예시 텍스트 구성
  let examplesText = "(예시 테스트 케이스가 제공되지 않았습니다.)";
  if (Array.isArray(examples) && examples.length > 0) {
    const lines = examples.map((ex, idx) => {
      const ip = (ex && ex.input) ? String(ex.input) : "";
      const op = (ex && ex.output) ? String(ex.output) : "";
      return `예시 ${idx + 1} 입력:
${ip}

예시 ${idx + 1} 출력:
${op}`;
    });
    examplesText = lines.join("\n\n");
  }

  // 2) 사용자 프롬프트 구성
  const userPrompt = `
사이트: ${site}

[문제 설명 / 입력 및 출력 형식 / 제약 조건]
${statement || "(문제 설명이 제공되지 않았습니다.)"}

[제공된 예시 테스트 케이스]
${examplesText}

[옵션]
- 난이도: ${difficulty}
- 케이스 스타일: ${style}

위의 문제 설명과 예시 테스트 케이스를 기준으로,
형식과 제약을 엄격히 지키는 추가 테스트 케이스들을 생성해라.
예시와 모순되는 출력이나 형식은 만들지 마라.
`;

  // 3) OpenAI Responses API 호출
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    instructions,
    input: userPrompt,
  });

  const rawText = response.output_text || "";

  // 4) JSON 파싱 시도
  let cases = [];
  try {
    const parsed = JSON.parse(rawText);
    if (parsed && Array.isArray(parsed.cases)) {
      cases = parsed.cases.map((c) => ({
        input: c.input ?? "",
        output: c.output ?? "",
        note: c.note ?? "",
      }));
    } else {
      console.warn(
        "[testcaseService] parsed JSON에 cases 배열이 없습니다.",
        parsed
      );
    }
  } catch (e) {
    console.error("[testcaseService] JSON 파싱 실패:", e);
    console.error("원본 응답:", rawText);
  }

  // 5) 파싱 실패 or 빈 배열이면 최소한의 fallback 더미 하나 생성
  if (cases.length === 0) {
    cases = [
      {
        input: "1\n1\n",
        output: "1\n",
        note: "파싱 실패로 인한 기본 예제 (백엔드 fallback)",
      },
    ];
  }

  // 6) 라우터에 넘길 최종 결과
  return {
    ok: true,
    site,
    statement,
    examples,
    cases,
  };
}