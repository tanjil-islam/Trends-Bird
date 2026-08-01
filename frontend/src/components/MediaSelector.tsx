import { getImageUrl } from '@/lib/utils';
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface MediaSelectorProps {
  onSelect: (mediaIds: string[]) => void;
  onClose: () => void;
  multiple?: boolean;
  selectedIds?: string[];
}

export default function MediaSelector({ onSelect, onClose, multiple = false, selectedIds = [] }: MediaSelectorProps) {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });

  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/media?page=${page}&limit=20`);
        setMedia(res.data || []);
        setMeta(res.meta || { totalPages: 1 });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, [page]);

  const toggleSelect = (id: string) => {
    if (multiple) {
      setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelected([id]);
    }
  };

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-4xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Select Media</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {loading && page === 1 ? (
            <div className="flex justify-center py-12"><div className="spinner" /></div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-5 gap-4">
              {media.map((m: any) => {
                const isSelected = selected.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleSelect(m.id)}
                    className={`relative aspect-square rounded-lg border-2 cursor-pointer overflow-hidden transition-all ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-[var(--border-color)] hover:border-indigo-400/50'}`}
                  >
                    {m.type === 'image' ? (
                      <img src={getImageUrl(m.thumbnail || m.publicUrl)} alt={m.fileName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-hover)]">
                        <span className="text-2xl mb-1">📄</span>
                        <span className="text-xs text-[var(--text-secondary)] truncate w-full px-2 text-center">{m.fileName}</span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-between items-center">
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-ghost text-xs">Prev</button>
            <span className="text-xs flex items-center text-[var(--text-secondary)]">Page {page} of {meta.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="btn btn-ghost text-xs">Next</button>
          </div>
          <div className="flex gap-2">
            <span className="text-sm text-[var(--text-secondary)] flex items-center mr-2">{selected.length} selected</span>
            <button onClick={onClose} className="btn btn-ghost text-sm">Cancel</button>
            <button onClick={handleConfirm} className="btn btn-primary text-sm">Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
}
