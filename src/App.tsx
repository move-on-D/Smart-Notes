import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ShelfView } from './components/ShelfView';
import { SyllabusManager } from './components/SyllabusManager';
import { UploadModal } from './components/UploadModal';
import { SettingsModal } from './components/SettingsModal';
import { Subject, Unit, Note } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { isGeminiConfigured } from './lib/gemini';

const SAMPLE_2ND_YEAR_SUBJECTS: Array<{ name: string; code: string; color: string; units: string[] }> = [
  {
    name: 'Operating Systems',
    code: 'CS301',
    color: '#4f46e5',
    units: [
      'Unit 1: OS Overview & System Calls',
      'Unit 2: Process Management & CPU Scheduling',
      'Unit 3: Synchronization & Deadlocks',
      'Unit 4: Memory Management & Virtual Memory',
      'Unit 5: File Systems & Disk Scheduling',
    ],
  },
  {
    name: 'Data Structures & Algorithms',
    code: 'CS302',
    color: '#0ea5e9',
    units: [
      'Unit 1: Arrays, Stacks & Queues',
      'Unit 2: Linked Lists & Skip Lists',
      'Unit 3: Trees, BST & AVL Trees',
      'Unit 4: Graphs & Shortest Path Algorithms',
      'Unit 5: Dynamic Programming & Hashing',
    ],
  },
  {
    name: 'Database Management Systems',
    code: 'CS303',
    color: '#10b981',
    units: [
      'Unit 1: ER Modeling & Relational Algebra',
      'Unit 2: SQL Queries, Triggers & Views',
      'Unit 3: Normalization (1NF, 2NF, 3NF, BCNF)',
      'Unit 4: Transactions & ACID Properties',
      'Unit 5: Concurrency Control & Indexing',
    ],
  },
  {
    name: 'Computer Networks',
    code: 'CS304',
    color: '#f59e0b',
    units: [
      'Unit 1: Physical Layer & Topologies',
      'Unit 2: Data Link Layer & Framing',
      'Unit 3: Network Layer & IP Addressing',
      'Unit 4: Transport Layer (TCP / UDP)',
      'Unit 5: Application Layer (DNS, HTTP)',
    ],
  },
  {
    name: 'Discrete Mathematics',
    code: 'MA301',
    color: '#8b5cf6',
    units: [
      'Unit 1: Set Theory & Mathematical Logic',
      'Unit 2: Relations & Functions',
      'Unit 3: Combinatorics & Permutations',
      'Unit 4: Graph Theory Basics & Trees',
      'Unit 5: Algebraic Structures & Groups',
    ],
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<'shelf' | 'syllabus' | 'upload'>('shelf');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data and subscribe to live changes
  useEffect(() => {
    loadInitialData();

    // Live Realtime Sync: When mobile uploads a note, laptop updates instantly!
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('realtime_notes_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notes' },
          () => {
            loadInitialData();
          }
        )
        .subscribe();

      return () => {
        supabase?.removeChannel(channel);
      };
    }
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        // Fetch subjects and their units from Supabase
        const { data: subData } = await supabase
          .from('subjects')
          .select('*, units(*)');

        if (subData && subData.length > 0) {
          setSubjects(subData);
        } else {
          loadFromLocalStorage();
        }

        // Fetch notes from Supabase
        const { data: notesData } = await supabase
          .from('notes')
          .select('*, subject:subjects(*)');

        if (notesData) {
          setNotes(notesData);
        }
      } else {
        loadFromLocalStorage();
      }
    } catch (e) {
      console.warn('Error loading cloud data, using local storage:', e);
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    const cachedSubs = localStorage.getItem('SN_SUBJECTS');
    if (cachedSubs) {
      setSubjects(JSON.parse(cachedSubs));
    }
    const cachedNotes = localStorage.getItem('SN_NOTES');
    if (cachedNotes) {
      setNotes(JSON.parse(cachedNotes));
    }
  };

  const saveLocalSubjects = (newSubs: Subject[]) => {
    setSubjects(newSubs);
    localStorage.setItem('SN_SUBJECTS', JSON.stringify(newSubs));
  };

  const saveLocalNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
    localStorage.setItem('SN_NOTES', JSON.stringify(newNotes));
  };

  const handleAddSubject = async (
    subject: Omit<Subject, 'id'>,
    units: Omit<Unit, 'id' | 'subject_id'>[]
  ) => {
    const subjectId = String(Date.now());
    const formattedUnits: Unit[] = units.map((u, i) => ({
      id: `${subjectId}_u_${i + 1}`,
      subject_id: subjectId,
      unit_number: u.unit_number,
      title: u.title,
      keywords: u.keywords,
    }));

    const newSubject: Subject = {
      ...subject,
      id: subjectId,
      units: formattedUnits,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: insertedSub } = await supabase
          .from('subjects')
          .insert({
            name: subject.name,
            code: subject.code,
            color: subject.color,
          })
          .select()
          .single();

        if (insertedSub) {
          const unitsToInsert = units.map((u) => ({
            subject_id: insertedSub.id,
            unit_number: u.unit_number,
            title: u.title,
            keywords: u.keywords,
          }));
          await supabase.from('units').insert(unitsToInsert);
          loadInitialData();
          return;
        }
      } catch (err) {
        console.warn('Supabase subject insert fallback:', err);
      }
    }

    const updated = [...subjects, newSubject];
    saveLocalSubjects(updated);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('subjects').delete().eq('id', subjectId);
      } catch (e) {
        console.warn(e);
      }
    }
    const updated = subjects.filter((s) => s.id !== subjectId);
    saveLocalSubjects(updated);
  };

  const handleLoadTemplate = async () => {
    const templateSubjects: Subject[] = SAMPLE_2ND_YEAR_SUBJECTS.map((item, idx) => {
      const sId = String(Date.now() + idx);
      return {
        id: sId,
        name: item.name,
        code: item.code,
        color: item.color,
        units: item.units.map((u, uIdx) => ({
          id: `${sId}_u${uIdx + 1}`,
          subject_id: sId,
          unit_number: uIdx + 1,
          title: u,
          keywords: u.toLowerCase().split(/\s+/),
        })),
      };
    });

    saveLocalSubjects(templateSubjects);

    if (isSupabaseConfigured && supabase) {
      try {
        for (const item of SAMPLE_2ND_YEAR_SUBJECTS) {
          const { data: sub } = await supabase
            .from('subjects')
            .insert({ name: item.name, code: item.code, color: item.color })
            .select()
            .single();
          if (sub) {
            const unitsToInsert = item.units.map((u, i) => ({
              subject_id: sub.id,
              unit_number: i + 1,
              title: u,
            }));
            await supabase.from('units').insert(unitsToInsert);
          }
        }
        loadInitialData();
      } catch (e) {
        console.warn('Template cloud sync warning:', e);
      }
    }
  };

  const handleUploadComplete = (newNote: Note) => {
    const updated = [newNote, ...notes];
    saveLocalNotes(updated);
    setActiveTab('shelf');
  };

  const handleDeleteNote = async (noteId: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('notes').delete().eq('id', noteId);
      } catch (e) {
        console.warn(e);
      }
    }
    const updated = notes.filter((n) => n.id !== noteId);
    saveLocalNotes(updated);
  };

  const isConfigured = Boolean(isSupabaseConfigured && isGeminiConfigured());

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* Ambient Glass Blue Glows & Broken Glass Shard Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/15 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-[140px]"></div>
        <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full bg-sky-500/10 blur-[100px]"></div>

        {/* Floating Broken Glass Shards */}
        <div className="absolute top-20 left-12 w-32 h-44 bg-sky-400/5 border border-sky-300/20 backdrop-blur-sm glass-shard-1 rotate-12 opacity-60"></div>
        <div className="absolute top-96 right-16 w-48 h-64 bg-cyan-400/5 border border-cyan-300/20 backdrop-blur-sm glass-shard-2 -rotate-45 opacity-50"></div>
        <div className="absolute bottom-32 left-1/4 w-36 h-36 bg-blue-400/5 border border-blue-300/20 backdrop-blur-sm glass-shard-1 rotate-45 opacity-40"></div>
        <div className="absolute top-1/3 left-2/3 w-24 h-48 bg-sky-300/5 border border-cyan-400/15 backdrop-blur-sm glass-shard-2 15deg opacity-30"></div>
      </div>

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isConfigured={isConfigured}
      />

      <main className="flex-1 pb-16 relative z-10">
        {activeTab === 'shelf' && (
          <ShelfView
            subjects={subjects}
            notes={notes}
            onDeleteNote={handleDeleteNote}
            onOpenUpload={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'syllabus' && (
          <SyllabusManager
            subjects={subjects}
            onAddSubject={handleAddSubject}
            onDeleteSubject={handleDeleteSubject}
            onLoadTemplate={handleLoadTemplate}
          />
        )}

        {activeTab === 'upload' && (
          <UploadModal
            subjects={subjects}
            onUploadComplete={handleUploadComplete}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
export default App;
