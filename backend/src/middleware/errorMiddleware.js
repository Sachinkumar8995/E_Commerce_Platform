/**
 * Error-handling middleware for the Express application.
 */

// Catch requests that don't match any route and forward a 404 error.
const notFound = (req, res, next) => {
  const error = new Error(`Not Found – ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Central error handler – sends a consistent JSON error response.
const errorHandler = (err, req, res, _next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;
  if (err.name === 'ValidationError' || err.name === 'CastError' || err.type === 'entity.parse.failed') {
    statusCode = 400;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with that value already exists';
  }
  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
