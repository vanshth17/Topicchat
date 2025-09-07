const Topic = require('../models/Topic');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get all public topics and user's private topics
exports.getTopics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get public topics and private topics where user is a member
    const topics = await Topic.find({
      $or: [
        { isPrivate: false },
        { isPrivate: true, members: userId }
      ]
    })
    .populate('creator', 'username avatar')
    .populate('members', 'username avatar')
    .sort({ updatedAt: -1 });

    res.json({
      success: true,
      topics
    });
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create a new topic
exports.createTopic = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { name, description, isPrivate, tags } = req.body;
    const userId = req.user._id;

    // Check if topic name already exists
    const existingTopic = await Topic.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existingTopic) {
      return res.status(400).json({ 
        message: 'A topic with this name already exists' 
      });
    }

    // Create topic
    const topic = new Topic({
      name,
      description,
      isPrivate: isPrivate || false,
      creator: userId,
      members: [userId],
      admins: [userId],
      tags: tags || []
    });

    await topic.save();
    await topic.populate('creator', 'username avatar');
    await topic.populate('members', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Topic created successfully',
      topic
    });
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Join a topic
exports.joinTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // Check if topic is private
    if (topic.isPrivate) {
      return res.status(403).json({ 
        message: 'Cannot join private topic without invitation' 
      });
    }

    // Check if user is already a member
    if (topic.members.includes(userId)) {
      return res.status(400).json({ 
        message: 'You are already a member of this topic' 
      });
    }

    // Add user to members
    topic.members.push(userId);
    await topic.save();

    await topic.populate('creator', 'username avatar');
    await topic.populate('members', 'username avatar');

    res.json({
      success: true,
      message: 'Successfully joined topic',
      topic
    });
  } catch (error) {
    console.error('Join topic error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Leave a topic
exports.leaveTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // Check if user is a member
    if (!topic.members.includes(userId)) {
      return res.status(400).json({ 
        message: 'You are not a member of this topic' 
      });
    }

    // Prevent creator from leaving (they must transfer ownership first)
    if (topic.creator.toString() === userId.toString()) {
      return res.status(400).json({ 
        message: 'Topic creator cannot leave. Transfer ownership first.' 
      });
    }

    // Remove user from members and admins
    topic.members = topic.members.filter(
      member => member.toString() !== userId.toString()
    );
    topic.admins = topic.admins.filter(
      admin => admin.toString() !== userId.toString()
    );

    await topic.save();

    res.json({
      success: true,
      message: 'Successfully left topic'
    });
  } catch (error) {
    console.error('Leave topic error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get topic details
exports.getTopicById = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;

    const topic = await Topic.findById(topicId)
      .populate('creator', 'username avatar')
      .populate('members', 'username avatar')
      .populate('admins', 'username avatar');

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // Check if user has access to this topic
    const hasAccess = !topic.isPrivate || topic.members.includes(userId);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'You do not have access to this topic' 
      });
    }

    res.json({
      success: true,
      topic
    });
  } catch (error) {
    console.error('Get topic error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a topic (creator only)
exports.deleteTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // Check if user is the creator
    if (topic.creator.toString() !== userId.toString()) {
      return res.status(403).json({ 
        message: 'Only topic creator can delete the topic' 
      });
    }

    await Topic.findByIdAndDelete(topicId);

    res.json({
      success: true,
      message: 'Topic deleted successfully'
    });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ message: error.message });
  }
};
