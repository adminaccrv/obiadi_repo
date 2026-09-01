import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Clock, 
  Download, 
  Cpu, 
  AlertTriangle, 
  RefreshCw,
  Copy,
  Laptop,
  CheckCircle,
  FileCode,
  Sparkles,
  Lock,
  Binary,
  Activity,
  FileSpreadsheet,
  Timer,
  Calendar,
  Sliders,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AuditLog {
  timestamp: string;
  orgName: string;
  nodeSignature: string;
  licenseKey: string;
  event: string;
  status: string;
}

export const LicensingManager: React.FC = () => {
  // Read/write simulated license state from localStorage to make it persistent on reload
  const [licenseKey, setLicenseKey] = useState(localStorage.getItem('NEXUS_LICENSE_KEY') || '');
  const [isActivated, setIsActivated] = useState(localStorage.getItem('NEXUS_LICENSED') === 'true');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'node' | 'generator' | 'timelock'>('node');

  // Sovereign Time-Lock configurations
  const [timeLockEnabled, setTimeLockEnabled] = useState(() => localStorage.getItem('NEXUS_TIMELOCK_ENABLED') === 'true');
  const [globalStart, setGlobalStart] = useState(() => localStorage.getItem('NEXUS_GLOBAL_START') || new Date().toISOString().slice(0, 16));
  const [globalEnd, setGlobalEnd] = useState(() => localStorage.getItem('NEXUS_GLOBAL_END') || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 16));
  const [sessionLimitHours, setSessionLimitHours] = useState(() => Number(localStorage.getItem('NEXUS_SESSION_LIMIT_HOURS') || '24'));
  const [lockoutReason, setLockoutReason] = useState(() => localStorage.getItem('NEXUS_LOCKOUT_REASON') || 'System locked down due to license expiration. Contact Administrator for an extension.');
  const [timeWarpOffset, setTimeWarpOffset] = useState(() => Number(localStorage.getItem('NEXUS_TIME_WARP_OFFSET') || '0'));
  
  // Local state for user's activated timestamp
  const [activatedAt, setActivatedAt] = useState(() => {
    let saved = localStorage.getItem('NEXUS_USER_ACTIVATED_AT');
    if (!saved) {
      saved = new Date().toISOString();
      localStorage.setItem('NEXUS_USER_ACTIVATED_AT', saved);
    }
    return saved;
  });

  const [simulatedNow, setSimulatedNow] = useState(Date.now() + timeWarpOffset);

  // Auto-sync Sovereign Time-Lock configurations to LocalStorage
  useEffect(() => {
    localStorage.setItem('NEXUS_TIMELOCK_ENABLED', timeLockEnabled ? 'true' : 'false');
  }, [timeLockEnabled]);

  useEffect(() => {
    localStorage.setItem('NEXUS_GLOBAL_START', globalStart);
  }, [globalStart]);

  useEffect(() => {
    localStorage.setItem('NEXUS_GLOBAL_END', globalEnd);
  }, [globalEnd]);

  useEffect(() => {
    localStorage.setItem('NEXUS_SESSION_LIMIT_HOURS', String(sessionLimitHours));
  }, [sessionLimitHours]);

  useEffect(() => {
    localStorage.setItem('NEXUS_LOCKOUT_REASON', lockoutReason);
  }, [lockoutReason]);

  useEffect(() => {
    localStorage.setItem('NEXUS_TIME_WARP_OFFSET', String(timeWarpOffset));
  }, [timeWarpOffset]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedNow(Date.now() + timeWarpOffset);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeWarpOffset]);

  const formatDuration = (ms: number) => {
    if (ms <= 0) return '0s';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
  };

  // Expiration days tracker
  const [trialDaysLeft, setTrialDaysLeft] = useState(14);
  const [errorText, setErrorText] = useState('');

  // Key Generator fields state
  const [orgName, setOrgName] = useState('Acme Corporation');
  const [nodeSignature, setNodeSignature] = useState('SHA-LOCK-UUID-492F');
  const [validityDays, setValidityDays] = useState(90);
  const [licenseTier, setLicenseTier] = useState('ENTERPRISE');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<{
    licenseKey: string;
    sha256Signature: string;
    marketingMessage: string;
    allowedThroughput: string;
  } | null>(null);

  // Initial Audit Logs list cached in state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Auto initialize logs list
  useEffect(() => {
    const savedLogs = localStorage.getItem('NEXUS_AUDIT_LOGS');
    if (savedLogs) {
      setAuditLogs(JSON.parse(savedLogs));
    } else {
      const initialLogs: AuditLog[] = [
        {
          timestamp: new Date(Date.now() - 3600000 * 5).toLocaleString(),
          orgName: 'Acme Space Relay',
          nodeSignature: 'SHA-LOCK-UUID-492F',
          licenseKey: 'NEXUS-ENT-F3B2-ACTIVE',
          event: 'KEY_GENERATED',
          status: 'SUCCESS'
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 2.5).toLocaleString(),
          orgName: 'Acme Space Relay',
          nodeSignature: 'SHA-LOCK-UUID-492F',
          licenseKey: 'NEXUS-ENT-F3B2-ACTIVE',
          event: 'NODE_ACTIVATION',
          status: 'SUCCESS'
        },
        {
          timestamp: new Date(Date.now() - 3600000).toLocaleString(),
          orgName: 'Intruder Cyber Scraper',
          nodeSignature: 'UNK-IP-192.168.12.9',
          licenseKey: 'ATTEMPTED-FAKE-SERIAL-KEY',
          event: 'KEY_REGISTRATION_REJECT',
          status: 'DENIED'
        }
      ];
      setAuditLogs(initialLogs);
      localStorage.setItem('NEXUS_AUDIT_LOGS', JSON.stringify(initialLogs));
    }
  }, []);

  const addAuditLog = (logEntry: Omit<AuditLog, 'timestamp'>) => {
    const newEntry: AuditLog = {
      ...logEntry,
      timestamp: new Date().toLocaleString()
    };
    setAuditLogs(prev => {
      const next = [newEntry, ...prev];
      localStorage.setItem('NEXUS_AUDIT_LOGS', JSON.stringify(next));
      return next;
    });
  };

  const generateRandomSignature = () => {
    const chars = 'ABCDEF0123456789';
    let randSig = 'SHA-LOCK-';
    for (let i = 0; i < 8; i++) {
      randSig += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNodeSignature(randSig);
  };

  const handleActivation = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedKey = licenseKey.trim().toUpperCase();
    const savedKeys = JSON.parse(localStorage.getItem('NEXUS_SAVED_KEYS_DB') || '[]');
    const isValid = formattedKey === 'NEXUS-PRO-999-ACTIVE' || savedKeys.some((k: string) => k.toUpperCase() === formattedKey);

    if (isValid) {
      setIsActivated(true);
      setErrorText('');
      localStorage.setItem('NEXUS_LICENSED', 'true');
      localStorage.setItem('NEXUS_LICENSE_KEY', formattedKey);
      
      addAuditLog({
        orgName: formattedKey === 'NEXUS-PRO-999-ACTIVE' ? 'Primary Pro Operator' : 'Corporate Node Client',
        nodeSignature: 'CPU-LOCAL-HOST',
        licenseKey: formattedKey,
        event: 'LICENSE_ACTIVATION_SUCCESS',
        status: 'SUCCESS'
      });
    } else {
      setErrorText('INVALID_SIGNATURE_校验_FAILED. Double check key syntax.');
      addAuditLog({
        orgName: 'External Connection Client',
        nodeSignature: 'UNK-IP-RESOLVE-ERR',
        licenseKey: formattedKey,
        event: 'LICENSE_ACTIVATION_REJECTED',
        status: 'DENIED'
      });
    }
  };

  const terminateLicense = () => {
    setIsActivated(false);
    setLicenseKey('');
    localStorage.removeItem('NEXUS_LICENSED');
    localStorage.removeItem('NEXUS_LICENSE_KEY');
    addAuditLog({
      orgName: 'System Core Node',
      nodeSignature: 'CPU-LOCAL-HOST',
      licenseKey: licenseKey || 'N/A',
      event: 'LICENSE_REVOCATED_BY_OPERATOR',
      status: 'TERMINATED'
    });
  };

  const triggerMockExpiration = () => {
    localStorage.setItem('NEXUS_LOCKOUT', 'true');
    window.location.reload();
  };

  const handleCreateLicenseKey = async () => {
    if (!orgName || !nodeSignature) return;

    setIsGeneratingKey(true);
    setGeneratedKeyResult(null);
    try {
      const response = await fetch('/api/gemini/generate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgName,
          nodeSignature,
          validityDays,
          tier: licenseTier
        }),
      });

      if (!response.ok) {
        throw new Error('Key generation failed');
      }

      const data = await response.json();
      setGeneratedKeyResult(data);

      // Save generated license key into our database list so it actually works to unlock the app!
      const savedKeys = JSON.parse(localStorage.getItem('NEXUS_SAVED_KEYS_DB') || '[]');
      if (data.licenseKey) {
        savedKeys.push(data.licenseKey);
        localStorage.setItem('NEXUS_SAVED_KEYS_DB', JSON.stringify(savedKeys));
      }

      addAuditLog({
        orgName,
        nodeSignature,
        licenseKey: data.licenseKey || 'N/A',
        event: 'KEY_GENERATED_BY_GEMINI',
        status: 'SUCCESS'
      });
    } catch (err) {
      console.error('Error generating key:', err);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Timestamp", "Organization", "Node Signature", "License Key", "Event Action", "Status"];
    const rows = auditLogs.map(l => [
      l.timestamp.replace(/,/g, ''),
      l.orgName,
      l.nodeSignature,
      l.licenseKey,
      l.event,
      l.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nexus_licensing_audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyConfig = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const tauriConfigText = `{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:3000",
    "distDir": "../dist"
  },
  "package": {
    "productName": "PulseMail Nexus",
    "version": "2.4.0"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "category": "DeveloperTool",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "identifier": "io.pulsemail.nexus",
      "targets": "all"
    }
  }
}`;

  const nodeExpirationText = `// SECURE CRYPTO EXPIRED CHECKER (To compile in native Tauri backend)
const fs = require('fs');
const crypto = require('crypto');

function verifyLicenseAndExpiry(licensePath) {
  try {
    const licenseRaw = fs.readFileSync(licensePath, 'utf8');
    const license = JSON.parse(licenseRaw);
    
    // Verify Cryptographic Signature
    const verifier = crypto.createVerify('SHA256');
    verifier.update(JSON.stringify(license.payload));
    const isValid = verifier.verify(PUBLIC_KEY, license.signature, 'hex');
    
    if (!isValid) throw new Error("CORRUPTED_SIGNATURE");
    
    const expiresAt = new Date(license.payload.expiresAt).getTime();
    if (Date.now() > expiresAt) {
      console.log("CRITICAL: SOFTWARE_LIFE_EXPIRED. Restricting API dispatch.");
      process.exit(101);
    }
    
    return license.payload;
  } catch (err) {
    process.exit(403);
  }
}`;

  return (
    <div className="space-y-6">
      {/* Sub tabs with custom visual styles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-white/5 pb-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Licensing Hub</h2>
          <p className="text-white/40 text-sm italic font-mono uppercase tracking-widest">Compiler Core • Embedded Distribution & Authentication Node</p>
        </div>
        <div className="flex bg-black/45 p-1 rounded-xl border border-white/5 self-stretch sm:self-auto flex-wrap gap-1">
          <button 
            onClick={() => setActiveSubTab('node')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
              activeSubTab === 'node' ? "bg-accent text-slate-950 font-bold" : "text-white/40 hover:text-white"
            )}
          >
            Node Authentication
          </button>
          <button 
            onClick={() => setActiveSubTab('generator')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1",
              activeSubTab === 'generator' ? "bg-accent text-slate-950 font-bold" : "text-white/40 hover:text-white"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Corporate Key Gen
          </button>
          <button 
            onClick={() => setActiveSubTab('timelock')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1",
              activeSubTab === 'timelock' ? "bg-accent text-slate-950 font-bold" : "text-white/40 hover:text-white"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            Sovereign Time-Locks
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'node' && (
          <motion.div 
            key="node-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left column: Licensing Activation Status */}
            <div className="glass p-6 bg-white/2 space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 text-white">
                  <Key className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Local Registration Status</h3>
                </div>

                {isActivated ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase">
                         <ShieldCheck className="w-4 h-4" />
                         Genuine PulseMail Serial Key Verified
                      </div>
                      <p className="text-[10px] text-white/50 font-mono select-all">
                        HEX-KEY: {licenseKey || 'NEXUS-PRO-999-ACTIVE'}
                      </p>
                      <div className="text-[10px] text-white/40">
                        <span className="text-accent underline">Licensed to</span>: Active Node Owner
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-white/60">
                      <div className="flex justify-between font-mono py-1 border-b border-white/5">
                        <span className="text-white/30">Validity</span>
                        <span>LIFETIME_UNLIMITED</span>
                      </div>
                      <div className="flex justify-between font-mono py-1 border-b border-white/5">
                        <span className="text-white/30">Execution Limit</span>
                        <span>1,000,000 parallel / sec</span>
                      </div>
                      <div className="flex justify-between font-mono py-1 border-b border-white/5">
                        <span className="text-white/30">Network Core</span>
                        <span>Registered Cluster Node</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-400/5 border border-yellow-400/10 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase">
                         <Clock className="w-4 h-4 animate-pulse" />
                         Sandbox Trial In Effect
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed font-mono">
                        Node will expire in <span className="text-yellow-400 font-bold">{trialDaysLeft} days</span>. Enter subscription license signature to lock state.
                      </p>
                    </div>

                    <form onSubmit={handleActivation} className="space-y-3">
                      <div>
                        <input 
                          type="text" 
                          placeholder="ENTER-NEXUS-SERIAL-SIGNATURE"
                          value={licenseKey}
                          onChange={e => setLicenseKey(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-center focus:border-accent/40 outline-none text-white uppercase"
                        />
                      </div>
                      
                      {errorText && (
                        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest text-center">
                          {errorText}
                        </div>
                      )}

                      <button 
                        type="submit"
                        className="w-full bg-accent text-slate-950 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:scale-[1.02] transition-colors cursor-pointer"
                      >
                        Bind_License_Key
                      </button>
                    </form>

                    <div className="text-center pt-2">
                       <span className="text-[9px] text-white/20 uppercase tracking-widest">
                         Hint: Enter <span className="text-accent font-bold underline select-all">NEXUS-PRO-999-ACTIVE</span> to trigger Pro Activation, or generate a custom key under Corporate Key Gen.
                       </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/5 space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/30">Software Operational Lifespan Tester</h4>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Force an expiration constraint lockout to test how the software acts when clients trial expires.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={triggerMockExpiration}
                    className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-mono border border-red-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    Simulate Expiration & Lock App
                  </button>
                  {isActivated && (
                    <button 
                      onClick={terminateLicense}
                      className="px-3 py-2 bg-white/5 text-white/30 hover:text-white rounded-lg text-xs font-mono cursor-pointer"
                      title="Revoke License key"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Middle column: Packaging options (Tauri vs Electron info) */}
            <div className="glass p-6 bg-white/2 lg:col-span-2 space-y-6">
              <div className="flex items-center gap-2 text-white border-b border-white/5 pb-3">
                <Laptop className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Independent Distribution Compiling Hub</h3>
              </div>

              <p className="text-xs text-white/60 leading-relaxed font-sans">
                To bundle this web dashboard into a **custom native desktop platform app with custom launch icons** (which you can distribute safely as a closed-source package to users/orgs), use **Tauri** (strongly recommended over Electron because Tauri produces highly secure Rust-backed binary executables of ~5MB and isolates standard browser DevTools!). 
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass p-4 bg-white/2 border-white/5 space-y-3">
                  <h4 className="text-[11px] font-bold uppercase text-accent tracking-widest flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5" />
                    Step 1: Install Tauri Bundler
                  </h4>
                  <pre className="text-[10px] text-white/40 leading-relaxed font-mono bg-black/30 p-2 rounded select-all">
                    npm install -D @tauri-apps/cli{"\n"}
                    npx tauri init
                  </pre>
                  <p className="text-[11px] text-white/50 font-sans">
                    Tauri will bootstrap a lightweight Rust wrapper around the static production files inside <span className="font-mono text-accent">dist/</span>.
                  </p>
                </div>

                <div className="glass p-4 bg-white/2 border-white/5 space-y-3">
                  <h4 className="text-[11px] font-bold uppercase text-accent tracking-widest flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Step 2: Generate Cross-Platform App
                  </h4>
                  <pre className="text-[10px] text-white/40 leading-relaxed font-mono bg-black/30 p-2 rounded select-all">
                    npx tauri build --target win
                  </pre>
                  <p className="text-[11px] text-white/50 font-sans">
                    This compiles into an optimised <span className="font-mono text-accent">.exe</span>, <span className="font-mono text-accent">.dmg / .app</span>, or native platform system packages!
                  </p>
                </div>
              </div>

              {/* Tauri config clipboard container */}
              <div className="space-y-4">
                 <div className="flex justify-between items-center bg-black/40 px-4 py-2 rounded-t-lg border-b border-white/5">
                    <span className="text-[10px] font-mono text-white/40 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-accent" />
                      tauri.conf.json Reference Configuration
                    </span>
                    <button 
                      onClick={() => copyConfig(tauriConfigText, 'tauri')}
                      className="text-[10px] font-bold font-mono uppercase text-accent hover:underline flex items-center gap-1 cursor-pointer font-sans"
                    >
                      {copiedSection === 'tauri' ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-accent" />
                          COPIED!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          COPY_CONFIG
                        </>
                      )}
                    </button>
                 </div>
                 <pre className="p-4 bg-black/55 text-[10px] font-mono text-white/60 overflow-x-auto rounded-b-lg scrollbar-thin max-h-48 leading-relaxed">
                   {tauriConfigText}
                 </pre>
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'generator' && (
          <motion.div 
            key="generator-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* AI License Key Generator Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Creator Settings Options */}
              <div className="lg:col-span-5 glass p-6 Space-y-4 bg-white/2 border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-white">
                    <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Enterprise Signer Configuration</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5 font-sans">
                        Client Organization Name
                      </label>
                      <input 
                        type="text"
                        value={orgName}
                        onChange={e => setOrgName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-accent/40"
                        placeholder="E.g., SpaceX Relay Corp"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 font-sans">
                          Node Hardware Signature ID
                        </label>
                        <button 
                          onClick={generateRandomSignature}
                          className="text-[9px] font-bold text-accent font-mono hover:underline flex items-center gap-1 cursor-pointer font-sans"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> RAND_SIG
                        </button>
                      </div>
                      <input 
                        type="text"
                        value={nodeSignature}
                        onChange={e => setNodeSignature(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white font-mono placeholder:text-white/20 outline-none focus:border-accent/40"
                        placeholder="Unique Node Signature Hex"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5 font-sans">
                          Validity Days Period
                        </label>
                        <select 
                          value={validityDays}
                          onChange={e => setValidityDays(Number(e.target.value))}
                          className="w-full bg-black/45 border border-white/10 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-accent/40"
                        >
                          <option value={30}>30 Days Evaluation</option>
                          <option value={90}>90 Days Executive</option>
                          <option value={365}>1 Year Corporate</option>
                          <option value={9999}>Lifetime Unlimited</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5 font-sans">
                          Operational Key Tier
                        </label>
                        <select 
                          value={licenseTier}
                          onChange={e => setLicenseTier(e.target.value)}
                          className="w-full bg-black/45 border border-white/10 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-accent/40"
                        >
                          <option value="PRO">Pro Node Tier</option>
                          <option value="ENTERPRISE">Enterprise Sovereign</option>
                          <option value="GOVERNMENT">Government Secure</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={handleCreateLicenseKey}
                    disabled={isGeneratingKey || !orgName || !nodeSignature}
                    className="w-full bg-accent text-slate-950 py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isGeneratingKey ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Generating_AI_Key...
                      </>
                    ) : (
                      <>
                        <Binary className="w-3.5 h-3.5 text-slate-950" />
                        Generate_AISecure_Key
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Visualized License output */}
              <div className="lg:col-span-7 glass p-6 bg-accent/[0.02] border border-accent/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-white">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Signed License Decryption Certificate</h3>
                  </div>

                  {generatedKeyResult ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.99 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4"
                    >
                      {/* Generated Certificate Card styling */}
                      <div className="p-4 bg-black/65 border border-accent/25 rounded-xl space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-xl pointer-events-none" />
                        
                        <div className="flex justify-between items-start border-b border-white/5 pb-2">
                          <div>
                            <span className="text-[8px] font-mono text-accent uppercase tracking-widest font-bold">SERIAL_KEY_GENERATED</span>
                            <div className="text-sm font-bold text-white tracking-widest select-all font-mono mt-0.5">{generatedKeyResult.licenseKey}</div>
                          </div>
                          <button 
                            onClick={() => copyConfig(generatedKeyResult.licenseKey, 'gen_key')}
                            className="p-1 px-2.5 bg-accent/10 border border-accent/20 rounded hover:bg-accent/20 hover:text-white text-[9px] font-mono text-accent transition-all cursor-pointer font-sans"
                          >
                            {copiedSection === 'gen_key' ? 'COPIED!' : 'COPY'}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono">
                          <div>
                            <span className="text-white/30 block">CLIENT_ORG</span>
                            <span className="text-white/80">{orgName}</span>
                          </div>
                          <div>
                            <span className="text-white/30 block">NODE_SIGNATURE</span>
                            <span className="text-white/80">{nodeSignature}</span>
                          </div>
                          <div className="col-span-2 border-t border-white/5 pt-2 mt-1">
                            <span className="text-white/30 block">SHA-256 ENVELOPE HEADER</span>
                            <span className="text-white/50 select-all font-mono break-all text-[8px] leading-relaxed block">{generatedKeyResult.sha256Signature}</span>
                          </div>
                          <div className="col-span-2 border-t border-white/5 pt-2">
                            <span className="text-white/30 block">ALLOWED THROUGHPUT RATE</span>
                            <span className="text-accent font-bold">{generatedKeyResult.allowedThroughput || 'Unlimited requests'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-accent/5 rounded-lg border border-accent/10">
                        <p className="text-[11px] text-accent/80 leading-relaxed flex items-center gap-1.5 font-sans">
                          <Sparkles className="w-3.5 h-3.5 text-accent" />
                          {generatedKeyResult.marketingMessage}
                        </p>
                      </div>

                      <div className="p-3 bg-yellow-400/5 rounded-lg border border-yellow-400/10">
                        <p className="text-[10px] text-yellow-400 leading-relaxed font-sans">
                          💡 **Instant Registration Node Active**: This generated serial is now cached inside the dynamic validation list. You can paste it directly into Node Authentication or Lockout wrapper to activate this license!
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-xl text-white/30 py-12">
                      <Binary className="w-12 h-12 text-white/10 mb-4 stroke-[1.5]" />
                      <p className="text-xs uppercase tracking-widest font-bold">No License Generated Yet</p>
                      <p className="text-[11px] text-white/20 max-w-xs mt-1 leading-relaxed font-sans">Configure client descriptors, then click generate key to activate the server side cryptography signature model.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Audit Log Ledger container */}
            <div className="glass p-6 bg-white/2 space-y-4">
               <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                     <Activity className="w-4 h-4 text-accent" />
                     <h3 className="text-xs font-bold uppercase tracking-widest text-white">Central Licensing Execution Ledger</h3>
                  </div>
                  <button 
                    onClick={handleExportCSV}
                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer font-sans"
                  >
                     <FileSpreadsheet className="w-3.5 h-3.5 text-accent" />
                     Export_Log_CSV
                  </button>
               </div>

               <div className="overflow-x-auto rounded-lg border border-white/5 scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-white/5 text-[9px] font-mono text-white/40 uppercase tracking-widest">
                           <th className="p-3 font-semibold">TIMESTAMP</th>
                           <th className="p-3 font-semibold">ORGANIZATION CLIENT</th>
                           <th className="p-3 font-semibold">NODE SIGNATURE</th>
                           <th className="p-3 font-semibold">SERIAL LICENSE KEY</th>
                           <th className="p-3 font-semibold">EVENT ACTION</th>
                           <th className="p-3 font-semibold text-center">STATUS</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5 text-[10px] font-mono text-white/70">
                        {auditLogs.map((log, i) => (
                           <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                              <td className="p-3 text-white/40">{log.timestamp}</td>
                              <td className="p-3 text-white font-semibold">{log.orgName}</td>
                              <td className="p-3 text-accent font-semibold">{log.nodeSignature}</td>
                              <td className="p-3 text-white/60 select-all">{log.licenseKey}</td>
                              <td className="p-3 text-white/50">{log.event}</td>
                              <td className="p-3 text-center">
                                 <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                                    log.status === 'SUCCESS' ? "bg-accent/10 text-accent" : 
                                    log.status === 'DENIED' ? "bg-red-500/10 text-red-500" :
                                    "bg-white/10 text-white/50"
                                 )}>
                                    {log.status}
                                 </span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'timelock' && (
          <motion.div 
            key="timelock-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Sovereign Time-Lock and Limits configuration panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Rules & Limits Setup */}
              <div className="lg:col-span-6 glass p-6 space-y-5 bg-white/2 border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-white">
                    <Sliders className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Sovereign Functional Lock Settings</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Time Lock Enable Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-white/2 rounded-xl border border-white/5">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white uppercase tracking-wider block">Enforce Expiration Constraints</span>
                        <span className="text-[10px] text-white/40 block">Enable strict operational lifespan checks for all sessions</span>
                      </div>
                      <button 
                        onClick={() => setTimeLockEnabled(!timeLockEnabled)}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                          timeLockEnabled ? "bg-accent" : "bg-white/10"
                        )}
                      >
                        <span className="sr-only">Toggle secure timelock</span>
                        <span 
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-slate-950 transition-transform",
                            timeLockEnabled ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>

                    {/* Global Lifespan Timeframe */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 font-sans">
                        Global Operational Timeframe Range
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] text-white/40 uppercase font-mono">Allowed Start Date</span>
                          <input 
                            type="datetime-local"
                            value={globalStart}
                            onChange={e => setGlobalStart(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-accent/40 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] text-white/40 uppercase font-mono">Hard Shutdown Date</span>
                          <input 
                            type="datetime-local"
                            value={globalEnd}
                            onChange={e => setGlobalEnd(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-accent/40 font-mono"
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-white/30 block mt-1 font-sans italic">
                        The software will refuse to initialize outside this date window regardless of keys.
                      </span>
                    </div>

                    {/* Authorized User Session Duration Limit */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 font-sans">
                          Authorized Session Duration Limit
                        </label>
                        <span className="text-xs font-mono text-accent font-bold">{sessionLimitHours} Hours</span>
                      </div>
                      <input 
                        type="range"
                        min="1"
                        max="168"
                        value={sessionLimitHours}
                        onChange={e => setSessionLimitHours(Number(e.target.value))}
                        className="w-full accent-accent h-1.5 bg-white/10 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-white/30 block font-sans leading-relaxed">
                        Defines how many hours the app remains active for each authorized user from their first login timestamp. Max 168 hours (7 days).
                      </span>
                    </div>

                    {/* Custom Warning Reason Override */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 font-sans">
                        Custom Blockade Notice Message
                      </label>
                      <textarea 
                        value={lockoutReason}
                        onChange={e => setLockoutReason(e.target.value)}
                        rows={3}
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-accent/40 font-sans resize-none leading-relaxed"
                        placeholder="Define customized instruction to show when lockout is triggered..."
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-3">
                  <button 
                    onClick={() => {
                      const now = new Date();
                      setGlobalStart(now.toISOString().slice(0, 16));
                      setGlobalEnd(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16));
                      setSessionLimitHours(24);
                      setLockoutReason('System locked down due to license expiration. Contact Administrator for an extension.');
                      setTimeLockEnabled(true);
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer font-sans"
                  >
                    Reset Defaults
                  </button>
                  <button 
                    onClick={() => {
                      // Save and log action
                      const newLog: AuditLog = {
                        timestamp: new Date().toLocaleString(),
                        orgName: 'SYSTEM_ADMIN',
                        nodeSignature: 'TIME_LOCK_LIMITS',
                        licenseKey: `LOCKS_${timeLockEnabled ? 'ENFORCED' : 'DISABLED'}_${sessionLimitHours}H`,
                        event: `Updated Global Lifespan constraints (${sessionLimitHours}h limits)`,
                        status: 'SUCCESS'
                      };
                      const updatedLogs = [newLog, ...auditLogs].slice(0, 50);
                      setAuditLogs(updatedLogs);
                      localStorage.setItem('NEXUS_AUDIT_LOGS', JSON.stringify(updatedLogs));
                    }}
                    className="flex-1 bg-accent hover:bg-opacity-90 text-slate-950 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer font-sans"
                  >
                    Apply Lock Profile
                  </button>
                </div>
              </div>

              {/* Right Column: Time Warp Console & Status Diagnostic */}
              <div className="lg:col-span-6 glass p-6 bg-white/2 border border-white/5 flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-white pb-3 border-b border-white/5">
                    <Activity className="w-4 h-4 text-accent animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Clock Diagnostic & Security Warper</h3>
                  </div>

                  {/* Operational Status Display Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                      <span className="text-[9px] text-white/40 uppercase tracking-wider block font-sans">Software Lifespan Status</span>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          !timeLockEnabled ? "bg-white/40 animate-pulse" :
                          (simulatedNow < new Date(globalStart).getTime() || simulatedNow > new Date(globalEnd).getTime()) ? "bg-red-500 animate-ping" : "bg-accent animate-pulse"
                        )} />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                          {!timeLockEnabled ? "BYPASSED" :
                           (simulatedNow < new Date(globalStart).getTime() || simulatedNow > new Date(globalEnd).getTime()) ? "LIFESPAN_EXPIRED" : "OPERATIONAL_OK"}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                      <span className="text-[9px] text-white/40 uppercase tracking-wider block font-sans">Authorized Session Expiry</span>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          !timeLockEnabled ? "bg-white/40" :
                          (simulatedNow > new Date(activatedAt).getTime() + sessionLimitHours * 3600 * 1000) ? "bg-red-500 animate-ping" : "bg-accent animate-pulse"
                        )} />
                        <span className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                          {!timeLockEnabled ? "INACTIVE" :
                           (simulatedNow > new Date(activatedAt).getTime() + sessionLimitHours * 3600 * 1000) ? "EXPIRED" : "VALID_ACTIVE"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Elapsed/Remaining Calculations */}
                  <div className="space-y-3.5 p-4 bg-black/40 rounded-xl border border-white/5 font-mono">
                    <div className="flex justify-between items-center text-[10px] text-white/60">
                      <span>Simulated Session Time:</span>
                      <span className="text-white font-bold">{new Date(simulatedNow).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-white/60">
                      <span>Session Started:</span>
                      <span className="text-white">{new Date(activatedAt).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-white/60">
                      <span>Session Lifespan Ends:</span>
                      <span className="text-white">{new Date(new Date(activatedAt).getTime() + sessionLimitHours * 3600 * 1000).toLocaleString()}</span>
                    </div>

                    {/* Session Expiration Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] text-white/40">
                        <span>SESSION USE PERCENTAGE</span>
                        <span>{Math.round(Math.min(100, ((simulatedNow - new Date(activatedAt).getTime()) / (sessionLimitHours * 3600 * 1000)) * 100))}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            ((simulatedNow - new Date(activatedAt).getTime()) / (sessionLimitHours * 3600 * 1000)) >= 1 ? "bg-red-500 animate-pulse" : "bg-accent"
                          )}
                          style={{ width: `${Math.min(100, Math.max(0, ((simulatedNow - new Date(activatedAt).getTime()) / (sessionLimitHours * 3600 * 1000)) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Expiration Clock / Dynamic Countdown */}
                    <div className="pt-2 text-center border-t border-white/5">
                      <span className="text-[10px] text-white/40 uppercase tracking-widest block font-sans mb-1">Time Remaining to Lockout</span>
                      <span className={cn(
                        "text-2xl font-bold tracking-wider",
                        (new Date(activatedAt).getTime() + sessionLimitHours * 3600 * 1000 - simulatedNow) <= 0 ? "text-red-500 font-sans uppercase animate-pulse" : "text-accent font-mono"
                      )}>
                        {(new Date(activatedAt).getTime() + sessionLimitHours * 3600 * 1000 - simulatedNow) <= 0 
                          ? "SESSION_LOCKED_OUT" 
                          : formatDuration(new Date(activatedAt).getTime() + sessionLimitHours * 3600 * 1000 - simulatedNow)}
                      </span>
                    </div>
                  </div>

                  {/* System Time Warp Simulator Panel */}
                  <div className="p-4 bg-accent/5 rounded-xl border border-accent/10 space-y-3">
                    <div className="flex items-center gap-2 text-white">
                      <Timer className="w-4 h-4 text-accent" />
                      <span className="text-xs font-bold uppercase tracking-widest font-sans">High-Security Clock Warp Simulator</span>
                    </div>
                    <p className="text-[10px] text-white/60 font-sans leading-relaxed">
                      Testing real-time software locks is difficult. Use the simulation controls below to speed up the system clock by hours or days to witness the instantaneous shutdown of application features.
                    </p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono">
                      <button 
                        onClick={() => {
                          setTimeWarpOffset(0);
                          setSimulatedNow(Date.now());
                        }}
                        className="bg-white/5 hover:bg-white/10 text-white py-1 px-1.5 rounded text-[10px] border border-white/5 text-center cursor-pointer transition-colors font-sans"
                      >
                        RESET_WARP
                      </button>
                      <button 
                        onClick={() => setTimeWarpOffset(prev => prev + 3600000)}
                        className="bg-accent/10 hover:bg-accent/20 text-accent py-1 px-1.5 rounded text-[10px] border border-accent/10 text-center cursor-pointer transition-colors"
                      >
                        +1 Hour
                      </button>
                      <button 
                        onClick={() => setTimeWarpOffset(prev => prev + 86400000)}
                        className="bg-accent/10 hover:bg-accent/20 text-accent py-1 px-1.5 rounded text-[10px] border border-accent/10 text-center cursor-pointer transition-colors"
                      >
                        +1 Day
                      </button>
                      <button 
                        onClick={() => setTimeWarpOffset(prev => prev + 604800000)}
                        className="bg-accent/10 hover:bg-accent/20 text-accent py-1 px-1.5 rounded text-[10px] border border-accent/10 text-center cursor-pointer transition-colors"
                      >
                        +7 Days
                      </button>
                      <button 
                        onClick={() => setTimeWarpOffset(prev => prev + 2592000000)}
                        className="bg-accent/10 hover:bg-accent/20 text-accent py-1 px-1.5 rounded text-[10px] border border-accent/10 text-center cursor-pointer transition-colors"
                      >
                        +30 Days
                      </button>
                    </div>

                    {timeWarpOffset > 0 && (
                      <div className="flex justify-between items-center bg-black/30 p-2 rounded text-[10px] text-accent border border-accent/10">
                        <span>Warp active: +{formatDuration(timeWarpOffset)}</span>
                        <button 
                          onClick={() => {
                            setTimeWarpOffset(0);
                            setSimulatedNow(Date.now());
                          }}
                          className="hover:underline font-bold text-red-400 font-sans"
                        >
                          Cancel Warp
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulated lockout warning status banner */}
                <div>
                  {timeLockEnabled && (simulatedNow < new Date(globalStart).getTime() || simulatedNow > new Date(globalEnd).getTime() || simulatedNow > new Date(activatedAt).getTime() + sessionLimitHours * 3600 * 1000) ? (
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-red-500 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                      <div className="text-[10px] font-sans">
                        <strong className="uppercase">Secure Lockdown Engaged</strong>: If you close or reload this view, the application will completely barricade dashboard access. Or click below to test the Lockout overlay immediately:
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-accent/5 rounded-lg border border-accent/15 text-accent flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-accent" />
                      <div className="text-[10px] font-sans">
                        <strong>Security Core Active</strong>: Operational metrics are running fine. Use warp simulations to trigger a blockade test safely.
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex gap-3">
                    <button 
                      onClick={() => {
                        // Extend user session - sets activation time forward
                        const extended = new Date(new Date(activatedAt).getTime() + 24 * 3600 * 1000).toISOString();
                        setActivatedAt(extended);
                        localStorage.setItem('NEXUS_USER_ACTIVATED_AT', extended);
                        
                        // Log event
                        const newLog: AuditLog = {
                          timestamp: new Date().toLocaleString(),
                          orgName: 'SYSTEM_ADMIN',
                          nodeSignature: 'TIME_LOCK_LIMITS',
                          licenseKey: 'USER_SESSION_EXTENDED',
                          event: 'Extended active user functional session by +24 Hours',
                          status: 'SUCCESS'
                        };
                        const updatedLogs = [newLog, ...auditLogs].slice(0, 50);
                        setAuditLogs(updatedLogs);
                        localStorage.setItem('NEXUS_AUDIT_LOGS', JSON.stringify(updatedLogs));
                      }}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer font-sans"
                    >
                      Extend User Session (+24h)
                    </button>

                    <button 
                      onClick={() => {
                        // Force lock
                        localStorage.setItem('NEXUS_LOCKOUT', 'true');
                        window.location.reload();
                      }}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/30 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer font-sans"
                    >
                      Trigger Lockout Screen
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code security details & tamper protection (Static info block preserved) */}
      <div className="glass p-6 bg-accent/5 border-accent/10">
         <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-accent" />
                <h4 className="text-sm font-bold text-accent uppercase tracking-widest">Ensuring Source-Code Authenticity & Tamper Defense</h4>
              </div>
              <p className="text-xs text-white/60 leading-relaxed max-w-2xl font-sans">
                When you distribute compiled apps to organizations, they shouldn't easily modify or extract the executable logic. To guarantee that:
              </p>
              <ul className="text-xs text-white/50 list-disc pl-5 space-y-1 font-sans">
                <li><span className="text-white font-bold">Code Minification/Obfuscation</span>: Vite inherently minifies JS assets during `npm run build` so they are illegible.</li>
                <li><span className="text-white font-bold">Network Time Synchronization</span>: Client-side tamperers might set the PC motherboard clock backwards. Use a background API query (e.g., Firestore timestamps on signup) to secure validity dates.</li>
                <li><span className="text-white font-bold">Hardware-Locked licensing</span>: Derive client signatures using native system UUID tokens (macOS system hardware hashes or registry identifiers).</li>
              </ul>
            </div>

            <div className="flex-1 space-y-2">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Server-side lifespan validation mock</span>
                  <button 
                    onClick={() => copyConfig(nodeExpirationText, 'node_expiration')}
                    className="text-[10px] font-mono text-accent uppercase hover:underline cursor-pointer font-sans"
                  >
                    {copiedSection === 'node_expiration' ? 'Copied!' : 'Copy Snippet'}
                  </button>
               </div>
               <pre className="p-3 bg-black/60 rounded border border-white/5 text-[9px] font-mono text-white/55 overflow-y-auto max-h-40 leading-relaxed">
                 {nodeExpirationText}
               </pre>
            </div>
         </div>
      </div>
    </div>
  );
};
