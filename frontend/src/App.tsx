import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Upload, RefreshCw, CloudUpload } from 'lucide-react';

//import Custom Components
import { ChatMessage } from './components/ChatMessage';
import { FileListItem } from './components/FileListItem';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { SidebarHeader } from './components/SidebarHeader';

import './App.css';

//types 
interface Message {
  role: 'user' | 'bot';
  content: string;
  sources?: string[];
}

interface UploadedFile {
  name: string;
  status: 'uploading' | 'ready' | 'error';
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handlers

  const uploadFile = async (file: File) => {
    if (uploadedFiles.some(f => f.name === file.name)) {
      alert(`⚠️ ${file.name} is already added!`);
      return;
    }

    const newFile: UploadedFile = { name: file.name, status: 'uploading' };
    setUploadedFiles(prev => [...prev, newFile]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setUploadedFiles(prev => 
          prev.map(f => f.name === file.name ? { ...f, status: 'ready' } : f)
        );
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      alert(`❌ Failed to upload ${file.name}`);
      setUploadedFiles(prev => prev.filter(f => f.name !== file.name));
    }
  };

  const handleButtonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validTypes = ['.pdf', '.docx', '.pptx', '.xlsx'];
      const isValid = validTypes.some(ext => file.name.toLowerCase().endsWith(ext));
      if (isValid) uploadFile(file);
      else alert("❌ Invalid file type.");
    }
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const clearChat = () => setMessages([]);

  const resetBrain = async () => {
    if(!confirm("Are you sure you want to delete all AI memory?")) return;
    try {
      await fetch('http://localhost:8000/reset', { method: 'DELETE' });
      clearChat();
      setUploadedFiles([]); 
      alert("🧠 Memory Wiped.");
    } catch (e) {
      alert("Error resetting brain");
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content
      }));

      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: userMsg.content,
          history: historyPayload 
        }),
      });
      
      const data = await res.json();
      const botMsg: Message = { role: 'bot', content: data.answer, sources: data.sources };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: "Error connecting to backend." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      
      {/* SIDEBAR */}
      <div className="sidebar">
        
        {/* Header Component */}
        <SidebarHeader />

        <div className="sidebar-controls">
          {/*File List Component Loop */}
          <div className="files-list">
            {uploadedFiles.map((file, index) => (
              <FileListItem 
                key={index}
                filename={file.name}
                status={file.status}
                onRemove={() => removeFile(file.name)}
              />
            ))}
          </div>

          <div 
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <CloudUpload size={32} className="drop-icon" />
            <p>Add Files</p>
            <span className="file-types">Drag & Drop or Click</span>
          </div>

          <div className="control-group">
            <label className="upload-btn">
              <Upload size={18} /> Select File
              <input 
                id="file-input"
                key={sessionKey}
                type="file" 
                onChange={handleButtonUpload} 
                accept=".pdf,.docx,.pptx,.xlsx"
                hidden 
              />
            </label>
          </div>

          <div className="bottom-controls">
            <button onClick={clearChat} className="action-btn">
              <Trash2 size={18} /> Clear Chat
            </button>
            <button onClick={resetBrain} className="action-btn danger">
              <RefreshCw size={18} /> Reset Memory
            </button>
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="chat-area">
        <div className="messages-container">
          
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="robot-container">
                <div className="robot-head">
                  <div className="robot-eyes">
                    <div className="eye left"></div>
                    <div className="eye right"></div>
                  </div>
                  <div className="robot-mouth"></div>
                </div>
                <div className="robot-shadow"></div>
              </div>
              <h3>How can I help you today?</h3>
              <p>Upload documents to give me knowledge.</p>
            </div>
          )}

          {/*Chat Message Component Loop */}
          {messages.map((m, i) => (
            <ChatMessage 
              key={i}
              role={m.role}
              content={m.content}
              sources={m.sources}
            />
          ))}

          {/*Thinking Indicator Component */}
          {loading && <ThinkingIndicator />}
          
          <div ref={bottomRef} />
        </div>

        <div className="input-container">
          <div className="input-wrapper">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask a question..."
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}>
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;
