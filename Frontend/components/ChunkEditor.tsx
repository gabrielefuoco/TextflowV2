// Frontend/components/ChunkEditor.tsx
import React from 'react';
import { useAppStore } from '../store/useAppStore';

export const ChunkEditor = () => {
    const { chunkFiles, currentFileIndex, goToNextFile, goToPrevFile, updateChunk, mergeWithNext } = useAppStore();

    const currentFile = chunkFiles[currentFileIndex];
    if (!currentFile) return null;

    return (
        <div className="space-y-6 mt-10">
            <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 sticky top-4 z-10">
                <div className="flex justify-between items-center">
                    <button onClick={goToPrevFile} disabled={currentFileIndex === 0} className="px-4 py-2 text-sm font-bold text-white bg-slate-500 rounded-md hover:bg-slate-600 disabled:bg-slate-300 disabled:cursor-not-allowed">
                        &larr; Prev File
                    </button>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-slate-800 truncate">{currentFile.fileName}</h2>
                        <p className="text-sm text-slate-500">File {currentFileIndex + 1} di {chunkFiles.length}</p>
                    </div>
                    <button onClick={goToNextFile} disabled={currentFileIndex === chunkFiles.length - 1} className="px-4 py-2 text-sm font-bold text-white bg-slate-500 rounded-md hover:bg-slate-600 disabled:bg-slate-300 disabled:cursor-not-allowed">
                        Next File &rarr;
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {currentFile.chunks.map((chunk, index) => (
                    <div key={`${currentFile.fileName}-${index}`} className="bg-white p-4 rounded-lg shadow-md border">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-bold text-slate-700">Chunk {index + 1} <span className="font-normal text-slate-500">({chunk.split(/\s+/).filter(Boolean).length} words)</span></p>
                            <button
                                onClick={() => mergeWithNext(index)}
                                disabled={index === currentFile.chunks.length - 1}
                                className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-slate-300"
                            >
                                Merge Next
                            </button>
                        </div>
                        <textarea
                            value={chunk}
                            onChange={(e) => updateChunk(index, e.target.value)}
                            className="w-full h-48 p-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md shadow-inner focus:ring-2 focus:ring-brand-500"
                            placeholder="Questo chunk è vuoto e verrà ignorato."
                        />
                    </div>
                ))}
                {currentFile.chunks.length === 0 && (
                    <div className="bg-white p-6 text-center rounded-lg shadow-md border">
                        <p className="text-slate-500">Nessun chunk generato per questo file. Potrebbe essere vuoto o non contenere testo valido.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
