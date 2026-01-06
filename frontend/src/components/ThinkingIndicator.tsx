import React from 'react';
import { Bot } from 'lucide-react';
import '../App.css';

export const ThinkingIndicator = () => {
  return (
    <div className="message-wrapper bot">
      <div className="avatar"><Bot size={20} /></div>
      <div className="message-bubble loading">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
    </div>
  );
};