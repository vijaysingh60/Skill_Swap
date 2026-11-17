import app from './app.js';
import { connectDb, redactMongoUri } from './config/db.js';
import { config } from './config/index.js';

try {
  await connectDb();
  console.log('Connected to MongoDB');
} catch (err) {
  console.error(`Could not connect to MongoDB at ${redactMongoUri(config.mongoUri)}\n${err.message}`);
  process.exit(1);
}

app.listen(config.port, () => console.log(`Skill Swap API listening on http://localhost:${config.port}`));
