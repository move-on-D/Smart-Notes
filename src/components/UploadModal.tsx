import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, Sparkles, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { Subject, AIClassificationResult, Note } from '../types';
import { universalClassifyNote, isAIConfigured, getAIConfig } from '../lib/ai';
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
  const [selectedUnitNumber, setSelectedUnitNumber] = useState<number>(1);
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
  };

  const runUniversalAI = async () => {
    if (!file) return;

    if (!isAIConfigured()) {
      setError('No AI API key found. Please choose a provider and add your key in Settings (⚙️).');
      return;
    }

    if (subjects.length === 0) {
      setError('Please add at least one subject in the Syllabus tab first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await universalClassifyNote(file, subjects);
      setAiResult(result);
      setEditedTitle(result.cleanTitle);
      setSelectedUnitNumber(result.unitNumber || 1);
      setSummary(result.summary || '');

      const matchedSubject = subjects.find(
        (s) => s.name.toLowerCase() === result.subjectName.toLowerCase()
      );
      if (matchedSubject) {
        setSelectedSubjectId(matchedSubject.id);
      }
    } catch (err: any) {
      console.warn('AI analysis error:', err?.message || err);
      setError(err?.message || 'AI request failed. You can still save manually below!');
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
          console.warn('Storage upload note:', uploadError.message);
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
            summary: summary || `Unit ${selectedUnitNumber} notes for ${subject?.name || 'Class'}`,
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
          summary: summary || `Unit ${selectedUnitNumber} notes for ${subject?.name}`,
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
          summary: summary || `Unit ${selectedUnitNumber} notes for ${subject?.name}`,
          confidence: aiResult?.confidence || 1.0,
          created_at: new Date().toISOString(),
          subject,
        };
        onUploadComplete(localNote);
      }

      setFile(null);
      setAiResult(null);
      setSummary('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not save note to shelf.');
    } finally {
      setIsSaving(false);
    }
  };

  const aiConfig = getAIConfig();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in relative z-10">
      <div className="glass-panel rounded-2xl p-5 sm:p-7 border border-sky-400/20 shadow-2xl relative overflow-hidden shard-accent">
        <div className="text-center max-w-md mx-auto mb-6 relative">
          <div className="w-10 h-10 bg-sky-500/20 text-cyan-300 rounded-xl flex items-center justify-center mx-auto mb-2.5 border border-cyan-400/30 glass-shard-1 shadow-md shadow-cyan-500/20">
            <UploadCloud className="w-5 h-5 text-cyan-300" />
          </div>
          <h2 className="text-xl font-black bg-gradient-to-r from-white via-sky-200 to-cyan-400 bg-clip-text text-transparent">
            Upload & File Notes
          </h2>
          <p className="text-xs text-sky-200/60 mt-0.5">
            Drop any PDF, pick its subject and unit, or let AI organize it automatically.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-sky-950/70 border border-sky-400/30 rounded-xl text-sky-200 text-xs flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-sky-300 hover:text-white font-bold ml-2 shrink-0 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dropzone */}
        {!file && (
          <label className="border-2 border-dashed border-sky-400/30 hover:border-cyan-400 bg-sky-950/20 hover:bg-sky-900/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform glass-shard-1 shadow-md shadow-cyan-500/20">
              <UploadCloud className="w-6 h-6 text-cyan-300" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-sky-100 group-hover:text-white transition-colors">
              Click to select or drop any PDF note
            </span>
            <span className="text-[11px] text-sky-300/50 mt-1">Saves directly to your cloud shelves</span>
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
            <div className="glass-card p-3.5 rounded-xl border border-sky-400/20 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs text-white font-bold truncate">{file.name}</p>
                  <p className="text-[10px] text-sky-300/50 font-mono">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {/* Universal AI button */}
              <button
                type="button"
                onClick={runUniversalAI}
                disabled={isAnalyzing}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-900/40 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 transition-all shrink-0"
                title={`Run AI with ${aiConfig.provider.toUpperCase()}`}
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                )}
                <span>{isAnalyzing ? 'Analyzing...' : `Auto-Name with AI (${aiConfig.provider})`}</span>
              </button>
            </div>

            {/* Shelf & Unit Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-sky-200 uppercase tracking-wider mb-1">
                  Subject Shelf *
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-sky-950/60 border border-sky-400/30 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 font-semibold"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-sky-200 uppercase tracking-wider mb-1">
                  Unit / Module *
                </label>
                <select
                  value={selectedUnitNumber}
                  onChange={(e) => setSelectedUnitNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-sky-950/60 border border-sky-400/30 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 font-semibold"
                >
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num} className="bg-slate-900 text-white">
                      Unit {num}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clean Note Title */}
            <div>
              <label className="block text-[11px] font-bold text-sky-200 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Note Title (Rename as you like)</span>
                <span className="text-sky-300/50 text-[10px] normal-case">
                  e.g. OS_Unit2_CPU_Scheduling.pdf
                </span>
              </label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-sky-950/80 border border-cyan-400/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono text-cyan-200 font-bold"
              />
            </div>

            {/* Optional Topic / Summary Note */}
            <div>
              <label className="block text-[11px] font-bold text-sky-200 uppercase tracking-wider mb-1">
                Description / Key Topics (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. CPU Scheduling algorithms, SJF, Round Robin"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-sky-950/60 border border-sky-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-sky-400/40"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-sky-400/20">
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
                className="flex items-center space-x-1.5 px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/30 border border-cyan-300/30 transition-all disabled:opacity-50 active:scale-95"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>File to Shelf</span>
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
