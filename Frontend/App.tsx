import React from 'react';
import { FileUploader } from './components/FileUploader';
import { PromptSelector } from './components/PromptSelector';
import { ConfigPanel } from './components/ConfigPanel';
import { ActionPanel } from './components/ActionPanel';
import { ResultDisplay } from './components/ResultDisplay';
import { ChunkEditor } from './components/ChunkEditor';
import { useAppStore } from './store/useAppStore';

function App() {
  const { chunkingStatus } = useAppStore();
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-600 tracking-tight">
            TextFlowAI
          </h1>
          <p className="mt-3 text-lg text-slate-500 max-w-2xl mx-auto">
            Process documents with powerful AI prompts. Upload files, select your prompts, and start the pipeline.
          </p>
        </header>
        
        <div className="space-y-8">
          <FileUploader />
          <PromptSelector />
          <ConfigPanel />
          <ActionPanel />
          {chunkingStatus === 'loaded' && <ChunkEditor />}
          <ResultDisplay />
        </div>
        
        <footer className="text-center mt-12 py-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">Powered by Gemini API</p>
        </footer>
      </main>
    </div>
  );
}

export default App;