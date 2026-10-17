import React, { useState } from 'react';
import { Plus, Trash2, BookPlus, Sparkles, FolderOpen, Layers, Check } from 'lucide-react';
import { Subject, Unit } from '../types';

interface SyllabusManagerProps {
  subjects: Subject[];
  onAddSubject: (subject: Omit<Subject, 'id'>, units: Omit<Unit, 'id' | 'subject_id'>[]) => Promise<void>;
  onDeleteSubject: (subjectId: string) => Promise<void>;
  onLoadTemplate: () => Promise<void>;
}

export const SyllabusManager: React.FC<SyllabusManagerProps> = ({
  subjects,
  onAddSubject,
  onDeleteSubject,
  onLoadTemplate,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [selectedColor, setSelectedColor] = useState('#0284c7');
  const [unitsInput, setUnitsInput] = useState<string[]>([
    'Unit 1: Introduction & Fundamentals',
    'Unit 2: Core Concepts & Architecture',
    'Unit 3: Algorithms & Methods',
    'Unit 4: Advanced Topics & Implementations',
    'Unit 5: Applications & Case Studies'
  ]);

  const colorOptions = [
    '#0284c7', // Sky Blue
    '#06b6d4', // Cyan
    '#3b82f6', // Electric Blue
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#ec4899', // Pink
  ];

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const unitsToCreate = unitsInput
      .filter((u) => u.trim().length > 0)
      .map((u, idx) => ({
        unit_number: idx + 1,
        title: u.trim(),
        keywords: u.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      }));

    await onAddSubject(
      {
        name: newSubjectName.trim(),
        code: newSubjectCode.trim() || undefined,
        color: selectedColor,
      },
      unitsToCreate
    );

    setNewSubjectName('');
    setNewSubjectCode('');
    setIsAdding(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in relative z-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 glass-shard-1 shadow-md shadow-cyan-500/20">
              <Layers className="w-4 h-4" />
            </span>
            <span className="bg-gradient-to-r from-white via-sky-200 to-cyan-400 bg-clip-text text-transparent">
              Syllabus & Subjects
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-sky-200/60 mt-1">
            Gemini AI uses these registered subjects and units to categorize and auto-rename your WhatsApp PDFs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {subjects.length === 0 && (
            <button
              onClick={onLoadTemplate}
              className="flex items-center space-x-1.5 px-4 py-2 bg-sky-950/40 hover:bg-sky-900/50 text-cyan-300 border border-cyan-400/30 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-cyan-500/20 backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>Load 2nd-Year Template</span>
            </button>
          )}

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-cyan-500/25 border border-cyan-300/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* Add Subject Drawer / Form */}
      {isAdding && (
        <div className="glass-panel rounded-2xl p-6 border border-sky-400/25 shadow-2xl mb-8 animate-slide-down relative overflow-hidden shard-accent">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BookPlus className="w-5 h-5 text-cyan-400" />
            Add New Subject Shelf
          </h3>
          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-sky-200 uppercase mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-sky-950/60 border border-sky-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-200 uppercase mb-1">
                  Subject Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS302"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-sky-950/60 border border-sky-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 font-semibold"
                />
              </div>
            </div>

            {/* Color selection */}
            <div>
              <label className="block text-xs font-bold text-sky-200 uppercase mb-1.5">
                Shelf Color
              </label>
              <div className="flex items-center space-x-2">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-transform ${
                      selectedColor === c ? 'scale-110 ring-2 ring-offset-2 ring-cyan-400 ring-offset-slate-900' : 'hover:scale-105'
                    }`}
                  >
                    {selectedColor === c && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Units */}
            <div>
              <label className="block text-xs font-bold text-sky-200 uppercase mb-1">
                Units / Modules Breakdown
              </label>
              <div className="space-y-2">
                {unitsInput.map((unitText, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-cyan-300 w-14">Unit {idx + 1}:</span>
                    <input
                      type="text"
                      value={unitText}
                      onChange={(e) => {
                        const next = [...unitsInput];
                        next[idx] = e.target.value;
                        setUnitsInput(next);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-sky-950/60 border border-sky-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm text-sky-300 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-md shadow-cyan-500/25 border border-cyan-300/30"
              >
                Save Subject Shelf
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subject Cards Grid */}
      {subjects.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-3xl border border-dashed border-sky-400/25 p-8 shadow-2xl shard-accent">
          <FolderOpen className="w-12 h-12 text-cyan-300/60 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Subjects Added Yet</h3>
          <p className="text-sm text-sky-200/60 max-w-md mx-auto mb-6">
            Add your semester subjects or click below to load standard 2nd-year CS subjects (OS, DSA, DBMS, CN, Maths).
          </p>
          <button
            onClick={onLoadTemplate}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/30 border border-cyan-300/30 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-cyan-200" />
            <span>Load 2nd-Year Engineering Template</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className="glass-card rounded-2xl border border-sky-400/20 shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:border-cyan-400/50 hover:shadow-cyan-500/15 shard-accent relative"
            >
              <div
                className="h-2"
                style={{ backgroundColor: sub.color || '#0284c7' }}
              />
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-white text-lg">{sub.name}</h3>
                    {sub.code && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-sky-950 border border-sky-400/30 text-cyan-300 font-mono">
                        {sub.code}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-bold text-sky-300/60 uppercase tracking-wider">
                      Syllabus Units ({sub.units?.length || 0})
                    </p>
                    <ul className="text-xs text-sky-200/80 space-y-1">
                      {sub.units && sub.units.length > 0 ? (
                        sub.units.slice(0, 4).map((u) => (
                          <li key={u.id || u.unit_number} className="truncate flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                            <span>{u.title}</span>
                          </li>
                        ))
                      ) : (
                        <li className="italic text-sky-400/50">No units defined</li>
                      )}
                      {sub.units && sub.units.length > 4 && (
                        <li className="text-[11px] text-cyan-300 font-bold">
                          +{sub.units.length - 4} more units
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-sky-400/15 flex items-center justify-between text-xs">
                  <span className="text-sky-300/60">Ready for AI sorting</span>
                  <button
                    onClick={() => onDeleteSubject(sub.id)}
                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-950/40 rounded transition-colors"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
