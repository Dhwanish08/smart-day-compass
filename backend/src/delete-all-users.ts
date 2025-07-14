import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';

dotenv.config();

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    const result = await User.deleteMany({});
    console.log(`Deleted ${result.deletedCount} users.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error deleting users:', err);
    process.exit(1);
  }
}

main(); 