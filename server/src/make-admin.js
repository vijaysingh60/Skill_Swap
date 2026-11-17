// Promotes an existing account to admin:  npm run make-admin -- someone@example.com
// Admins are never created through the app itself, so this is the way to bootstrap the first one.
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import { User } from './models/User.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run make-admin -- <email>');
  process.exit(1);
}

await connectDb();
const result = await User.updateOne({ email }, { role: 'admin' });
await mongoose.disconnect();

if (result.matchedCount === 0) {
  console.error(`No account found for ${email}. Register it in the app first.`);
  process.exit(1);
}
console.log(`${email} is now an admin.`);
