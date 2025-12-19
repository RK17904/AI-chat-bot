import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Upload, RefreshCw, FileText, Bot, User, CloudUpload, Loader2, X, CheckCircle } from 'lucide-react';
import './App.css';

interface Message {
  role: 'user' | 'bot';
  content: string;
  sources?: string[];
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  
  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // storing an array of files
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const uploadFile = async (file: File) => {
    // prevent duplicate uploads
    if (uploadedFiles.some(f => f.name === file.name)) {
      alert("⚠️ This file is already uploaded!");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        // list instead of replacing
        setUploadedFiles(prev => [...prev, file]);
      } else {
        alert("❌ Upload failed.");
      }
    } catch (error) {
      alert("❌ Error uploading file.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileNameToRemove: string) => {
    //removes from UI
    setUploadedFiles(prev => prev.filter(f => f.name !== fileNameToRemove));
  };

  const handleButtonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isUploading) setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validTypes = ['.pdf', '.docx', '.pptx', '.xlsx'];
      const isValid = validTypes.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (isValid) uploadFile(file);
      else alert("❌ Invalid file type. Please upload PDF, Word, Excel, or PowerPoint.");
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const resetBrain = async () => {
    if(!confirm("Are you sure you want to delete all AI memory?")) return;
    try {
      await fetch('http://localhost:8000/reset', { method: 'DELETE' });
      clearChat();
      setUploadedFiles([]); // clear the entire list
      alert("🧠 Memory Wiped.");
    } catch (e) {
      clearChat();
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
        <div className="sidebar-header">
          <div className="brand-container">
            <video 
              className="brand-video" 
              autoPlay 
              loop 
              muted 
              playsInline
            >
              <source src="/robot_logo.mp4" type="video/mp4" />
            </video>
            <h2>ConsultPro</h2>
          </div>
          <p>Your AI Assistant</p>
        </div>

        <div className="sidebar-controls">
          
          {/* file list (scrollable) */}
          <div className="files-list">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="file-preview-card">
                <div className="file-info">
                  <FileText size={24} className="file-icon-preview" />
                  <div className="file-details">
                    <span className="file-name-preview">{file.name}</span>
                    <span className="file-status"><CheckCircle size={10}/> Ready</span>
                  </div>
                </div>
                <button 
                  onClick={() => removeFile(file.name)} 
                  className="remove-file-btn" 
                  title="Remove from list"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* upload zone */}
          {isUploading ? (
            <div className="drop-zone uploading">
              <Loader2 size={32} className="spin-icon" />
              <p>Uploading...</p>
            </div>
          ) : (
            <div 
              className={`drop-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <CloudUpload size={32} className="drop-icon" />
              <p>Add another file</p>
              <span className="file-types">Drag & drop or use button</span>
            </div>
          )}

          <div className="control-group">
            <label className={`upload-btn ${isUploading ? 'disabled' : ''}`}>
              <Upload size={18} /> Select File
              <input 
                key={sessionKey}
                type="file" 
                onChange={handleButtonUpload} 
                accept=".pdf,.docx,.pptx,.xlsx"
                hidden 
                disabled={isUploading}
              />
            </label>
          </div>

          <div className="control-group bottom-controls">
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

          {messages.map((m, i) => (
            <div key={i} className={`message-wrapper ${m.role}`}>
              <div className="avatar">
                {m.role === 'bot' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div className="message-bubble">
                <div className="msg-content">{m.content}</div>
                {m.sources && m.sources.length > 0 && (
                  <div className="sources">
                    <div className="source-title"><FileText size={12} /> Sources:</div>
                    <ul>{m.sources.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-wrapper bot">
              <div className="avatar"><Bot size={20} /></div>
              <div className="message-bubble loading">
                <span className="dot"></span><span className="dot"></span><span className="dot"></span>
              </div>
            </div>
          )}
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