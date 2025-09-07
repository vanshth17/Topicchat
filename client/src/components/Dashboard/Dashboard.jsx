import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { TopicProvider, useTopic } from '../../contexts/TopicContext';
import TopicList from '../Topics/TopicList';
import TopicView from '../Topics/TopicView';
import './Dashboard.css';

function DashboardContent() {
  const { user, logout } = useAuth();
  const { currentTopic } = useTopic();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            ☰
          </button>
          <h1>TopicChat</h1>
        </div>
        <div className="user-info">
          <span>Welcome, {user?.username}!</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>
      
      <div className="dashboard-body">
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <div className="sidebar-content">
            <TopicList />
          </div>
        </aside>
        
        <main className="main-content">
          {currentTopic ? (
            <TopicView />
          ) : (
            <div className="welcome-screen">
              <div className="welcome-content">
                <h2>🎉 Welcome to TopicChat!</h2>
                <p>Select a topic from the sidebar to start chatting, or create a new topic to begin conversations.</p>
                <div className="feature-list">
                  <div className="feature-item">
                    <span className="feature-icon">💬</span>
                    <span>Real-time messaging</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🏷️</span>
                    <span>Message tagging</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📌</span>
                    <span>Pin important messages</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🔒</span>
                    <span>Private topics</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <TopicProvider>
      <DashboardContent />
    </TopicProvider>
  );
}

export default Dashboard;
