import React, { useState, useEffect } from 'react';
import { X, Volume2, Square, Play, Pause, FileText, Check } from 'lucide-react';
import { Note } from '../types';

interface VoiceReadModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
}

export const VoiceReadModal: React.FC<VoiceReadModalProps> = ({ isOpen, onClose, note }) => {
  const [selectedText, setSelectedText] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [rate, setRate] = useState<number>(1.0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Monitor text highlighted by user with mouse/touch
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()?.toString().trim();
      if (selection && selection.length > 3) {
        setSelectedText(selection);
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Reset speech when modal closes
  useEffect(() => {
    if (!isOpen && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isOpen]);

  if (!isOpen || !note) return null;

  const defaultTextToRead = selectedText || customInput || note.summary || note.clean_title;

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech reading is not supported on this browser.');
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(defaultTextToRead);
    utterance.rate = rate;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  };

  const handleStop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative text-slate-800">
        {/* Close Button */}
        <button
          onClick={() => {
            handleStop();
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div className="truncate pr-6">
            <h3 className="font-bold text-base text-slate-900 truncate">
              Selective Read Aloud
            </h3>
            <p className="text-xs text-slate-500 truncate">
              {note.clean_title}
            </p>
          </div>
        </div>

        {/* Selected Paragraph or Page Target */}
        <div className="space-y-3 mb-5">
          <label className="block text-xs font-bold text-slate-700">
            Selected Passage / Page Content to Read:
          </label>

          <textarea
            rows={4}
            value={customInput || selectedText || note.summary || ''}
            onChange={(e) => {
              setCustomInput(e.target.value);
              setSelectedText('');
            }}
            placeholder="Highlight any paragraph in your note or paste a page's text here to read aloud word-for-word..."
            className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans placeholder-slate-400"
          />

          <p className="text-[11px] text-slate-500 leading-tight">
            💡 <strong>Tip:</strong> Select/highlight any line or page text from your PDF or type it above. It will read <em>strictly that portion</em> without reading the entire document.
          </p>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80 mb-5 text-xs font-semibold">
          <span className="text-slate-600">Reading Speed:</span>
          <div className="flex space-x-1.5">
            {[0.8, 1.0, 1.25, 1.5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setRate(spd)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all border ${
                  rate === spd
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Playback Action Buttons */}
        <div className="flex items-center space-x-2">
          {!isSpeaking ? (
            <button
              onClick={handleSpeak}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isPaused ? 'Resume Reading' : 'Read Aloud'}</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <Pause className="w-4 h-4 fill-white" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={handleStop}
            disabled={!isSpeaking && !isPaused}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
            title="Stop Reading"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
