import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ShelfView } from './components/ShelfView';
import { SyllabusManager } from './components/SyllabusManager';
import { UploadModal } from './components/UploadModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthPage } from './components/AuthPage';
import { MoveOnChat } from './components/MoveOnChat';
import { CupboardIcon } from './components/CupboardIcon';
import { Subject, Unit, Note } from './types';
import { supabase, isSupabaseConfigured, signOutUser } from './lib/supabase';
import { isAIConfigured } from './lib/ai';

declare global {
  interface Window {
    handleSharedFile?: (fileName: string, mimeType: string, base64Data: string) => void;
    __PENDING_SHARED_NOTE__?: { fileName: string; mimeType: string; base64Data: string } | null;
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
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  // MOVE ON bot state
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [botSelectedNote, setBotSelectedNote] = useState<Note | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [incomingSharedFile, setIncomingSharedFile] = useState<File | null>(null);
  const [uploadPreselectedSubjectId, setUploadPreselectedSubjectId] = useState<string | null>(null);

  // Global Drag-and-drop state for Laptop & Desktop
  const [isDraggingOverWindow, setIsDraggingOverWindow] = useState(false);

  // Monitor Authentication (Supabase + Local Fallback)
  useEffect(() => {
    // Check local user profile first
    const localProfile = localStorage.getItem('SN_USER_PROFILE');
    if (localProfile) {
      try {
        setUser(JSON.parse(localProfile));
      } catch (e) {
        console.warn('Local profile parse error:', e);
      }
    }

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(session.user);
          setIsGuest(false);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Global window drag-and-drop listener for laptop/desktop
  useEffect(() => {
    let dragCounter = 0;

    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDraggingOverWindow(true);
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsDraggingOverWindow(false);
        dragCounter = 0;
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOverWindow(false);
      dragCounter = 0;

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0];
        console.log('File dropped onto laptop window:', droppedFile.name);
        setIncomingSharedFile(droppedFile);
        setActiveTab('upload');
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  // Load user data whenever auth state changes & register native share listener
  useEffect(() => {
    loadInitialData();

    // Register Native Share Bridge Listener (Android & WhatsApp / Drive / Files)
    window.handleSharedFile = (fileName: string, mimeType: string, base64Data: string) => {
      try {
        console.log('Received shared file from Android / Native Share:', fileName);
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

    // Check if there is already a pending shared note from MainActivity
    if (window.__PENDING_SHARED_NOTE__ && window.__PENDING_SHARED_NOTE__.base64Data) {
      const p = window.__PENDING_SHARED_NOTE__;
      window.__PENDING_SHARED_NOTE__ = null;
      window.handleSharedFile?.(p.fileName, p.mimeType, p.base64Data);
    }

    // Live Realtime Sync across devices
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
        const subjectsQuery = user 
          ? supabase.from('subjects').select('*, units(*)').eq('user_id', user.id)
          : supabase.from('subjects').select('*, units(*)');

        const { data: subData, error: subError } = await subjectsQuery;

        if (subData && subData.length > 0) {
          setSubjects(subData);
        } else {
          loadFromLocalStorage();
        }

        const notesQuery = user
          ? supabase.from('notes').select('*, subject:subjects(*)').eq('user_id', user.id)
          : supabase.from('notes').select('*, subject:subjects(*)');

        const { data: notesData, error: notesError } = await notesQuery;

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
    newSub: Omit<Subject, 'id'>,
    unitsData: Omit<Unit, 'id' | 'subject_id'>[]
  ) => {
    const localId = 'sub_' + Date.now();
    const createdUnits: Unit[] = unitsData.map((u, i) => ({
      id: 'unit_' + Date.now() + '_' + i,
      subject_id: localId,
      unit_number: u.unit_number || (i + 1),
      title: u.title || (u as any).name || `Unit ${i + 1}`,
      keywords: u.keywords || [],
    }));

    const subjectWithUnits: Subject = {
      ...newSub,
      id: localId,
      units: createdUnits,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: subResult, error: subErr } = await supabase
          .from('subjects')
          .insert({
            name: newSub.name,
            code: newSub.code,
            color: newSub.color,
            user_id: user?.id || null,
          })
          .select()
          .single();

        if (subResult && !subErr) {
          let insertedUnits: Unit[] = [];
          if (unitsData.length > 0) {
            const unitsToInsert = unitsData.map((u, idx) => ({
              subject_id: subResult.id,
              unit_number: u.unit_number || (idx + 1),
              title: u.title || (u as any).name || `Unit ${idx + 1}`,
              keywords: u.keywords || [],
            }));
            const { data: uRes } = await supabase.from('units').insert(unitsToInsert).select();
            if (uRes) insertedUnits = uRes;
          }

          setSubjects([...subjects, { ...subResult, units: insertedUnits }]);
          return;
        }
      } catch (err) {
        console.warn('Supabase subject insert warning:', err);
      }
    }

    saveLocalSubjects([...subjects, subjectWithUnits]);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('subjects').delete().eq('id', subjectId);
        setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
        setNotes((prev) => prev.filter((n) => n.subject_id !== subjectId));
        return;
      } catch (err) {
        console.warn('Supabase subject delete warning:', err);
      }
    }

    const updated = subjects.filter((s) => s.id !== subjectId);
    saveLocalSubjects(updated);
    saveLocalNotes(notes.filter((n) => n.subject_id !== subjectId));
  };

  const handleLoadTemplate = async () => {
    for (const item of SAMPLE_2ND_YEAR_SUBJECTS) {
      const units: Omit<Unit, 'id' | 'subject_id'>[] = item.units.map((uName, idx) => ({
        unit_number: idx + 1,
        title: uName,
      }));
      await handleAddSubject(
        {
          name: item.name,
          code: item.code,
          color: item.color,
        },
        units
      );
    }
  };

  const handleUploadComplete = (newNote: Note) => {
    setNotes([newNote, ...notes]);
    saveLocalNotes([newNote, ...notes]);
    setActiveTab('shelf');
    setIncomingSharedFile(null);
    setUploadPreselectedSubjectId(null);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('notes').delete().eq('id', noteId);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        return;
      } catch (err) {
        console.warn('Delete note error:', err);
      }
    }

    const updated = notes.filter((n) => n.id !== noteId);
    saveLocalNotes(updated);
  };

  const handleSignOut = async () => {
    localStorage.removeItem('SN_USER_PROFILE');
    try {
      await signOutUser();
    } catch (e) {
      console.warn('Sign out notice:', e);
    }
    setUser(null);
    setIsGuest(false);
  };

  const handleOpenBot = (note: Note) => {
    setBotSelectedNote(note);
    setIsBotOpen(true);
  };

  const handleOpenUploadForSubject = (subjectId?: string) => {
    setUploadPreselectedSubjectId(subjectId || null);
    setActiveTab('upload');
  };

  const isConfigured = Boolean(isSupabaseConfigured && isAIConfigured());

  // Show full-page Auth portal first if user is not authenticated and has not explicitly chosen guest mode
  if (!user && !isGuest) {
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
          user={user}
          onSignOut={handleSignOut}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[300px] h-[300px] rounded-full bg-cyan-600/10 blur-[80px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[320px] h-[320px] rounded-full bg-blue-600/10 blur-[90px]"></div>

        <div className="absolute top-16 left-8 w-14 h-20 bg-sky-400/5 border border-sky-300/15 backdrop-blur-[1px] glass-shard-1 rotate-12 opacity-30"></div>
        <div className="absolute top-72 right-8 w-16 h-24 bg-cyan-400/5 border border-cyan-300/15 backdrop-blur-[1px] glass-shard-2 -rotate-25 opacity-25"></div>
        <div className="absolute bottom-28 left-1/4 w-12 h-16 bg-blue-400/5 border border-blue-300/15 backdrop-blur-[1px] glass-shard-1 rotate-45 opacity-20"></div>
      </div>

      {/* Full-Screen Laptop Drop Zone Overlay */}
      {isDraggingOverWindow && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none animate-fade-in border-4 border-dashed border-cyan-400/90 m-4 rounded-3xl shadow-2xl">
          <div className="p-8 rounded-3xl bg-sky-950/90 border border-cyan-400 shadow-2xl flex flex-col items-center max-w-md text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-blue-700 flex items-center justify-center text-white mb-4 shadow-xl shadow-cyan-500/30 animate-bounce p-3">
              <CupboardIcon className="w-full h-full text-white" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              Drop Note to Add to Shelf
            </h2>
            <p className="text-xs text-sky-200/80 max-w-xs">
              Release anywhere to instantly auto-detect the subject and file your note into the cupboard!
            </p>
          </div>
        </div>
      )}

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
            onOpenUpload={handleOpenUploadForSubject}
            onOpenBot={handleOpenBot}
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
            preselectedSubjectId={uploadPreselectedSubjectId}
            onUploadComplete={handleUploadComplete}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onAddSubject={handleAddSubject}
          />
        )}
      </main>

      {/* MOVE ON Bot Slide-out Drawer */}
      <MoveOnChat
        isOpen={isBotOpen}
        onClose={() => setIsBotOpen(false)}
        selectedNote={botSelectedNote}
        selectedSubject={subjects.find(s => s.id === botSelectedNote?.subject_id) || null}
      />

      {/* Clean Settings Modal (Live Credit Meter, Sign Out, Admin Reload) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
export default App;
