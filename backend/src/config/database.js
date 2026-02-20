const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    const conn = await mongoose.connect(mongoURI, {
      // Explicitly force the database name here
      dbName: 'resume_db', 
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    // Log exactly which database we are using to be 100% sure
    console.log(`Using Database: ${conn.connection.name}`); 
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;