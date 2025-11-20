import React from 'react';
import { useAppStore } from '@/store/main';

const UV_Dashboard: React.FC = () => {
  const { logout, authentication_state } = useAppStore();
  const { is_authenticated } = authentication_state.authentication_status;

  const handleLogout = () => {
    logout();
  };

  if (!is_authenticated) {
    return <div>Please log in to access the dashboard.</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Dashboard</h1>
      <p>Welcome! You are successfully authenticated.</p>
      
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default UV_Dashboard;
