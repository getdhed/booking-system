const {
  ValidationError,
  ForeignKeyConstraintError,
  UniqueConstraintError
} = require('sequelize');

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON'
    });
  }

  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({
      error: 'Value must be unique',
      details: err.errors.map(error => error.message)
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(error => error.message)
    });
  }

  if (err instanceof ForeignKeyConstraintError) {
    return res.status(400).json({
      error: 'Referenced record does not exist'
    });
  }

  res.status(500).json({
    error: 'Internal server error'
  });
}

module.exports = errorHandler;