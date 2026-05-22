const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_EXTS = [...IMAGE_EXTS, '.pdf', '.doc', '.docx'];

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = IMAGE_EXTS.includes(ext);
    return {
      folder: isImage ? 'smrh/images' : 'smrh/documents',
      resource_type: isImage ? 'image' : 'raw',
    };
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_EXTS.includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de ficheiro não permitido'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 },
});

module.exports = upload;
