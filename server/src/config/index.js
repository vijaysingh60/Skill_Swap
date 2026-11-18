import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. Copy server/.env.example to server/.env and fill it in.`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = required('JWT_SECRET');
if (nodeEnv === 'production' && (jwtSecret.length < 32 || jwtSecret.startsWith('change-me'))) {
  throw new Error('JWT_SECRET is too weak for production. Use a random string of at least 32 characters.');
}

// Comma-separated list of email domains allowed to register, e.g. "uohyd.ac.in,uohyd.ernet.in"
// (the university's current and legacy domains). Set to an empty string to allow any domain
// (useful for local development against seeded @example.com accounts).
const parseDomains = (value) =>
  value === undefined
    ? ['uohyd.ac.in', 'uohyd.ernet.in']
    : value
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

export const config = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillswap',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  allowedEmailDomains: parseDomains(process.env.ALLOWED_EMAIL_DOMAINS),
};
