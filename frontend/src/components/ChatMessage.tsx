import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, FileText } from 'lucide-react';
import '../App.css';

interface MessageProps {
  role: 'user' | 'bot';
  content: string;
  sources?: string[];
}

export const ChatMessage: React.FC<MessageProps> = ({ role, content, sources }) => {
  const isBot = role === 'bot';

  return (
    <div className={`message-wrapper ${role}`}>
      <div className="avatar">
        {isBot ? <Bot size={20} /> : <User size={20} />}
      </div>
      
      <div className="message-bubble">
        {/* Markdown Content */}
        <div className="msg-content">
           <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {/* Sources rendered as Chips */}
        {sources && sources.length > 0 && (
          <div className="citation-container">
            <div className="source-title"><FileText size={12} /> Sources:</div>
            <div style={{display: 'flex', flexWrap: 'wrap'}}>
              {sources.map((src, idx) => (
                <div key={idx} className="citation-chip">
                  <FileText size={10} /> {src}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};