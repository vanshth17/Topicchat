import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useSocket } from '../../contexts/SocketContext';
import './Chat.css';

function MessageInput() {
  const { sendMessage, currentTopic } = useChat();
  const { startTyping, stopTyping, connected } = useSocket();
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Handle typing indicators
  const handleTypingStart = () => {
    if (!isTypingRef.current && connected && currentTopic) {
      isTypingRef.current = true;
      startTyping(currentTopic);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000); // Stop typing after 3 seconds of inactivity
  };

  const handleTypingStop = () => {
    if (isTypingRef.current && connected && currentTopic) {
      isTypingRef.current = false;
      stopTyping(currentTopic);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!message.trim() || sending || !connected) return;

    setSending(true);
    handleTypingStop();

    const result = await sendMessage(message, replyTo?._id);
    
    if (result.success) {
      setMessage('');
      setReplyTo(null);
    }

    setSending(false);
    textareaRef.current?.focus();
  };

  // Clear reply
  const clearReply = () => {
    setReplyTo(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleTypingStop();
    };
  }, []);

  if (!currentTopic) {
    return null;
  }

  return (
    <div className="message-input-container">
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-content">
            <span className="reply-to">Replying to {replyTo.sender.username}</span>
            <span className="reply-message">{replyTo.content}</span>
          </div>
          <button className="reply-close" onClick={clearReply}>×</button>
        </div>
      )}

      <div className="message-input-wrapper">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={connected ? "Type a message..." : "Connecting..."}
            disabled={!connected || sending}
            className="message-textarea"
            rows="1"
            maxLength="1000"
          />
          
          <div className="input-actions">
            <div className="message-info">
              <span className={`connection-indicator ${connected ? 'connected' : 'disconnected'}`}>
                {connected ? '●' : '○'}
              </span>
              <span className="char-count">
                {message.length}/1000
              </span>
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || sending || !connected}
              className="send-button"
            >
              {sending ? (
                <div className="sending-spinner"></div>
              ) : (
                <span>Send</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessageInput;
