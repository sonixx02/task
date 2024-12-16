import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();
  const backendUrl = 'https://task-czvp.onrender.com' ;
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${backendUrl}/api/auth/login`, formData);
      localStorage.setItem('token', response.data.token); // Store token in localStorage
      navigate('/admin'); // Redirect to Admin Dashboard on successful login
    } catch (error) {
      alert('Login failed');
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
      <h2 className="text-2xl mb-4">Login</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6 bg-white shadow-lg rounded-lg">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
        <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
          Login
        </button>
        <button
          type="button"
          onClick={() => navigate('/signup')}
          className="w-full py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          Signup
        </button>
      </form>
    </div>
  );
};

export default Login;
