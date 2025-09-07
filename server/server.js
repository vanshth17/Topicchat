require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);

// Enhanced Socket.io setup with debugging and CORS
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  // Increased timeouts to handle network instability
  pingTimeout: 120000,  // 2 minutes (increased from default 20s)
  pingInterval: 60000   // 1 minute (increased from default 25s)
});

// Enhanced connection debugging
io.engine.on("connection_error", (err) => {
  console.log('🚫 Engine connection error:', {
    code: err.code,
    message: err.message,
    context: err.context
  });
});

// CORS Configuration
const corsOptions = {
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || "http://localhost:5173");
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (disabled for development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use('/api/', limiter);
}

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/topicchat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log('📊 Database:', mongoose.connection.name);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// Import models for Socket.io
const User = require('./models/User');
const Message = require('./models/Message');
const Topic = require('./models/Topic');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/topics', require('./routes/topics'));
app.use('/api/messages', require('./routes/messages'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    connections: io.engine.clientsCount
  });
});

// Enhanced Socket authentication middleware with debugging
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    console.log('🔐 Socket auth attempt:', { 
      hasToken: !!token, 
      tokenStart: token ? token.substring(0, 10) + '...' : 'null',
      socketId: socket.id
    });
    
    if (!token) {
      console.log('⚠️ Socket connection rejected: No token provided');
      return next(new Error('No token provided'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log('⚠️ Socket connection rejected: User not found for token');
      return next(new Error('User not found'));
    }

    socket.user = user;
    console.log(`✅ Socket authenticated successfully: ${user.username} (${socket.id})`);
    next();
  } catch (error) {
    console.log('⚠️ Socket authentication error:', {
      message: error.message,
      socketId: socket.id
    });
    next(new Error('Invalid token'));
  }
};

// Apply authentication to all socket connections
io.use(authenticateSocket);

// Socket.io connection handling with enhanced debugging
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.user.username} (${socket.id})`);
  console.log(`📊 Total connections: ${io.engine.clientsCount}`);

  // Join topic room
  socket.on('join-topic', async (topicId) => {
    try {
      console.log(`👥 ${socket.user.username} attempting to join topic: ${topicId}`);
      
      // Verify user has access to topic
      const topic = await Topic.findById(topicId);
      if (!topic) {
        console.log(`❌ Topic not found: ${topicId}`);
        socket.emit('error', { message: 'Topic not found' });
        return;
      }

      const hasAccess = !topic.isPrivate || topic.members.includes(socket.user._id);
      if (!hasAccess) {
        console.log(`❌ Access denied to topic ${topicId} for user ${socket.user.username}`);
        socket.emit('error', { message: 'Access denied to this topic' });
        return;
      }

      socket.join(topicId);
      socket.currentTopic = topicId;
      console.log(`✅ ${socket.user.username} successfully joined topic: ${topicId}`);
      
      // Notify others in the topic (not including sender)
      socket.to(topicId).emit('user-joined-topic', {
        user: {
          id: socket.user._id,
          username: socket.user.username
        }
      });
    } catch (error) {
      console.error('Join topic error:', error);
      socket.emit('error', { message: 'Failed to join topic' });
    }
  });

  // Leave topic room
  socket.on('leave-topic', (topicId) => {
    socket.leave(topicId);
    console.log(`👋 ${socket.user.username} left topic: ${topicId}`);
    
    // Notify others in the topic (not including sender)
    socket.to(topicId).emit('user-left-topic', {
      user: {
        id: socket.user._id,
        username: socket.user.username
      }
    });
  });

  // CRITICAL FIX: Handle new message - Updated to include sender
  socket.on('send-message', async (data) => {
    try {
      const { content, topicId, replyTo } = data;
      console.log(`💬 Message from ${socket.user.username} in topic ${topicId}: ${content.substring(0, 50)}...`);

      if (!content || !content.trim()) {
        socket.emit('message-error', { message: 'Message content cannot be empty' });
        return;
      }

      if (content.length > 1000) {
        socket.emit('message-error', { message: 'Message too long (max 1000 characters)' });
        return;
      }

      // Verify topic access
      const topic = await Topic.findById(topicId);
      if (!topic) {
        socket.emit('message-error', { message: 'Topic not found' });
        return;
      }

      const hasAccess = !topic.isPrivate || topic.members.includes(socket.user._id);
      if (!hasAccess) {
        socket.emit('message-error', { message: 'Access denied to this topic' });
        return;
      }

      // Create and save message
      const message = new Message({
        content: content.trim(),
        sender: socket.user._id,
        topic: topicId,
        replyTo: replyTo || null
      });

      await message.save();
      await message.populate('sender', 'username avatar');
      
      if (replyTo) {
        await message.populate('replyTo', 'content sender');
      }

      // Update topic's last activity
      topic.updatedAt = new Date();
      await topic.save();

      // CRITICAL FIX: Use io.in() to include sender in message broadcast
      io.in(topicId).emit('new-message', message);
      
      console.log(`✅ Message sent successfully by ${socket.user.username} in topic ${topicId} to ${io.sockets.adapter.rooms.get(topicId)?.size || 0} clients`);
    } catch (error) {
      console.error('Socket message error:', error);
      socket.emit('message-error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators (exclude sender from broadcast)
  socket.on('typing-start', (data) => {
    console.log(`⌨️ ${socket.user.username} started typing in topic ${data.topicId}`);
    socket.to(data.topicId).emit('user-typing', {
      user: {
        id: socket.user._id,
        username: socket.user.username
      },
      topicId: data.topicId
    });
  });

  socket.on('typing-stop', (data) => {
    console.log(`⌨️ ${socket.user.username} stopped typing in topic ${data.topicId}`);
    socket.to(data.topicId).emit('user-stop-typing', {
      user: {
        id: socket.user._id,
        username: socket.user.username
      },
      topicId: data.topicId
    });
  });

  // Handle message reactions (include all room members)
  socket.on('add-reaction', async (data) => {
    try {
      const { messageId, emoji } = data;
      console.log(`😊 ${socket.user.username} reacted with ${emoji} to message ${messageId}`);
      
      if (!emoji || emoji.length > 10) {
        return;
      }
      
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Check if user already reacted with this emoji
      const existingReaction = message.reactions.find(
        r => r.user.toString() === socket.user._id.toString() && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove reaction
        message.reactions = message.reactions.filter(
          r => !(r.user.toString() === socket.user._id.toString() && r.emoji === emoji)
        );
      } else {
        // Add reaction
        message.reactions.push({
          user: socket.user._id,
          emoji
        });
      }

      await message.save();
      await message.populate('reactions.user', 'username');

      // Emit to all users in the topic (including sender)
      io.in(message.topic.toString()).emit('message-reaction-updated', {
        messageId,
        reactions: message.reactions
      });
    } catch (error) {
      console.error('Socket reaction error:', error);
      socket.emit('error', { message: 'Failed to update reaction' });
    }
  });

  // Handle disconnect with detailed logging
  socket.on('disconnect', (reason, details) => {
    console.log(`❌ User disconnected: ${socket.user.username} (${socket.id}) - Reason: ${reason}`);
    if (details) {
      console.log(`📋 Disconnect details:`, details);
    }
    console.log(`📊 Total connections: ${io.engine.clientsCount}`);
    
    // Notify current topic if user was in one
    if (socket.currentTopic) {
      socket.to(socket.currentTopic).emit('user-left-topic', {
        user: {
          id: socket.user._id,
          username: socket.user.username
        }
      });
    }
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.user.username}:`, error);
  });

  // Handle reconnection
  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 ${socket.user.username} reconnected after ${attemptNumber} attempts`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler - must be last
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

// Start server with enhanced logging
const PORT = process.env.PORT || 5001;
server.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log(`🚀 TopicChat Server Started Successfully`);
  console.log('='.repeat(60));
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log(`🔌 Socket.io enabled with transports: polling, websocket`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Configured ✅' : '❌ MISSING!'}`);
  console.log(`🗄️ MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/topicchat'}`);
  console.log(`⏰ Socket ping timeout: 120000ms, interval: 60000ms`);
  console.log(`🔧 CORS Origins: localhost:5173, 127.0.0.1:5173`);
  console.log('='.repeat(60));
});

module.exports = { app, server, io };
