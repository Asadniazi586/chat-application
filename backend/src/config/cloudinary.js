import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Configuring Cloudinary...');
console.log('📌 Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || '❌ NOT SET');
console.log('📌 API Key:', process.env.CLOUDINARY_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('📌 API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ SET' : '❌ NOT SET');

if (!process.env.CLOUDINARY_CLOUD_NAME || 
    !process.env.CLOUDINARY_API_KEY || 
    !process.env.CLOUDINARY_API_SECRET) {
  console.warn('⚠️ WARNING: Cloudinary credentials are incomplete!');
  console.warn('📝 Please add the following to your .env file:');
  console.warn('   CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.warn('   CLOUDINARY_API_KEY=your_api_key');
  console.warn('   CLOUDINARY_API_SECRET=your_api_secret');
  console.warn('📝 Get these from: https://cloudinary.com/console');
} else {
  console.log('✅ Cloudinary configured successfully');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default cloudinary;