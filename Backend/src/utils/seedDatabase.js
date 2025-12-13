const mongoose = require('mongoose');
const Convoy = require('../models/Convoy');
const User = require('../models/User');
const logger = require('../config/logger');
require('dotenv').config();

// Load seed data
const seedConvoysData = require('../data/seed-convoys.json');

async function seedDatabase() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    logger.info('Connected to MongoDB for seeding');
    
    // Clear existing data
    await Convoy.deleteMany({});
    await User.deleteMany({});
    
    logger.info('Cleared existing data');
    
    // Insert convoys
    const convoys = await Convoy.insertMany(seedConvoysData);
    logger.info(`✅ Seeded ${convoys.length} convoys`);
    
    // Create default users
    const defaultUsers = [
      {
        username: 'admin',
        password: 'admin123',
        rank: 'Lt. General',
        unit: 'HQ Northern Command',
        role: 'ADMIN',
        permissions: ['READ_CONVOYS', 'WRITE_CONVOYS', 'OPTIMIZE_ROUTES', 'MANAGE_EVENTS', 'ADMIN']
      },
      {
        username: 'commander',
        password: 'commander123',
        rank: 'Major',
        unit: '15 Corps',
        role: 'COMMANDER',
        permissions: ['READ_CONVOYS', 'WRITE_CONVOYS', 'OPTIMIZE_ROUTES', 'MANAGE_EVENTS']
      },
      {
        username: 'operator',
        password: 'operator123',
        rank: 'Captain',
        unit: 'Operations Center',
        role: 'OPERATOR',
        permissions: ['READ_CONVOYS', 'WRITE_CONVOYS', 'MANAGE_EVENTS']
      },
      {
        username: 'viewer',
        password: 'viewer123',
        rank: 'Lieutenant',
        unit: 'Monitoring Team',
        role: 'VIEWER',
        permissions: ['READ_CONVOYS']
      }
    ];
    
    for (const userData of defaultUsers) {
      const user = new User(userData);
      await user.save();
    }
    
    logger.info(`✅ Seeded ${defaultUsers.length} users`);
    
    logger.info('🎉 Database seeding completed successfully');
    logger.info('\n📋 Default Users:');
    logger.info('   Admin: admin / admin123');
    logger.info('   Commander: commander / commander123');
    logger.info('   Operator: operator / operator123');
    logger.info('   Viewer: viewer / viewer123');
    
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
