import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { startProcessingJob, getJobStatus, ProcessingRequest } from '../services/apiService';
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
    customPromptName,
    customPromptContent,
    llmConfig, 
    chunkingConfig, 
    normalizeText,
    orderMode,
    preprocessingOnly,
    jobId,
    jobStatus, 
    jobDetail,
    error,
    startJob,
    setJobId,
    setResults,
    failJob, 
    completeJob,
    updateJobStatus,
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

  const handleStartProcessing = async () => {
    startJob();
    
    const allPrompts = { ...selectedPrompts };
    if (customPromptName && customPromptContent) {
      allPrompts[customPromptName] = customPromptContent;
    }
    
    const config: ProcessingRequest = {
        prompts: preprocessingOnly ? {} : allPrompts,
        normalize_text: normalizeText,
        order_mode: orderMode,
        llm_config: llmConfig,
        chunking_config: chunkingConfig,
    };
    
    try {
      const newJobId = await startProcessingJob(uploadedFiles, config);
      setJobId(newJobId);
      updateJobStatus('processing', 'Job started. Polling for status...');
    } catch (e: any) {
      failJob(e.message || 'An unknown error occurred during processing.');
    }
  };

  const isReady = uploadedFiles.length > 0 && 
                  (preprocessingOnly || (Object.keys(selectedPrompts).length > 0 || (customPromptName && customPromptContent)));
  const isProcessing = jobStatus === 'processing';

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 min-h-[120px]">
      {isProcessing ? (
        <JobProgressLog detail={jobDetail} />
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleStartProcessing}
            disabled={!isReady}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-brand-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-brand-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
          >
            <PlayIcon />
            Start Pipeline
          </button>
          <div className="text-center sm:text-right min-h-[40px]">
            {jobStatus !== 'idle' && (
              <div>
                  <div className="flex items-center gap-2 justify-center sm:justify-end">
                      <span className="text-sm font-medium text-slate-600">Status:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        jobStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        jobStatus === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {jobStatus}
                      </span>
                  </div>
                  {/* FIX: The conditional rendering for jobDetail was causing a TypeScript error due to a redundant check.
                      It has been corrected to only show the detail message when the job is successfully completed,
                      which also improves UI clarity by not showing stale progress messages on failure. */}
                  {jobStatus === 'completed' && jobDetail && <p className="text-sm text-slate-500 mt-1">{jobDetail}</p>}
              </div>
            )}
            {error && <p className="text-sm text-red-600 mt-1 font-medium">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
};