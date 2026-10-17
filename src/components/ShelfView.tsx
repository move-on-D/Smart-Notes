import React, { useState } from 'react';
import { Search, FileText, Download, ExternalLink, Trash2, BookOpen, Folder, Sparkles } from 'lucide-react';
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

  const filteredNotes = notes.filter((n) => {
    if (selectedSubjectId !== 'all' && n.subject_id !== selectedSubjectId) {
      return false;
    }
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
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in relative z-10">
      {/* Top Banner & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 glass-shard-1 shadow-md shadow-cyan-500/20">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="bg-gradient-to-r from-white via-sky-200 to-cyan-400 bg-clip-text text-transparent">
              Digital Note Shelves
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-sky-200/60 mt-1">
            Organized college PDFs by subject and unit, synced between your phone and laptop.
          </p>
        </div>

        {/* Translucent Glass Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-cyan-400/70 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search notes, topics, units..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-sky-950/40 border border-sky-400/25 rounded-2xl text-white placeholder-sky-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-300 backdrop-blur-md shadow-inner transition-all font-medium"
          />
        </div>
      </div>

      {/* Subject Filter Glass Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        <button
          onClick={() => setSelectedSubjectId('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
            selectedSubjectId === 'all'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300/40 shadow-md shadow-cyan-500/30'
              : 'glass-card text-sky-200/80 hover:text-white hover:bg-sky-900/40 border-sky-400/20'
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
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                isSelected
                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'glass-card text-sky-200/80 hover:text-white hover:bg-sky-900/40 border-sky-400/20'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shadow-sm"
                style={{ backgroundColor: sub.color || '#38bdf8' }}
              />
              <span>{sub.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-cyan-400/30 text-white' : 'bg-sky-900/40 text-sky-300/70'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-3xl border border-dashed border-sky-400/25 p-8 shadow-2xl relative overflow-hidden shard-accent">
          <div className="w-16 h-16 bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 rounded-2xl flex items-center justify-center mx-auto mb-4 glass-shard-1 shadow-lg shadow-cyan-500/20">
            <Folder className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Your shelf is empty</h3>
          <p className="text-sm text-sky-200/60 max-w-md mx-auto mb-6">
            Dump your first messy WhatsApp PDF. Gemini AI will scan it, rename it cleanly, and place it right here.
          </p>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/30 border border-cyan-300/30 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-cyan-200" />
            <span>Dump Your First Note</span>
          </button>
        </div>
      ) : (
        /* Notes Grid with Glass Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map((note) => {
            const subject = getSubjectForNote(note.subject_id);
            return (
              <div
                key={note.id}
                className="glass-card rounded-2xl border border-sky-400/20 shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:border-cyan-400/50 hover:shadow-cyan-500/15 shard-accent relative"
              >
                <div className="p-5 relative z-10">
                  {/* Subject Badge & File Type */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className="text-[11px] font-black px-2.5 py-1 rounded-lg text-white truncate max-w-[200px] border border-white/20 shadow-sm glass-shard-1"
                      style={{ backgroundColor: subject?.color || '#0284c7' }}
                    >
                      {subject?.name || 'General Subject'}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-cyan-300/70">
                      {formatFileSize(note.file_size)}
                    </span>
                  </div>

                  {/* Clean Title */}
                  <h3 className="font-bold text-white text-base leading-snug group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {note.clean_title}
                  </h3>

                  {/* Original WhatsApp Filename */}
                  <p className="text-[11px] text-sky-300/50 font-mono mt-1 truncate">
                    Original: {note.original_filename}
                  </p>

                  {/* Summary */}
                  {note.summary && (
                    <p className="text-xs text-sky-100/80 mt-3 line-clamp-3 bg-sky-950/40 p-2.5 rounded-xl border border-sky-400/15 italic">
                      "{note.summary}"
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3 bg-sky-950/60 border-t border-sky-400/15 flex items-center justify-between text-xs relative z-10 backdrop-blur-sm">
                  <span className="text-[11px] text-sky-300/60 font-medium">
                    {new Date(note.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    {note.file_url && (
                      <a
                        href={note.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-sky-300 hover:text-white hover:bg-sky-800/50 rounded-lg transition-colors border border-transparent hover:border-sky-400/30"
                        title="View / Open PDF"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    <a
                      href={note.file_url || '#'}
                      download={note.clean_title}
                      className="p-1.5 text-cyan-300 hover:text-white hover:bg-sky-800/50 rounded-lg transition-colors border border-transparent hover:border-cyan-400/30"
                      title="Download Clean PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="p-1.5 text-sky-400/60 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
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
