// server/config/passportGoogle.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} from "./env.js";
import db from "./db.js";

// 전략 등록
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_REDIRECT_URI,
    },
    (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || null;
        const name = profile.displayName || email || "No Name";

        // users 테이블에 upsert
        const stmt = db.prepare(`
          INSERT INTO users (google_id, email, name)
          VALUES (?, ?, ?)
          ON CONFLICT(google_id)
          DO UPDATE SET
            email = excluded.email,
            name  = excluded.name
        `);
        stmt.run(googleId, email, name);

        // 방금(or 기존) 유저 정보 가져오기
        const user = db
          .prepare("SELECT id, google_id, email, name FROM users WHERE google_id = ?")
          .get(googleId);

        // 세션에 태울 user 객체
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// 세션에 user.id만 저장
passport.serializeUser((user, done) => {
  done(null, user.id); // DB users.id
});

// 세션에서 user 복원
passport.deserializeUser((id, done) => {
  try {
    const user = db
      .prepare("SELECT id, google_id, email, name FROM users WHERE id = ?")
      .get(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});