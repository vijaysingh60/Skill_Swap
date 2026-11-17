import mongoose from 'mongoose';
import { config } from './index.js';

// Connection strings can embed a password (mongodb+srv://user:password@host/db); never log them as-is.
export function redactMongoUri(uri) {
  return uri.replace(/(\/\/[^:/@]+:)[^@]*@/, '$1***@');
}

export async function connectDb() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  return mongoose.connection;
}
