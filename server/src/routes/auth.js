// server/routes/auth.js
import express from "express";
import passport from "passport";
import { FRONTEND_URL } from "../config/env.js";

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

// 4) 현재 로그인 상태 확인
//    프론트에서 /auth/me를 호출해서 로그인 여부/유저 정보 확인
router.get("/me", (req, res) => {
  if (!req.user) {
    return res.json({
      loggedIn: false,
      user: null,
    });
  }

  res.json({
    loggedIn: true,
    user: req.user,
  });
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