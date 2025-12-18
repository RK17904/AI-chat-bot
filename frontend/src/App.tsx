import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Upload, RefreshCw, FileText, Bot, User, CloudUpload } from 'lucide-react';
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
  const [isDragging, setIsDragging] = useState(false); // state for dragging

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // upload function 
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) alert(`✅ Uploaded: ${file.name}`);
      else alert("❌ Upload failed.");
    } catch (error) {
      alert("❌ Error uploading file.");
    }
  };

  // button upload
  const handleButtonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  // drag & drop events
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
      // check file type 
      const validTypes = ['.pdf', '.docx', '.pptx', '.xlsx'];
      const isValid = validTypes.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (isValid) uploadFile(file);
      else alert("❌ Invalid file type. Please upload PDF, Word, Excel, or PowerPoint.");
    }
  };

  // clear chat
  const clearChat = () => {
    setMessages([]);
    setSessionKey(prev => prev + 1);
  };

  // reset brain
  const resetBrain = async () => {
    if(!confirm("Are you sure you want to delete all AI memory?")) return;
    try {
      await fetch('http://localhost:8000/reset', { method: 'DELETE' });
      clearChat();
      alert("🧠 Memory Wiped.");
    } catch (e) {
      clearChat();
    }
  };

  // send message
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
          <h2>🤖 ConsultPro</h2>
          <p>Your AI Assistant</p>
        </div>

        <div className="sidebar-controls">
          
          {/* DRAG & DROP ZONE */}
          <div 
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <CloudUpload size={32} className="drop-icon" />
            <p>Drag & Drop files here</p>
            <span className="file-types">PDF, DOCX, PPTX, XLSX</span>
          </div>

          <div className="control-group">
            <label className="upload-btn">
              <Upload size={18} /> Select File
              <input 
                key={sessionKey}
                type="file" 
                onChange={handleButtonUpload} 
                accept=".pdf,.docx,.pptx,.xlsx"
                hidden 
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
              <p>Upload a document to get started.</p>
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