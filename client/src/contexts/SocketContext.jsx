import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export function SocketProvider({ children }) {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map());

  useEffect(() => {
    console.log('🔍 SocketProvider - Auth state changed:', {
      hasUser: !!user,
      hasToken: !!token,
      existingSocket: !!socketRef.current
    });

    if (user && token && !socketRef.current) {
      console.log('🔌 Creating NEW socket instance...');
      
      const socket = io('http://127.0.0.1:5001', {
        auth: { token },
        transports: ['polling', 'websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000
      });

      socket.on('connect', () => {
        console.log('✅ Socket connected successfully:', socket.id);
        setConnected(true);
      });

      socket.on('disconnect', (reason, details) => {
        console.log('❌ Socket disconnected:', { reason, details });
        setConnected(false);
        setOnlineUsers(new Set());
        setTypingUsers(new Map());
      });

      socket.on('connect_error', (error) => {
        console.error('🚫 Socket connection error:', error);
        setConnected(false);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        setConnected(true);
      });

      // User presence events
      socket.on('user-joined-topic', (data) => {
        setOnlineUsers(prev => new Set([...prev, data.user.id]));
      });

      socket.on('user-left-topic', (data) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.user.id);
          return newSet;
        });
      });

      // Typing events
      socket.on('user-typing', (data) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(data.user.id, {
            username: data.user.username,
            topicId: data.topicId
          });
          return newMap;
        });
      });

      socket.on('user-stop-typing', (data) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.user.id);
          return newMap;
        });
      });

      socketRef.current = socket;
    } else if (!user || !token) {
      // Clean up socket when auth is lost
      if (socketRef.current) {
        console.log('🛑 Cleaning up socket due to auth loss');
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
    }

    // Cleanup function
    return () => {
      // Don't disconnect here - keep socket alive during re-renders
    };
  }, [user, token]);

  // Helper functions
  const joinTopic = (topicId) => {
    if (socketRef.current && connected) {
      console.log('👥 Joining topic:', topicId);
      socketRef.current.emit('join-topic', topicId);
    } else {
      console.log('⚠️ Cannot join topic - socket not connected');
    }
  };

  const leaveTopic = (topicId) => {
    if (socketRef.current && connected) {
      console.log('👋 Leaving topic:', topicId);
      socketRef.current.emit('leave-topic', topicId);
    }
  };

  const sendMessage = (messageData) => {
    if (socketRef.current && connected) {
      console.log('💬 Sending message via socket:', messageData);
      socketRef.current.emit('send-message', messageData);
    } else {
      console.log('⚠️ Cannot send message - not connected');
    }
  };

  const startTyping = (topicId) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('typing-start', { topicId });
    }
  };

  const stopTyping = (topicId) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('typing-stop', { topicId });
    }
  };

  const addReaction = (messageId, emoji) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('add-reaction', { messageId, emoji });
    }
  };

  const value = {
    socket: socketRef.current,
    connected,
    onlineUsers,
    typingUsers,
    joinTopic,
    leaveTopic,
    sendMessage,
    startTyping,
    stopTyping,
    addReaction
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
