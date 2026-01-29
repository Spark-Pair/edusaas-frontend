import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Input, Button } from '../components/common';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      toast.error('Please enter username and password');
      return;
    }
    
    setLoading(true);

    try {
      const { data } = await authAPI.login({ 
        username: username.trim(), 
        password 
      });
      
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        await login(data.user);
        
        if (data.user.role === 'admin') {
          toast.success('Welcome, Admin!');
          navigate('/admin', { replace: true });
        } else {
          toast.success(`Welcome, ${data.user.schoolName || data.user.name}!`);
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid username or password';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-sm fade-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800">EduSaaS</h1>
          <p className="text-slate-500 text-sm mt-1">School Management System</p>
        </div>

        <div className="space-y-4">
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            placeholder="Enter your username"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="Enter your password"
          />
          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2.5"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </Button>
        </div>


      </div>
    </div>
  );
};

export default LoginPage;
