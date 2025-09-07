import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const TopicContext = createContext();

export function useTopic() {
  const context = useContext(TopicContext);
  if (!context) {
    throw new Error('useTopic must be used within a TopicProvider');
  }
  return context;
}

export function TopicProvider({ children }) {
  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Fetch all topics
  const fetchTopics = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await api.get('/topics');
      setTopics(response.data.topics || []);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create a new topic
  const createTopic = async (topicData) => {
    try {
      const response = await api.post('/topics', topicData);
      const newTopic = response.data.topic;
      
      setTopics(prev => [newTopic, ...prev]);
      return { success: true, topic: newTopic };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create topic'
      };
    }
  };

  // Join a topic
  const joinTopic = async (topicId) => {
    try {
      const response = await api.post(`/topics/${topicId}/join`);
      const updatedTopic = response.data.topic;
      
      setTopics(prev => 
        prev.map(topic => 
          topic._id === topicId ? updatedTopic : topic
        )
      );
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to join topic'
      };
    }
  };

  // Leave a topic
  const leaveTopic = async (topicId) => {
    try {
      await api.post(`/topics/${topicId}/leave`);
      
      setTopics(prev => prev.filter(topic => topic._id !== topicId));
      
      // If currently viewing this topic, clear current topic
      if (currentTopic?._id === topicId) {
        setCurrentTopic(null);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to leave topic'
      };
    }
  };

  // Delete a topic
  const deleteTopic = async (topicId) => {
    try {
      await api.delete(`/topics/${topicId}`);
      
      setTopics(prev => prev.filter(topic => topic._id !== topicId));
      
      if (currentTopic?._id === topicId) {
        setCurrentTopic(null);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete topic'
      };
    }
  };

  // Get topic details
  const getTopicById = async (topicId) => {
    try {
      const response = await api.get(`/topics/${topicId}`);
      return { success: true, topic: response.data.topic };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get topic'
      };
    }
  };

  // Set current topic
  const selectTopic = (topic) => {
    setCurrentTopic(topic);
  };

  // Fetch topics when user changes
  useEffect(() => {
    if (user) {
      fetchTopics();
    }
  }, [user]);

  const value = {
    topics,
    currentTopic,
    loading,
    createTopic,
    joinTopic,
    leaveTopic,
    deleteTopic,
    getTopicById,
    selectTopic,
    fetchTopics
  };

  return (
    <TopicContext.Provider value={value}>
      {children}
    </TopicContext.Provider>
  );
}
