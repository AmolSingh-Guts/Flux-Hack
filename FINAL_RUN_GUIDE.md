# Brightloop Software — Final Run Guide

## 1. Start the backend (Terminal 1)

```bash
cd "Odoo Final/backend"
cp .env.example .env  # edit DB_PASSWORD if your MySQL root account has a password
npm install
npm run db:setup
npm run dev
```

The API should report that it is listening on `http://localhost:4000`.

> Copy `.env.example` to `.env` before starting. Set `DB_PASSWORD` in `backend/.env` to your local MySQL password if required. `npm run db:setup` creates/migrates the database and inserts demo data on a fresh database. It does not overwrite a database that already has users. Do not run `npm run db:reset` on a database containing work you need to keep.

## 2. Start the frontend (Terminal 2)

```bash
cd "Odoo Final/frontend"
cp .env.example .env
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## 3. Development demo accounts

These accounts are inserted by the demo database seed on a fresh database:

| Role | Email | Password |
|---|---|---|
| Admin | admin@brightloop.test | Admin@1234 |
| Staff | staff@brightloop.test | Staff@1234 |
| Customer | customer@brightloop.test | Customer@1234 |

The role shortcuts are shown only in Vite development mode. They fill the form; you must still click Sign in. They are not a production authentication bypass.

## 4. If the login page says it cannot reach the API

- Keep the backend terminal running on port `4000`.
- Check `http://127.0.0.1:4000/api/health` in your browser.
- Ensure `frontend/.env` contains `VITE_API_BASE_URL=/api` and `API_PROXY_TARGET=http://127.0.0.1:4000`.
- Restart Vite after changing `.env`.
- Confirm MySQL is running and the backend terminal has no database connection errors.

## 5. Production build

```bash
cd "Odoo Final/frontend"
npm run build
```

A successful build creates `frontend/dist`.
