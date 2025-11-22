// src/services/solutionService.js
import { openai } from "./openaiClient.js";

/**
 * 풀이 힌트/설명 생성 서비스
 * @param {object} params
 */
export async function generateSolution(params = {}) {
  const {
    site = "BOJ",
    problemId = "",
    title = "",
    description = "",
    userCode = "",
    errorMessage = "",
    mode = "hint", // "hint" | "outline" | "full"
  } = params;

  const instructions = `
너는 알고리즘 문제를 설명해 주는 튜터이다.
가능하면 먼저 힌트 위주로 설명하고, mode가 "full"인 경우에만
좀 더 직접적인 풀이 요약과 의사코드 수준까지 제시해라.

반드시 JSON 형식으로만 응답해야 한다. 마크다운, 코드블록(\`\`\`)은 사용하지 마라.

응답 형식:

{
  "responseType": "hint" | "outline" | "full",
  "content": "전체 설명을 자연어로 작성",
  "steps": [
    "1단계 설명",
    "2단계 설명",
    ...
  ]
}
`;

  const userPrompt = `
사이트: ${site}
문제 번호: ${problemId}
제목: ${title}

[참고용 문제 링크]
${problemUrl || "(링크 없음)"}

[문제 본문 / 입력 및 출력 형식 / 제약 조건]
${
  statement ||
  description ||
  "(문제 설명이 충분히 주어지지 않았습니다. 테스트 케이스를 만들기 어렵다면, 안전하게 단순한 예제 위주로만 구성하세요.)"
}

[옵션]
- 난이도: ${difficulty}
- 케이스 스타일: ${style}

위의 [문제 본문 / 입력 및 출력 형식 / 제약 조건]에 명시된 형식과 제약을 반드시 따르는
테스트 케이스들을 생성해 줘.
문제 본문에 없는 정보(예: 새로운 제약, 임의의 범위)는 마음대로 추가하지 마라.
`;

  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    instructions,
    input: userPrompt,
  });

  const rawText = response.output_text || "";

  let result = {
    responseType: mode === "full" ? "full" : mode,
    content: "",
    steps: [],
  };

  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === "object") {
      result.responseType = parsed.responseType || result.responseType;
      result.content = parsed.content || "";
      if (Array.isArray(parsed.steps)) {
        result.steps = parsed.steps.map((s) => String(s));
      }
    } else {
      console.warn("[solutionService] JSON 형태가 예상과 다릅니다.", parsed);
    }
  } catch (e) {
    console.error("[solutionService] JSON 파싱 실패:", e);
    console.error("원본 응답:", rawText);
    // 파싱 실패 시에는 전체 텍스트를 content에 넣어준다.
    result.content = rawText;
    result.steps = [];
  }

  return {
    ok: true,
    site,
    problemId,
    title,
    responseType: result.responseType,
    content: result.content,
    steps: result.steps,
  };
}