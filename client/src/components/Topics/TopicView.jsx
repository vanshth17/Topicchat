import React from 'react';
import { useTopic } from '../../contexts/TopicContext';
import ChatArea from '../Chat/ChatArea';

function TopicView() {
  const { currentTopic } = useTopic();

  if (!currentTopic) {
    return null;
  }

  return <ChatArea topic={currentTopic} />;
}

export default TopicView;
