const express = require('express');
const upload = require('../middleware/uploadMiddleware.js.js');
const authMiddleware = require('../middleware/authMiddleware.js');
const {
  getUsers,
  updateUser,
  deleteUser,
  exportUsers,
  importUsers,
  addUser,
  blockUser,
} = require('../controllers/adminController');

const router = express.Router();

router.get('/users',  getUsers);
router.put('/users/:id', authMiddleware, updateUser);
router.delete('/users/:id', authMiddleware, deleteUser);
router.get('/export', authMiddleware, exportUsers);
router.post('/users/import', authMiddleware, upload.single('file'), importUsers);
router.post('/addUser', authMiddleware, addUser);
router.put('/users/block/:id', authMiddleware, blockUser);

module.exports = router;
