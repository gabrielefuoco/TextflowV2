import type { LLMConfig, ChunkingConfig } from '../types';
import type { ChunkFile } from '../store/useAppStore';

// --- Funzione per il CHUNKING ---
export const getChunks = async (
    file: File,
    config: ChunkingConfig,
    normalize: boolean
): Promise<ChunkFile> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('max_words', String(config.max_words));
    formData.append('min_words', String(config.min_words));
    formData.append('normalize_text_flag', String(normalize));

    const response = await fetch('/api/chunk', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to get chunks from server.' }));
        throw new Error(error.detail);
    }
    const data = await response.json();
    // Normalize server keys (snake_case) to client shape (camelCase)
    return { fileName: data.file_name, chunks: data.chunks } as ChunkFile;
};

// --- Funzione per il PROCESSING ---
export const processEditedChunks = async (
    payload: {
        chunks: string[];
        fileName: string;
        prompts: Record<string, string>;
        llmConfig: LLMConfig;
        orderMode: "chunk" | "prompt";
    }
): Promise<string> => {
    // Filtra i chunk vuoti o inutili prima di inviarli
    const nonEmptyChunks = payload.chunks.filter(c => c.trim().length > 0);
    if (nonEmptyChunks.length === 0) {
        throw new Error("Cannot start processing: all chunks are empty.");
    }

    const body = {
        chunks: nonEmptyChunks,
        file_name: payload.fileName,
        prompts: payload.prompts,
        llm_config: payload.llmConfig,
        order_mode: payload.orderMode,
    };

    const response = await fetch('/api/process-chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        let message = 'Failed to start processing job.';
        try {
            const asJson = await response.json();
            message = asJson.detail || message;
        } catch {
            const asText = await response.text();
            message = asText || message;
        }
        throw new Error(message);
    }
    const result = await response.json();
    return result.job_id;
};

// --- Funzione per i RISULTATI (INVARIATA) ---
export interface JobStatusResponse {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    detail?: string;
    data?: Blob;
}

export const getJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
    const response = await fetch(`/api/results/${jobId}`);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/markdown')) {
        return { status: 'completed', data: await response.blob() };
    }
    
    if (!response.ok) {
        let message = 'Failed to poll job status.';
        try {
            const asJson = await response.json();
            message = asJson.detail || message;
        } catch {
            const asText = await response.text();
            message = asText || message;
        }
        throw new Error(message);
    }

    // Se non è un file, è un JSON di stato ben formato
    return await response.json();
};
