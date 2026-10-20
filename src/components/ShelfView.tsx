import React, { useState } from 'react';
import { 
  Search, Download, ExternalLink, Trash2, BookOpen, Folder, 
  Sparkles, Bot, ChevronRight, ArrowLeft, FileText, Layers, PlusCircle, UploadCloud
} from 'lucide-react';
import { CupboardIcon } from './CupboardIcon';
import { Subject, Note } from '../types';

interface ShelfViewProps {
  subjects: Subject[];
  notes: Note[];
  onDeleteNote: (noteId: string) => Promise<void>;
  onOpenUpload: (subjectId?: string) => void;
  onOpenBot: (note: Note) => void;
}

export const ShelfView: React.FC<ShelfViewProps> = ({
  subjects,
  notes,
  onDeleteNote,
  onOpenUpload,
  onOpenBot,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  // When activeSubjectId is null -> Shows the Vertical Subject Shelves (No notes shown)
  // When activeSubjectId is set -> Opens that specific shelf and shows ONLY that subject's notes
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);

  const activeSubject = subjects.find(s => s.id === activeSubjectId) || null;

  // Notes filtered strictly for the currently opened subject shelf + search
  const currentShelfNotes = notes.filter((n) => {
    if (activeSubjectId && n.subject_id !== activeSubjectId) {
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

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'PDF';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-fade-in relative z-10 font-sans">
      {/* Top Banner with Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          {activeSubject ? (
            <button
              onClick={() => {
                setActiveSubjectId(null);
                setSearchQuery('');
              }}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-cyan-300 hover:text-white transition-colors mb-1.5 p-1 -ml-1 rounded-lg hover:bg-sky-900/30"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Shelves</span>
            </button>
          ) : null}

          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 glass-shard-1 shadow-sm shadow-cyan-500/20 p-1">
              <CupboardIcon className="w-full h-full text-cyan-300" />
            </span>
            <span className="bg-gradient-to-r from-white via-sky-200 to-cyan-400 bg-clip-text text-transparent">
              {activeSubject ? activeSubject.name : 'Digital Subject Shelves'}
            </span>
          </h1>
          <p className="text-xs text-sky-200/60 mt-0.5">
            {activeSubject 
              ? `Strictly containing notes for ${activeSubject.name}. No other subjects allowed.`
              : 'Each shelf strictly holds notes for that single subject. Tap any shelf to view its notes.'}
          </p>
        </div>

        {/* High-Visibility Deep Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={activeSubject ? `Search in ${activeSubject.name}...` : "Search subjects, topics, or notes..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-sky-950/70 border border-sky-400/40 rounded-2xl text-white placeholder-sky-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 backdrop-blur-xl transition-all font-medium shadow-inner shadow-sky-950/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-[11px] text-sky-400/60 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. HOME VIEW: VERTICAL STACK OF SUBJECT SHELVES (NO NOTES SHOWN) */}
      {/* ======================================================== */}
      {!activeSubject ? (
        <div className="space-y-4 animate-fade-in">
          {/* Quick Add Banner for Laptop & Desktop */}
          <div className="glass-panel p-4 rounded-2xl border border-sky-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-sky-950/30 bg-gradient-to-r from-sky-950/70 via-slate-900/60 to-cyan-950/50">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-md p-1.5 shrink-0">
                <CupboardIcon className="w-full h-full text-cyan-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Add Notes to Shelf</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30">
                    Instant Auto-Filing
                  </span>
                </div>
                <p className="text-xs text-sky-200/60 mt-0.5">
                  Drag &amp; drop any file from Windows Explorer or Downloads anywhere onto the screen, or click Add Note
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenUpload()}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/25 border border-cyan-300/30 transition-all active:scale-95 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add Note to Shelf</span>
            </button>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-3xl border border-dashed border-sky-400/20 p-6 shadow-xl">
              <div className="w-12 h-12 bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 rounded-2xl flex items-center justify-center mx-auto mb-3 glass-shard-1 shadow-md shadow-cyan-500/20">
                <Folder className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No Subject Shelves Created</h3>
              <p className="text-xs text-sky-200/60 max-w-sm mx-auto mb-5">
                Create your first subject shelf to start organizing your college lecture PDFs.
              </p>
              <button
                onClick={() => onOpenUpload()}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/25 border border-cyan-300/30 transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span>Add / Upload Note</span>
              </button>
            </div>
          ) : (
            subjects
              .filter(s => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const matchName = s.name.toLowerCase().includes(q);
                const matchCode = s.code?.toLowerCase().includes(q) || false;
                const matchNotes = notes.some(n => n.subject_id === s.id && n.clean_title.toLowerCase().includes(q));
                return matchName || matchCode || matchNotes;
              })
              .map((sub) => {
                const subNotes = notes.filter((n) => n.subject_id === sub.id);
                const count = subNotes.length;

                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setActiveSubjectId(sub.id);
                      setSearchQuery('');
                    }}
                    className="glass-card rounded-2xl border border-sky-400/25 p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:border-cyan-400 hover:bg-sky-900/40 hover:shadow-lg hover:shadow-cyan-500/15 transition-all duration-200 group active:scale-[0.99] relative overflow-hidden shard-accent"
                  >
                    {/* Left: Subject Color Plate & Details */}
                    <div className="flex items-center space-x-4 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md border border-white/20 glass-shard-1"
                        style={{ backgroundColor: sub.color || '#0284c7' }}
                      >
                        <Layers className="w-5 h-5 text-white/90" />
                      </div>

                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                            {sub.name}
                          </h2>
                          {sub.code && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-950/70 border border-sky-400/30 text-cyan-300 font-bold">
                              {sub.code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-sky-200/60 mt-0.5">
                          {count === 0 
                            ? 'Empty Shelf • Tap to add notes' 
                            : `${count} Note${count === 1 ? '' : 's'} strictly filed • Tap to open shelf`}
                        </p>
                      </div>
                    </div>

                    {/* Right: Quick Add + Badge + Chevron */}
                    <div className="flex items-center space-x-2.5 shrink-0 pl-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenUpload(sub.id);
                        }}
                        className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/30 text-xs font-bold transition-all shadow-sm active:scale-95"
                        title={`Add note directly to ${sub.name}`}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add Note</span>
                      </button>

                      <span className="text-xs font-bold px-3 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                        {count} {count === 1 ? 'Note' : 'Notes'}
                      </span>
                      <ChevronRight className="w-5 h-5 text-sky-400/60 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })
          )}
        </div>
      ) : (
        /* ======================================================== */
        /* 2. OPENED SHELF VIEW: SHOWS NOTES ONLY FOR THIS SUBJECT */
        /* ======================================================== */
        <div className="space-y-4 animate-slide-down">
          {/* Shelf Banner */}
          <div 
            className="p-4 rounded-2xl border border-white/10 flex items-center justify-between text-white relative overflow-hidden shadow-lg"
            style={{ 
              background: `linear-gradient(135deg, ${activeSubject.color || '#0284c7'} 0%, #0369a1 100%)` 
            }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                Single-Subject Dedicated Shelf
              </span>
              <h2 className="text-xl font-black text-white">{activeSubject.name}</h2>
              <p className="text-xs text-white/80 mt-0.5">
                All notes below strictly belong to this shelf.
              </p>
            </div>

            <button
              onClick={() => onOpenUpload(activeSubject.id)}
              className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md hover:bg-slate-100 active:scale-95 transition-all flex items-center space-x-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-900" />
              <span>+ Add Note to {activeSubject.name}</span>
            </button>
          </div>

          {currentShelfNotes.length === 0 ? (
            <div className="text-center py-14 glass-panel rounded-3xl border border-dashed border-sky-400/20 p-6">
              <FileText className="w-10 h-10 text-cyan-400/50 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white mb-1">No notes in {activeSubject.name}</h3>
              <p className="text-xs text-sky-200/60 max-w-sm mx-auto mb-4">
                This shelf is empty. Upload or drop a note to file it directly here.
              </p>
              <button
                onClick={() => onOpenUpload(activeSubject.id)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 mx-auto active:scale-95 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Upload to {activeSubject.name}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentShelfNotes.map((note) => (
                <div
                  key={note.id}
                  className="glass-card rounded-2xl border border-sky-400/20 shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-cyan-400/40 hover:shadow-cyan-500/10 shard-accent relative"
                >
                  <div className="p-4 relative z-10">
                    {/* File Size */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold text-cyan-300">
                        {formatFileSize(note.file_size)}
                      </span>
                      <span className="text-[10px] text-sky-300/60">
                        {new Date(note.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Note Title */}
                    <h3 className="font-bold text-white text-sm leading-snug group-hover:text-cyan-300 transition-colors line-clamp-2">
                      {note.clean_title}
                    </h3>

                    {/* Original filename */}
                    <p className="text-[10px] text-sky-400/50 font-mono truncate mt-1">
                      {note.original_filename}
                    </p>

                    {/* Topics / Summary Preview */}
                    {note.summary && (
                      <p className="text-xs text-sky-200/70 mt-2 line-clamp-2 bg-sky-950/50 p-2 rounded-xl border border-sky-400/15">
                        {note.summary}
                      </p>
                    )}
                  </div>

                  {/* Note Action Toolbar */}
                  <div className="px-4 py-3 bg-sky-950/40 border-t border-sky-400/15 flex items-center justify-between relative z-10 gap-2">
                    <div className="flex items-center space-x-1.5">
                      {/* Open / Download PDF */}
                      {note.file_url && (
                        <a
                          href={note.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-sky-300 hover:text-white hover:bg-sky-800/40 transition-colors"
                          title="Open PDF Document"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* MOVE ON Bot Button */}
                      <button
                        onClick={() => onOpenBot(note)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-400/40 text-[11px] font-bold text-cyan-300 shadow-sm transition-all"
                        title="Ask MOVE ON Bot from this note"
                      >
                        <Bot className="w-3.5 h-3.5 text-cyan-300" />
                        <span>MOVE ON</span>
                      </button>
                    </div>

                    {/* Delete Note */}
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="p-1.5 rounded-lg text-sky-400/40 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
