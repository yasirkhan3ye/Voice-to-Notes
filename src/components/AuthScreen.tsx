import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Chrome, ArrowRight, Sparkles, Languages, Phone, Hash, ShieldCheck } from 'lucide-react';
import { RecaptchaVerifier, auth } from '../firebase';

type AuthMethod = 'email' | 'phone';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, signup, loginWithGoogle, loginWithPhone } = useAuth();
  
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (authMethod === 'phone' && !recaptchaVerifier.current && recaptchaRef.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: 'invisible',
        callback: () => {
          console.log('Recaptcha resolved');
        }
      });
    }
  }, [authMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (authMethod === 'email') {
        if (isLogin) {
          await login(email, password);
        } else {
          await signup(email, password, name);
        }
      } else {
        if (!confirmationResult) {
          if (!recaptchaVerifier.current) {
            throw new Error('Recaptcha not initialized');
          }
          const result = await loginWithPhone(phoneNumber, recaptchaVerifier.current);
          setConfirmationResult(result);
        } else {
          await confirmationResult.confirm(verificationCode);
        }
      }
    } catch (err: any) {
      setError(err.message);
      if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number. Please use international format (e.g., +1234567890)');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPhoneAuth = () => {
    setConfirmationResult(null);
    setVerificationCode('');
    setError('');
  };

  return (
    <div className="h-full bg-[#050505] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Immersive Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] size-[600px] bg-primary/20 rounded-full blur-[120px] opacity-50 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] size-[600px] bg-slate-600/10 rounded-full blur-[120px] opacity-30" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-4">
          <motion.div className="inline-flex items-center justify-center size-12 rounded-[16px] bg-gradient-to-br from-primary/30 to-blue-600/10 border border-white/10 mb-3 shadow-2xl shadow-primary/20">
            <Languages className="size-6 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tighter mb-1 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            Voice to Notes
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-tight">
            Your AI-powered linguistic companion.
          </p>
        </div>

        <div className="glass p-5 rounded-[20px] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] backdrop-blur-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <div className="flex items-center justify-center gap-6 mb-5">
            <button 
              onClick={() => { setIsLogin(true); resetPhoneAuth(); }}
              className={`text-[11px] font-bold uppercase tracking-widest transition-all ${isLogin ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Sign In
              {isLogin && <motion.div layoutId="tab" className="h-0.5 bg-primary mt-1 rounded-full" />}
            </button>
            <button 
              onClick={() => { setIsLogin(false); resetPhoneAuth(); }}
              className={`text-[11px] font-bold uppercase tracking-widest transition-all ${!isLogin ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Join Us
              {!isLogin && <motion.div layoutId="tab" className="h-0.5 bg-primary mt-1 rounded-full" />}
            </button>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl mb-5">
            <button 
              onClick={() => { setAuthMethod('email'); resetPhoneAuth(); }}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${authMethod === 'email' ? 'bg-primary text-white' : 'text-slate-500'}`}
            >
              Email
            </button>
            <button 
              onClick={() => { setAuthMethod('phone'); resetPhoneAuth(); }}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${authMethod === 'phone' ? 'bg-primary text-white' : 'text-slate-500'}`}
            >
              Phone
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {authMethod === 'email' ? (
                <motion.div 
                  key="email-fields"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  {!isLogin && (
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all placeholder:text-slate-600"
                        required
                      />
                    </div>
                  )}
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                    <input 
                      type="email" 
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all placeholder:text-slate-600"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                    <input 
                      type="password" 
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all placeholder:text-slate-600"
                      required
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="phone-fields"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  {!confirmationResult ? (
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                      <input 
                        type="tel" 
                        placeholder="+1 234 567 890"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all placeholder:text-slate-600"
                        required
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Verification Code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all placeholder:text-slate-600"
                        required
                      />
                    </div>
                  )}
                  <div ref={recaptchaRef} />
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-rose-400 text-[10px] font-medium text-center"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {authMethod === 'phone' && !confirmationResult ? 'Send Code' : (isLogin ? 'Enter Workspace' : 'Create Account')}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
            
            {authMethod === 'phone' && confirmationResult && (
              <button 
                type="button"
                onClick={resetPhoneAuth}
                className="w-full text-slate-500 text-[10px] font-bold uppercase tracking-widest hover:text-slate-300 transition-colors"
              >
                Change Phone Number
              </button>
            )}
          </form>

          <div className="mt-5 flex items-center gap-4">
            <div className="h-px bg-white/5 flex-1" />
            <span className="text-[9px] uppercase font-bold text-slate-600 tracking-widest">Secure Access</span>
            <div className="h-px bg-white/5 flex-1" />
          </div>

          <button 
            onClick={loginWithGoogle}
            className="w-full mt-5 bg-white text-black py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-slate-100 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            <svg className="size-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-5 flex items-center justify-center gap-2 text-slate-500 text-[9px]"
        >
          <Sparkles className="size-3 text-primary" />
          <span>Powered by Gemini 3 Neural Engine</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
