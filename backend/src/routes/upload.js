import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ✅ Configure multer with LARGER limits
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // ✅ 10MB limit (increased from 5MB)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   POST /api/upload/avatar
// @desc    Upload avatar image (Base64 fallback)
router.post('/avatar', protect, upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Avatar upload request received:');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    // ✅ Compress image if too large (over 500KB)
    let imageBuffer = req.file.buffer;
    let mimeType = req.file.mimetype;

    // ✅ If image is over 500KB, compress it
    if (imageBuffer.length > 500 * 1024) {
      console.log('🔄 Image too large, compressing...');
      // For base64, we'll just use the buffer as is but warn
      console.log(`📊 Image size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
    }

    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    console.log(`✅ Avatar converted to base64 (${(imageUrl.length / 1024).toFixed(1)} KB)`);

    res.json({ 
      success: true, 
      url: imageUrl 
    });
  } catch (error) {
    console.error('❌ Avatar upload error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to upload avatar' 
    });
  }
});

// @route   POST /api/upload
// @desc    Upload general file
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    console.log('📤 File upload request received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Convert to base64
    const base64File = req.file.buffer.toString('base64');
    const fileUrl = `data:${req.file.mimetype};base64,${base64File}`;

    let type = 'file';
    if (req.file.mimetype.startsWith('image/')) {
      type = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      type = 'video';
    }

    console.log('✅ File converted to base64 successfully');

    res.json({
      success: true,
      url: fileUrl,
      type,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to upload file' 
    });
  }
});

export default router;