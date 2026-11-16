# Jobster API

Job application tracker: a REST API plus the prebuilt React front-end (Jobster) served from the same Express app.
Users register / log in with JWT, manage only their own jobs, search / filter / sort / paginate them,
and see stats by status and by month. Built while following the "Jobster API" section of a Node.js / Express course.

- **Live:** https://jobster-api-p596.onrender.com
- **Docs (Swagger UI):** https://jobster-api-p596.onrender.com/api-docs
- **Demo:** click **Demo App** on the register page (`testUser@test.com` / `secret`) — read-only

> Hosted on Render's free tier — the first request after ~15 min of inactivity can take 30–60 s.

## Tech stack

Node.js 22 · Express 4 · MongoDB Atlas + Mongoose 9 · JWT (jsonwebtoken 9) · bcryptjs · moment ·
helmet · cors · xss-clean · express-rate-limit · swagger-ui-express + yamljs · React (prebuilt in `client/build`)

## Getting started

```bash
npm install
npm run dev   # nodemon, auto-reload
npm start     # plain node (used in production)
```

Create `.env` in the project root:

```env
PORT=5000
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<long random string>
JWT_LIFETIME=30d
```

Then open http://localhost:5000 (front-end) or http://localhost:5000/api-docs (API docs).

Optional: register the demo user, set its `_id` as `createdBy` in `mock-data.json`, and run `node populate.js` once
to load 75 sample jobs (running it again adds them again).

## API

Base URL: `/api/v1`. `/jobs` routes and `PATCH /auth/updateUser` require `Authorization: Bearer <token>`.

| Method | Route              | Description                                                                    |
|--------|--------------------|--------------------------------------------------------------------------------|
| POST   | `/auth/register`   | Register — `{ user: { email, name, lastName, location, token } }`              |
| POST   | `/auth/login`      | Login — same shape as register                                                 |
| PATCH  | `/auth/updateUser` | Update `email`, `name`, `lastName`, `location` — returns the user + new token  |
| GET    | `/jobs`            | Jobs of the current user — `{ jobs, totalJobs, numOfPages }`                   |
| POST   | `/jobs`            | Create job — `{ job }`                                                         |
| GET    | `/jobs/stats`      | `{ defaultStats: { pending, interview, declined }, monthlyApplications }`      |
| GET    | `/jobs/:id`        | Single job — `{ job }`                                                         |
| PATCH  | `/jobs/:id`        | Update job (partial) — `{ job }`                                               |
| DELETE | `/jobs/:id`        | Delete job                                                                     |

`GET /jobs` query parameters (all optional):

| Param     | Values                                               |
|-----------|------------------------------------------------------|
| `search`  | substring of `position`, case-insensitive            |
| `status`  | `all`, `interview`, `declined`, `pending`            |
| `jobType` | `all`, `full-time`, `part-time`, `remote`, `internship` |
| `sort`    | `latest`, `oldest`, `a-z`, `z-a`                     |
| `page`    | default `1`                                          |
| `limit`   | default `10`                                         |

Errors always come back as `{ msg }`:

| Case                                                   | Status |
|--------------------------------------------------------|--------|
| Mongoose validation error, duplicate email (11000)     | 400    |
| Demo user tries to create / update / delete            | 400    |
| Missing / invalid token, wrong credentials             | 401    |
| Job not found, or invalid id (CastError)               | 404    |
| Rate limit: 10 login/register or 1000 requests / 15 min per IP | 429 |

## Project structure

```
app.js                        # middleware, Swagger, API routes, serves client/build + index.html fallback
db/connect.js                 # mongoose.connect
models/User.js                # validation, lastName/location, pre('save') hashing (only if modified)
models/Job.js                 # company, position, status, jobType, jobLocation, createdBy -> User
controllers/auth.js           # register, login, updateUser
controllers/jobs.js           # CRUD, search/filter/sort/pagination, stats (aggregation pipelines)
middleware/authentication.js  # verifies Bearer token, sets req.user (+ testUser flag)
middleware/testUser.js        # blocks writes for the demo user
middleware/error-handler.js   # maps Mongoose/Mongo errors to status codes
routes/                       # auth (with login/register rate limiter), jobs
errors/                       # CustomAPIError + BadRequest / Unauthenticated / NotFound
client/build/                 # prebuilt React front-end (committed — Render doesn't build it)
swagger.yaml                  # OpenAPI 3.0 spec served at /api-docs
mock-data.json, populate.js   # sample jobs for the demo user
```

## Deployment ([Render](https://render.com))

Live: https://jobster-api-p596.onrender.com · Docs: https://jobster-api-p596.onrender.com/api-docs

- Build command: `npm install`, start command: `npm start`
- Environment: `MONGO_URI`, `JWT_SECRET`, `JWT_LIFETIME` (`PORT` is set by Render)
- MongoDB Atlas → Network Access must allow Render's IPs
- `app.set('trust proxy', 1)` so the rate limiters see real client IPs behind Render's proxy
- `engines.node` in `package.json` pins Node 22 on Render
- Every push to `main` triggers an auto-deploy

## Differences from the course

- Mongoose 9: `pre('save')` without `next`, `{ returnDocument: 'after' }`, `new mongoose.Types.ObjectId(...)`
  in aggregations (calling it without `new` throws)
- Kept Swagger, CORS and a global rate limiter (1000 / 15 min) instead of removing them
- Search escapes regex special characters (`c++`, `(` no longer break the query or return 500)
- Invalid `page` / `limit` fall back to defaults; `a-z` / `z-a` sort uses `_id` as a tie-breaker so pages don't overlap
- Demo user is detected by email instead of a hard-coded `_id`, so it survives a fresh database
- Deployed to Render instead of Heroku; Node 22 instead of 16
