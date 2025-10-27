
import type { LLMConfig, ChunkingConfig } from '../types';

export interface ProcessingRequest {
  prompts: Record<string, string>;
  normalize_text: boolean;
  order_mode: "chunk" | "prompt";
  llm_config: LLMConfig;
  chunking_config: ChunkingConfig;
}

export const startProcessingJob = async (files: File[], config: ProcessingRequest): Promise<string> => {
  const formData = new FormData();
  formData.append('request_str', JSON.stringify(config));
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch('/api/process', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to start processing job. The server returned a non-JSON response.' }));
    throw new Error(errorData.detail || 'Failed to start processing job.');
  }

  const result = await response.json();
  return result.job_id;
};

export interface JobStatusResponse {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    detail?: string;
    data?: Blob;
}

export const getJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
    const response = await fetch(`/api/results/${jobId}`);

    if (response.headers.get('content-disposition')) {
        return { status: 'completed', data: await response.blob() };
    }
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to get job status. The server returned a non-JSON response.' }));
        throw new Error(errorData.detail || 'Failed to get job status.');
    }

    return response.json();
};
