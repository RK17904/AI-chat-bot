import React from 'react';
import { Trash2, Bot } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface HeaderProps {
  onReset: () => void;
}

export const ChatHeader: React.FC<HeaderProps> = ({ onReset }) => {
  
  const handleReset = () => {
    //call your actual reset function here
    onReset();
    
    //trigger the notification
    toast.success('Brain cleared! Starting fresh context.', {
        icon: '🧠',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
    });
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      <Toaster position="top-center" /> {/* Toast Container */}
      
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <h1 className="font-bold text-xl text-gray-800">Local RAG Bot</h1>
      </div>

      <button 
        onClick={handleReset}
        className="flex items-center space-x-2 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        <span>Reset Brain</span>
      </button>
    </div>
  );
};