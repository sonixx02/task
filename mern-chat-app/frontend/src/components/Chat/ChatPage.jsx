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
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const backendUrl = 'https://task-czvp.onrender.com';
  const token = localStorage.getItem('token');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const socketInstance = io(`${backendUrl}`, {
      extraHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    setSocket(socketInstance);

    socketInstance.on('receive_message', (message) => {
      setMessages(prevMessages => {
        // Check if message already exists to prevent duplicates
        const messageExists = prevMessages.some(msg => msg._id === message._id);
        if (!messageExists) {
          return [...prevMessages, message];
        }
        return prevMessages;
      });
    });

    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        const [currentUserRes, receiverUserRes, messagesRes] = await Promise.all([
          axios.get(`${backendUrl}/api/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          axios.get(`${backendUrl}/api/auth/user/${receiverId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          axios.get(`${backendUrl}/api/chat/messages/${receiverId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        setCurrentUser(currentUserRes.data);
        setReceiverUser(receiverUserRes.data);
        setMessages(messagesRes.data);
        
        // Register user after getting current user data
        socketInstance.emit('register', currentUserRes.data.id);
      } catch (error) {
        console.error('Failed to fetch initial data', error);
      }
    };

    fetchInitialData();

    return () => {
      socketInstance.disconnect();
    };
  }, [receiverId, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size <= 5 * 1024 * 1024) { // 5MB limit
      setFile(selectedFile);
    } else {
      alert('File size should be less than 5MB');
      e.target.value = null;
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !file) || isUploading) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('content', newMessage);
    if (file) {
      formData.append('file', file);
    }

    try {
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

      // Immediately update local state with the new message
      const newMsg = response.data.data;
      setMessages(prevMessages => [...prevMessages, newMsg]);

      // Clear input and file
      setNewMessage('');
      setFile(null);
      if (document.getElementById('fileInput')) {
        document.getElementById('fileInput').value = null;
      }
    } catch (error) {
      console.error('Failed to send message', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Rest of your component remains the same...
  // (Keep your existing render methods and JSX)

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
              {msg.sender._id !== currentUser?.id && (
                <div className="font-semibold text-sm mb-1">
                  {msg.sender.name}
                </div>
              )}
              
              <div>{msg.content}</div>
              
              {msg.filePath && (
                <div className="mt-2">
                  {msg.filePath.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                    <img 
                      src={`${backendUrl}/${msg.filePath}`} 
                      alt="Attachment" 
                      className="max-w-full rounded"
                    />
                  ) : (
                    <a 
                      href={`${backendUrl}/${msg.filePath}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-200 underline"
                    >
                      Download Attachment
                    </a>
                  )}
                </div>
              )}
              
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
          {file.type.startsWith('image/') ? (
            <img 
              src={URL.createObjectURL(file)} 
              alt="Preview" 
              className="max-w-32 max-h-32 object-cover rounded"
            />
          ) : (
            <div className="bg-gray-100 p-2 rounded">
              {file.name} ({Math.round(file.size / 1024)} KB)
            </div>
          )}
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
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }} 
        className="bg-white p-4 border-t flex items-center space-x-2"
      >
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
          disabled={isUploading}
        >
          📎
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-grow border p-2 rounded"
          placeholder="Type your message..."
          disabled={isUploading}
        />
        <button
          type="submit"
          className={`bg-blue-500 text-white p-2 rounded ${
            isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
          }`}
          disabled={isUploading}
        >
          {isUploading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatPage;