const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

dotenv.config();


app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use('/uploads', express.static('uploads')); 


const onlineUsers = new Map();


io.on('connection', (socket) => {
  console.log('New socket connection:', socket.id);

  
  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ID: ${socket.id}`);
    
    
    io.emit('user_online', userId);
  });

  
  socket.on('send_message', (messageData) => {
    const { sender, receiver, content, filePath } = messageData;
    const receiverSocketId = onlineUsers.get(receiver);

    if (receiverSocketId) {
     
      io.to(receiverSocketId).emit('receive_message', {
        sender,
        receiver,
        content,
        filePath,
        timestamp: new Date()
      });
    }
  });


  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('user_offline', userId);
        break;
      }
    }
    console.log('Socket disconnected:', socket.id);
  });
});


app.set('socketio', io);


mongoose
  .connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));


app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));