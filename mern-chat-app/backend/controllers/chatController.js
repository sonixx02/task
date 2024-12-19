const Message = require('../models/Message');
const User = require('../models/User');

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user.id;
    const { content } = req.body;
    const filePath = req.file ? req.file.path : null;

    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId)
    ]);

    if (!sender || !receiver) {
      return res.status(404).json({ message: 'Sender or receiver not found' });
    }

    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content: content || '',
      filePath,
      timestamp: new Date()
    });

    await message.save();
    
    // Populate the message after saving
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email')
      .populate('receiver', 'name email');

    const messageData = {
      _id: populatedMessage._id,
      content: populatedMessage.content,
      filePath: populatedMessage.filePath,
      timestamp: populatedMessage.timestamp,
      sender: {
        _id: populatedMessage.sender._id,
        name: populatedMessage.sender.name,
        email: populatedMessage.sender.email
      },
      receiver: {
        _id: populatedMessage.receiver._id,
        name: populatedMessage.receiver.name,
        email: populatedMessage.receiver.email
      }
    };

    // Get the socket instance
    const io = req.app.get('socketio');
    
    // Emit to both sender and receiver rooms
    io.emit('new_message', messageData);

    res.status(201).json({
      message: 'Message sent successfully',
      data: messageData
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      message: 'Failed to send message',
      error: error.message
    });
  }
};
exports.getMessages = async (req, res) => {
  const { receiverId } = req.params;
  const senderId = req.user.id;

  try {
    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    })
    .populate('sender', 'name email')
    .populate('receiver', 'name email')
    .sort({ timestamp: 1 });

    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      content: msg.content,
      filePath: msg.filePath,
      timestamp: msg.timestamp,
      sender: {
        _id: msg.sender._id,
        name: msg.sender.name,
        email: msg.sender.email
      },
      receiver: {
        _id: msg.receiver._id,
        name: msg.receiver.name,
        email: msg.receiver.email
      }
    }));

    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};