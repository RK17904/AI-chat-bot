import React from 'react';
import { FileText, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import '../App.css'; //import the CSS

interface FileProps {
  filename: string;
  status: 'uploading' | 'ready' | 'error';
  onRemove: () => void;
}

export const FileListItem: React.FC<FileProps> = ({ filename, status, onRemove }) => {
  return (
    <div className={`file-preview-card ${status === 'uploading' ? 'uploading' : ''}`}>
      <div className="file-info">
        {status === 'uploading' ? (
          <Loader2 size={24} className="file-icon-preview spin-icon" />
        ) : (
          <FileText size={24} className="file-icon-preview" />
        )}
        
        <div className="file-details">
          <span className="file-name-preview">{filename}</span>
          <span className={`file-status ${status}`}>
             {status === 'uploading' && 'Uploading...'}
             {status === 'ready' && <><CheckCircle size={10}/> Ready</>}
             {status === 'error' && <><AlertCircle size={10}/> Failed</>}
          </span>
        </div>
      </div>
      
      <button onClick={onRemove} className="remove-file-btn">
        <X size={16} />
      </button>
    </div>
  );
};