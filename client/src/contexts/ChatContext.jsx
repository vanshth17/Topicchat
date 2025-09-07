import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTopic, setCurrentTopic] = useState(null);
  const { socket, connected, sendMessage: socketSendMessage } = useSocket();
  const { user } = useAuth();

  // Load messages for a topic
  const loadMessages = async (topicId, page = 1, append = false) => {
    if (!topicId) return;

    setLoading(true);
    try {
      console.log(`📋 Loading messages for topic ${topicId}, page ${page}`);
      const response = await api.get(`/messages/topic/${topicId}?page=${page}&limit=50`);
      const { messages: newMessages, pagination } = response.data;

      console.log(`📨 Loaded ${newMessages.length} messages from API`);

      if (append) {
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
        setCurrentTopic(topicId);
      }

      setHasMore(pagination.hasMore);
      setCurrentPage(pagination.currentPage);
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load more messages (pagination)
  const loadMoreMessages = () => {
    if (currentTopic && hasMore && !loading) {
      console.log('📄 Loading more messages...');
      loadMessages(currentTopic, currentPage + 1, true);
    }
  };

  // Send a message using Socket.io only (no API call)
  const sendMessage = async (content, replyTo = null) => {
    if (!currentTopic || !content.trim()) {
      console.log('❌ Cannot send message - missing data:', { 
        currentTopic: !!currentTopic, 
        hasContent: !!content.trim() 
      });
      return { success: false, message: 'Cannot send message - missing topic or content' };
    }

    if (!connected || !socket) {
      console.log('❌ Cannot send message - socket not connected:', { connected, hasSocket: !!socket });
      return { success: false, message: 'Cannot send message - not connected to server' };
    }

    try {
      console.log('📤 Sending message via socket:', { 
        content: content.trim(), 
        topicId: currentTopic, 
        replyTo 
      });
      
      // Use the socketSendMessage function from SocketContext
      socketSendMessage({
        content: content.trim(),
        topicId: currentTopic,
        replyTo
      });

      console.log('✅ Message sent via socket');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to send message' 
      };
    }
  };

  // Edit a message
  const editMessage = async (messageId, newContent) => {
    try {
      console.log(`✏️ Editing message ${messageId}`);
      const response = await api.put(`/messages/${messageId}`, {
        content: newContent.trim()
      });

      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, content: newContent.trim(), isEdited: true, editedAt: new Date() }
            : msg
        )
      );

      console.log('✅ Message edited successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to edit message:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to edit message' 
      };
    }
  };

  // Delete a message
  const deleteMessage = async (messageId) => {
    try {
      console.log(`🗑️ Deleting message ${messageId}`);
      await api.delete(`/messages/${messageId}`);

      // Update local state
      setMessages(prev => prev.filter(msg => msg._id !== messageId));

      console.log('✅ Message deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to delete message:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to delete message' 
      };
    }
  };

  // Add reaction to message
  const addReaction = async (messageId, emoji) => {
    try {
      console.log(`😊 Adding reaction ${emoji} to message ${messageId}`);
      const response = await api.post(`/messages/${messageId}/reaction`, { emoji });
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, reactions: response.data.reactions }
            : msg
        )
      );

      console.log('✅ Reaction added successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to add reaction:', error);
      return { success: false };
    }
  };

  // Clear messages when topic changes
  const clearMessages = () => {
    console.log('🧹 Clearing messages');
    setMessages([]);
    setCurrentPage(1);
    setHasMore(true);
    setCurrentTopic(null);
  };

  // CRITICAL: Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) {
      console.log('🔌 No socket available for event listeners');
      return;
    }

    console.log('🎧 Setting up socket event listeners for ChatContext');

    // Listen for new messages
    const handleNewMessage = (message) => {
      console.log('📨 RECEIVED new-message event in ChatContext:', {
        messageId: message._id,
        content: message.content?.substring(0, 50) + '...',
        sender: message.sender?.username,
        currentTopic
      });
      
      setMessages(prev => {
        // Check if message already exists (prevent duplicates)
        const messageExists = prev.some(msg => msg._id === message._id);
        if (messageExists) {
          console.log('⚠️ Message already exists in state, skipping duplicate');
          return prev;
        }
        
        console.log('✅ Adding new message to messages state');
        const newMessages = [...prev, message];
        console.log('📊 Total messages after add:', newMessages.length);
        return newMessages;
      });
    };

    // Listen for message errors
    const handleMessageError = (error) => {
      console.error('❌ Message error from server:', error);
      // You can show a toast notification here
      alert(`Message Error: ${error.message}`);
    };

    // Listen for reaction updates
    const handleReactionUpdate = (data) => {
      console.log('😊 Received reaction update:', data);
      setMessages(prev => 
        prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      );
    };

    // Register event listeners
    socket.on('new-message', handleNewMessage);
    socket.on('message-error', handleMessageError);
    socket.on('message-reaction-updated', handleReactionUpdate);

    console.log('✅ Socket event listeners registered in ChatContext');

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket listeners in ChatContext');
      socket.off('new-message', handleNewMessage);
      socket.off('message-error', handleMessageError);
      socket.off('message-reaction-updated', handleReactionUpdate);
    };
  }, [socket, currentTopic]); // Include currentTopic to re-register when topic changes

  // Debug: Log messages state changes
  useEffect(() => {
    console.log('📊 Messages state updated:', {
      messageCount: messages.length,
      currentTopic,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 30) + '...'
    });
  }, [messages, currentTopic]);

  // Debug: Log socket connection changes
  useEffect(() => {
    console.log('🔌 Socket connection status changed:', { connected, hasSocket: !!socket });
  }, [connected, socket]);

  const value = {
    messages,
    loading,
    hasMore,
    currentTopic,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    clearMessages
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}
