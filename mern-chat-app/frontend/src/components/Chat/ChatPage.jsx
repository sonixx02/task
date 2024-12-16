import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

const ChatPage = () => {
  const { receiverId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [socket, setSocket] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [receiverUser, setReceiverUser] = useState(null);
  const messagesEndRef = useRef(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL ;
  // Get token from localStorage (adjust based on your auth storage)
  const token = localStorage.getItem('token');

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch user details and messages
  useEffect(() => {
    // Fetch current user details
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setCurrentUser(response.data);
      } catch (error) {
        console.error('Failed to fetch current user', error);
      }
    };

    // Fetch receiver user details
    const fetchReceiverDetails = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/auth/user/${receiverId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setReceiverUser(response.data);
      } catch (error) {
        console.error('Failed to fetch receiver user', error);
      }
    };

    // Fetch message history
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/chat/messages/${receiverId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to fetch messages', error);
      }
    };

    // Socket setup
    const socketInstance = io(`${backendUrl}`, {
      extraHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    setSocket(socketInstance);

    // Register user and listen for messages
    socketInstance.emit('register', currentUser?.id);
    socketInstance.on('receive_message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // Fetch data
    fetchUserDetails();
    fetchReceiverDetails();
    fetchMessages();

    // Cleanup
    return () => {
      socketInstance.disconnect();
    };
  }, [receiverId, token]);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Send message with optional file
  const sendMessage = async () => {
    // Prevent sending empty message and no file
    if (!newMessage.trim() && !file) return;

    const formData = new FormData();
    formData.append('content', newMessage);
    if (file) {
      formData.append('file', file);
    }

    try {
      // Send message to backend
      const response = await axios.post(
        `${backendUrl}/api/chat/send-message/${receiverId}`, 
        formData, 
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Clear input and file
      setNewMessage('');
      setFile(null);
      document.getElementById('fileInput').value = null;
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  // Handle message input submission
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  // Render file preview
  const renderFilePreview = () => {
    if (!file) return null;

    const fileType = file.type.split('/')[0];
    switch (fileType) {
      case 'image':
        return (
          <img 
            src={URL.createObjectURL(file)} 
            alt="Preview" 
            className="max-w-32 max-h-32 object-cover rounded"
          />
        );
      default:
        return (
          <div className="bg-gray-100 p-2 rounded">
            {file.name} ({Math.round(file.size / 1024)} KB)
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Chat Header */}
      <div className="bg-gray-100 p-4 shadow-md">
        <h2 className="text-xl font-bold">
          Chat with {receiverUser?.name || 'User'}
        </h2>
      </div>

      {/* Messages Container */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div 
            key={msg._id} 
            className={`flex ${
              msg.sender._id === currentUser?.id 
                ? 'justify-end' 
                : 'justify-start'
            }`}
          >
            <div 
              className={`max-w-[70%] p-3 rounded-lg ${
                msg.sender._id === currentUser?.id 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200'
              }`}
            >
              {/* Sender name only for messages from other users */}
              {msg.sender._id !== currentUser?.id && (
                <div className="font-semibold text-sm mb-1">
                  {msg.sender.name}
                </div>
              )}
              
              {/* Message content */}
              <div>{msg.content}</div>
              
              {/* File preview if exists */}
              {msg.filePath && (
                <div className="mt-2">
                  <a 
                    href={`${backendUrl}/${msg.filePath}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-200 underline"
                  >
                    View Attachment
                  </a>
                </div>
              )}
              
              {/* Timestamp */}
              <div className="text-xs mt-1 opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {file && (
        <div className="p-2 bg-gray-50 flex items-center space-x-2">
          {renderFilePreview()}
          <button 
            onClick={() => {
              setFile(null);
              document.getElementById('fileInput').value = null;
            }} 
            className="text-red-500"
          >
            Remove
          </button>
        </div>
      )}

      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="bg-white p-4 border-t flex items-center space-x-2">
        <input
          type="file"
          id="fileInput"
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.txt,.mp4"
        />
        <button 
          type="button"
          onClick={() => document.getElementById('fileInput').click()}
          className="bg-gray-200 p-2 rounded-full"
        >
          📎
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-grow border p-2 rounded"
          placeholder="Type your message..."
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatPage;