const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const connectDB = async () => {
  try {
    // backend/src/config/database.js
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resume_db';
    
    const conn = await mongoose.connect(mongoURI, {
      // These options are recommended for Mongoose 6+
      // Remove deprecated options if using older versions
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
