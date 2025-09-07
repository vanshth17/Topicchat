const express = require('express');
const { body } = require('express-validator');
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction
} = require('../controllers/messageController');
const auth = require('../middleware/auth');

const router = express.Router();

// Message validation
const messageValidation = [
  body('content')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters')
    .trim(),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file'])
    .withMessage('Invalid message type')
];

// All routes require authentication
router.use(auth);

// Get messages for a topic
router.get('/topic/:topicId', getMessages);

// Send a message to a topic
router.post('/topic/:topicId', messageValidation, sendMessage);

// Edit a message
router.put('/:messageId', [
  body('content')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters')
    .trim()
], editMessage);

// Delete a message
router.delete('/:messageId', deleteMessage);

// Add/remove reaction to message
router.post('/:messageId/reaction', [
  body('emoji')
    .isLength({ min: 1, max: 10 })
    .withMessage('Invalid emoji')
], addReaction);

module.exports = router;
