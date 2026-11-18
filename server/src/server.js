import http from 'node:http';
import app from './app.js';
import { connectDb, redactMongoUri } from './config/db.js';
import { config } from './config/index.js';
import { attachRealtime } from './realtime.js';

try {
  await connectDb();
  console.log('Connected to MongoDB');
} catch (err) {
  console.error(`Could not connect to MongoDB at ${redactMongoUri(config.mongoUri)}\n${err.message}`);
  process.exit(1);
}

// A plain http.Server, not app.listen(), so Socket.IO (real-time chat) can share the same port.
const httpServer = http.createServer(app);
attachRealtime(httpServer);
httpServer.listen(config.port, () => console.log(`Skill Swap API listening on http://localhost:${config.port}`));
