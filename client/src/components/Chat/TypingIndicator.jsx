import React, { useEffect, useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import './Chat.css';

function TypingIndicator() {
  const { typingUsers } = useSocket();
  const { user } = useAuth();
  const [displayUsers, setDisplayUsers] = useState([]);

  useEffect(() => {
    // Filter out current user and convert to array
    const users = Array.from(typingUsers.values())
      .filter(typingUser => typingUser.user?.id !== user?.id);
    
    setDisplayUsers(users);
  }, [typingUsers, user]);

  if (displayUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    const usernames = displayUsers.map(u => u.username);
    
    if (usernames.length === 1) {
      return `${usernames[0]} is typing...`;
    } else if (usernames.length === 2) {
      return `${usernames[0]} and ${usernames[1]} are typing...`;
    } else if (usernames.length === 3) {
      return `${usernames[0]}, ${usernames[1]}, and ${usernames[2]} are typing...`;
    } else {
      return `${usernames.slice(0, 3).join(', ')} and ${usernames.length - 3} others are typing...`;
    }
  };

  return (
    <div className="typing-indicator">
      <div className="typing-content">
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span className="typing-text">{getTypingText()}</span>
      </div>
    </div>
  );
}

export default TypingIndicator;
