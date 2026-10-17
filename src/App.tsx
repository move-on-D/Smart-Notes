import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ShelfView } from './components/ShelfView';
import { SyllabusManager } from './components/SyllabusManager';
import { UploadModal } from './components/UploadModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthPage } from './components/AuthPage';
import { Subject, Unit, Note } from './types';
import { supabase, isSupabaseConfigured, signOutUser } from './lib/supabase';
import { isAIConfigured } from './lib/ai';

declare global {
  interface Window {
    handleSharedFile?: (fileName: string, mimeType: string, base64Data: string) => void;
  }
}

const SAMPLE_2ND_YEAR_SUBJECTS: Array<{ name: string; code: string; color: string; units: string[] }> = [
  {
    name: 'Operating Systems',
    code: 'CS301',
    color: '#0284c7',
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
    color: '#06b6d4',
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
    color: '#3b82f6',
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [incomingSharedFile, setIncomingSharedFile] = useState<File | null>(null);

  // Monitor Supabase Authentication
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setIsGuest(false);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Load user data whenever auth state changes
  useEffect(() => {
    loadInitialData();

    // Register Native WhatsApp Share Bridge Listener
    window.handleSharedFile = (fileName: string, mimeType: string, base64Data: string) => {
      try {
        console.log('Received shared file from WhatsApp/Android:', fileName);
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType || 'application/pdf' });
        const sharedFile = new File([blob], fileName, { type: mimeType || 'application/pdf' });
        
        setIncomingSharedFile(sharedFile);
        setActiveTab('upload');
      } catch (err) {
        console.error('Failed to process incoming shared file:', err);
      }
    };

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
  }, [user]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        // Query user-specific subjects and notes
        const subjectsQuery = user 
          ? supabase.from('subjects').select('*, units(*)').eq('user_id', user.id)
          : supabase.from('subjects').select('*, units(*)');

        const { data: subData } = await subjectsQuery;

        if (subData && subData.length > 0) {
          setSubjects(subData);
        } else {
          loadFromLocalStorage();
        }

        const notesQuery = user
          ? supabase.from('notes').select('*, subject:subjects(*)').eq('user_id', user.id)
          : supabase.from('notes').select('*, subject:subjects(*)');

        const { data: notesData } = await notesQuery;

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
            user_id: user?.id,
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
            .insert({ 
              user_id: user?.id,
              name: item.name, 
              code: item.code, 
              color: item.color 
            })
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
    setIncomingSharedFile(null);
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

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setSubjects([]);
    setNotes([]);
  };

  const isConfigured = Boolean(isSupabaseConfigured && isAIConfigured());

  // Show Auth Page if user is not authenticated and has not clicked guest mode
  if (!user && !isGuest && isSupabaseConfigured && !showAuthModal) {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
        <AuthPage
          onSuccess={() => {
            loadInitialData();
          }}
          onContinueAsGuest={() => setIsGuest(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* Refined ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[300px] h-[300px] rounded-full bg-cyan-600/10 blur-[80px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[320px] h-[320px] rounded-full bg-blue-600/10 blur-[90px]"></div>

        <div className="absolute top-16 left-8 w-14 h-20 bg-sky-400/5 border border-sky-300/15 backdrop-blur-[1px] glass-shard-1 rotate-12 opacity-30"></div>
        <div className="absolute top-72 right-8 w-16 h-24 bg-cyan-400/5 border border-cyan-300/15 backdrop-blur-[1px] glass-shard-2 -rotate-25 opacity-25"></div>
        <div className="absolute bottom-28 left-1/4 w-12 h-16 bg-blue-400/5 border border-blue-300/15 backdrop-blur-[1px] glass-shard-1 rotate-45 opacity-20"></div>
      </div>

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isConfigured={isConfigured}
        user={user}
        onSignOut={handleSignOut}
        onOpenAuth={() => setIsGuest(false)}
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
            initialFile={incomingSharedFile}
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
