const express = require('express');
const upload = require('../middleware/uploadMiddleware.js');
const { sendMessage, getMessages } = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();


router.use((req, res, next) => {
  req.io = req.app.get('socketio');
  next();
});


router.post('/send-message/:receiverId', 
  authMiddleware, 
  upload.single('file'), 
  sendMessage
);


router.get('/messages/:receiverId', 
  authMiddleware, 
  getMessages
);

module.exports = router;