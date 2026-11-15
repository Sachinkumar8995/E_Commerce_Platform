# Architecture and technical notes

## System

ShopEase is a modular monolith: the React SPA calls one Express REST API, which owns validation, authentication, business rules and Mongoose persistence. MongoDB stores users/addresses, categories, products, per-customer carts, orders and audit events. Payment is deliberately a sandbox endpoint; no payment credentials or external payment provider are involved.

```mermaid
erDiagram
  USER ||--o| CART : owns
  USER ||--o{ ORDER : places
  USER ||--o{ AUDIT_LOG : performs
  CATEGORY ||--o{ PRODUCT : groups
  PRODUCT ||--o{ CART_ITEM : referenced_by
  PRODUCT ||--o{ ORDER_ITEM : snapshot_in
  CART ||--|{ CART_ITEM : contains
  ORDER ||--|{ ORDER_ITEM : contains

  USER {
    ObjectId _id PK
    string name
    string email UK
    string password_hash
    string role
    Address[] addresses
  }
  CATEGORY {
    ObjectId _id PK
    string name UK
    boolean isActive
  }
  PRODUCT {
    ObjectId _id PK
    string sku UK
    ObjectId category FK
    string name
    decimal price
    int countInStock
    boolean isActive
  }
  CART {
    ObjectId _id PK
    ObjectId user FK_UK
    CartItem[] items
  }
  ORDER {
    ObjectId _id PK
    ObjectId user FK
    string status
    string idempotencyKey UK
    decimal itemsPrice
    decimal taxPrice
    decimal shippingPrice
    decimal totalPrice
  }
  AUDIT_LOG {
    ObjectId _id PK
    ObjectId user FK
    string action
    string entity
    ObjectId entityId
    date timestamp
  }
```

Embedded addresses and cart/order items are intentional: they are bounded by their owning aggregate and preserve an order-time item/price snapshot. Product stock is decremented with a conditional atomic MongoDB update (`countInStock >= qty`) during checkout; cancellation is guarded by a conditional status update. An idempotency key is unique in the orders collection and clients reuse it for retries. Admin status changes are an explicit transition map. Mongoose schema constraints and API checks reject malformed quantities, required fields and invalid transitions.

## Operational behavior and known limitations

- Tax defaults to 10% and shipping to $5.99 (free at $100); both rates can be configured through backend environment variables.
- The API compensates earlier stock reservations if a later reservation/order write fails. A replica-set MongoDB deployment with multi-document transactions would provide stronger crash atomicity; the included local standalone setup does not guarantee atomicity across process termination during a multi-item checkout.
- Payment is simulated only. Cancellation after a completed simulated payment releases stock but does not connect to a real refund processor.
- JWTs are stored in browser local storage for this demo. Production deployments should prefer secure, HTTP-only cookies and CSRF protections.
- Seed is repeatable and non-destructive; it upserts the known demo catalogue by SKU while preserving stock, and does not reset users, carts or orders.

## 4-minute walkthrough recording outline

1. (0:00–0:35) Start MongoDB, seed data, show the catalogue and category/search/filter controls.
2. (0:35–1:20) Register or sign in as the demo customer, add a product, inspect the saved cart and edit the address book.
3. (1:20–2:10) Checkout and place the order. Show the order snapshot and sandbox payment-failure path; retry with success.
4. (2:10–2:45) Show order status and cancellation availability; explain atomic stock recheck and idempotency.
5. (2:45–3:35) Sign in as admin, update inventory, advance an order and inspect customer/audit views and dashboard totals.
6. (3:35–4:00) Run `npm test -- --runInBand` and show API docs at `/api/docs`.

No recording is included in this repository; this outline is ready to record using the local setup below.
