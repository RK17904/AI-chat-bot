import React from 'react';
import { FileText, Bookmark } from 'lucide-react';

interface CitationProps {
  filename: string;
  pageNumber: number | string;
}

export const CitationChip: React.FC<CitationProps> = ({ filename, pageNumber }) => {
  return (
    <div className="inline-flex items-center space-x-1 bg-blue-50 border border-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs cursor-pointer hover:bg-blue-100 transition-colors mt-2 mr-2">
      <FileText className="w-3 h-3" />
      <span className="font-semibold">{filename}</span>
      <span className="text-blue-400">|</span>
      <div className="flex items-center space-x-0.5">
        <Bookmark className="w-3 h-3" />
        <span>Pg. {pageNumber}</span>
      </div>
    </div>
  );
};