import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getChunks, processEditedChunks, getJobStatus } from '../services/apiService';
import { PlayIcon } from './icons';

const JobProgressLog = ({ detail }: { detail: string | null }) => {
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState('');
  const [chunk, setChunk] = useState('');
  const [prompt, setPrompt] = useState('');
  const [rawText, setRawText] = useState('');

  useEffect(() => {
    if (!detail) return;
    
    // Regex to capture progress and structured details
    // Example: (15%) Processing file 'document.txt', chunk 2/10, prompt 'Summarize'
    const structuredMatch = detail.match(/\((\d+)%\)\s*Processing file '(.+)', chunk ([\d\/]+), prompt '(.+)'/);
    
    if (structuredMatch) {
      setProgress(parseInt(structuredMatch[1], 10));
      setFile(structuredMatch[2]);
      setChunk(structuredMatch[3]);
      setPrompt(structuredMatch[4]);
      setRawText(''); // Clear raw text since we have details
    } else {
      // For a non-structured message, we just display it as raw text.
      // We keep the previous structured data visible to maintain context.
      setRawText(detail);
    }
  }, [detail]);

  return (
    <div>
      <div className="flex items-center mb-4">
        <svg className="animate-spin mr-3 h-5 w-5 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h3 className="text-lg font-bold text-slate-800">Pipeline in Progress...</h3>
      </div>

      <div className="bg-slate-100 border border-slate-200 text-slate-800 font-mono text-sm rounded-lg p-4 space-y-3 min-h-[120px]">
        <dl className="space-y-3">
            <div className="flex justify-between items-center">
                <dt className="text-slate-500">File:</dt>
                <dd className="font-semibold text-brand-600 truncate pl-4" title={file}>{file || '...'}</dd>
            </div>
            <div className="flex justify-between items-center">
                <dt className="text-slate-500">Chunk:</dt>
                <dd className="font-semibold text-brand-600">{chunk || '...'}</dd>
            </div>
            <div className="flex justify-between items-center">
                <dt className="text-slate-500">Prompt:</dt>
                <dd className="font-semibold text-brand-600">{prompt || '...'}</dd>
            </div>
        </dl>
        {rawText && <p className="text-slate-600 text-xs pt-2 border-t border-slate-200">{rawText}</p>}
      </div>

      <div className="w-full bg-slate-200 rounded-full h-4 mt-5 relative overflow-hidden border border-slate-300">
        <div 
          className="bg-brand-600 h-4 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        ></div>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference tracking-wider">
          {progress}% Complete
        </span>
      </div>
    </div>
  );
};


export const ActionPanel = () => {
  const { 
    uploadedFiles, 
    selectedPrompts, 
    llmConfig, 
    chunkingConfig, 
    normalizeText,
    orderMode,
    preprocessingOnly,
    jobId,
    jobStatus, 
    jobDetail,
    error,
    chunkFile,
    chunkingStatus,
    chunkingError,
    startJob,
    setJobId,
    setResults,
    failJob, 
    completeJob,
    updateJobStatus,
    startChunking,
    setChunkFile,
    failChunking,
  } = useAppStore();

  useEffect(() => {
    if (jobId && jobStatus === 'processing') {
      const intervalId = setInterval(async () => {
        try {
          const result = await getJobStatus(jobId);
          if (result.status === 'completed' && result.data) {
            setResults(result.data);
            completeJob();
            clearInterval(intervalId);
          } else if (result.status === 'failed') {
            failJob(result.detail || 'Job failed without a specific reason.');
            clearInterval(intervalId);
          } else {
            // Still processing, update detail message
            updateJobStatus('processing', result.detail);
          }
        } catch (e: any) {
          failJob(e.message);
          clearInterval(intervalId);
        }
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(intervalId); // Cleanup on component unmount or if jobId/status changes
    }
  }, [jobId, jobStatus]);

  const handleChunking = async () => {
    if (uploadedFiles.length === 0) return;
    startChunking();
    try {
      const result = await getChunks(uploadedFiles[0], chunkingConfig, normalizeText);
      setChunkFile(result);
    } catch (e) {
      failChunking(e);
    }
  };

  const handleStartProcessing = async () => {
    if (!chunkFile || (!preprocessingOnly && Object.keys(selectedPrompts).length === 0)) return;
    startJob();
    try {
      const newJobId = await processEditedChunks({
        chunks: chunkFile.chunks,
        fileName: chunkFile.fileName,
        prompts: preprocessingOnly ? {} : selectedPrompts,
        llmConfig,
        orderMode,
      });
      setJobId(newJobId);
      updateJobStatus('processing', 'Job started. Polling for status...');
    } catch (e) {
      failJob(e);
    }
  };

  const isReadyForChunking = uploadedFiles.length > 0 && chunkingStatus !== 'loading';
  const isReadyForProcessing = chunkingStatus === 'loaded' && (preprocessingOnly || Object.keys(selectedPrompts).length > 0);
  const isProcessing = jobStatus === 'processing';

  if (isProcessing) {
    return <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 min-h-[120px]"><JobProgressLog detail={jobDetail} /></div>;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 min-h-[120px]">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {chunkingStatus !== 'loaded' ? (
          <button
            onClick={handleChunking}
            disabled={!isReadyForChunking}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300"
          >
            {chunkingStatus === 'loading' ? 'Splitting...' : '1. Split into Chunks'}
          </button>
        ) : (
          <button
            onClick={handleStartProcessing}
            disabled={!isReadyForProcessing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-brand-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-brand-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300"
          >
            <PlayIcon />
            {preprocessingOnly ? '2. Export Chunks' : '2. Start AI Pipeline'}
          </button>
        )}
      </div>
      {chunkingError && <p className="text-sm text-red-600 mt-2 text-center">{chunkingError}</p>}
      {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
    </div>
  );
};