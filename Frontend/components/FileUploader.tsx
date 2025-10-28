import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Card } from './Card';
import { UploadIcon, FileIcon, TrashIcon } from './icons';

export const FileUploader = () => {
  const { uploadedFiles, setUploadedFiles, removeUploadedFile } = useAppStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setUploadedFiles(Array.from(e.dataTransfer.files));
    }
  };
  
  const handleRemoveFile = (fileName: string) => {
    removeUploadedFile(fileName);
  };

  return (
    <Card title="Upload Documents" icon={<UploadIcon />}>
      <div className="flex flex-col items-center">
        <label
          htmlFor="file-input"
          className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-brand-300 border-dashed rounded-lg cursor-pointer bg-brand-50 hover:bg-brand-100 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-10 h-10 mb-3 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            <p className="mb-2 text-sm text-brand-800"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-brand-700">.TXT, .MD, or .PDF files</p>
          </div>
          <input id="file-input" type="file" multiple hidden onChange={handleFileChange} accept=".txt,.md,.pdf" />
        </label>
        {uploadedFiles.length > 0 && (
          <div className="w-full mt-6">
            <h3 className="font-semibold text-slate-700 mb-2">Selected files:</h3>
            <ul className="space-y-2">
              {uploadedFiles.map(file => (
                <li key={file.name} className="flex items-center justify-between bg-slate-100 p-2 rounded-md">
                   <div className="flex items-center space-x-2 truncate">
                     <FileIcon className="h-5 w-5 text-slate-500 flex-shrink-0" />
                     <span className="text-sm text-slate-800 truncate" title={file.name}>{file.name}</span>
                   </div>
                   <div className="flex items-center space-x-2">
                     <span className="text-xs text-slate-500 whitespace-nowrap pl-2">{(file.size / 1024).toFixed(2)} KB</span>
                     <button
                        onClick={() => handleRemoveFile(file.name)}
                        className="text-slate-500 hover:text-red-600 p-1 rounded-full transition-colors"
                        aria-label={`Remove file: ${file.name}`}
                     >
                        <TrashIcon className="h-4 w-4" />
                     </button>
                   </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};