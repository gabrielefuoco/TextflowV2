// Frontend/components/ChunkEditor.tsx
import React from 'react';
import { useAppStore } from '../store/useAppStore';

export const ChunkEditor = () => {
    const { chunkFile, updateChunk, mergeWithNext } = useAppStore();

    if (!chunkFile) return null;

    return (
        <div className="space-y-6 mt-10">
            <h2 className="text-3xl font-bold text-center text-slate-800">
                Chunk Editor: <span className="text-brand-600">{chunkFile.fileName}</span>
            </h2>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-4">
                {chunkFile.chunks.map((chunk, index) => (
                    <div key={index} className="bg-slate-50 p-4 rounded-lg border">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-bold text-slate-700">
                                Chunk {index + 1}
                                <span className="ml-2 font-normal text-slate-500">({chunk.split(/\s+/).length} words)</span>
                            </p>
                            <button
                                onClick={() => mergeWithNext(index)}
                                disabled={index === chunkFile.chunks.length - 1}
                                className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                Merge Next &rarr;
                            </button>
                        </div>
                        <textarea
                            value={chunk}
                            onChange={(e) => updateChunk(index, e.target.value)}
                            className="w-full h-40 p-2 font-mono text-xs bg-white border border-slate-300 rounded-md shadow-inner focus:ring-2 focus:ring-brand-500"
                            placeholder="Questo chunk è vuoto. Verrà ignorato durante il processamento."
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};


