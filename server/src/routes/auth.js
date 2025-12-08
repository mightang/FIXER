// server/routes/auth.js
import express from "express";
import passport from "passport";
import { FRONTEND_URL } from "../config/env.js";
import db from "../config/db.js";

const router = express.Router();

// 1) 구글 로그인 시작
//    프론트에서 이 URL로 리다이렉트하면 구글 로그인 화면으로 넘어감
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// 2) 구글 로그인 콜백 처리
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/fail",
    session: true,
  }),
  (req, res) => {
    // 여기까지 오면 로그인 성공
    // 세션에 req.user가 들어가 있는 상태
    const redirectTo = FRONTEND_URL || "http://localhost:5500/index.html";
    res.redirect(redirectTo);
  }
);

// 3) 로그인 실패했을 때 (디버그용)
router.get("/fail", (req, res) => {
  res.status(401).json({
    ok: false,
    message: "Google 로그인에 실패했습니다.",
  });
});

router.get("/me", (req, res) => {
  if (!req.user) {
    return res.json({
      loggedIn: false,
      user: null,
    });
  }

  // 여기서 관리자(테스트) 계정인지 판정
  const isAdmin =
    req.user.google_id === "local:test" ||
    req.user.email === "admin@test.local" ||
    req.user.name === "테스트 계정";

  // 프론트로 넘길 안전한 유저 정보
  const safeUser = {
    id: req.user.id,
    google_id: req.user.google_id,
    email: req.user.email,
    name: req.user.name,
    isAdmin,
  };

  res.json({
    loggedIn: true,
    user: safeUser,
  });
});

// 관리자 / 테스트 계정용 아이디/비밀번호 로그인
router.post("/admin-login", (req, res, next) => {
  const { username, password } = req.body || {};

  // 고정 관리자 계정 검증
  if (username !== "test" || password !== "1234") {
    return res.status(401).json({
      ok: false,
      message: "아이디 또는 비밀번호가 올바르지 않습니다.",
    });
  }

  try {
    // users 테이블에 이 계정이 없으면 생성
    const googleId = "local:test"; // 구글 계정 대신 쓰는 내부용 ID
    const email = "admin@test.local";
    const name = "테스트 계정";

    const insertStmt = db.prepare(
      `INSERT OR IGNORE INTO users (google_id, email, name)
       VALUES (?, ?, ?)`
    );
    insertStmt.run(googleId, email, name);

    // 방금(또는 기존) 생성된 유저 조회
    const user = db
      .prepare(
        "SELECT id, google_id, email, name FROM users WHERE google_id = ?"
      )
      .get(googleId);

    // passport가 제공하는 req.login으로 세션에 user 심기
    req.login(user, err => {
      if (err) return next(err);

      return res.json({
        ok: true,
        user,
      });
    });
  } catch (err) {
    console.error("admin-login error:", err);
    next(err);
  }
});


// 5) 로그아웃
router.post("/logout", (req, res, next) => {
  // passport가 추가해주는 logout 함수
  req.logout(err => {
    if (err) return next(err);

    // 세션 제거
    req.session.destroy(() => {
      // 세션 쿠키 제거 (기본 이름: connect.sid)
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });
});

export default router;