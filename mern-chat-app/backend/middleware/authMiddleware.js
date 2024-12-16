const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
   
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

   
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email
    };

    next();
  } catch (err) {
    console.error('Authentication error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }
    
    return res.status(403).json({ message: 'Unauthorized: Invalid token' });
  }
};

module.exports = authMiddleware;