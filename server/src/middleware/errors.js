import { HttpError } from '../utils/httpError.js';
import { config } from '../config/index.js';

export function notFound(_req, _res, next) {
  next(new HttpError(404, 'Route not found.'));
}

// Express recognises error handlers by their four arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, ...(err.fields && { errors: err.fields }), ...err.extra });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body is not valid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: 'That record already exists.' });

  if (config.nodeEnv !== 'test') console.error(err);
  res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
}
