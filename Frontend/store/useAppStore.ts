import { useState, useEffect } from 'react';
import type { LLMConfig, ChunkingConfig, JobStatus } from '../types';

export interface ChunkFile {
  fileName: string;
  chunks: string[];
  attachment_path?: string;
}

interface AppState {
  uploadedFiles: File[];
  selectedPrompts: Record<string, string>;
  customPromptName: string;
  customPromptContent: string;
  llmConfig: LLMConfig;
  chunkingConfig: ChunkingConfig;
  normalizeText: boolean;
  orderMode: "chunk" | "prompt";
  preprocessingOnly: boolean;
  jobId: string | null;
  jobStatus: JobStatus;
  jobDetail: string | null;
  error: string | null;
  results: Blob | null;
  
  // STATO UNIVERSALE PER FILE MULTIPLI
  chunkFiles: ChunkFile[];
  currentFileIndex: number;
  chunkingStatus: 'idle' | 'loading' | 'loaded' | 'error';
  chunkingError: string | null;
}

const initialState: AppState = {
  uploadedFiles: [],
  selectedPrompts: {},
  customPromptName: "",
  customPromptContent: "",
  llmConfig: { model_name: 'gemini-1.5-flash', temperature: 0.7 },
  chunkingConfig: { max_words: 1000, min_words: 300 },
  normalizeText: true,
  orderMode: "chunk",
  preprocessingOnly: false,
  jobId: null,
  jobStatus: 'idle',
  jobDetail: null,
  error: null,
  results: null,
  chunkFiles: [],
  currentFileIndex: 0,
  chunkingStatus: 'idle',
  chunkingError: null,
};

const state: AppState = { ...initialState };
const listeners: Set<() => void> = new Set();
const notify = () => listeners.forEach(l => l());

const actions = {
  // --- GESTIONE FILE ---
  setUploadedFiles: (files: File[]) => {
    state.uploadedFiles = files;
    actions.fullReset(); // Reset completo se i file cambiano
  },
  removeUploadedFile: (fileName: string) => {
    state.uploadedFiles = state.uploadedFiles.filter(file => file.name !== fileName);
    if (state.uploadedFiles.length === 0) {
      actions.fullReset();
    }
  },

  // --- CONFIGURAZIONE (INVARIATA) ---
  addSelectedPrompt: (name: string, content: string) => { state.selectedPrompts = { ...state.selectedPrompts, [name]: content }; },
  removeSelectedPrompt: (name: string) => { const p = { ...state.selectedPrompts }; delete p[name]; state.selectedPrompts = p; },
  setCustomPromptName: (name: string) => { state.customPromptName = name; },
  setCustomPromptContent: (content: string) => { state.customPromptContent = content; },
  setLlmConfig: (config: Partial<LLMConfig>) => { state.llmConfig = { ...state.llmConfig, ...config }; },
  setChunkingConfig: (config: Partial<ChunkingConfig>) => { state.chunkingConfig = { ...state.chunkingConfig, ...config }; },
  setNormalizeText: (normalize: boolean) => { state.normalizeText = normalize; },
  setOrderMode: (mode: "chunk" | "prompt") => { state.orderMode = mode; },
  setPreprocessingOnly: (isOn: boolean) => { state.preprocessingOnly = isOn; },

  // --- LOGICA DI CHUNKING PER FILE MULTIPLI ---
  startChunking: () => {
    state.chunkingStatus = 'loading';
    state.chunkingError = null;
    state.chunkFiles = [];
    actions.resetJobState();
  },
  failChunking: (error: any) => {
    state.chunkingStatus = 'error';
    state.chunkingError = error instanceof Error ? error.message : String(error);
  },
  setChunkFiles: (files: ChunkFile[]) => {
    state.chunkFiles = files;
    state.currentFileIndex = 0;
    state.chunkingStatus = 'loaded';
  },

  // --- NAVIGAZIONE E MODIFICA DEI CHUNK ---
  goToNextFile: () => { if (state.currentFileIndex < state.chunkFiles.length - 1) state.currentFileIndex++; },
  goToPrevFile: () => { if (state.currentFileIndex > 0) state.currentFileIndex--; },
  updateChunk: (chunkIndex: number, content: string) => {
    const file = state.chunkFiles[state.currentFileIndex];
    if (file) {
      const newChunks = [...file.chunks];
      newChunks[chunkIndex] = content;
      state.chunkFiles[state.currentFileIndex] = { ...file, chunks: newChunks };
    }
  },
  mergeWithNext: (chunkIndex: number) => {
    const file = state.chunkFiles[state.currentFileIndex];
    if (file && chunkIndex < file.chunks.length - 1) {
      const newChunks = [...file.chunks];
      newChunks[chunkIndex] += '\n\n' + newChunks[chunkIndex + 1];
      newChunks.splice(chunkIndex + 1, 1);
      state.chunkFiles[state.currentFileIndex] = { ...file, chunks: newChunks };
    }
  },

  splitChunk: (chunkIndex: number, cursorPosition: number) => {
    const file = state.chunkFiles[state.currentFileIndex];
    if (file && file.chunks[chunkIndex] !== undefined) {
      const chunkToSplit = file.chunks[chunkIndex];
      const part1 = chunkToSplit.substring(0, cursorPosition);
      const part2 = chunkToSplit.substring(cursorPosition);

      if (part1.trim().length === 0 && part2.trim().length === 0) return;

      const newChunks = [...file.chunks];
      newChunks.splice(chunkIndex, 1, part1, part2);
      
      state.chunkFiles[state.currentFileIndex] = { ...file, chunks: newChunks };
    }
  },

  createChunkAfter: (chunkIndex: number) => {
    const file = state.chunkFiles[state.currentFileIndex];
    if (file) {
      const newChunks = [...file.chunks];
      newChunks.splice(chunkIndex + 1, 0, "");
      state.chunkFiles[state.currentFileIndex] = { ...file, chunks: newChunks };
    }
  },

  // --- LOGICA DI PROCESSING ---
  startJob: () => { state.jobStatus = 'processing'; state.jobDetail = 'Submitting job...'; state.error = null; state.results = null; state.jobId = null; },
  setJobId: (id: string | null) => { state.jobId = id; },
  failJob: (error: any) => { state.jobStatus = 'failed'; state.error = error instanceof Error ? error.message : String(error); state.jobId = null; },
  completeJob: () => { state.jobStatus = 'completed'; state.jobDetail = 'Job completed successfully.'; state.jobId = null; },
  updateJobStatus: (status: JobStatus, detail?: string) => { state.jobStatus = status; state.jobDetail = detail || null; },
  setResults: (blob: Blob | null) => { state.results = blob; },

  // --- AZIONI DI RESET ---
  resetJobState: () => { state.jobStatus = 'idle'; state.error = null; state.results = null; state.jobId = null; state.jobDetail = null; },
  fullReset: () => { state.chunkFiles = []; state.currentFileIndex = 0; state.chunkingStatus = 'idle'; state.chunkingError = null; actions.resetJobState(); },
};

Object.keys(actions).forEach(key => { const a = (actions as any)[key]; (actions as any)[key] = (...args: any[]) => { a(...args); notify(); }; });

export const useAppStore = () => {
  const [, forceUpdate] = useState({});
  useEffect(() => { const l = () => forceUpdate({}); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return { ...state, ...actions };
};