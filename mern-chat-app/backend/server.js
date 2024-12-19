const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

// Load environment variables from .env file
dotenv.config();

// Initialize express app and create server
const app = express();
const server = http.createServer(app);

// Initialize socket.io with authentication middleware
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
});

// Socket authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Middleware to enable CORS and parse JSON
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Store online users in a Map
const onlineUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New socket connection:', socket.id, 'User:', socket.userId);

  // Join user to their own room
  if (socket.userId) {
    socket.join(socket.userId);
    onlineUsers.set(socket.userId, socket.id);
    io.emit('user_online', socket.userId);
  }

  // Handle user disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      socket.leave(socket.userId);
      onlineUsers.delete(socket.userId);
      io.emit('user_offline', socket.userId);
    }
    console.log('Socket disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('socketio', io);
app.set('onlineUsers', onlineUsers);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));