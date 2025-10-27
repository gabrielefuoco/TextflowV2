
import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { startProcessingJob, getJobStatus, ProcessingRequest } from '../services/apiService';
import { PlayIcon } from './icons';

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
      }, 5000); // Poll every 5 seconds

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
        prompts: allPrompts,
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
                  (Object.keys(selectedPrompts).length > 0 || (customPromptName && customPromptContent));
  const isProcessing = jobStatus === 'processing';

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={handleStartProcessing}
          disabled={!isReady || isProcessing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-brand-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-brand-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <PlayIcon />
              Start Pipeline
            </>
          )}
        </button>
        <div className="text-center sm:text-right min-h-[40px]">
          {jobStatus !== 'idle' && (
            <div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Status:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      jobStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      jobStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      jobStatus === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {jobStatus}
                    </span>
                </div>
                {jobDetail && <p className="text-sm text-slate-500 mt-1">{jobDetail}</p>}
            </div>
          )}
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
};
