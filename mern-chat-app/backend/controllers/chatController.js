const Message = require('../models/Message');
const User = require('../models/User');

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user.id; 
    const { content } = req.body;
    const filePath = req.file ? req.file.path : null;

   
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);
    
    if (!sender || !receiver) {
      return res.status(404).json({ message: 'Sender or receiver not found' });
    }

    // Create new message
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content: content || '', 
      filePath,
      timestamp: new Date()
    });

    
    const savedMessage = await message.save();

    
    await savedMessage.populate('sender receiver', 'name email');


    const io = req.app.get('socketio');
    io.emit('receive_message', {
      _id: savedMessage._id,
      sender: {
        _id: sender._id,
        name: sender.name
      },
      receiver: {
        _id: receiver._id,
        name: receiver.name
      },
      content: savedMessage.content,
      filePath: savedMessage.filePath,
      timestamp: savedMessage.timestamp
    });

    res.status(201).json({ 
      message: 'Message sent successfully', 
      data: savedMessage 
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
    .populate('sender receiver', 'name email')
    .sort({ timestamp: 1 });

    
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      sender: {
        _id: msg.sender._id,
        name: msg.sender.name
      },
      receiver: {
        _id: msg.receiver._id,
        name: msg.receiver.name
      },
      content: msg.content,
      filePath: msg.filePath,
      timestamp: msg.timestamp
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