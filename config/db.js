const mongoose = require('mongoose');

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is missing in .env');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000
  });

  console.log('MongoDB Atlas connected successfully');
}

module.exports = connectDB;