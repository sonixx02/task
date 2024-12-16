const express = require('express');
const User = require('../models/User');
const { login, signup, validateToken } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/login', login);
router.post('/signup', signup);
router.get('/validate', validateToken); 
router.get('/profile', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching profile' });
    }
  });
  

  router.get('/user/:id', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('name email');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user details' });
    }
  });
module.exports = router;
