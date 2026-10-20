import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, FileText, Sparkles, CheckCircle2, RefreshCw, 
  AlertCircle, ArrowRight, AlertTriangle, PlusCircle 
} from 'lucide-react';
import { Subject, Unit, AIClassificationResult, Note } from '../types';
import { universalClassifyNote, isAIConfigured } from '../lib/ai';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface UploadModalProps {
  subjects: Subject[];
  initialFile?: File | null;
  preselectedSubjectId?: string | null;
  onUploadComplete: (newNote: Note) => void;
  onOpenSettings: () => void;
  onAddSubject?: (subject: Omit<Subject, 'id'>, units: Omit<Unit, 'id' | 'subject_id'>[]) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  subjects,
  initialFile,
  preselectedSubjectId,
  onUploadComplete,
  onOpenSettings,
  onAddSubject,
}) => {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    preselectedSubjectId || subjects[0]?.id || ''
  );
  const [editedTitle, setEditedTitle] = useState<string>(initialFile?.name || '');
  const [summary, setSummary] = useState<string>('');
  const [aiResult, setAiResult] = useState<AIClassificationResult | null>(null);

  // AI Subject Mismatch Warning & New Shelf option
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);
  const [suggestedNewSubject, setSuggestedNewSubject] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedSubjectId) {
      setSelectedSubjectId(preselectedSubjectId);
    }
  }, [preselectedSubjectId]);

  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
      setEditedTitle(initialFile.name);
      if (!selectedSubjectId && subjects.length > 0) {
        setSelectedSubjectId(preselectedSubjectId || subjects[0].id);
      }
      runUniversalAI(initialFile);
    }
  }, [initialFile, subjects]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setMismatchWarning(null);
    setSuggestedNewSubject(null);
    setEditedTitle(selectedFile.name);
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(preselectedSubjectId || subjects[0].id);
    }

    runUniversalAI(selectedFile);
  };

  const runUniversalAI = async (fileToAnalyze?: File) => {
    const target = fileToAnalyze || file;
    if (!target) return;

    setIsAnalyzing(true);
    setError(null);
    setMismatchWarning(null);
    setSuggestedNewSubject(null);

    try {
      const result = await universalClassifyNote(target, subjects);
      setAiResult(result);
      setEditedTitle(result.cleanTitle);
      setSummary(result.summary || '');

      // Check if AI detected subject belongs to an existing subject
      const detectedName = result.subjectName.trim().toLowerCase();
      const existingMatch = subjects.find(
        (s) => s.name.toLowerCase() === detectedName || 
               s.name.toLowerCase().includes(detectedName) ||
               detectedName.includes(s.name.toLowerCase())
      );

      if (existingMatch) {
        // Automatically lock and point directly to that subject shelf!
        setSelectedSubjectId(existingMatch.id);
      } else {
        // AI found this PDF is from a different subject (e.g. Java notes when only Maths exists)
        setSuggestedNewSubject(result.subjectName);
        setMismatchWarning(
          `AI detected this note is for "${result.subjectName}", which does not match any existing shelf. Do not mix it into another subject!`
        );
      }
    } catch (err: any) {
      console.warn('AI analysis error:', err?.message || err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Create a brand new dedicated shelf if note subject does not exist
  const handleCreateSuggestedShelf = () => {
    if (!suggestedNewSubject || !onAddSubject) return;

    const colors = ['#0284c7', '#06b6d4', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    onAddSubject(
      {
        name: suggestedNewSubject,
        code: suggestedNewSubject.slice(0, 3).toUpperCase() + '101',
        color: randomColor,
      },
      []
    );

    setMismatchWarning(null);
    setSuggestedNewSubject(null);
  };

  const handleSaveToShelf = async () => {
    if (!file || !selectedSubjectId) {
      setError('Please select a dedicated shelf for this note.');
      return;
    }

    // STRICT CHECK: Warn if user is forcing a note into a mismatched shelf
    const currentSub = subjects.find(s => s.id === selectedSubjectId);
    if (aiResult && currentSub) {
      const aiSub = aiResult.subjectName.toLowerCase();
      const shelfName = currentSub.name.toLowerCase();
      if (!shelfName.includes(aiSub) && !aiSub.includes(shelfName) && aiResult.confidence > 0.8) {
        const confirmSave = window.confirm(
          `⚠️ STRICT SHELF WARNING: AI detected this PDF is for "${aiResult.subjectName}", but you selected "${currentSub.name}". Each shelf must contain only one subject. Are you sure you want to proceed?`
        );
        if (!confirmSave) return;
      }
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
              Ingest & File Note
            </h2>
            <p className="text-xs text-sky-200/60 mt-0.5">
              AI auto-identifies the exact subject and prevents cross-subject clutter.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* AI Subject Mismatch Warning Banner */}
        {mismatchWarning && (
          <div className="mb-4 p-4 bg-amber-950/70 border border-amber-500/50 rounded-2xl text-amber-200 text-xs space-y-2.5 animate-slide-down">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">Subject Mismatch Detected!</p>
                <p className="text-[11px] text-amber-200/90 mt-0.5">{mismatchWarning}</p>
              </div>
            </div>

            {suggestedNewSubject && onAddSubject && (
              <button
                type="button"
                onClick={handleCreateSuggestedShelf}
                className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Dedicated Shelf for "{suggestedNewSubject}"</span>
              </button>
            )}
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
              accept=".pdf,.docx,.doc,.txt,.pptx,application/pdf,application/*,*/*"
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
                <span>{isAnalyzing ? 'Analyzing Subject...' : 'AI Auto-Detect Subject'}</span>
              </button>
            </div>

            {/* Dedicated Subject Shelf Picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-sky-200 uppercase tracking-wider">
                  Target Dedicated Shelf *
                </label>
                <span className="text-[10px] text-cyan-300 font-medium">
                  {aiResult?.subjectName ? `AI Suggested: ${aiResult.subjectName}` : '1 Subject Per Shelf'}
                </span>
              </div>
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
                  Auto-renamed by AI
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
                Topics Covered
              </label>
              <input
                type="text"
                placeholder="e.g. CPU Scheduling algorithms, SJF, Round Robin"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-sky-950/60 border border-sky-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-sky-400/40"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-sky-400/20">
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setAiResult(null);
                  setMismatchWarning(null);
                  setSuggestedNewSubject(null);
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
