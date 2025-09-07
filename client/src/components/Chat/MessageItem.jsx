import React, { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import './Chat.css';

function MessageItem({ message, isOwn, isConsecutive }) {
  const { editMessage, deleteMessage, addReaction } = useChat();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      const result = await editMessage(message._id, editContent);
      if (result.success) {
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      await deleteMessage(message._id);
    }
  };

  const handleReaction = async (emoji) => {
    await addReaction(message._id, emoji);
    setShowReactions(false);
  };

  const canEdit = isOwn && new Date() - new Date(message.createdAt) < 15 * 60 * 1000; // 15 minutes
  const canDelete = isOwn;

  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  // IMPORTANT: Determine if this message is from current user
  const isMyMessage = message.sender._id === user?.id;

  return (
    <div 
      className={`message-item ${isMyMessage ? 'message-own' : 'message-other'} ${isConsecutive ? 'message-consecutive' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isConsecutive && (
        <div className="message-header">
          <div className="message-avatar">
            {message.sender.avatar ? (
              <img src={message.sender.avatar} alt={message.sender.username} />
            ) : (
              <div className="avatar-placeholder">
                {message.sender.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="message-meta">
            <span className="message-sender">{message.sender.username}</span>
            <span className="message-time">{formatTime(message.createdAt)}</span>
            {message.isEdited && <span className="message-edited">(edited)</span>}
          </div>
        </div>
      )}

      <div className="message-body">
        {message.replyTo && (
          <div className="message-reply">
            <div className="reply-indicator"></div>
            <div className="reply-content">
              <span className="reply-sender">{message.replyTo.sender?.username}</span>
              <span className="reply-text">{message.replyTo.content}</span>
            </div>
          </div>
        )}

        <div className="message-content">
          {isEditing ? (
            <div className="message-edit">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEdit();
                  }
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }
                }}
                autoFocus
                className="edit-textarea"
              />
              <div className="edit-actions">
                <button onClick={handleEdit} className="save-btn">Save</button>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }} 
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="message-text">{message.content}</div>
          )}

          {/* Message Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="message-reactions">
              {message.reactions.reduce((acc, reaction) => {
                const existing = acc.find(r => r.emoji === reaction.emoji);
                if (existing) {
                  existing.count++;
                  existing.users.push(reaction.user);
                } else {
                  acc.push({
                    emoji: reaction.emoji,
                    count: 1,
                    users: [reaction.user]
                  });
                }
                return acc;
              }, []).map((reaction, index) => (
                <button
                  key={index}
                  className={`reaction-btn ${reaction.users.some(u => u._id === user?.id) ? 'reaction-active' : ''}`}
                  onClick={() => handleReaction(reaction.emoji)}
                  title={reaction.users.map(u => u.username).join(', ')}
                >
                  {reaction.emoji} {reaction.count}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message Actions */}
        {(showActions || showReactions) && !isEditing && (
          <div className="message-actions">
            <button 
              className="action-btn reaction-btn"
              onClick={() => setShowReactions(!showReactions)}
            >
              😊
            </button>
            {canEdit && (
              <button 
                className="action-btn edit-btn"
                onClick={() => setIsEditing(true)}
              >
                ✏️
              </button>
            )}
            {canDelete && (
              <button 
                className="action-btn delete-btn"
                onClick={handleDelete}
              >
                🗑️
              </button>
            )}
          </div>
        )}

        {/* Reaction Picker */}
        {showReactions && (
          <div className="reaction-picker">
            {reactionEmojis.map(emoji => (
              <button
                key={emoji}
                className="reaction-option"
                onClick={() => handleReaction(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {isConsecutive && (
        <div className="message-time-consecutive">
          {formatTime(message.createdAt)}
        </div>
      )}
    </div>
  );
}

export default MessageItem;
