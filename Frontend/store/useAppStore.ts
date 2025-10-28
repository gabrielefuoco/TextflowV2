import { useState } from 'react';
import type { LLMConfig, ChunkingConfig, JobStatus } from '../types';

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
};

const state: AppState = { ...initialState };

const listeners: Set<() => void> = new Set();

const actions = {
  setUploadedFiles: (files: File[]) => {
    state.uploadedFiles = files;
    actions.resetJobState();
  },
  removeUploadedFile: (fileName: string) => {
    state.uploadedFiles = state.uploadedFiles.filter(file => file.name !== fileName);
    actions.resetJobState();
  },
  addSelectedPrompt: (name: string, content: string) => {
    state.selectedPrompts = { ...state.selectedPrompts, [name]: content };
  },
  removeSelectedPrompt: (name: string) => {
    const newPrompts = { ...state.selectedPrompts };
    delete newPrompts[name];
    state.selectedPrompts = newPrompts;
  },
  setCustomPromptName: (name: string) => {
    state.customPromptName = name;
  },
  setCustomPromptContent: (content: string) => {
    state.customPromptContent = content;
  },
  setLlmConfig: (config: Partial<LLMConfig>) => {
    state.llmConfig = { ...state.llmConfig, ...config };
  },
  setChunkingConfig: (config: Partial<ChunkingConfig>) => {
    state.chunkingConfig = { ...state.chunkingConfig, ...config };
  },
  setNormalizeText: (normalize: boolean) => {
    state.normalizeText = normalize;
  },
  setOrderMode: (mode: "chunk" | "prompt") => {
    state.orderMode = mode;
  },
  setPreprocessingOnly: (isOn: boolean) => {
    state.preprocessingOnly = isOn;
  },
  setJobId: (id: string | null) => {
    state.jobId = id;
  },
  setResults: (blob: Blob | null) => {
    state.results = blob;
  },
  startJob: () => {
    state.jobStatus = 'processing';
    state.jobDetail = 'Submitting job to the server...';
    state.error = null;
    state.results = null;
    state.jobId = null;
  },
  updateJobStatus: (status: JobStatus, detail?: string) => {
    state.jobStatus = status;
    state.jobDetail = detail || null;
  },
  failJob: (error: string) => {
    state.jobStatus = 'failed';
    state.error = error;
    state.jobId = null;
  },
  completeJob: () => {
    state.jobStatus = 'completed';
    state.jobDetail = 'Job completed successfully.';
    state.jobId = null;
  },
  resetJobState: () => {
    state.jobStatus = 'idle';
    state.error = null;
    state.results = null;
    state.jobId = null;
    state.jobDetail = null;
  },
  getState: () => state,
};

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