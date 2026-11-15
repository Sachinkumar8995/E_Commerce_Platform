const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();

// Core middleware
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/docs', (_req, res) => res.sendFile(path.join(__dirname, '..', 'openapi.yaml')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/products',   require('./routes/product'));
app.use('/api/categories', require('./routes/category'));
app.use('/api/cart',       require('./routes/cart'));
app.use('/api/orders',     require('./routes/order'));
app.use('/api/admin',      require('./routes/admin'));

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
