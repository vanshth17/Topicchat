import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import MessageItem from './MessageItem';
import './Chat.css';

function MessageList() {
  const { messages, loading, hasMore, loadMoreMessages } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if user is near bottom of messages
  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    
    const threshold = 100;
    return container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
  };

  // Handle scroll events
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isAtBottom = isNearBottom();
    setShowScrollButton(!isAtBottom);
    setShouldScrollToBottom(isAtBottom);

    // Load more messages when scrolled to top
    if (container.scrollTop === 0 && hasMore && !loading) {
      const prevScrollHeight = container.scrollHeight;
      loadMoreMessages().then(() => {
        // Maintain scroll position after loading more messages
        setTimeout(() => {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }, 100);
      });
    }
  };

  // Auto-scroll for new messages
  useEffect(() => {
    if (shouldScrollToBottom) {
      scrollToBottom();
    }
  }, [messages, shouldScrollToBottom]);

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentGroup = null;

    messages.forEach(message => {
      const messageDate = new Date(message.createdAt).toDateString();
      
      if (!currentGroup || currentGroup.date !== messageDate) {
        currentGroup = {
          date: messageDate,
          messages: []
        };
        groups.push(currentGroup);
      }
      
      currentGroup.messages.push(message);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  if (messages.length === 0 && !loading) {
    return (
      <div className="messages-empty">
        <div className="empty-state">
          <span className="empty-icon">💬</span>
          <h3>No messages yet</h3>
          <p>Be the first to start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container" ref={messagesContainerRef} onScroll={handleScroll}>
      {loading && hasMore && (
        <div className="load-more-indicator">
          <div className="loading-spinner-small"></div>
          <span>Loading more messages...</span>
        </div>
      )}

      {messageGroups.map((group, groupIndex) => (
        <div key={group.date} className="message-group">
          <div className="date-separator">
            <span className="date-text">{formatDateHeader(group.date)}</span>
          </div>
          
          {group.messages.map((message, index) => {
            const prevMessage = index > 0 ? group.messages[index - 1] : null;
            const isConsecutive = prevMessage && 
              prevMessage.sender._id === message.sender._id &&
              new Date(message.createdAt) - new Date(prevMessage.createdAt) < 300000; // 5 minutes

            // IMPORTANT: Determine if message is from current user
            const isOwn = message.sender._id === user?.id;

            return (
              <MessageItem
                key={message._id}
                message={message}
                isOwn={isOwn}
                isConsecutive={isConsecutive}
              />
            );
          })}
        </div>
      ))}

      <div ref={messagesEndRef} />

      {showScrollButton && (
        <button className="scroll-to-bottom-btn" onClick={scrollToBottom}>
          <span>↓</span>
          New messages
        </button>
      )}
    </div>
  );
}

export default MessageList;
