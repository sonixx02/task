const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // Added recursive option
}

// Configure storage for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save files in the `uploads` folder
  },
  filename: (req, file, cb) => {
    // Include sender ID in filename for better tracking
    const uniqueName = `${req.user.id}-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Configure file filter for validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = /\.(jpg|jpeg|png|gif|pdf|docx|mp4|mov|xlsx|xls)$/i; // Regex for extensions
  const extname = allowedTypes.test(path.extname(file.originalname));
  
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'application/pdf', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 
    'video/quicktime',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (extname && mimetype) {
    cb(null, true); // Accept file
  } else {
    cb(new Error('Invalid file type. Supported types: jpg, jpeg, png, gif, pdf, docx, mp4, mov, xlsx, xls'), false);
  }
};


const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024 
  }
});

module.exports = upload;