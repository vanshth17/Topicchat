const express = require('express');
const { body } = require('express-validator');
const {
  getTopics,
  createTopic,
  joinTopic,
  leaveTopic,
  getTopicById,
  deleteTopic
} = require('../controllers/topicController');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation middleware for topic creation
const createTopicValidation = [
  body('name')
    .isLength({ min: 3, max: 50 })
    .withMessage('Topic name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Topic name can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean value')
];

// All routes require authentication
router.use(auth);

// Get all accessible topics for the user
router.get('/', getTopics);

// Create a new topic
router.post('/', createTopicValidation, createTopic);

// Get specific topic details
router.get('/:topicId', getTopicById);

// Join a topic
router.post('/:topicId/join', joinTopic);

// Leave a topic
router.post('/:topicId/leave', leaveTopic);

// Delete a topic (creator only)
router.delete('/:topicId', deleteTopic);

module.exports = router;
