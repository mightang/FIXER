// src/services/solutionService.js
import { openai } from "./openaiClient.js";

/**
 * 풀이 힌트/설명 생성 서비스
 * @param {object} params
 */
export async function generateSolution(params = {}) {
  const {
    site = "BOJ",        // BOJ, Programmers, etc...
    problemId = "",      // 2606 같은 번호 (선택)
    title = "",          // 문제 제목 (선택)
    description = "",    // 문제 전문 / 설명
    userCode = "",       // 내가 시도한 코드 (선택)
    errorMessage = "",   // 컴파일/런타임 에러 메시지 (선택)
    mode = "hint",       // "hint" | "outline" | "full"
  } = params;

  const instructions = `
너는 알고리즘 문제를 설명해 주는 한국어 튜터이다.

- 사용자가 온라인 저지(BOJ, Programmers 등) 문제의 전문을 붙여 넣는다.
- 너의 역할은 "정답 코드"가 아니라, 문제를 푸는 데 도움이 되는 **풀이 아이디어 / 로직 힌트**를 제공하는 것이다.
- 가능한 한 단계별로 사고 과정을 설명해라.
- mode가 "hint"면 아주 간단한 방향 잡기 위주,
  "outline"이면 풀이 흐름과 핵심 알고리즘을 설명,
  "full"이면 거의 풀이 요약 + 의사코드 수준까지 안내하되, 여전히 최종 코드 전체는 주지 않는다.

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

  // 사용자 프롬프트 구성
  let meta = `사이트: ${site}\n`;
  if (problemId) meta += `문제 번호: ${problemId}\n`;
  if (title) meta += `제목: ${title}\n`;

  let extra = "";
  if (userCode) {
    extra += `\n[사용자가 시도한 코드]\n${userCode}\n`;
  }
  if (errorMessage) {
    extra += `\n[에러/막힌 부분]\n${errorMessage}\n`;
  }

  const userPrompt = `
${meta}

[문제 설명 / 입력 및 출력 형식 / 제약 조건]
${description || "(문제 설명이 충분히 주어지지 않았습니다.)"}

[요청 모드]
${mode}

위 문제를 이해하고 풀 수 있도록,
위에서 설명한 JSON 형식에 맞춰 풀이 힌트와 단계별 설명을 작성해라.
${extra}
`.trim();

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
      result.content = rawText;
    }
  } catch (e) {
    console.error("[solutionService] JSON 파싱 실패:", e);
    console.error("원본 응답:", rawText);
    result.content = rawText;
  }

  return {
    ok: true,
    site,
    problemId,
    title,
    mode: result.responseType,
    content: result.content,
    steps: result.steps,
  };
}