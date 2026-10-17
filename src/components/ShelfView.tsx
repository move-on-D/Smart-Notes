import React, { useState } from 'react';
import { Search, Download, ExternalLink, Trash2, BookOpen, Folder, Sparkles } from 'lucide-react';
import { Subject, Note } from '../types';

interface ShelfViewProps {
  subjects: Subject[];
  notes: Note[];
  onDeleteNote: (noteId: string) => Promise<void>;
  onOpenUpload: () => void;
}

export const ShelfView: React.FC<ShelfViewProps> = ({
  subjects,
  notes,
  onDeleteNote,
  onOpenUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  // Deep search matching title, filename, summary, and subject
  const filteredNotes = notes.filter((n) => {
    // Subject filter
    if (selectedSubjectId !== 'all' && n.subject_id !== selectedSubjectId) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.clean_title.toLowerCase().includes(q);
      const matchOriginal = n.original_filename.toLowerCase().includes(q);
      const matchSummary = n.summary?.toLowerCase().includes(q) || false;
      const matchSubject = subjects.find(s => s.id === n.subject_id)?.name.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchOriginal && !matchSummary && !matchSubject) {
        return false;
      }
    }
    return true;
  });

  const getSubjectForNote = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'PDF';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-fade-in relative z-10">
      {/* Top Banner & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 glass-shard-1 shadow-sm shadow-cyan-500/20">
              <BookOpen className="w-3.5 h-3.5" />
            </span>
            <span className="bg-gradient-to-r from-white via-sky-200 to-cyan-400 bg-clip-text text-transparent">
              Digital Note Shelves
            </span>
          </h1>
          <p className="text-xs text-sky-200/60 mt-0.5">
            Organized college PDFs by subject and unit, instantly accessible.
          </p>
        </div>

        {/* Translucent Glass Search bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-cyan-400/70 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search notes, topics, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-sky-950/40 border border-sky-400/25 rounded-xl text-white placeholder-sky-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 backdrop-blur-md transition-all font-medium"
          />
        </div>
      </div>

      {/* Subject Filter Glass Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2.5 mb-3 scrollbar-none">
        <button
          onClick={() => setSelectedSubjectId('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
            selectedSubjectId === 'all'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300/40 shadow-sm shadow-cyan-500/30'
              : 'glass-card text-sky-200/70 hover:text-white hover:bg-sky-900/40 border-sky-400/15'
          }`}
        >
          All Subjects ({notes.length})
        </button>
        {subjects.map((sub) => {
          const count = notes.filter((n) => n.subject_id === sub.id).length;
          const isSelected = selectedSubjectId === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(sub.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-sm shadow-cyan-500/20'
                  : 'glass-card text-sky-200/70 hover:text-white hover:bg-sky-900/40 border-sky-400/15'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: sub.color || '#38bdf8' }}
              />
              <span>{sub.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-cyan-400/30 text-white' : 'bg-sky-900/40 text-sky-300/60'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>



      {/* Empty State */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl border border-dashed border-sky-400/20 p-6 shadow-xl relative overflow-hidden shard-accent">
          <div className="w-12 h-12 bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 rounded-xl flex items-center justify-center mx-auto mb-3 glass-shard-1 shadow-md shadow-cyan-500/20">
            <Folder className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No notes found</h3>
          <p className="text-xs text-sky-200/60 max-w-sm mx-auto mb-5">
            {notes.length === 0 ? 'Your shelf is empty. Upload your first PDF notes here.' : 'No notes match your active filter.'}
          </p>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/25 border border-cyan-300/30 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span>Upload Note</span>
          </button>
        </div>
      ) : (
        /* Notes Grid with compact glass cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const subject = getSubjectForNote(note.subject_id);
            return (
              <div
                key={note.id}
                className="glass-card rounded-xl border border-sky-400/20 shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-cyan-400/40 hover:shadow-cyan-500/10 shard-accent relative"
              >
                <div className="p-4 relative z-10">
                  {/* Subject Badge & File Type */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white truncate max-w-[170px] border border-white/20 glass-shard-1"
                      style={{ backgroundColor: subject?.color || '#0284c7' }}
                    >
                      {subject?.name || 'General Subject'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-cyan-300/70">
                      {formatFileSize(note.file_size)}
                    </span>
                  </div>

                  {/* Clean Title */}
                  <h3 className="font-bold text-white text-sm leading-snug group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {note.clean_title}
                  </h3>

                  {/* Original WhatsApp Filename */}
                  <p className="text-[10px] text-sky-300/50 font-mono mt-0.5 truncate">
                    {note.original_filename}
                  </p>

                  {/* Summary */}
                  {note.summary && (
                    <p className="text-xs text-sky-100/80 mt-2.5 line-clamp-2 bg-sky-950/40 p-2 rounded-lg border border-sky-400/15 italic text-[11px]">
                      "{note.summary}"
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-4 py-2.5 bg-sky-950/70 border-t border-sky-400/20 flex items-center justify-between text-xs relative z-10 backdrop-blur-md">
                  <span className="text-[10px] text-sky-300/60 font-medium">
                    {new Date(note.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  {/* Centered prominent Open Notes & Action buttons */}
                  <div className="flex items-center space-x-2">
                    {note.file_url && (
                      <a
                        href={note.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-bold shadow-sm shadow-cyan-500/25 border border-cyan-300/40 transition-all active:scale-95"
                        title="Open & Read Note"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Note</span>
                      </a>
                    )}

                    <a
                      href={note.file_url || '#'}
                      download={note.clean_title}
                      className="p-1.5 text-cyan-300 hover:text-white bg-sky-900/40 hover:bg-sky-800/60 border border-sky-400/25 rounded-lg transition-all"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="p-1.5 text-sky-400/40 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
