// backend/src/middlewares/errorHandler.js
export function errorHandler(err, req, res, next) {
  console.error("[ERROR]", err);

  const status = err.status || 500;
  const message =
    err.message || "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

  res.status(status).json({
    ok: false,
    message,
  });
}