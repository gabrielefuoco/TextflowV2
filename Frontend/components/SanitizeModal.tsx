import React from 'react';
import ReactDiffViewer from 'react-diff-viewer';
import { useAppStore } from '../store/useAppStore';
import { Modal } from './Modal';

export const SanitizeModal = () => {
    const {
        sanitizeProposals,
        updateSanitizeProposal,
        acceptSanitizeProposal,
        rejectSanitizeProposal
    } = useAppStore();

    const proposalIndexStr = Object.keys(sanitizeProposals).find(
        idx => sanitizeProposals[parseInt(idx)].status === 'loaded'
    );
    
    if (!proposalIndexStr) {
        return null;
    }
    
    const chunkIndex = parseInt(proposalIndexStr);
    const proposal = sanitizeProposals[chunkIndex];
    
    if (!proposal || proposal.status !== 'loaded') return null;

    return (
        <Modal
            isOpen={true}
            onClose={() => rejectSanitizeProposal(chunkIndex)}
            title={`Sanitize Proposal for Chunk ${chunkIndex + 1}`}
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    Review the AI's proposed changes. You can edit the cleaned version before accepting.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-bold text-slate-800 mb-2">Original</h3>
                        <div className="h-64 overflow-y-auto p-2 bg-slate-100 border rounded-md text-xs whitespace-pre-wrap font-mono">
                            {proposal.original}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 mb-2">Cleaned (Editable)</h3>
                        <textarea
                            value={proposal.cleaned}
                            onChange={(e) => updateSanitizeProposal(chunkIndex, e.target.value)}
                            className="h-64 w-full p-2 bg-white border rounded-md text-xs whitespace-pre-wrap font-mono focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h3 className="font-bold text-slate-800 mb-2">Diff View</h3>
                    <div className="text-xs border rounded-md overflow-hidden">
                       <ReactDiffViewer
                           oldValue={proposal.original}
                           newValue={proposal.cleaned || ''}
                           splitView={true}
                           useDarkTheme={false}
                           styles={{
                               diffContainer: { borderRadius: '0.375rem' },
                               diffRemoved: { backgroundColor: '#fecaca' },
                               diffAdded: { backgroundColor: '#bbf7d0' },
                           }}
                       />
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        onClick={() => rejectSanitizeProposal(chunkIndex)}
                        className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-md hover:bg-slate-300"
                    >
                        Reject
                    </button>
                    <button
                        onClick={() => acceptSanitizeProposal(chunkIndex)}
                        className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700"
                    >
                        Accept & Save
                    </button>
                </div>
            </div>
        </Modal>
    );
};