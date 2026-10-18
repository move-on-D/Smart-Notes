import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, Sparkles, CheckCircle2, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { Subject, AIClassificationResult, Note } from '../types';
import { universalClassifyNote, isAIConfigured } from '../lib/ai';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface UploadModalProps {
  subjects: Subject[];
  initialFile?: File | null;
  onUploadComplete: (newNote: Note) => void;
  onOpenSettings: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  subjects,
  initialFile,
  onUploadComplete,
  onOpenSettings,
}) => {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Note form state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [editedTitle, setEditedTitle] = useState<string>(initialFile?.name || '');
  const [summary, setSummary] = useState<string>('');
  const [aiResult, setAiResult] = useState<AIClassificationResult | null>(null);

  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
      setEditedTitle(initialFile.name);
      if (!selectedSubjectId && subjects.length > 0) {
        setSelectedSubjectId(subjects[0].id);
      }
      // Auto trigger AI on incoming shared file
      runUniversalAI(initialFile);
    }
  }, [initialFile, subjects]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setError('Please upload a PDF file.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setEditedTitle(selectedFile.name);
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }

    // Auto trigger AI immediately upon drop/select for instant zero-hassle renaming
    runUniversalAI(selectedFile);
  };

  const runUniversalAI = async (fileToAnalyze?: File) => {
    const target = fileToAnalyze || file;
    if (!target) return;

    if (!isAIConfigured()) {
      // Still allows manual filing even if AI key is not loaded
      return;
    }

    if (subjects.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await universalClassifyNote(target, subjects);
      setAiResult(result);
      setEditedTitle(result.cleanTitle);
      setSummary(result.summary || '');

      const matchedSubject = subjects.find(
        (s) => s.name.toLowerCase() === result.subjectName.toLowerCase()
      );
      if (matchedSubject) {
        setSelectedSubjectId(matchedSubject.id);
      }
    } catch (err: any) {
      console.warn('AI analysis error:', err?.message || err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToShelf = async () => {
    if (!file || !selectedSubjectId) {
      setError('Please select a subject for this note.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const subject = subjects.find((s) => s.id === selectedSubjectId);
      const cleanFilename = editedTitle.trim().endsWith('.pdf') ? editedTitle.trim() : `${editedTitle.trim()}.pdf`;

      let fileUrl = '';
      let storagePath = '';

      if (isSupabaseConfigured && supabase) {
        storagePath = `${selectedSubjectId}/${Date.now()}_${cleanFilename}`;
        
        const { error: uploadError } = await supabase.storage
          .from('notes')
          .upload(storagePath, file, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          console.warn('Storage upload fallback:', uploadError.message);
          fileUrl = URL.createObjectURL(file);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('notes')
            .getPublicUrl(storagePath);
          fileUrl = publicUrlData.publicUrl;
        }

        const { data: dbData, error: dbError } = await supabase
          .from('notes')
          .insert({
            subject_id: selectedSubjectId,
            original_filename: file.name,
            clean_title: cleanFilename,
            storage_path: storagePath,
            file_url: fileUrl,
            file_size: file.size,
            summary: summary || `Notes for ${subject?.name || 'Class'}`,
            confidence: aiResult?.confidence || 1.0,
          })
          .select()
          .single();

        if (dbError) {
          console.warn('DB insert fallback:', dbError.message);
        }

        const noteToAdd: Note = dbData || {
          id: String(Date.now()),
          subject_id: selectedSubjectId,
          original_filename: file.name,
          clean_title: cleanFilename,
          storage_path: storagePath,
          file_url: fileUrl,
          file_size: file.size,
          summary: summary || `Notes for ${subject?.name}`,
          confidence: aiResult?.confidence || 1.0,
          created_at: new Date().toISOString(),
          subject,
        };

        onUploadComplete(noteToAdd);
      } else {
        fileUrl = URL.createObjectURL(file);
        const localNote: Note = {
          id: String(Date.now()),
          subject_id: selectedSubjectId,
          original_filename: file.name,
          clean_title: cleanFilename,
          storage_path: `local/${file.name}`,
          file_url: fileUrl,
          file_size: file.size,
          summary: summary || `Notes for ${subject?.name}`,
          confidence: aiResult?.confidence || 1.0,
          created_at: new Date().toISOString(),
          subject,
        };
        onUploadComplete(localNote);
      }

      setFile(null);
      setAiResult(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save note.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in relative z-10 font-sans">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-sky-400/25 shadow-2xl relative overflow-hidden shard-accent">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-500/30 border border-cyan-300/40 glass-shard-1">
            <UploadCloud className="w-5 h-5 text-cyan-100" />
          </div>
          <div>
            <h2 className="text-xl font-black bg-gradient-to-r from-white via-sky-200 to-cyan-400 bg-clip-text text-transparent">
              Ingest & Shelve Notes
            </h2>
            <p className="text-xs text-sky-200/60 mt-0.5">
              Drop college PDFs or share from WhatsApp. Auto-names and files in 1 click.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Zone */}
        {!file && (
          <label className="border-2 border-dashed border-sky-400/30 hover:border-cyan-400/60 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-sky-950/30 hover:bg-sky-900/40 transition-all group relative overflow-hidden shard-accent">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform glass-shard-1 shadow-md shadow-cyan-500/20">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white mb-1">
              Select or Drop Lecture PDF
            </p>
            <p className="text-[11px] text-sky-300/60 text-center max-w-xs">
              Supports college PDFs, lecture slides, and WhatsApp shared notes
            </p>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        )}

        {/* Note Configuration Form */}
        {file && (
          <div className="space-y-4 animate-slide-down">
            <div className="glass-card p-4 rounded-2xl border border-sky-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <p className="text-xs text-white font-bold truncate">{file.name}</p>
                  <p className="text-[10px] text-sky-300/50 font-mono">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {/* 1-Click Auto-Name with AI Button */}
              <button
                type="button"
                onClick={() => runUniversalAI()}
                disabled={isAnalyzing}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500/30 to-blue-600/30 hover:from-cyan-500/40 hover:to-blue-600/40 text-cyan-200 border border-cyan-400/40 transition-all shrink-0 active:scale-95 shadow-sm"
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                )}
                <span>{isAnalyzing ? 'Extracting Topics...' : 'Auto-Name with AI'}</span>
              </button>
            </div>

            {/* Subject Shelf Picker */}
            <div>
              <label className="block text-[11px] font-bold text-sky-200 uppercase tracking-wider mb-1.5">
                Subject Shelf *
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-sky-950/70 border border-sky-400/30 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 font-semibold"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Clean Note Title Field */}
            <div>
              <label className="block text-[11px] font-bold text-sky-200 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Renamed Note Title</span>
                <span className="text-sky-300/50 text-[10px] normal-case">
                  Auto-filled by AI or type your own
                </span>
              </label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-sky-950/80 border border-cyan-400/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono text-cyan-200 font-bold"
              />
            </div>

            {/* Extracted Key Topics / Summary */}
            <div>
              <label className="block text-[11px] font-bold text-sky-200 uppercase tracking-wider mb-1.5">
                Topics Covered (Inside PDF)
              </label>
              <input
                type="text"
                placeholder="e.g. CPU Scheduling algorithms, SJF, Round Robin"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-sky-950/60 border border-sky-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-sky-400/40"
              />
            </div>

            {/* Action Buttons with prominent Tap Save */}
            <div className="flex items-center justify-between pt-4 border-t border-sky-400/20">
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setAiResult(null);
                }}
                className="text-xs text-sky-300 hover:text-white font-medium"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveToShelf}
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/30 border border-cyan-300/30 transition-all disabled:opacity-50 active:scale-95"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Filing Note...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Note to Shelf</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
