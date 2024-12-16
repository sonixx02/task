const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');

// Load environment variables from .env file
dotenv.config();

// Initialize express app and create server
const app = express();
const server = http.createServer(app);

// Initialize socket.io
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',  // Use frontend URL from .env
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
});

// Middleware to enable CORS and parse JSON
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',  // Use frontend URL from .env
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));  // Static file serving for uploads

// Store online users in a Map
const onlineUsers = new Map(); 

// Socket.IO connection event
io.on('connection', (socket) => {
  console.log('New socket connection:', socket.id);

  // Register user with socket
  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ID: ${socket.id}`);
    
    io.emit('user_online', userId); // Notify others when user is online
  });

  // Handle sending messages
  socket.on('send_message', (messageData) => {
    const { sender, receiver, content, filePath } = messageData;
    const receiverSocketId = onlineUsers.get(receiver);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receive_message', {
        sender,
        receiver,
        content,
        filePath,
        timestamp: new Date(),
      });
    }
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('user_offline', userId); // Notify others when user is offline
        break;
      }
    }
    console.log('Socket disconnected:', socket.id);
  });
});

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

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
