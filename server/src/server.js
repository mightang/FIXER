// backend/src/server.js
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";

import { PORT, SESSION_SECRET, NODE_ENV } from "./config/env.js";
import testcasesRouter from "./routes/testcases.js";
import solutionRouter from "./routes/solution.js";
import runRouter from "./routes/run.js";
import authRouter from "./routes/auth.js";
import studyLogsRouter from "./routes/studyLogs.js";
import { errorHandler } from "./middlewares/errorHandler.js";

import "./config/passportGoogle.js";

const app = express();
app.set("trust proxy", 1);
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://mightang.github.io",
    ],
    credentials: true,
  })
);

// JSON body 파싱
app.use(express.json());

// 세션 설정
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === "production",
      sameSite: NODE_ENV === "production" ? "none" : "lax",
    },
  })
);


// Passport 초기화 + 세션 연동
app.use(passport.initialize());
app.use(passport.session());

// 간단 헬스 체크
app.get("/", (req, res) => {
  res.json({ ok: true, message: "백엔드 서버 실행 중" });
});

// API 라우트
app.use("/auth", authRouter);
app.use("/api/testcases", testcasesRouter);
app.use("/api/solution", solutionRouter);
app.use("/api/run", runRouter);
app.use("/api/study-logs", studyLogsRouter);

// 에러 핸들러 (항상 마지막에)
app.use(errorHandler);

// 서버 시작
app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});