// Frontend/components/ChunkEditor.tsx
import React, { useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { SplitIcon, PlusCircleIcon, FileIcon } from './icons';

export const ChunkEditor = () => {
    const { 
        chunkFiles, 
        currentFileIndex, 
        goToNextFile, 
        goToPrevFile, 
        updateChunk, 
        updateChunkName,
        mergeWithNext,
        splitChunk,
        createChunkAfter,
        saveChunksMode
    } = useAppStore();

    const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
    const currentFile = chunkFiles[currentFileIndex];

    if (!currentFile) return null;

    const handleSplit = (index: number) => {
        const textarea = textareaRefs.current[index];
        if (textarea) {
            const cursorPosition = textarea.selectionStart;
            if (cursorPosition > 0 && cursorPosition < textarea.value.length) {
                splitChunk(index, cursorPosition);
            } else {
                alert("Metti il cursore nel mezzo del testo per dividerlo. Non all'inizio o alla fine.");
            }
        }
    };

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
                    <div key={`${currentFile.fileName}-${index}`} className="bg-white p-4 rounded-lg shadow-md border group relative">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-bold text-slate-700">Chunk {index + 1} <span className="font-normal text-slate-500">({chunk.split(/\s+/).filter(Boolean).length} words)</span></p>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleSplit(index)}
                                    className="px-3 py-1 text-xs font-semibold text-white bg-amber-500 rounded-md hover:bg-amber-600 flex items-center gap-1"
                                    title="Split chunk at cursor position"
                                >
                                    <SplitIcon />
                                    Split
                                </button>
                                <button
                                    onClick={() => mergeWithNext(index)}
                                    disabled={index === currentFile.chunks.length - 1}
                                    className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-slate-300"
                                >
                                    Merge Next
                                </button>
                            </div>
                        </div>
                        {saveChunksMode && (
                            <div className="mb-2">
                                <label htmlFor={`chunk-name-${index}`} className="sr-only">Chunk File Name</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <FileIcon className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        id={`chunk-name-${index}`}
                                        value={currentFile.chunkNames[index] || ''}
                                        onChange={(e) => updateChunkName(index, e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 font-mono text-xs bg-slate-100 border border-slate-300 rounded-md shadow-inner focus:ring-1 focus:ring-green-500"
                                        placeholder="Nome del file del chunk"
                                    />
                                </div>
                            </div>
                        )}
                        <textarea
                            ref={(el) => (textareaRefs.current[index] = el)}
                            value={chunk}
                            onChange={(e) => updateChunk(index, e.target.value)}
                            className="w-full h-48 p-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md shadow-inner focus:ring-2 focus:ring-brand-500"
                            placeholder="Questo chunk è vuoto e verrà ignorato."
                        />
                        <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-full h-4 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-full h-px bg-slate-200"></div>
                            <button 
                                onClick={() => createChunkAfter(index)}
                                className="absolute bg-white p-0.5 rounded-full text-slate-400 hover:text-brand-600 hover:scale-110 transition-all z-10"
                                title="Create new chunk after this one"
                            >
                                <PlusCircleIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                ))}
                {currentFile.chunks.length === 0 && (
                    <div className="bg-white p-6 text-center rounded-lg shadow-md border">
                        <p className="text-slate-500 mb-4">Nessun chunk generato per questo file. Vuoto o illeggibile.</p>
                         <button 
                            onClick={() => createChunkAfter(-1)}
                            className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-md hover:bg-brand-700 flex items-center gap-2 mx-auto"
                        >
                            <PlusCircleIcon className="h-5 w-5" />
                            Crea il primo Chunk
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
