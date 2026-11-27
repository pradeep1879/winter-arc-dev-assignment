# Blog Website (React + TypeScript / Express + Prisma 7)

```
blog-website/
├── backend/   Express + TypeScript, modular structure, Prisma 7 (SQLite via better-sqlite3 adapter)
└── client/    React 19 + TypeScript + Vite, React Router, TanStack Query, Axios
```

## Backend structure
```
backend/
├── prisma/            schema.prisma, migrations, seed.ts
├── prisma.config.ts   Prisma 7 config (datasource url, migrations, seed)
└── src/
    ├── config/        env validation (zod)
    ├── lib/           prisma client instance (driver adapter)
    ├── middlewares/   auth (JWT), validate (zod), error handler
    ├── modules/
    │   ├── auth/      routes · controller · service · schema
    │   ├── users/
    │   ├── posts/
    │   └── comments/
    ├── utils/         AppError, asyncHandler, jwt, slug
    ├── generated/prisma   (generated client – git-ignored)
    ├── app.ts / routes.ts / server.ts
```

## Setup
```bash
# 1. install
npm run install:all           # (or npm install in backend/ and client/)

# 2. backend env + database
cd backend
cp .env.example .env          # edit JWT_SECRET
npx prisma migrate dev        # creates SQLite db & generates client
npx prisma db seed            # optional: demo@example.com / password123

# 3. client env
cd ../client && cp .env.example .env

# 4. run both (from root)
cd .. && npm run dev          # API :4000, web :5173
```

## Environment
| App | Variable | Default |
|-----|----------|---------|
| backend | PORT | 4000 |
| backend | DATABASE_URL | file:./dev.db |
| backend | JWT_SECRET | (required) |
| backend | JWT_EXPIRES_IN | 7d |
| backend | CLIENT_URL | http://localhost:5173 (CORS) |
| client | VITE_API_URL | http://localhost:4000/api/v1 |

## API (`/api/v1`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /health | – | Health check |
| POST | /auth/register | – | Register, returns `{user, token}` |
| POST | /auth/login | – | Login |
| GET | /auth/me | ✔ | Current user |
| GET | /users/:id | – | Public profile + posts |
| GET | /posts?page&limit&search&authorId | optional | Paginated list (drafts only for author) |
| GET | /posts/:idOrSlug | optional | Single post |
| POST | /posts | ✔ | Create |
| PUT | /posts/:id | owner | Update |
| DELETE | /posts/:id | owner | Delete |
| GET | /posts/:postId/comments | – | List comments |
| POST | /posts/:postId/comments | ✔ | Add comment |
| PUT | /posts/:postId/comments/:id | owner | Edit comment |
| DELETE | /posts/:postId/comments/:id | comment or post owner | Delete comment |

## Production build
```bash
npm run build
cd backend && npm start
```
