/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff,
  Languages, 
  History, 
  Bookmark, 
  Settings, 
  ChevronDown, 
  ArrowLeftRight, 
  CheckCircle2, 
  Plus, 
  Search,
  Grid,
  ArrowLeft,
  Trash2,
  Clock,
  MoreVertical,
  Plane,
  Briefcase,
  Utensils,
  PlusSquare,
  MessageSquare,
  ShoppingBag,
  Cpu,
  Bus,
  ChevronRight,
  LayoutGrid,
  User,
  Bell,
  Shield,
  Volume2,
  Moon,
  Sun,
  LogOut,
  ChevronRight as ChevronRightIcon,
  Download,
  Database,
  Cloud,
  Loader2
} from 'lucide-react';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from './firebase';
import { translateText } from './services/geminiService';
import { TranslationNote, SUPPORTED_LANGUAGES, CATEGORY_COLORS, Category, DEFAULT_CATEGORIES } from './types';
import { useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { Tag, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const HeartbeatVisualizer = ({ isListening, isDarkMode }: { isListening: boolean; isDarkMode: boolean }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
      <svg
        viewBox="0 0 800 200"
        className={`w-full h-full transition-opacity duration-700 ${isListening ? 'opacity-100' : 'opacity-10'}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Single thin glowing red line */}
        <motion.path
          d="M 0 100 L 50 100 L 60 80 L 70 120 L 80 100 L 150 100 L 165 30 L 185 170 L 205 100 L 280 100 L 295 85 L 310 115 L 325 100 L 400 100 L 450 100 L 460 70 L 470 130 L 480 100 L 550 100 L 565 20 L 585 180 L 605 100 L 680 100 L 695 80 L 710 120 L 725 100 L 800 100"
          fill="transparent"
          stroke="#ff1a1a"
          strokeWidth="1"
          filter="url(#glow)"
          initial={{ x: 0 }}
          animate={{
            x: isListening ? [-400, 0] : 0,
            scaleY: isListening ? [1, 1.5, 0.5, 1.3, 1] : 1,
            opacity: isListening ? [0.6, 1, 0.6] : 0.2
          }}
          transition={{
            x: { duration: 5, repeat: Infinity, ease: "linear" },
            scaleY: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
        />
      </svg>
    </div>
  );
};

export default function App() {
  const { user, loading, logout, refreshUser } = useAuth();
  const [view, setView] = useState<'translate' | 'notes' | 'categories' | 'settings'>('translate');
  const [isListening, setIsListening] = useState(false);
  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('English');
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [detectedCategory, setDetectedCategory] = useState<Category>('General');
  const [notes, setNotes] = useState<TranslationNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [selectingLangType, setSelectingLangType] = useState<'source' | 'target'>('source');
  const [recentLangs, setRecentLangs] = useState<string[]>(['English', 'Spanish', 'French']);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  // Theme Effect
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [customCategories, setCustomCategories] = useState<{id: string, name: string}[]>([]);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const speak = (text: string, langName: string) => {
    if (!isVoiceEnabled) return;
    const langCode = SUPPORTED_LANGUAGES.find(l => l.name === langName)?.code || 'en';
    const fullLangCode = langCode === 'ur' ? 'ur-PK' : langCode === 'it' ? 'it-IT' : langCode === 'ps' ? 'ps-AF' : 'en-US';
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = fullLangCode;
    window.speechSynthesis.speak(utterance);
  };

  // Sync notes with Firestore
  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'notes'), where('userId', '==', user.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notesData = snapshot.docs.map(doc => doc.data() as TranslationNote);
        setNotes(notesData.sort((a, b) => b.timestamp - a.timestamp));
      }, (error) => {
        console.error('Firestore Error:', error);
      });
      return () => unsubscribe();
    } else {
      setNotes([]);
    }
  }, [user]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        refreshUser();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refreshUser]);

  const handleProfileClick = () => {
    handleViewChange('settings');
  };

  const handleLogout = async () => {
    await logout();
    setView('translate');
  };

  const handleViewChange = (newView: 'translate' | 'notes' | 'categories' | 'settings') => {
    if (view === 'translate' && translation && newView !== 'translate') {
      setShowSavePrompt(true);
      // We don't block the view change, but we keep the prompt visible or handle it
      // Actually, let's just save it automatically if they navigate away
      saveNote();
    }
    setView(newView);
  };

  const handleSwapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  const openLangModal = (type: 'source' | 'target') => {
    setSelectingLangType(type);
    setIsLangModalOpen(true);
  };

  const selectLanguage = (langName: string) => {
    if (selectingLangType === 'source') {
      setSourceLang(langName);
    } else {
      setTargetLang(langName);
    }
    
    // Update recent languages
    setRecentLangs(prev => {
      const filtered = prev.filter(l => l !== langName);
      return [langName, ...filtered].slice(0, 4);
    });
    
    setIsLangModalOpen(false);
  };

  // Real speech recognition logic
  const handleMicClick = async () => {
    // Check and request microphone permission on Android
    if (Capacitor.isNativePlatform()) {
      try {
        const { recordAudio } = await (window as any).Capacitor.Plugins.Permissions.checkPermissions({ permissions: ['recordAudio'] });
        if (recordAudio !== 'granted') {
          const { recordAudio: newStatus } = await (window as any).Capacitor.Plugins.Permissions.requestPermissions({ permissions: ['recordAudio'] });
          if (newStatus !== 'granted') {
            alert('Microphone permission is required for voice recording.');
            return;
          }
        }
      } catch (e) {
        console.warn('Capacitor Permissions API not found, falling back to browser behavior', e);
      }
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      
      if (transcript) {
        try {
          const result = await translateText(
            transcript, 
            targetLang, 
            sourceLang, 
            customCategories.map(c => c.name)
          );
          setTranslation(result.translatedText);
          setDetectedCategory(result.category);
          setSourceLang(result.detectedSourceLang);
          
          if (isVoiceEnabled) {
            speak(result.translatedText, targetLang);
          }
        } catch (error) {
          console.error("Translation failed", error);
        }
      }
    } else {
      if (!recognitionRef.current) {
        alert('Speech recognition is not supported in this browser. Please try Chrome.');
        return;
      }

      setTranscript('');
      setTranslation('');
      
      const langCode = SUPPORTED_LANGUAGES.find(l => l.name === sourceLang)?.code || 'en';
      const fullLangCode = langCode === 'ur' ? 'ur-PK' : langCode === 'it' ? 'it-IT' : langCode === 'ps' ? 'ps-AF' : 'en-US';
      
      recognitionRef.current.lang = fullLangCode;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  };

  const saveNote = async () => {
    if (!transcript || !translation || !user) return;
    
    const noteId = Math.random().toString(36).substr(2, 9);
    const newNote: TranslationNote = {
      id: noteId,
      userId: user.id,
      originalText: transcript,
      translatedText: translation,
      sourceLang,
      targetLang,
      category: detectedCategory,
      timestamp: Date.now(),
    };
    
    try {
      await setDoc(doc(db, 'notes', noteId), newNote);
      setTranscript('');
      setTranslation('');
      setDetectedCategory('General');
      setShowSavePrompt(false);
    } catch (err) {
      console.error('Failed to save note to Firestore:', err);
    }
  };

  const deleteNote = async (id: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'notes', id));
      } catch (err) {
        console.error('Failed to delete note from Firestore:', err);
      }
    }
  };

  const handleBackupToDrive = async () => {
    alert('Google Drive backup is currently being migrated to Firebase. This feature will be available again soon!');
  };

  const clearAllData = () => {
    setNotes([]);
    setRecentLangs(['English', 'Urdu', 'Italian', 'Pashto']);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(notes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'omnivice-notes.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const id = newCategoryName.trim();
    if (!customCategories.find(c => c.id === id) && !DEFAULT_CATEGORIES.find(c => c.id === id)) {
      setCustomCategories([...customCategories, { id, name: newCategoryName.trim() }]);
    }
    setNewCategoryName('');
    setIsCreateCategoryModalOpen(false);
  };

  const filteredNotes = notes.filter(note => 
    (note?.originalText?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (note?.translatedText?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (note?.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const categoryCounts = notes.reduce((acc, note) => {
    if (note?.category) {
      acc[note.category] = (acc[note.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const activeCategoriesCount = Object.keys(categoryCounts).length;

  const handleCategoryClick = (category: string) => {
    setSearchQuery(category);
    setView('notes');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className={`h-screen flex flex-col max-w-md mx-auto relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-background-dark text-white' : 'bg-background-light text-slate-900'}`}>
      {/* Background Decoration */}
      <div className={`fixed top-[-10%] left-[-10%] size-[400px] rounded-full blur-[120px] pointer-events-none -z-10 transition-opacity duration-500 ${isDarkMode ? 'bg-primary/10 opacity-100' : 'bg-primary/5 opacity-50'}`} />
      <div className={`fixed bottom-[-10%] right-[-10%] size-[400px] rounded-full blur-[120px] pointer-events-none -z-10 transition-opacity duration-500 ${isDarkMode ? 'bg-slate-900/10 opacity-100' : 'bg-slate-900/5 opacity-50'}`} />

      {/* Header */}
      <header className={`px-4 py-2 flex items-center justify-between z-50 backdrop-blur-md border-b shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-background-dark/80 border-white/5' : 'bg-background-light/80 border-black/5'}`}>
        <div className="flex items-center gap-3">
          <div className={`size-8 rounded-full border-2 overflow-hidden flex items-center justify-center cursor-pointer transition-colors ${isDarkMode ? 'border-primary/30 bg-slate-800 hover:border-primary' : 'border-primary/20 bg-slate-200 hover:border-primary'}`} onClick={() => handleViewChange('settings')}>
            {user ? (
              <img 
                src={`https://picsum.photos/seed/${user.id}/100/100`} 
                alt="User" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className={`size-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center">
          <div className="h-1 w-8 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 rounded-full mb-1 shadow-[0_0_10px_rgba(37,106,244,0.3)]" />
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold tracking-[0.2em] uppercase opacity-90 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {view === 'translate' ? 'Neural Voice' : view === 'notes' ? 'History' : view === 'categories' ? 'Categories' : 'Settings'}
            </span>
            {view === 'translate' && (
              <div className="flex items-center gap-1">
                <div className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[7px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
              </div>
            )}
          </div>
        </div>

        <div className="w-8 flex justify-end">
          {view !== 'translate' && (
            <button onClick={() => handleViewChange('translate')} className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/5 text-slate-500'}`}>
              <X className="size-4" />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'translate' ? (
            <motion.div 
              key="translate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col gap-4"
            >
              {/* Language Selector */}
              <div className="glass p-4 rounded-2xl flex items-center justify-between shadow-2xl relative overflow-hidden border border-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <button 
                  onClick={() => openLangModal('source')}
                  className="flex flex-col gap-1 relative z-10 text-left active:opacity-70 transition-opacity"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">From</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{sourceLang}</span>
                    <CheckCircle2 className="size-4 text-primary" />
                  </div>
                </button>
                
                <button 
                  onClick={handleSwapLanguages}
                  className={`relative z-10 flex items-center justify-center size-12 rounded-full border active:scale-90 transition-all shadow-lg ${
                    isDarkMode 
                      ? 'bg-slate-800/50 border-white/10 hover:bg-slate-800 hover:border-primary/30' 
                      : 'bg-white/80 border-black/5 hover:bg-white hover:border-primary/30'
                  }`}
                >
                  <ArrowLeftRight className="size-5 text-primary" />
                </button>

                <button 
                  onClick={() => openLangModal('target')}
                  className="flex flex-col items-end gap-1 relative z-10 text-right active:opacity-70 transition-opacity"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">To</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{targetLang}</span>
                    <ChevronDown className={`size-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  </div>
                </button>
              </div>

              {/* Translation Area */}
              <div className="flex-1 flex flex-col gap-4 relative min-h-[250px]">
                <HeartbeatVisualizer isListening={isListening} isDarkMode={isDarkMode} />
                
                {transcript && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass p-4 rounded-2xl rounded-tl-none border-l-2 border-l-primary/50 max-w-[90%]"
                  >
                    <p className="text-xs text-slate-400 mb-1">{sourceLang}</p>
                    <p className="text-lg leading-relaxed font-light">{transcript}</p>
                  </motion.div>
                )}

                {translation && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-primary p-4 rounded-2xl rounded-tr-none ml-auto max-w-[90%] relative group"
                  >
                    <p className="text-xs text-primary/80 mb-1 font-medium">{targetLang}</p>
                    <p className="text-lg leading-relaxed font-medium">{translation}</p>
                    <button 
                      onClick={saveNote}
                      className="absolute -bottom-2 -left-2 size-8 bg-primary rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Bookmark className="size-4 text-white" />
                    </button>
                  </motion.div>
                )}

                {isListening && !transcript && !translation && (
                  <div className="flex-1 flex items-center justify-center">
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      className="text-primary font-mono text-[10px] tracking-widest uppercase"
                    >
                      Analyzing Audio Stream...
                    </motion.p>
                  </div>
                )}
              </div>

              {/* Mic Section */}
              <div className="mt-auto py-4 flex flex-col items-center relative">
                <AnimatePresence>
                  {showSavePrompt && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute -top-12 glass-primary px-3 py-1.5 rounded-full flex items-center gap-3 shadow-xl border-primary/30 z-30"
                    >
                      <span className="text-[10px] font-medium text-primary">Save this translation?</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={saveNote}
                          className="text-[9px] font-bold uppercase bg-primary text-white px-2 py-0.5 rounded-full"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => {
                            setTranslation('');
                            setTranscript('');
                            setShowSavePrompt(false);
                          }}
                          className="text-[9px] font-bold uppercase bg-white/10 text-slate-400 px-2 py-0.5 rounded-full"
                        >
                          Discard
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="text-center mb-6">
                  <p className="text-primary font-bold tracking-[0.3em] uppercase text-[9px] mb-1 opacity-80">AI Neural Processing</p>
                  <h2 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {isListening ? 'Listening...' : 'Start Conversation'}
                  </h2>
                </div>
                
                <div className="relative flex items-center justify-center">
                  {isListening && (
                    <>
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 0.2 }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute size-24 bg-primary rounded-full blur-xl"
                      />
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 2, opacity: 0.1 }}
                        transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                        className="absolute size-24 bg-primary rounded-full blur-2xl"
                      />
                    </>
                  )}
                  <button 
                    onClick={handleMicClick}
                    className={`relative z-20 size-20 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xl ${
                      isListening 
                        ? 'bg-gradient-to-br from-primary to-blue-700 shadow-primary/40' 
                        : isDarkMode 
                          ? 'bg-slate-900/40 backdrop-blur-xl border border-white/10 hover:bg-white/10'
                          : 'bg-white/60 backdrop-blur-xl border border-black/5 hover:bg-black/5'
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="size-8 text-white" />
                    ) : (
                      <Mic className="size-8 text-primary" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : view === 'notes' ? (
            <motion.div 
              key="notes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col gap-4"
            >
              <div className="flex items-center justify-end">
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">
                  {notes.length} Records
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search notes or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full glass pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredNotes.length > 0 ? (
                  filteredNotes.map((note) => (
                    <motion.div 
                      layout
                      key={note.id}
                      className={`glass p-3 rounded-2xl border-l-4 relative group ${CATEGORY_COLORS[note.category].split(' ')[2]}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CATEGORY_COLORS[note.category].split(' ').slice(0, 2).join(' ')}`}>
                          {note.category}
                        </span>
                        <button 
                          onClick={() => deleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-rose-400"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 mb-1 font-light italic">"{note.originalText}"</p>
                      <p className="text-sm font-medium text-white">{note.translatedText}</p>
                      <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                        <span>{note.sourceLang} → {note.targetLang}</span>
                        <span>{new Date(note.timestamp).toLocaleDateString()}</span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-30">
                    <Bookmark className="size-10 mb-3" />
                    <p className="text-sm">No notes found</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : view === 'categories' ? (
            <motion.div 
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col gap-4"
            >
              {/* Search Categories */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search categories..."
                  className="w-full glass pl-12 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              {/* Stats Header */}
              <div className="flex items-end justify-end">
                <div className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                  {activeCategoriesCount} Active
                </div>
              </div>

              {/* Masonry Grid */}
              <div className="masonry-grid pb-10">
                {DEFAULT_CATEGORIES.map((cat) => {
                  const Icon = {
                    Plane,
                    Briefcase,
                    Utensils,
                    PlusSquare,
                    MessageSquare,
                    Cpu,
                    ShoppingBag,
                    Grid
                  }[cat.icon] || Grid;

                  const isLarge = cat.id === 'Travel' || cat.id === 'Business' || cat.id === 'Greetings' || cat.id === 'General';
                  
                  return (
                    <div 
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`${isLarge ? 'tile-2x1' : 'tile-1x1'} glass p-3 flex ${isLarge ? 'items-center gap-3' : 'flex-col justify-between'} glow-${cat.color} group cursor-pointer rounded-2xl`}
                    >
                      {isLarge ? (
                        <>
                          <div className={`size-10 rounded-lg bg-${cat.color}-500/20 text-${cat.color}-400 flex items-center justify-center shrink-0`}>
                            <Icon className="size-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-bold tracking-tight">{cat.name}</h3>
                            <p className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">{categoryCounts[cat.id] || 0} Records</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={`size-8 rounded-lg bg-${cat.color}-500/20 text-${cat.color}-400 flex items-center justify-center`}>
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold tracking-tight">{cat.name}</h3>
                            <p className="text-[8px] text-slate-500 font-medium uppercase tracking-widest">{categoryCounts[cat.id] || 0} Records</p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {customCategories.map((cat) => (
                  <div 
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className="tile-1x1 glass p-3 flex flex-col justify-between glow-slate group cursor-pointer rounded-2xl"
                  >
                    <Tag className="size-5 text-slate-400" />
                    <div>
                      <h3 className="text-xs font-bold tracking-tight">{cat.name}</h3>
                      <p className="text-[8px] text-slate-500 font-medium uppercase tracking-widest">{categoryCounts[cat.id] || 0} Records</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Create Category Modal */}
              <AnimatePresence>
                {isCreateCategoryModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsCreateCategoryModalOpen(false)}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="relative w-full max-w-sm glass p-8 rounded-[40px] shadow-2xl"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">New Category</h3>
                        <button onClick={() => setIsCreateCategoryModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                          <X className="size-5" />
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Category Name</label>
                          <input 
                            type="text" 
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g. Work, Family, Hobbies"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                            autoFocus
                          />
                        </div>
                        
                        <button 
                          onClick={handleAddCategory}
                          disabled={!newCategoryName.trim()}
                          className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                        >
                          Create Category
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-8"
            >
              {/* Profile Section */}
              <div 
                onClick={handleProfileClick}
                className={`glass p-6 rounded-[32px] flex items-center gap-4 cursor-pointer transition-all active:scale-[0.98] ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <div className={`size-16 rounded-full border-4 overflow-hidden flex items-center justify-center shrink-0 ${isDarkMode ? 'border-primary/30 bg-slate-800' : 'border-primary/20 bg-slate-200'}`}>
                  {user ? (
                    <img 
                      src={`https://picsum.photos/seed/${user.id}/200/200`} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className={`size-8 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-xl font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user?.name || 'Guest User'}</h3>
                  <p className={`text-sm truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{user?.email || 'guest@example.com'}</p>
                </div>
                <div className={`size-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isDarkMode ? 'bg-white/5 text-primary' : 'bg-black/5 text-primary'}`}>
                  <ChevronRightIcon className="size-5" />
                </div>
              </div>

              {/* Settings Groups */}
              <div className="flex flex-col gap-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2">Preferences</h4>
                
                <div className="glass rounded-[32px] overflow-hidden">
                  <div className="p-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Moon className="size-5" />
                      </div>
                      <span className="font-medium">Dark Mode</span>
                    </div>
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-primary' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 size-4 rounded-full bg-white transition-all ${isDarkMode ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="p-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Volume2 className="size-5" />
                      </div>
                      <span className="font-medium">Voice Output</span>
                    </div>
                    <button 
                      onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${isVoiceEnabled ? 'bg-primary' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 size-4 rounded-full bg-white transition-all ${isVoiceEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Bell className="size-5" />
                      </div>
                      <span className="font-medium">Notifications</span>
                    </div>
                    <button 
                      onClick={() => setIsNotificationsEnabled(!isNotificationsEnabled)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${isNotificationsEnabled ? 'bg-primary' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 size-4 rounded-full bg-white transition-all ${isNotificationsEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2">Data & Privacy</h4>
                
                <div className="glass rounded-[32px] overflow-hidden">
                  <button 
                    onClick={handleBackupToDrive}
                    disabled={isBackingUp}
                    className="w-full p-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                        {isBackingUp ? <Loader2 className="size-5 animate-spin" /> : <Cloud className="size-5" />}
                      </div>
                      <span className="font-medium">Backup to Google Drive</span>
                    </div>
                    <ChevronRightIcon className="size-5 text-slate-600" />
                  </button>

                  <button 
                    onClick={exportData}
                    className="w-full p-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Download className="size-5" />
                      </div>
                      <span className="font-medium">Export History</span>
                    </div>
                    <ChevronRightIcon className="size-5 text-slate-600" />
                  </button>

                  <button 
                    onClick={clearAllData}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                        <Database className="size-5" />
                      </div>
                      <span className="font-medium">Clear All Data</span>
                    </div>
                    <ChevronRightIcon className="size-5 text-slate-600" />
                  </button>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className={`w-full glass p-4 rounded-2xl flex items-center justify-center gap-3 font-bold mt-4 transition-all active:scale-[0.98] text-rose-400`}
              >
                <LogOut className="size-5" />
                Sign Out
              </button>

              <div className="text-center pb-20">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Voice to Notes v2.4.0</p>
                <p className="text-[10px] text-slate-700 mt-1">Neural Engine: Gemini 3 Flash</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Language Selection Modal */}
      <AnimatePresence>
        {isLangModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLangModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass rounded-t-[32px] z-[101] p-6 pb-12 border-t border-white/10"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Select {selectingLangType === 'source' ? 'Source' : 'Target'} Language</h3>
                <button 
                  onClick={() => setIsLangModalOpen(false)}
                  className="p-2 glass rounded-full"
                >
                  <ArrowLeft className="size-5" />
                </button>
              </div>

              {/* Recent Languages */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 text-slate-500">
                  <Clock className="size-3" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Recent</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentLangs.map((lang) => (
                    <button
                      key={`recent-${lang}`}
                      onClick={() => selectLanguage(lang)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border ${
                        (selectingLangType === 'source' ? sourceLang : targetLang) === lang
                          ? 'bg-primary border-primary text-white'
                          : 'glass border-white/5 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-4 text-slate-500">
                <Languages className="size-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest">All Languages</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => selectLanguage(lang.name)}
                    className={`p-4 rounded-2xl text-left transition-all border ${
                      (selectingLangType === 'source' ? sourceLang : targetLang) === lang.name
                        ? 'bg-primary/20 border-primary text-white'
                        : 'glass border-white/5 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-sm font-semibold">{lang.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FAB for Categories */}
      {view === 'categories' && (
        <button 
          onClick={() => setIsCreateCategoryModalOpen(true)}
          className="absolute bottom-24 right-6 size-14 bg-primary text-white rounded-full shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
        >
          <Plus className="size-8" />
        </button>
      )}

      {/* Auth Modal */}
      {/* Bottom Navigation */}
      <nav className={`border-t px-4 py-2 flex items-center justify-between z-50 shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-background-dark/95 backdrop-blur-xl border-white/5' : 'bg-background-light/95 backdrop-blur-xl border-black/5'}`}>
        <button 
          onClick={() => handleViewChange('translate')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${view === 'translate' ? 'text-primary scale-110' : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${view === 'translate' ? 'bg-primary/10' : 'bg-transparent'}`}>
            <Languages className="size-5" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Translate</span>
        </button>
        
        <button 
          onClick={() => handleViewChange('notes')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${view === 'notes' ? 'text-primary scale-110' : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${view === 'notes' ? 'bg-primary/10' : 'bg-transparent'}`}>
            <History className="size-5" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">History</span>
        </button>
        
        <button 
          onClick={() => handleViewChange('categories')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${view === 'categories' ? 'text-primary scale-110' : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${view === 'categories' ? 'bg-primary/10' : 'bg-transparent'}`}>
            <LayoutGrid className="size-5" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Categories</span>
        </button>
        
        <button 
          onClick={() => handleViewChange('settings')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${view === 'settings' ? 'text-primary scale-110' : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${view === 'settings' ? 'bg-primary/10' : 'bg-transparent'}`}>
            <Settings className="size-5" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Settings</span>
        </button>
      </nav>
    </div>
  );
}
