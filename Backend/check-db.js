require('dotenv').config();
const mongoose = require('mongoose');

async function checkDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!\n');

    const Convoy = require('./src/models/Convoy');
    
    const convoys = await Convoy.find({}).sort({ createdAt: -1 });
    
    console.log(`📊 Total Convoys in Database: ${convoys.length}\n`);
    
    if (convoys.length === 0) {
      console.log('⚠️  No convoys found in database yet.');
      console.log('💡 Try creating a convoy from the frontend to test real-time saving.\n');
    } else {
      console.log('📋 Convoys List:\n');
      convoys.forEach((convoy, index) => {
        console.log(`${index + 1}. Convoy: ${convoy.name}`);
        console.log(`   ID: ${convoy.id}`);
        console.log(`   Status: ${convoy.status}`);
        console.log(`   Priority: ${convoy.priority}`);
        console.log(`   Vehicles: ${convoy.vehicleCount}`);
        console.log(`   Origin: ${convoy.origin.name} (${convoy.origin.lat}, ${convoy.origin.lng})`);
        console.log(`   Destination: ${convoy.destination.name} (${convoy.destination.lat}, ${convoy.destination.lng})`);
        console.log(`   Speed: ${convoy.speedKmph} km/h`);
        console.log(`   ETA: ${convoy.etaHours} hours`);
        console.log(`   Created: ${new Date(convoy.createdAt).toLocaleString()}`);
        console.log(`   Last Updated: ${new Date(convoy.lastUpdated).toLocaleString()}`);
        if (convoy.assignedRoute) {
          console.log(`   Route Distance: ${convoy.assignedRoute.distanceKm} km`);
          console.log(`   Checkpoints: ${convoy.assignedRoute.checkpoints?.length || 0}`);
        }
        console.log('');
      });
    }
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
