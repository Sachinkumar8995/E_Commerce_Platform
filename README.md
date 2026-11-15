# ShopEase E-commerce Platform

Full-stack demo store built with React, Express, MongoDB and Mongoose. It covers the customer journey from searchable catalogue through sandbox checkout, plus staff inventory/order management, reporting and audit history. No paid or third-party services are required.

## Architecture

- **UI:** React 18 SPA (`frontend/`), accessible forms and responsive catalogue/cart/checkout/profile/order/admin screens.
- **API:** Express REST API (`backend/src/`) with Joi-free server-side checks, JWT authentication and server-side admin role checks.
- **Persistence:** MongoDB documents described by Mongoose schemas, including stock constraints, indexes and embedded address/cart/order snapshots.
- **Design notes and ER diagram:** [docs/architecture.md](./docs/architecture.md)
- **OpenAPI:** [backend/openapi.yaml](./backend/openapi.yaml), served as YAML at `http://localhost:5000/api/docs`.

## Local setup

Requirements: Node.js 18+, npm, and MongoDB 6+ running locally. Example connection string: `mongodb://127.0.0.1:27017/ecommerce`.

1. Copy `backend/.env.example` to `backend/.env` and set `JWT_SECRET` to a private random value (at least 32 characters). `backend/.env` is ignored by git.
2. In a terminal:

   ```powershell
   Set-Location backend
   npm install
   npm run seed
   npm run dev
   ```

   The API starts at `http://localhost:5000`; health check: `/api/health`.
3. In a second terminal:

   ```powershell
   Set-Location frontend
   npm install
   npm start
   ```

   Open `http://localhost:3000`. The development server proxies `/api` to port 5000. To override it, copy `frontend/.env.example` to `frontend/.env` and set `REACT_APP_API_URL`.

Seed is repeatable and non-destructive: it updates the 20 known demo products (including names and image URLs) while preserving their current stock, and never deletes users, carts or orders.

### Demo accounts

The seed creates these dummy users if they do not already exist:

- Admin: `admin@example.com` / `Admin123!`
- Customer: `user@example.com` / `User123!`

Change these before using any publicly reachable deployment. Demo payment is simulated; do not enter card information.

## Core behavior

- Catalogue supports case-insensitive partial-term search across product names, descriptions and brands, plus category (ID or name), price range, sorting and pagination.
- The repeatable demo seed includes 20 pictured items across Electronics, Clothing, Books, Home & Kitchen and Sports. Open **Products** to browse the full list and filter by category.
- **Starter catalogue:** Electronics — Studio Wireless Headphones, Everyday Smartphone, Minimal Smart Watch, Mirrorless Travel Camera; Clothing — Classic Cotton T-Shirt, Utility Denim Jacket, Everyday Running Shoes, Canvas Weekend Backpack; Books — The Creative Habit, Wilderness Field Guide, Modern Home Cooking, Sketchbook for Ideas; Home & Kitchen — Handmade Ceramic Mug, Arc Table Lamp, Indoor Green Plant, Cast Iron Skillet; Sports — Studio Yoga Mat, Training Dumbbell Set, Match Day Football, Court Tennis Racket.
- A user's cart persists in MongoDB. Checkout snapshots current product prices and shipping address, calculates tax/shipping on the server and checks/decrements current stock with a conditional atomic update.
- Send `X-Idempotency-Key` on `POST /api/orders`; reuse that same key when retrying the same attempt. The UI holds one key for the active checkout flow.
- New orders start `placed`. The order screen provides sandbox payment success/failure and eligible cancellation. Admins advance `paid → packed → shipped → delivered`; invalid transitions are rejected.
- Admin routes verify JWT role on the server. Admin screens manage products/inventory and categories, advance orders, view customers, audit events and sales summaries.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | API listening port |
| `MONGO_URI` | `mongodb://localhost:27017/ecommerce` | MongoDB connection |
| `JWT_SECRET` | none | Required signing secret; set privately |
| `NODE_ENV` | `development` | Error/logging environment |
| `TAX_RATE` | `0.1` | Tax fraction (for example `0.1` = 10%) |
| `SHIPPING_FLAT_RATE` | `5.99` | Shipping amount; orders at/above $100 ship free |
| `REACT_APP_API_URL` | `/api` in development; deployed API URL in production | Frontend API base URL override |

## Tests and build

Backend integration tests use `mongodb-memory-server`; they do not touch your configured database:

```powershell
Set-Location backend
npm test -- --runInBand
```

Frontend production build:

```powershell
Set-Location frontend
npm run build
```

Covered cases include category search, idempotent retry, stale-stock conflict, failed sandbox payment, cancellation/stock release, order ownership, server-side admin protection and valid/invalid order transitions with dashboard reconciliation.

## Docker Compose (optional)

Set `JWT_SECRET` in the shell or a root `.env` file, then run `docker compose up --build`. Compose starts MongoDB, seeds missing demo records, starts the API and React development UI. Container runtime availability depends on Docker Desktop being started.

## Limitations

Payment and refunds are simulations only. Local standalone MongoDB checkout uses atomic per-product stock updates and compensating rollback for detected write failures; it cannot guarantee recovery if the process is killed mid-checkout. See [docs/architecture.md](./docs/architecture.md) for design decisions and a 4-minute walkthrough recording outline. The outline is provided; a video file is not included.
