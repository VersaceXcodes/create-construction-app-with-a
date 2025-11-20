import React, { useState } from 'react';
import { useAppStore } from '@/store/main';

const UV_SignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { login, authentication_state } = useAppStore();
  const { is_loading } = authentication_state.authentication_status;
  const { error_message } = authentication_state;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(email, password);
    } catch (error) {
      // Error is already handled in the store
      console.error('Login error:', error);
    }
  };

  const isFormValid = email.trim() !== '' && password.trim() !== '';

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h1>Sign In</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={is_loading}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={is_loading}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        {error_message && (
          <div style={{ color: 'red', marginBottom: '15px' }}>
            {error_message}
          </div>
        )}
        
        <button
          type="submit"
          disabled={!isFormValid || is_loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: isFormValid && !is_loading ? '#007bff' : '#cccccc',
            color: 'white',
            border: 'none',
            cursor: isFormValid && !is_loading ? 'pointer' : 'not-allowed',
          }}
        >
          {is_loading ? 'Signing In...' : 'Sign In to Your Account'}
        </button>
      </form>
    </div>
  );
};

export default UV_SignIn;
