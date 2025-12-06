// server/middlewares/requireLogin.js
export function requireLogin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      message: "로그인이 필요합니다.",
    });
  }
  next();
}