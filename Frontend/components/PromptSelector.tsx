import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Card } from './Card';
import { PromptIcon, TrashIcon } from './icons';

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
    setCustomPromptContent 
  } = useAppStore();

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

  return (
    <Card title="Select & Create Prompts" icon={<PromptIcon />}>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-slate-700 mb-2">Default Prompts</h3>
          <div className="space-y-2">
            {Object.keys(DEFAULT_PROMPTS).map(name => (
              <label key={name} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  name={name}
                  checked={!!selectedPrompts[name]}
                  onChange={handleDefaultPromptChange}
                  className="h-4 w-4 rounded border-slate-300 bg-white text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-slate-800">{name}</span>
              </label>
            ))}
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
                {Object.keys(selectedPrompts).map(name => (
                    <div key={name} className="flex items-center bg-brand-100 text-brand-800 text-sm font-medium px-3 py-1 rounded-full">
                        <span>{name}</span>
                        <button onClick={() => removeSelectedPrompt(name)} className="ml-2 text-brand-600 hover:text-brand-800">
                           <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};