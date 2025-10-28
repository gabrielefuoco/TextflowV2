import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getChunks, processMultipleFiles, getJobStatus } from '../services/apiService';
import { PlayIcon } from './icons';

const JobProgressLog = ({ detail }: { detail: string | null }) => { /* ... (INVARIATO) ... */ return null };

export const ActionPanel = () => {
  const store = useAppStore();

  useEffect(() => {
    if (store.jobId && store.jobStatus === 'processing') {
      const interval = setInterval(async () => {
        try {
          const result = await getJobStatus(store.jobId!);
          if (result.status === 'completed') {
            store.setResults(result.data!);
            store.completeJob();
            clearInterval(interval);
          } else if (result.status === 'failed') {
            store.failJob(result.detail || 'Job failed');
            clearInterval(interval);
          } else {
            store.updateJobStatus('processing', result.detail);
          }
        } catch (e) {
          store.failJob(e);
          clearInterval(interval);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [store.jobId, store.jobStatus]);

  const handleChunking = async () => {
    if (store.uploadedFiles.length === 0) return;
    store.startChunking();
    try {
      const results = await getChunks(store.uploadedFiles, store.chunkingConfig, store.normalizeText);
      store.setChunkFiles(results);
    } catch (e) {
      store.failChunking(e);
    }
  };

  const handleStartProcessing = async () => {
    if (store.chunkFiles.length === 0) return;
    store.startJob();
    try {
      const newJobId = await processMultipleFiles(
        store.chunkFiles,
        (store.preprocessingOnly || store.saveChunksMode) ? {} : store.selectedPrompts,
        store.llmConfig,
        store.orderMode,
        store.saveChunksMode
      );
      store.setJobId(newJobId);
    } catch (e) {
      store.failJob(e);
    }
  };

  if (store.jobStatus === 'processing') {
    return <div className="..."><JobProgressLog detail={store.jobDetail} /></div>;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {store.chunkingStatus !== 'loaded' ? (
          <button
            onClick={handleChunking}
            disabled={store.uploadedFiles.length === 0 || store.chunkingStatus === 'loading'}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-400"
          >
            {store.chunkingStatus === 'loading' ? 'Splitting...' : '1. Split into Chunks'}
          </button>
        ) : (
          <button
            onClick={handleStartProcessing}
            disabled={
              store.chunkFiles.length === 0 ||
              ( !store.preprocessingOnly && !store.saveChunksMode && Object.keys(store.selectedPrompts).length === 0 )
            }
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-brand-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-brand-700 disabled:bg-slate-400"
          >
            <PlayIcon />
            2. Start Pipeline ({store.chunkFiles.length} file/s)
          </button>
        )}
      </div>
      {store.chunkingError && <p className="text-sm text-red-600 mt-2 text-center">{store.chunkingError}</p>}
      {store.error && <p className="text-sm text-red-600 mt-2 text-center">{store.error}</p>}
    </div>
  );
};