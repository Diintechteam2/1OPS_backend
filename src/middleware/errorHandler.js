const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected server error occurred.';
  let errorCode = err.error || 'INTERNAL_SERVER_ERROR';

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
    errorCode = 'BAD_REQUEST';
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 409;
    const key = Object.keys(err.keyValue)[0];
    message = `Conflict: Duplicate value for field '${key}' is not allowed.`;
    errorCode = 'CONFLICT';
  }

  // Handle CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with id of ${err.value}`;
    errorCode = 'NOT_FOUND';
  }

  // Handle JSON Web Token Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token signature.';
    errorCode = 'UNAUTHORIZED';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please log in again.';
    errorCode = 'UNAUTHORIZED';
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: errorCode,
  });
};

module.exports = errorHandler;
