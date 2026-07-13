import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Check if MongoDB URI exists
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in .env file');
      console.log('📝 Please add MONGODB_URI to your .env file');
      console.log('📝 Example: MONGODB_URI=mongodb://localhost:27017/whatsapp_clone');
      process.exit(1);
    }

    console.log(`📡 Connecting to MongoDB...`);
    console.log(`🔗 URI: ${process.env.MONGODB_URI.replace(/\/\/.*@/, '//<hidden>@')}`);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    console.log(`📊 Database State: ${conn.connection.readyState === 1 ? 'Connected ✅' : 'Not Connected ❌'}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('\n💡 Troubleshooting Tips:');
    console.log('1. Check if MongoDB is running: mongosh');
    console.log('2. If using Atlas, whitelist your IP address');
    console.log('3. Verify your connection string in .env');
    console.log('4. Check your internet connection');
    console.log('\n📝 Example .env entry:');
    console.log('MONGODB_URI=mongodb://localhost:27017/whatsapp_clone');
    process.exit(1);
  }
};

export default connectDB;