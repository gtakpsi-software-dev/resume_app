require('dotenv').config();
const connectDB = require('../config/database');
const { User } = require('../models');

async function seed() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Database connected!');

    // Note: Admin login is handled via password check in authController, not database users
    // This seed script can be used to create test member users if needed

    // Example: Create a test member user (optional)
    const testEmail = 'test@example.com';
    let user = await User.findOne({ email: testEmail });

    if (!user) {
      user = await User.create({
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        password: 'testpassword123', // Will be hashed by pre-save hook
        role: 'member'
      });
      console.log('Test member user created!');
    } else {
      console.log('Test member user already exists!');
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seed();
