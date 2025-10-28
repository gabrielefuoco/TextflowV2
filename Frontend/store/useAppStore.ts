import { useState } from 'react';
import type { LLMConfig, ChunkingConfig, JobStatus } from '../types';

// NUOVA INTERFACCIA PER I CHUNK
export interface ChunkFile {
  fileName: string;
  chunks: string[];
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
  // NUOVI STATI PER IL WORKFLOW DI CHUNKING
  chunkFile: ChunkFile | null;
  chunkingStatus: 'idle' | 'loading' | 'loaded' | 'error';
  chunkingError: string | null;
}

const initialState: AppState = {
  uploadedFiles: [],
  selectedPrompts: {},
  customPromptName: "",
  customPromptContent: "",
  llmConfig: { model_name: 'gemini-2.5-flash', temperature: 0.7 },
  chunkingConfig: { max_words: 1000, min_words: 300 },
  normalizeText: true,
  orderMode: "chunk",
  preprocessingOnly: false,
  jobId: null,
  jobStatus: 'idle',
  jobDetail: null,
  error: null,
  results: null,
  // STATI INIZIALI PER IL CHUNKING
  chunkFile: null,
  chunkingStatus: 'idle',
  chunkingError: null,
};

// Logica dello store (leggermente modificata per usare un approccio più simile a un hook)
const state: AppState = { ...initialState };
const listeners: Set<() => void> = new Set();

const actions = {
  // --- Gestione File ---
  setUploadedFiles: (files: File[]) => {
    // Forziamo un solo file per volta per l'editor
    state.uploadedFiles = files.length > 0 ? [files[0]] : [];
    actions.fullReset(); // Se carichi un nuovo file, resetta tutto
  },
  removeUploadedFile: (fileName: string) => {
    state.uploadedFiles = state.uploadedFiles.filter(file => file.name !== fileName);
    actions.fullReset();
  },
  // --- Gestione Prompt e Config (invariata) ---
  addSelectedPrompt: (name: string, content: string) => { state.selectedPrompts = { ...state.selectedPrompts, [name]: content }; },
  removeSelectedPrompt: (name: string) => {
    const next = { ...state.selectedPrompts };
    delete next[name];
    state.selectedPrompts = next;
  },
  setCustomPromptName: (name: string) => { state.customPromptName = name; },
  setCustomPromptContent: (content: string) => { state.customPromptContent = content; },
  setLlmConfig: (config: Partial<LLMConfig>) => { state.llmConfig = { ...state.llmConfig, ...config }; },
  setChunkingConfig: (config: Partial<ChunkingConfig>) => { state.chunkingConfig = { ...state.chunkingConfig, ...config }; },
  setNormalizeText: (normalize: boolean) => { state.normalizeText = normalize; },
  setOrderMode: (mode: "chunk" | "prompt") => { state.orderMode = mode; },
  setPreprocessingOnly: (isOn: boolean) => { state.preprocessingOnly = isOn; },

  // --- NUOVA LOGICA DI CHUNKING ---
  startChunking: () => {
    state.chunkingStatus = 'loading';
    state.chunkingError = null;
    state.chunkFile = null;
    actions.resetJobState();
  },
  failChunking: (error: unknown) => {
    state.chunkingStatus = 'error';
    const asString = typeof error === 'string' ? error : (error instanceof Error ? error.message : JSON.stringify(error));
    state.chunkingError = asString;
  },
  setChunkFile: (file: ChunkFile) => {
    state.chunkFile = file;
    state.chunkingStatus = 'loaded';
  },
  updateChunk: (index: number, content: string) => {
    if (state.chunkFile) {
      const newChunks = [...state.chunkFile.chunks];
      newChunks[index] = content;
      state.chunkFile = { ...state.chunkFile, chunks: newChunks };
    }
  },
  mergeWithNext: (index: number) => {
    if (state.chunkFile && index < state.chunkFile.chunks.length - 1) {
      const newChunks = [...state.chunkFile.chunks];
      newChunks[index] = newChunks[index] + '\n\n' + newChunks[index + 1];
      newChunks.splice(index + 1, 1);
      state.chunkFile = { ...state.chunkFile, chunks: newChunks };
    }
  },

  // --- LOGICA DI PROCESSING (leggermente modificata) ---
  setJobId: (id: string | null) => { state.jobId = id; },
  setResults: (blob: Blob | null) => { state.results = blob; },
  startJob: () => {
    state.jobStatus = 'processing';
    state.jobDetail = 'Submitting job...';
    state.error = null;
    state.results = null;
    state.jobId = null;
  },
  updateJobStatus: (status: JobStatus, detail?: string) => {
    state.jobStatus = status;
    state.jobDetail = detail ?? null;
  },
  failJob: (error: unknown) => {
    state.jobStatus = 'failed';
    state.error = typeof error === 'string' ? error : (error instanceof Error ? error.message : JSON.stringify(error));
    state.jobId = null;
  },
  completeJob: () => {
    state.jobStatus = 'completed';
    state.jobDetail = 'Job completed successfully.';
    state.jobId = null;
  },

  // --- Azioni di Reset ---
  resetJobState: () => {
    state.jobStatus = 'idle';
    state.error = null;
    state.results = null;
    state.jobId = null;
    state.jobDetail = null;
  },
  fullReset: () => {
    state.chunkFile = null;
    state.chunkingStatus = 'idle';
    state.chunkingError = null;
    actions.resetJobState();
  },
  getState: () => state,
};

// Notifica gli iscritti dopo ogni azione
const notify = () => {
  listeners.forEach(l => l());
};

Object.keys(actions).forEach(key => {
  const action = actions[key as keyof typeof actions];
  (actions as any)[key] = (...args: any[]) => {
    (action as Function)(...args);
    notify();
  };
});

export const useAppStore = () => {
  const [snapshot, setSnapshot] = useState(state);

  useState(() => {
    const listener = () => setSnapshot({ ...state });
    listeners.add(listener);
    return () => listeners.delete(listener);
  });

  return { ...snapshot, ...actions };
};