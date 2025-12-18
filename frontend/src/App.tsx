import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Upload, RefreshCw, FileText, Bot, User } from 'lucide-react';
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
  
  //completely reset when "Clear Chat" is clicked
  const [sessionKey, setSessionKey] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);

  // aquto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  //handel file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) alert("✅ File Uploaded!");
      else alert("❌ Upload failed.");
    } catch (error) {
      alert("❌ Error uploading file.");
    }
  };

  //clear chat
  const clearChat = () => {
    setMessages([]);
    setSessionKey(prev => prev + 1);
  };

  // reset brain (clear backend memory)
  const resetBrain = async () => {
    if(!confirm("Are you sure you want to delete all AI memory?")) return;
    try {
      await fetch('http://localhost:8000/reset', { method: 'DELETE' });
      clearChat();
      alert("🧠 Memory Wiped.");
    } catch (e) {
      clearChat(); // clear UI even if backend fails
    }
  };

  //dend message logic 
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // prepare history for backend
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
      
      const botMsg: Message = { 
        role: 'bot', 
        content: data.answer,
        sources: data.sources 
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: "Error connecting to backend." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* side bar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>🤖 ConsultPro</h2>
          <p>Your AI Assistant</p>
        </div>

        <div className="sidebar-controls">
          <div className="control-group">
            <label className="upload-btn">
              <Upload size={18} /> Upload Document
              <input 
                key={sessionKey}
                type="file" 
                onChange={handleUpload} 
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

      {/* main chat area */}
      <div className="chat-area">
        <div className="messages-container">
          
          {/* default animated robot */}
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
              <p>Where should we start?</p>
            </div>
          )}

          {/* chat messages */}
          {messages.map((m, i) => (
            <div key={i} className={`message-wrapper ${m.role}`}>
              <div className="avatar">
                {m.role === 'bot' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div className="message-bubble">
                <div className="msg-content">{m.content}</div>
                
                {/* sourse section */}
                {m.sources && m.sources.length > 0 && (
                  <div className="sources">
                    <div className="source-title"><FileText size={12} /> Sources:</div>
                    <ul>
                      {m.sources.map((s, idx) => <li key={idx}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* loading animation  */}
          {loading && (
            <div className="message-wrapper bot">
              <div className="avatar"><Bot size={20} /></div>
              <div className="message-bubble loading">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          
          {/* scroll anchor*/}
          <div ref={bottomRef} />
        </div>

        {/* input area */}
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