const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');
const AuditLog = require('../src/models/AuditLog');
const generateToken = require('../src/utils/generateToken');

const makeUser = async (email, role = 'customer') => {
  const user = await User.create({ name: 'Test User', email, password: 'password123', role });
  return { user, token: generateToken(user._id) };
};
const makeProduct = async (stock = 5) => {
  const category = await Category.create({ name: 'Books' });
  return Product.create({
    name: 'Test book',
    description: 'Searchable demo book',
    price: 20,
    countInStock: stock,
    category: category._id,
  });
};
const address = { address: '1 Test Street', city: 'Testville', postalCode: '12345', country: 'Testland' };

beforeAll(async () => {
  await Promise.all([User.init(), Product.init(), Order.init(), Cart.init(), Category.init()]);
});

describe('customer commerce flows', () => {
  test('registers, searches, adds to cart, checks out, pays and exposes the order to staff', async () => {
    const registration = await request(app).post('/api/auth/register')
      .send({ name: 'Journey Customer', email: 'journey@example.test', password: 'password123' });
    expect(registration.status).toBe(201);
    const token = registration.body.token;
    const product = await makeProduct(2);

    const search = await request(app).get('/api/products?q=Searchable');
    expect(search.status).toBe(200);
    expect(search.body.products.some((item) => item._id === product._id.toString())).toBe(true);

    const added = await request(app).post('/api/cart').set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id.toString(), qty: 1 });
    expect(added.status).toBe(201);
    expect(added.body.items[0].qty).toBe(1);

    const placed = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'journey-checkout').send({ shippingAddress: address });
    expect(placed.status).toBe(201);
    expect((await Product.findById(product._id)).countInStock).toBe(1);

    const paid = await request(app).put(`/api/orders/${placed.body._id}/pay`)
      .set('Authorization', `Bearer ${token}`).send({ success: true });
    expect(paid.status).toBe(200);
    expect(paid.body.status).toBe('paid');

    const admin = await makeUser('journey-admin@example.test', 'admin');
    const staffOrders = await request(app).get('/api/orders/admin/all')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(staffOrders.body.orders.some((item) => item._id === placed.body._id)).toBe(true);
  });

  test('searches by category name and paginates results', async () => {
    const product = await makeProduct();
    const response = await request(app).get('/api/products?category=Books&page=1&limit=1');
    expect(response.status).toBe(200);
    expect(response.body.products.map((item) => item._id)).toContain(product._id.toString());
    expect(response.body.pages).toBe(1);

    const keywordResponse = await request(app).get('/api/products?keyword=searchable');
    expect(keywordResponse.status).toBe(200);
    expect(keywordResponse.body.products.map((item) => item._id)).toContain(product._id.toString());

    const partialResponse = await request(app).get('/api/products?q=Search');
    expect(partialResponse.body.products.map((item) => item._id)).toContain(product._id.toString());

    const invalidRegex = await request(app).get('/api/products?q=%5B');
    expect(invalidRegex.status).toBe(200);
    expect(invalidRegex.body.total).toBe(0);
  });

  test('retries checkout with one idempotency key without duplicating orders or decrementing stock twice', async () => {
    const { user, token } = await makeUser('buyer@example.test');
    const product = await makeProduct(5);
    await Cart.create({ user: user._id, items: [{ product: product._id, qty: 2, price: 1 }] });

    const first = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'checkout-attempt-1').send({ shippingAddress: address });
    const retry = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'checkout-attempt-1').send({ shippingAddress: address });

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body._id).toBe(first.body._id);
    expect(await Order.countDocuments({ user: user._id })).toBe(1);
    expect((await Product.findById(product._id)).countInStock).toBe(3);
  });

  test('concurrent retries with one key still create one order and reserve stock once', async () => {
    const { user, token } = await makeUser('parallel@example.test');
    const product = await makeProduct(5);
    await Cart.create({ user: user._id, items: [{ product: product._id, qty: 2, price: 20 }] });
    const sendCheckout = () => request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'parallel-attempt').send({ shippingAddress: address });

    const [first, second] = await Promise.all([sendCheckout(), sendCheckout()]);

    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(first.body._id).toBe(second.body._id);
    expect(await Order.countDocuments({ user: user._id })).toBe(1);
    expect((await Product.findById(product._id)).countInStock).toBe(3);
  });

  test('rejects stale stock at checkout and never makes stock negative', async () => {
    const { user, token } = await makeUser('stock@example.test');
    const product = await makeProduct(1);
    await Cart.create({ user: user._id, items: [{ product: product._id, qty: 2, price: 20 }] });

    const response = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'out-of-stock').send({ shippingAddress: address });

    expect(response.status).toBe(409);
    expect((await Product.findById(product._id)).countInStock).toBe(1);
    expect(await Order.countDocuments()).toBe(0);
  });

  test('failed sandbox payment leaves order retryable and cancellation releases stock only once', async () => {
    const { user, token } = await makeUser('payment@example.test');
    const product = await makeProduct(4);
    await Cart.create({ user: user._id, items: [{ product: product._id, qty: 1, price: 20 }] });
    const placed = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'payment-order').send({ shippingAddress: address });

    const failed = await request(app).put(`/api/orders/${placed.body._id}/pay`)
      .set('Authorization', `Bearer ${token}`).send({ success: false });
    expect(failed.status).toBe(402);
    expect((await Order.findById(placed.body._id)).status).toBe('placed');

    const cancelled = await request(app).put(`/api/orders/${placed.body._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(cancelled.status).toBe(200);
    const retry = await request(app).put(`/api/orders/${placed.body._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(retry.status).toBe(400);
    expect((await Product.findById(product._id)).countInStock).toBe(4);
  });

  test('forbids another customer from cancelling an order', async () => {
    const { user, token } = await makeUser('owner@example.test');
    const other = await makeUser('other@example.test');
    const product = await makeProduct(3);
    await Cart.create({ user: user._id, items: [{ product: product._id, qty: 1, price: 20 }] });
    const placed = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'owner-order').send({ shippingAddress: address });

    const response = await request(app).put(`/api/orders/${placed.body._id}/cancel`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(response.status).toBe(403);
    expect((await Product.findById(product._id)).countInStock).toBe(2);
  });

  test('keeps admin reports role protected and updates the lifecycle with valid transitions only', async () => {
    const customer = await makeUser('customer@example.test');
    const admin = await makeUser('admin@example.test', 'admin');
    const denied = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${customer.token}`);
    expect(denied.status).toBe(403);
    const deniedMutation = await request(app).post('/api/products').set('Authorization', `Bearer ${customer.token}`)
      .send({ name: 'Unauthorized product', price: 1, countInStock: 1 });
    expect(deniedMutation.status).toBe(403);

    const product = await makeProduct(3);
    await Cart.create({ user: customer.user._id, items: [{ product: product._id, qty: 1, price: 20 }] });
    const placed = await request(app).post('/api/orders').set('Authorization', `Bearer ${customer.token}`)
      .set('X-Idempotency-Key', 'lifecycle-order').send({ shippingAddress: address });
    await request(app).put(`/api/orders/${placed.body._id}/pay`).set('Authorization', `Bearer ${customer.token}`).send({ success: true });

    const packed = await request(app).put(`/api/orders/${placed.body._id}/status`)
      .set('Authorization', `Bearer ${admin.token}`).send({ status: 'packed' });
    expect(packed.status).toBe(200);
    const invalid = await request(app).put(`/api/orders/${placed.body._id}/status`)
      .set('Authorization', `Bearer ${admin.token}`).send({ status: 'delivered' });
    expect(invalid.status).toBe(400);

    const dashboard = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${admin.token}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.totalOrders).toBe(1);
    expect(dashboard.body.totalRevenue).toBe(27.99);
    expect(await AuditLog.countDocuments({ entity: 'Order' })).toBeGreaterThanOrEqual(2);
  });
});
