
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Card } from './Card';
import { PromptIcon, TrashIcon, EyeIcon } from './icons';
import { Modal } from './Modal';

const DEFAULT_PROMPTS: Record<string, string> = {
  'Summarize': 'Based on the following text, extract the key concepts and provide a detailed technical summary in markdown format.\n\nText to analyze:\n---\n{text_chunk}\n---',
  'Key Points': 'Extract the main key points from the following text as a bulleted list in markdown.\n\nText:\n---\n{text_chunk}\n---',
  'Sentiment Analysis': 'Analyze the sentiment of the following text. Is it positive, negative, or neutral? Explain your reasoning.\n\nText:\n---\n{text_chunk}\n---'
};

export const PromptSelector = () => {
  const { 
    selectedPrompts, 
    addSelectedPrompt, 
    removeSelectedPrompt, 
    customPromptName, 
    setCustomPromptName, 
    customPromptContent, 
    setCustomPromptContent,
    preprocessingOnly
  } = useAppStore();

  const [viewingPrompt, setViewingPrompt] = useState<{ name: string; content: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleDefaultPromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (checked) {
      addSelectedPrompt(name, DEFAULT_PROMPTS[name]);
    } else {
      removeSelectedPrompt(name);
    }
  };
  
  const handleAddCustomPrompt = () => {
      if (customPromptName && customPromptContent && !selectedPrompts[customPromptName]) {
          addSelectedPrompt(customPromptName, customPromptContent);
          setCustomPromptName('');
          setCustomPromptContent('');
      }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  const selectedDefaultPrompts = Object.keys(selectedPrompts).filter(p => DEFAULT_PROMPTS[p]);

  return (
    <>
      <Card title="Select & Create Prompts" icon={<PromptIcon />}>
        <fieldset
          disabled={preprocessingOnly}
          className={`space-y-6 transition-opacity ${preprocessingOnly ? 'opacity-50' : ''}`}
        >
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">Default Prompts</h3>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="relative w-full cursor-default rounded-md bg-white py-2 pl-3 pr-10 text-left text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm sm:leading-6"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
              >
                <span className="block truncate">
                  {selectedDefaultPrompts.length > 0 ? selectedDefaultPrompts.join(', ') : 'Select prompts...'}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 6.53 8.28a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.53a.75.75 0 011.06 0L10 15.19l2.47-2.47a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clipRule="evenodd" />
                  </svg>
                </span>
              </button>
              
              {isDropdownOpen && (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm" role="listbox">
                  {Object.entries(DEFAULT_PROMPTS).map(([name, content]) => (
                    <li key={name} className="flex items-center justify-between text-slate-900 relative select-none py-2 pl-3 pr-3 hover:bg-slate-100" role="option" aria-selected={!!selectedPrompts[name]}>
                      <label className="flex items-center space-x-3 cursor-pointer grow">
                        <input
                          type="checkbox"
                          name={name}
                          checked={!!selectedPrompts[name]}
                          onChange={handleDefaultPromptChange}
                          className="h-4 w-4 rounded border-slate-300 bg-white text-brand-600 focus:ring-brand-500"
                        />
                        <span className="font-normal block truncate">{name}</span>
                      </label>
                      <button 
                        onClick={() => setViewingPrompt({ name, content })} 
                        className="text-slate-500 hover:text-brand-600 p-1 rounded-full flex-shrink-0"
                        aria-label={`View prompt: ${name}`}
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-3 border-t pt-4">Custom Prompt</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Custom prompt name..."
                value={customPromptName}
                onChange={(e) => setCustomPromptName(e.target.value)}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              />
              <textarea
                placeholder="Your custom prompt content. Use {text_chunk} as a placeholder for the document text..."
                value={customPromptContent}
                onChange={(e) => setCustomPromptContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              />
              <button
                  onClick={handleAddCustomPrompt}
                  disabled={!customPromptName || !customPromptContent || !!selectedPrompts[customPromptName]}
                  className="px-4 py-2 bg-brand-600 text-white font-semibold rounded-md shadow-sm hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                Add Custom Prompt
              </button>
            </div>
          </div>

          {Object.keys(selectedPrompts).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-700 mb-2">Active Prompts</h3>
              <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedPrompts).map(([name, content]) => (
                      <div key={name} className="flex items-center bg-brand-100 text-brand-800 text-sm font-medium pl-3 pr-2 py-1 rounded-full">
                          <span>{name}</span>
                          <div className="flex items-center ml-2 space-x-1">
                              <button 
                                onClick={() => setViewingPrompt({ name, content })} 
                                className="text-brand-600 hover:text-brand-800 p-1 rounded-full"
                                aria-label={`View prompt: ${name}`}
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => removeSelectedPrompt(name)} 
                                className="text-brand-600 hover:text-brand-800 p-1 rounded-full"
                                aria-label={`Remove prompt: ${name}`}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
            </div>
          )}
        </fieldset>
      </Card>
      <Modal
        isOpen={!!viewingPrompt}
        onClose={() => setViewingPrompt(null)}
        title={`Prompt: ${viewingPrompt?.name || ''}`}
      >
        <pre className="bg-slate-100 p-4 rounded-md text-sm text-slate-800 whitespace-pre-wrap font-sans">
          {viewingPrompt?.content}
        </pre>
      </Modal>
    </>
  );
};
