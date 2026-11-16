# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

This is section **06.5-jobster-api** (Udemy "Section 10: Jobster API (Extra Project)") of a Node.js/Express course. The backend here is Ilya's own finished Jobs API copied from `../../06-jobs-api/starter` on 2026-11-16 (not the course's starter code), so it already has the bumped dependency versions and his Ukrainian comments. The original 06 project (own git repo, deployed to Render) must stay untouched. `client/` is the course's prebuilt React front-end (`client/build`). `README.MD` is now the project README (API, deploy, differences from the course); the course lesson plan for this section lives in `../final/README.MD` (identical copy of the original). Ilya prefers to keep existing features (Swagger, CORS, rate limiter) rather than delete them where the README says to remove them. The sections below still describe the Jobs API base. `.env` here uses DB `06-5-JOBSTER-API` (DB names can't contain a dot). This folder has its own local git repo (`main`, created 2026-11-16, like 03–06); no remote yet — the GitHub repo is added at the deploy lesson.

A completed reference implementation lives at `../final/` — consult it when you need to see the target architecture or resolve ambiguity about what a lesson is building toward. Do **not** copy-paste from `final/`; Ilya is learning and wants to type the code himself. Offer snippets inline in chat or explain approaches instead.

## Commands

- `npm install` — install dependencies
- `npm run dev` — runs `nodemon app.js` (auto-reloads on file changes) — use this locally
- `npm start` — `node app.js` (production; hosting runs this, nodemon is only a devDependency)

There is no lint or test setup in this starter.

## Environment

`.env` (gitignored):
- `PORT=5000` — 3000 is taken by another local project
- `MONGO_URI` — Atlas `Cluster0` (same cluster as 04-store-api), DB name `06-JOBS-API`; added during the "Database Connection" lesson
- `JWT_SECRET`, `JWT_LIFETIME` (e.g. `30d`) — used by the User model's `createJWT` and the auth middleware

## Architecture (target, see `../final/`)

- **app.js** — dotenv, express-async-errors, security middleware (helmet, cors, xss-clean, express-rate-limit), Swagger UI at `/api-docs`, `/api/v1/auth` (public) and `/api/v1/jobs` (behind `authenticateUser`), then `notFound` and `errorHandler`; `start()` awaits `connectDB(MONGO_URI)` before `listen`.
- **models/User.js** — name/email/password with Mongoose validation; `pre('save')` hashes the password with bcryptjs; instance methods `createJWT` and `comparePassword`.
- **models/Job.js** — company, position, status, `createdBy` (ref User).
- **controllers/auth.js** — `register`, `login` (BadRequestError / UnauthenticatedError).
- **controllers/jobs.js** — CRUD scoped to `req.user.userId`.
- **middleware/authentication.js** — verifies `Bearer` token, sets `req.user = { userId, name }`.
- **errors/** — `CustomAPIError` + `BadRequestError`, `UnauthenticatedError`, `NotFoundError` with an `index.js` barrel (already provided).
- **middleware/error-handler.js** — later extended to map Mongoose validation, duplicate-key (11000) and CastError to proper status codes.

## Version differences vs the course

Bumped: `mongoose` 9.7.2, `jsonwebtoken` 9, `dotenv` 16, `express` 4.21, `nodemon` 3. `db/connect.js` already simplified to `mongoose.connect(url)` (old options throw in v6+).

Mongoose 9 vs the course's v5:
- `pre('save', async function () {...})` — no `next` parameter, don't call `next()`.
- `findOneAndUpdate(..., { new: true })` → `{ returnDocument: 'after', runValidators: true }`.
- `findByIdAndRemove` / `findOneAndRemove` were removed → `findOneAndDelete`.

Security/docs packages (helmet 4, express-rate-limit 5, xss-clean, swagger-ui-express 4, yamljs) are still at course versions; decide on upgrades when those lessons arrive (express-rate-limit 7 renamed `max` → `limit`; xss-clean is unmaintained).

## Course workflow

- When Ilya asks for help implementing something, explain the concept and show the code inline — don't write it to his files unless he explicitly asks.
- If he's stuck, compare his code against `../final/` mentally and point out specific differences rather than dumping the whole reference.
- After a lesson he runs `/lesson-explain`; he often asks to commit afterwards; push only when he says so.
