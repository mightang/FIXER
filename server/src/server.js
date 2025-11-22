// backend/src/server.js
import express from "express";
import cors from "cors";
import { PORT } from "./config/env.js";
import testcasesRouter from "./routes/testcases.js";
import solutionRouter from "./routes/solution.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

// CORS 허용 (필요하면 origin 제한 가능)
app.use(
  cors({
    origin: "*", // 개발 단계라 편하게 전체 허용 (나중엔 프론트 주소로 제한 가능)
  })
);

// JSON body 파싱
app.use(express.json());

// 간단 헬스 체크
app.get("/", (req, res) => {
  res.json({ ok: true, message: "알고리즘 도우미 백엔드 실행 중" });
});

// API 라우트
app.use("/api/testcases", testcasesRouter);
app.use("/api/solution", solutionRouter);

// 에러 핸들러 (항상 마지막에)
app.use(errorHandler);

// 서버 시작
app.listen(PORT, () => {
  console.log(`✅ Backend server listening on http://localhost:${PORT}`);
});