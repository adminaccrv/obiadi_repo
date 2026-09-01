import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Loader2, Mail } from 'lucide-react';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({ user: null, loading: true });

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0c0e14] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto mb-4" />
          <p className="text-accent font-mono text-[10px] uppercase tracking-[0.3em]">Nexus_Initializing...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#0c0e14] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass max-w-sm w-full p-10 bg-white/5 relative z-10 text-center border-white/10"
        >
          <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-accent/20">
            <Mail className="w-10 h-10 text-accent" />
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">PulseMail Nexus</h1>
          <p className="text-white/40 text-[10px] mb-10 font-mono uppercase tracking-widest italic">Global Transmission Control</p>
          
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-accent text-slate-950 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-lg shadow-accent/20"
          >
            <LogIn className="w-5 h-5" />
            Authenticate_Node
          </button>
          
          <p className="mt-8 text-[10px] text-white/20 uppercase tracking-[0.2em] leading-relaxed">
            Protocol: Google Auth v3.2<br/>
            Secured via Enterprise Firestore
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={{ user, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
};
