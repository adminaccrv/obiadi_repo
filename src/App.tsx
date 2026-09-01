import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CampaignCreator } from './components/CampaignCreator';
import { RecipientManager } from './components/RecipientManager';
import { Analytics } from './components/Analytics';
import { TemplateManager } from './components/TemplateManager';
import { GoogleDriveWorkspace } from './components/GoogleDriveWorkspace';
import { LicensingManager } from './components/LicensingManager';
import { SmtpConfigManager } from './components/SmtpConfigManager';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Lock, Key, AlertTriangle, Play, HelpCircle, Mail, Clock, Send, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from './lib/utils';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreator, setShowCreator] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Real Firestore Campaigns data
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  // Sovereign Expiration and Time-Lock verification engine
  const checkTimeLockout = () => {
    const isManualLock = localStorage.getItem('NEXUS_LOCKOUT') === 'true';
    if (isManualLock) {
      return { isLocked: true, type: 'MANUAL', reason: 'MANUAL LOCKOUT COMMANDED BY OPERATOR' };
    }

    const timeLockEnabled = localStorage.getItem('NEXUS_TIMELOCK_ENABLED') === 'true';
    if (!timeLockEnabled) {
      return { isLocked: false, type: 'NONE', reason: '' };
    }

    const offset = Number(localStorage.getItem('NEXUS_TIME_WARP_OFFSET') || '0');
    const simulatedNow = Date.now() + offset;

    // 1. Global Operating Lifespan Date-window validation
    const startStr = localStorage.getItem('NEXUS_GLOBAL_START');
    const endStr = localStorage.getItem('NEXUS_GLOBAL_END');
    if (startStr && endStr) {
      const start = new Date(startStr).getTime();
      const end = new Date(endStr).getTime();
      if (simulatedNow < start || simulatedNow > end) {
        return { 
          isLocked: true, 
          type: 'GLOBAL_TIMEFRAME_VIOLATION', 
          reason: `GLOBAL LIFESPAN EXPIRED: Software is only licensed to execute between ${new Date(start).toLocaleString()} and ${new Date(end).toLocaleString()}` 
        };
      }
    }

    // 2. Authorized Session Duration Limit validation
    const activatedStr = localStorage.getItem('NEXUS_USER_ACTIVATED_AT');
    const limitHours = Number(localStorage.getItem('NEXUS_SESSION_LIMIT_HOURS') || '24');
    if (activatedStr) {
      const activatedAt = new Date(activatedStr).getTime();
      const expiry = activatedAt + limitHours * 3600 * 1000;
      if (simulatedNow > expiry) {
        return { 
          isLocked: true, 
          type: 'SESSION_EXPIRED', 
          reason: `AUTHORIZED SESSION EXPIRED: Profile usage has exceeded the permitted functional duration limit of ${limitHours} Hour(s)` 
        };
      }
    }

    return { isLocked: false, type: 'NONE', reason: '' };
  };

  const [lockDetails, setLockDetails] = useState(() => checkTimeLockout());
  const [isLockedOut, setIsLockedOut] = useState(() => lockDetails.isLocked);
  const [unlockKey, setUnlockKey] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Lock status background validator
  useEffect(() => {
    const handleLockCheck = () => {
      const details = checkTimeLockout();
      setLockDetails(details);
      setIsLockedOut(details.isLocked);
    };
    handleLockCheck();
    const timer = setInterval(handleLockCheck, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const key = unlockKey.trim().toUpperCase();
    const savedKeys = JSON.parse(localStorage.getItem('NEXUS_SAVED_KEYS_DB') || '[]');
    const isValidKey = key === 'NEXUS-PRO-999-ACTIVE' || savedKeys.some((s: string) => s.toUpperCase() === key);

    if (isValidKey) {
      localStorage.removeItem('NEXUS_LOCKOUT');
      localStorage.setItem('NEXUS_LICENSED', 'true');
      localStorage.setItem('NEXUS_LICENSE_KEY', key);
      
      // Bypass restrictions on successful key entry
      localStorage.setItem('NEXUS_TIMELOCK_ENABLED', 'false');
      localStorage.setItem('NEXUS_TIME_WARP_OFFSET', '0');
      localStorage.setItem('NEXUS_USER_ACTIVATED_AT', new Date().toISOString());
      
      setIsLockedOut(false);
      setLockDetails({ isLocked: false, type: 'NONE', reason: '' });
    } else {
      setUnlockError('DECRYPTION_SIGNATURE_VERIFICATION_FAILED');
    }
  };

  useEffect(() => {
    // Realtime Database Sync for campaigns
    const user = auth.currentUser;
    if (!user) return;

    const campaignsQuery = query(
      collection(db, 'campaigns'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(campaignsQuery, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loaded.push({
          id: doc.id,
          ...data,
          createdAtFormatted: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'
        });
      });
      setCampaigns(loaded);
      setCampaignsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'campaigns');
      setCampaignsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const defaultLogs = [
      '[SYSTEM] ASUS SA Technical Toolsuite initialized...',
      '[AUTH] Session verified for chinedu.okeke@outlook.com',
      '[NET] Google Gemini secure cloud channels active',
      '[VITE] A4 layout optimization hot-loaded',
      '[SYS] Ready for hardware diagnostics & profile rendering...'
    ];
    setLogs(defaultLogs);

    // Mock live logs
    const interval = setInterval(() => {
      const messages = [
        '[NET] Diagnostic ping from Johannesburg North node',
        '[SYS] PDF render optimization matrices initialized',
        '[SYS] Motherboards diagnostic schema index loaded',
        '[AUTH] Workspace token refreshed successfully',
        '[SYS] Perfect contrast check: A4 standard document margin OK'
      ];
      setLogs(prev => [...prev.slice(-14), messages[Math.floor(Math.random() * messages.length)]]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  if (isLockedOut) {
    const customWarning = localStorage.getItem('NEXUS_LOCKOUT_REASON') || 'System locked down due to license expiration. Contact Administrator for an extension.';
    const timeWarpOffset = Number(localStorage.getItem('NEXUS_TIME_WARP_OFFSET') || '0');
    const simulatedClock = Date.now() + timeWarpOffset;

    return (
      <div className="h-screen w-screen bg-[#07090e] flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans selection:bg-red-500 selection:text-black">
        {/* Dynamic Scanlines Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
        
        {/* Lockout Ambient Glowing Radials */}
        <div className="absolute top-0 left-0 w-full h-full opacity-35 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-600/5 rounded-full blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="glass max-w-xl w-full p-6 md:p-8 bg-black/75 border border-red-500/20 shadow-2xl shadow-red-950/20 relative z-10 space-y-5 rounded-2xl"
        >
          {/* Cybernetic Lockout Header Banner */}
          <div className="flex items-center justify-between border-b border-red-500/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[9px] font-mono text-red-500 uppercase tracking-widest font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                  NEXUS_SECURE_TIMELOCK_ENGAGED
                </span>
                <h1 className="text-lg font-bold tracking-tight text-white uppercase font-mono">SYSTEM BLOCKADE</h1>
              </div>
            </div>
            <div className="text-right font-mono text-[9px] text-white/30 hidden sm:block">
              <div>CLOCK_OFFSET // +{Math.round(timeWarpOffset / 1000)}s</div>
              <div>CODE // {lockDetails.type || 'TIME_EXPIRED'}</div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Expiration Details Alert Box */}
            <div className="p-3.5 bg-red-500/5 border border-red-500/15 rounded-xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-wider block">
                ⚠️ SECURE TIME-LOCK VIOLATION REPORT:
              </span>
              <p className="text-xs text-red-400 leading-relaxed font-sans font-medium">
                {lockDetails.reason || 'Sovereign time-constraints exceeded. The active timeframe allocated for this system deployment has completed.'}
              </p>
            </div>

            {/* Custom Notice Defined by Operator */}
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest block font-sans">
                Notice from System Administrator:
              </span>
              <p className="text-xs text-white/80 leading-relaxed font-sans italic">
                "{customWarning}"
              </p>
            </div>

            {/* Simulated Clock Diagnostics */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 space-y-2 font-mono text-[10px]">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">SIMULATED SYSTEM CLOCK:</span>
                <span className="text-accent font-bold">{new Date(simulatedClock).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[9px]">
                <div className="flex justify-between p-1.5 bg-white/[0.01] border border-white/5 rounded">
                  <span className="text-white/40">GLOBAL START:</span>
                  <span className="text-white">{localStorage.getItem('NEXUS_GLOBAL_START') ? new Date(localStorage.getItem('NEXUS_GLOBAL_START')!).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between p-1.5 bg-white/[0.01] border border-white/5 rounded">
                  <span className="text-white/40">GLOBAL SHUTDOWN:</span>
                  <span className="text-white">{localStorage.getItem('NEXUS_GLOBAL_END') ? new Date(localStorage.getItem('NEXUS_GLOBAL_END')!).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between p-1.5 bg-white/[0.01] border border-white/5 rounded">
                  <span className="text-white/40">SESSION INITIATED:</span>
                  <span className="text-white">{localStorage.getItem('NEXUS_USER_ACTIVATED_AT') ? new Date(localStorage.getItem('NEXUS_USER_ACTIVATED_AT')!).toLocaleTimeString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between p-1.5 bg-white/[0.01] border border-white/5 rounded">
                  <span className="text-white/40">MAX SESSION:</span>
                  <span className="text-white">{localStorage.getItem('NEXUS_SESSION_LIMIT_HOURS') || '24'} Hrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Bypass Key Form */}
          <form onSubmit={handleUnlock} className="space-y-3.5 text-left">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">
                  Sovereign Override Decryption Key
                </label>
                <span className="text-[8px] font-mono text-red-500/50 uppercase tracking-widest">
                  PORT_CRYPT // MULTI_LOCK
                </span>
              </div>
              <input 
                type="text"
                placeholder="NEXUS-PRO-XXXX-XXXX"
                value={unlockKey}
                onChange={e => {
                  setUnlockKey(e.target.value);
                  setUnlockError('');
                }}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs font-mono text-center text-white focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 outline-none uppercase tracking-widest transition-all"
                required
              />
            </div>

            {unlockError && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono rounded-lg text-center uppercase tracking-wider"
              >
                ⚠️ ERROR: {unlockError}
              </motion.div>
            )}

            <button 
              type="submit"
              className="w-full bg-red-500 hover:bg-red-400 text-slate-950 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-lg shadow-red-500/10 active:scale-95 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              Apply_Override_Handshake
            </button>
          </form>
          
          <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-2 text-[9px] font-mono text-white/30">
            <span>Bypass Evaluation Signature Code:</span>
            <span className="text-red-400 select-all font-bold px-1.5 py-0.5 bg-red-500/5 border border-red-500/10 rounded lowercase">NEXUS-PRO-999-ACTIVE</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mesh-bg flex h-screen w-screen overflow-hidden p-4 gap-4 selection:bg-accent selection:text-black">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <Dashboard setShowCreator={setShowCreator} />
            </motion.div>
          )}

          {activeTab === 'recipients' && (
            <motion.div 
              key="recipients"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-8 overflow-y-auto"
            >
              <RecipientManager />
            </motion.div>
          )}

          {activeTab === 'campaigns' && (
             <motion.div 
               key="campaigns"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               className="flex-1 p-8 overflow-y-auto"
             >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Active Campaigns</h2>
                    <p className="text-white/40 text-sm font-mono mt-1 uppercase tracking-widest italic">Database archives • Verified Cloud Blasts ({campaigns.length})</p>
                  </div>
                  <button 
                    onClick={() => setShowCreator(true)}
                    className="bg-accent text-slate-950 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-accent/20 cursor-pointer"
                  >
                    New Campaign
                  </button>
                </div>

                {campaignsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-accent animate-spin mb-2" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-white/40">Synchronizing campaigns...</span>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="text-white/20 text-center py-24 border border-dashed border-white/5 rounded-2xl bg-black/10">
                     <p className="font-mono text-xs uppercase tracking-widest">No detailed archives yet. Start a blast to see metrics.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {campaigns.map((camp, idx) => (
                      <motion.div 
                        key={camp.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="glass p-6 bg-white/2 group hover:border-accent/30 transition-all flex flex-col justify-between h-60"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest border",
                              camp.status === 'sending' ? "bg-accent/15 text-accent border-accent/20 animate-pulse" :
                              camp.status === 'scheduled' ? "bg-yellow-400/5 text-yellow-400 border-yellow-400/20" :
                              "bg-white/5 text-white/40 border-white/10"
                            )}>
                              {camp.status}
                            </span>
                            <span className="text-[10px] text-white/30 font-mono italic">{camp.createdAtFormatted}</span>
                          </div>
                          
                          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-accent transition-all truncate">{camp.name}</h3>
                          <p className="text-xs text-white/40 font-mono mb-4 truncate italic">Subject: {camp.subject || 'Empty Subject'}</p>
                          {camp.replyTo && (
                            <p className="text-[10px] text-white/30 truncate">Reply: {camp.replyTo}</p>
                          )}
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5 mt-auto">
                          <div className="flex justify-between text-[10px] font-mono text-white/30 uppercase tracking-wider">
                            <span>Target Uplinks</span>
                            <span>{(camp.totalCount || 0).toLocaleString()} / {(camp.totalCount || 0).toLocaleString()}</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-accent" style={{ width: '100%' }} />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
             </motion.div>
          )}

          {activeTab === 'terminal' && (
            <motion.div 
              key="terminal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 bg-black p-6 font-mono text-xs overflow-y-auto"
            >
              <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                <Terminal className="w-4 h-4 text-accent" />
                <span className="text-accent uppercase font-bold tracking-[0.2em]">System_Logs / Dev_Console</span>
              </div>
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-ink/20 w-16 text-right">00:{i+10}:42</span>
                    <span className={cn(
                      "transition-all duration-500",
                      log.includes('[SYSTEM]') ? "text-accent" : 
                      log.includes('[NET]') ? "text-blue-400" :
                      log.includes('[AUTH]') ? "text-purple-400" : "text-ink/60"
                    )}>
                      {log}
                    </span>
                  </div>
                ))}
                <div className="flex gap-4 mt-4">
                   <span className="text-accent">pulsemail:~$</span>
                   <span className="text-white inline-block animate-pulse w-2 h-4 bg-accent" />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-8 overflow-y-auto"
            >
              <Analytics />
            </motion.div>
          )}

          {activeTab === 'templates' && (
            <motion.div 
              key="templates"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-8 overflow-y-auto"
            >
              <TemplateManager />
            </motion.div>
          )}

          {activeTab === 'gdrive' && (
            <motion.div 
              key="gdrive"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-8 overflow-y-auto"
            >
              <GoogleDriveWorkspace />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-8 overflow-y-auto"
            >
              <SmtpConfigManager />
            </motion.div>
          )}

          {activeTab === 'licensing' && (
            <motion.div 
              key="licensing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-8 overflow-y-auto"
            >
              <LicensingManager />
            </motion.div>
          )}

          {activeTab === 'logs' && (
             <motion.div 
               key="placeholder"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="flex-1 flex items-center justify-center italic text-white/20"
             >
                {activeTab.toUpperCase()} MODULE_BUSY_OR_UNAVAILABLE
             </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showCreator && (
          <CampaignCreator 
            onClose={() => setShowCreator(false)} 
            onLaunch={(id) => {
              console.log('Launched', id);
              setShowCreator(false);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
