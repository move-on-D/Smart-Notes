import React, { useState } from 'react';
import { X, Send, Bot, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { askMoveOnBot } from '../lib/ai';
import { Note, Subject } from '../types';

interface MoveOnChatProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNote: Note | null;
  selectedSubject: Subject | null;
}

interface Message {
  role: 'bot' | 'user';
  text: string;
  timestamp: string;
}

export const MoveOnChat: React.FC<MoveOnChatProps> = ({
  isOpen,
  onClose,
  selectedNote,
  selectedSubject,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: selectedNote 
        ? `Hey! I'm MOVE ON. I'm strictly reading from "${selectedNote.clean_title}". Ask me to explain any topic from this chapter!`
        : `Hey! I'm MOVE ON. Select any note or chapter from your shelf, and ask me to explain any topic strictly from your notes.`,
      timestamp: 'Just now'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || loading) return;

    const userQ = inputQuery.trim();
    setInputQuery('');

    const newMsgs: Message[] = [
      ...messages,
      { role: 'user', text: userQ, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const notesContext = selectedNote?.summary || selectedNote?.clean_title || '';
      const reply = await askMoveOnBot(
        userQ,
        selectedNote?.clean_title || 'General Notes',
        selectedSubject?.name || 'College Syllabus',
        notesContext
      );

      setMessages([
        ...newMsgs,
        { role: 'bot', text: reply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } catch (err: any) {
      setMessages([
        ...newMsgs,
        { role: 'bot', text: "Could not retrieve answer. Please make sure credits are available or notify your admin.", timestamp: 'Just now' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900/95 backdrop-blur-2xl border-l border-sky-400/30 shadow-2xl flex flex-col text-slate-100 animate-slide-left font-sans">
      {/* Bot Top Header */}
      <div className="p-4 border-b border-sky-400/20 bg-sky-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-500/30 border border-cyan-300/40 glass-shard-1">
            <Bot className="w-5 h-5 text-cyan-100" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-white tracking-wide">MOVE ON</span>
              <span className="bg-cyan-500/20 text-cyan-300 text-[9px] px-1.5 py-0.2 rounded-full font-bold border border-cyan-400/30">
                NOTES BOT
              </span>
            </div>
            <p className="text-[10px] text-sky-200/60 truncate max-w-[200px]">
              {selectedNote ? selectedNote.clean_title : 'General Study Helper'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-sky-300/60 hover:text-white hover:bg-sky-900/40 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Note Banner */}
      {selectedNote && (
        <div className="p-3 bg-sky-950/40 border-b border-sky-400/15 flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-xs text-sky-200 font-semibold truncate">{selectedNote.clean_title}</span>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-tr-none shadow-md shadow-cyan-500/20'
                  : 'bg-sky-950/80 border border-sky-400/25 text-slate-100 rounded-tl-none shadow-sm'
              }`}
            >
              <p className="whitespace-pre-line">{m.text}</p>
            </div>
            <span className="text-[9px] text-sky-300/40 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}
        {loading && (
          <div className="flex items-center space-x-2 text-xs text-cyan-300 bg-sky-950/60 p-2.5 rounded-xl border border-sky-400/20 w-fit">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>MOVE ON is consulting your notes...</span>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-sky-400/20 bg-sky-950/80">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder={selectedNote ? "Ask MOVE ON to explain a topic from this note..." : "Ask a topic from your syllabus..."}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={loading}
            className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-900 border border-sky-400/30 rounded-xl text-white placeholder-sky-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-medium"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="absolute right-1.5 p-1.5 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-40 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-sky-300/40 mt-1.5 text-center">
          Strictly answers only from your uploaded notes. No outside assumptions.
        </p>
      </form>
    </div>
  );
};
