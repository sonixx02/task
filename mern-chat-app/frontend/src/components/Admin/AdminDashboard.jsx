import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', mobileNo: '', password: '' });
  const [file, setFile] = useState(null);
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  useEffect(() => {
    
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/'); 
    } else {
      console.log(backendUrl);
      axios.get(`${backendUrl}/api/auth/validate`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(() => {
          
          fetchUsers(token);
        })
        .catch(() => {

          localStorage.removeItem('token');
          navigate('/');
        });
    }
  }, [navigate]);

  const validateToken = async (token) => {
    try {
      await axios.get(`${backendUrl}/api/auth/validate`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchUsers(token); 
    } catch (error) {
      alert('Unauthorized access. Please log in again.');
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const fetchUsers = async (token) => {
    try {
      
      const decodedToken = JSON.parse(atob(token.split('.')[1]));  // Decode JWT
      const loggedInUserId = decodedToken.id;

      const response = await axios.get(`${backendUrl}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      
      const filteredUsers = response.data.filter(user => user._id !== loggedInUserId);
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Failed to fetch users');
    }
  };

  const handleChat = (receiverId) => {
    navigate(`/chat/${receiverId}`);
  };

  const handleBlock = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${backendUrl}/api/admin/users/block/${userId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert(response.data.message);
      fetchUsers(token); 
    } catch (error) {
      alert('Error blocking/unblocking user');
    }
  };

  const handleAddUser = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${backendUrl}/api/admin/addUser`, newUser, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNewUser({ name: '', email: '', mobileNo: '', password: '' });
      fetchUsers(token); 
      alert('User added successfully!');
    } catch (error) {
      alert('Failed to add user');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${backendUrl}/api/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchUsers(token); // Re-fetch users after deleting a user
      alert('User deleted successfully');
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const handleFileUpload = async () => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${backendUrl}/api/admin/users/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      fetchUsers(token); // Re-fetch users after import
      alert('Users imported successfully');
    } catch (error) {
      alert('Error importing users');
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${backendUrl}/api/admin/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users.xlsx');
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert('Error exporting users');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl">Admin Dashboard</h2>

      
      <div className="mb-4">
        <h3 className="text-xl">Add New User</h3>
        <input
          type="text"
          placeholder="Name"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          className="border p-2 m-1"
        />
        <input
          type="email"
          placeholder="Email"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          className="border p-2 m-1"
        />
        <input
          type="text"
          placeholder="Mobile No"
          value={newUser.mobileNo}
          onChange={(e) => setNewUser({ ...newUser, mobileNo: e.target.value })}
          className="border p-2 m-1"
        />
        <input
          type="password"
          placeholder="Password"
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          className="border p-2 m-1"
        />
        <button
          onClick={handleAddUser}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add User
        </button>
      </div>

      
      <div className="mb-4">
        <h3 className="text-xl">Import/Export Users</h3>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="border p-2 m-1"
        />
        <button
          onClick={handleFileUpload}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Import Users
        </button>
        <button
          onClick={handleExport}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 ml-4"
        >
          Export Users
        </button>
      </div>

      
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr>
            <th className="border p-2">Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td className="border p-2">{user.name}</td>
              <td className="border p-2">{user.email}</td>
              <td className="border p-2">
                <button
                  onClick={() => handleChat(user._id)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Chat
                </button>
                <button
                  onClick={() => handleBlock(user._id)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 ml-2"
                >
                  {user.isBlocked ? 'Unblock' : 'Block'}
                </button>
                <button
                  onClick={() => handleDeleteUser(user._id)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 ml-2"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
