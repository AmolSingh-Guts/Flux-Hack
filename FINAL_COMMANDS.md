# Brightloop Software — Final Commands

Run the backend and frontend in two separate terminal windows.

## Terminal 1: Backend

```bash
cd "/Users/pateldevasya/Desktop/Odoo Ready /backend"
npm install
npm run db:setup
npm run dev
```

The backend listens on `http://localhost:4000`.

## Terminal 2: Frontend

```bash
cd "/Users/pateldevasya/Desktop/Odoo Ready /frontend"
npm install
npm run build
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/`.

Keep the existing `backend/.env` and `frontend/.env` files. They contain local configuration and are not distributed in the repair ZIP. Make sure MySQL is running before starting the backend. The backend `CLIENT_ORIGIN` should include `http://127.0.0.1:5173`.

## Seeded demo credentials

When the database is empty and `npm run db:setup` successfully seeds it:

- Admin: `admin@brightloop.test` / `Admin@1234`
- Staff: `staff@brightloop.test` / `Staff@1234`
- Customer: `customer@brightloop.test` / `Customer@1234`

The seed script skips seeding if users already exist. `npm run db:reset` is destructive and deletes existing business data; do not use it on a database you need to preserve.

## Checks

```bash
# Frontend
npm run build
npm run lint

# Backend (from backend folder)
npm run check
npm test
```

Backend tests require a running MySQL server and a configured test database.
