export type Category = string;

export interface TranslationNote {
  id: string;
  userId: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  category: Category;
  timestamp: number;
}

export interface Language {
  code: string;
  name: string;
  flag?: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'ur', name: 'Urdu' },
  { code: 'it', name: 'Italian' },
  { code: 'ps', name: 'Pashto' },
];

export const DEFAULT_CATEGORIES = [
  { id: 'Travel', name: 'Travel Essentials', icon: 'Plane', color: 'blue' },
  { id: 'Business', name: 'Business', icon: 'Briefcase', color: 'purple' },
  { id: 'Dining', name: 'Dining', icon: 'Utensils', color: 'amber' },
  { id: 'Emergency', name: 'Emergency', icon: 'PlusSquare', color: 'rose' },
  { id: 'Greetings', name: 'Greetings', icon: 'MessageSquare', color: 'emerald' },
  { id: 'Shopping', name: 'Shopping', icon: 'ShoppingBag', color: 'pink' },
  { id: 'Technical', name: 'Technical', icon: 'Cpu', color: 'blue' },
  { id: 'General', name: 'General', icon: 'Grid', color: 'slate' },
];

export const CATEGORY_COLORS: Record<string, string> = {
  Travel: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Business: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Dining: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Emergency: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  Greetings: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Technical: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  General: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  Shopping: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};
