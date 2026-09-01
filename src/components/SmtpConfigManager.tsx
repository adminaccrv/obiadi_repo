import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Server, 
  Key, 
  User, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Send,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface SmtpPreset {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  description: string;
}

const PRESETS: SmtpPreset[] = [
  { name: 'Gmail', host: 'smtp.gmail.com', port: 465, secure: true, description: 'Google Workspace Relay' },
  { name: 'Outlook / 365', host: 'smtp.office365.com', port: 587, secure: false, description: 'Microsoft Exchange Gateway' },
  { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false, description: 'Transactional SMTP Grid' },
  { name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, secure: false, description: 'Developer Relay Channel' },
];

const InfoTooltip: React.FC<{ content: string }> = ({ content }) => {
  return (
    <span className="group relative inline-block ml-1.5 text-white/35 hover:text-accent cursor-help align-middle">
      <HelpCircle className="w-3.5 h-3.5" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900/95 border border-white/10 rounded-lg text-[11px] leading-relaxed text-white/85 shadow-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-50 font-sans font-normal normal-case block">
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 block" />
        {content}
      </span>
    </span>
  );
};

export const SmtpConfigManager: React.FC = () => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [secure, setSecure] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState(auth.currentUser?.email || '');
  const [showTestInput, setShowTestInput] = useState(false);
  
  // Feedback
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message: string;
  }>({ type: 'idle', message: '' });

  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unchecked' | 'testing' | 'connected' | 'failed'>('unchecked');
  const [selectedPresetName, setSelectedPresetName] = useState('');

  const checkConnectivity = async (configData: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    secure?: boolean;
    senderName?: string;
    senderEmail?: string;
  }) => {
    if (!configData.host || !configData.port) {
      setConnectionStatus('failed');
      return;
    }
    setConnectionStatus('testing');
    try {
      const response = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          host: configData.host,
          port: Number(configData.port),
          username: configData.username || '',
          password: configData.password || '',
          secure: !!configData.secure,
          senderName: configData.senderName || '',
          senderEmail: configData.senderEmail || ''
        })
      });
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('failed');
      }
    } catch (err) {
      console.error("Silent connection handshake failed:", err);
      setConnectionStatus('failed');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setHost('');
        setPort(587);
        setUsername('');
        setPassword('');
        setSenderName('');
        setSenderEmail('');
        setSecure(false);
        setHasSavedConfig(false);
        setConnectionStatus('unchecked');
        setSelectedPresetName('');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const docRef = doc(db, 'settings', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setHost(data.host || '');
          setPort(data.port || 587);
          setUsername(data.username || '');
          setPassword(data.password || '');
          setSenderName(data.senderName || '');
          setSenderEmail(data.senderEmail || '');
          setSecure(data.secure ?? false);
          setHasSavedConfig(true);

          if (data.host) {
            const matchedPreset = PRESETS.find(
              p => p.host.toLowerCase() === (data.host || '').toLowerCase() && Number(p.port) === Number(data.port)
            );
            if (matchedPreset) {
              setSelectedPresetName(matchedPreset.name);
            }
          }

          // Auto-trigger connectivity test on load
          checkConnectivity({
            host: data.host || '',
            port: Number(data.port || 587),
            username: data.username || '',
            password: data.password || '',
            secure: data.secure ?? false,
            senderName: data.senderName || '',
            senderEmail: data.senderEmail || ''
          });
        } else {
          setTestEmail(user.email || '');
          setHasSavedConfig(false);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `settings/${user.uid}`);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const applyPreset = (preset: SmtpPreset) => {
    setHost(preset.host);
    setPort(preset.port);
    setSecure(preset.secure);
    setSelectedPresetName(preset.name);
    setConnectionStatus('unchecked');
    setStatus({
      type: 'success',
      message: `${preset.name} configuration presets applied successfully!`
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host || !port) {
      setStatus({ type: 'error', message: 'Host and Port are strictly required.' });
      return;
    }

    setSaving(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No verified credentials found');

      const configDoc = {
        host,
        port: Number(port),
        username,
        password,
        senderName,
        senderEmail,
        secure,
        ownerId: user.uid,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'settings', user.uid), configDoc);
      setHasSavedConfig(true);
      setStatus({
        type: 'success',
        message: 'SMTP credentials committed and synchronized with secure cloud vault successfully!'
      });

      // Re-trigger connectivity test
      checkConnectivity({
        host,
        port: Number(port),
        username,
        password,
        secure,
        senderName,
        senderEmail
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `settings/${auth.currentUser?.uid}`);
      setStatus({
        type: 'error',
        message: 'Failed to synchronize configuration. Secure cloud vault rejected operation.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestHandshake = async () => {
    if (!host || !port) {
      setStatus({ type: 'error', message: 'Set host and port first before executing handshakes.' });
      return;
    }

    setTesting(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          host,
          port: Number(port),
          username,
          password,
          secure,
          senderName,
          senderEmail,
          testRecipient: showTestInput ? testEmail : undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          type: 'success',
          message: data.message || 'SMTP handshakes completed with 0 errors. Gateways validated.'
        });
        setConnectionStatus('connected');
        if (showTestInput) {
          setShowTestInput(false);
        }
      } else {
        setStatus({
          type: 'error',
          message: data.error || data.message || 'Handshake failed. Verify firewall rules or credentials.'
        });
        setConnectionStatus('failed');
      }
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: err.message || 'Network timeout or transport gateway is unreachable.'
      });
      setConnectionStatus('failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
        <span className="text-white/40 text-xs font-mono uppercase tracking-widest">Decrypting Gateway Node Settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8" id="smtp-config-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Server className="w-6 h-6 text-accent" />
            SMTP Relay Configuration
          </h1>
          <p className="text-xs text-white/40 mt-1 font-mono">
            Connect your own outbound server nodes for independent organic campaign delivery
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Real-time Connectivity status badge */}
          {hasSavedConfig && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-mono font-bold uppercase tracking-wider ${
              connectionStatus === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : connectionStatus === 'failed'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : connectionStatus === 'testing'
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                : 'bg-white/5 border-white/10 text-white/40'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'failed'
                  ? 'bg-rose-400'
                  : connectionStatus === 'testing'
                  ? 'bg-cyan-400 animate-pulse'
                  : 'bg-white/25'
              }`} />
              {connectionStatus === 'connected' && 'Relay Active'}
              {connectionStatus === 'failed' && 'Relay Offline'}
              {connectionStatus === 'testing' && 'Testing...'}
              {connectionStatus === 'unchecked' && 'Unchecked'}
            </div>
          )}

          {hasSavedConfig ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              Relay Vault Synchronized
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-mono font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              Simulated Offline Mode Active
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Presets and Information */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 border-white/5 bg-white/2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-accent" />
              Gateway Presets
            </h2>
            <p className="text-xs text-white/40 mb-4">
              Apply standard configurations with a single click:
            </p>

            <div className="space-y-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  id={`preset-${preset.name.toLowerCase().replace(/\s+/g, '')}`}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all group flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-accent transition-all">{preset.name}</div>
                    <div className="text-[10px] text-white/30 font-mono mt-0.5">{preset.host}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 font-mono">
                    :{preset.port}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 border-white/5 bg-slate-950/20 text-xs text-white/40 space-y-3">
            <div className="flex items-start gap-2 text-white/60 font-bold mb-1">
              <HelpCircle className="w-4 h-4 text-accent shrink-0" />
              <span>Need Assistance?</span>
            </div>
            <p>
              PulseMail utilizes safe nodemailer transport logic to process your batches. For high deliverability:
            </p>
            <ul className="list-disc pl-4 space-y-1 font-mono text-[10px]">
              <li>Use port <span className="text-accent">465</span> with SSL enabled for secure standard handshakes</li>
              <li>Use port <span className="text-accent">587</span> with TLS/STARTTLS</li>
              <li>Ensure 2-Step Verification and an <span className="text-white/60">App Password</span> is set if utilizing Gmail servers</li>
            </ul>
          </div>
        </div>

        {/* Right column: Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="glass-panel p-8 border-white/5 bg-white/2 space-y-6">
            
            {/* Server settings */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                Server Handshake Parameters
              </h3>

              {/* Provider Preset Dropdown */}
              <div className="mb-5 bg-white/5 border border-white/5 p-4 rounded-lg">
                <label className="block text-[11px] font-mono text-white/40 uppercase tracking-wider mb-2">
                  Choose SMTP Provider
                  <InfoTooltip content="Select a major provider from the list to instantly pre-populate standard host, port, and security rules." />
                </label>
                <div className="relative">
                  <select
                    id="smtp-provider-preset-select"
                    value={selectedPresetName}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      if (selectedVal) {
                        const preset = PRESETS.find(p => p.name === selectedVal);
                        if (preset) {
                          applyPreset(preset);
                        }
                      } else {
                        setSelectedPresetName('');
                      }
                    }}
                    className="w-full bg-black/60 border border-white/10 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-accent font-sans appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900 text-white/50">Custom SMTP Server (No Preset Selected)</option>
                    {PRESETS.map((preset) => (
                      <option key={preset.name} value={preset.name} className="bg-slate-900 text-white">
                        {preset.name} — {preset.host}:{preset.port} {preset.secure ? '(SSL)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/40">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-mono text-white/40 uppercase tracking-wider mb-2">
                    SMTP Host Outbound Relay
                    <InfoTooltip content="The address of your SMTP server (e.g. smtp.gmail.com). Keeps outbound campaigns completely in your control." />
                  </label>
                  <div className="relative">
                    <Server className="absolute left-3 top-2.5 w-4 h-4 text-white/20" />
                    <input
                      type="text"
                      id="smtp-host-input"
                      value={host}
                      onChange={(e) => {
                        setHost(e.target.value);
                        setSelectedPresetName('');
                      }}
                      placeholder="e.g. smtp.gmail.com"
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white/40 uppercase tracking-wider mb-2">
                    Port
                    <InfoTooltip content="Common standard ports: 465 (SSL/TLS secure) or 587 (modern STARTTLS)." />
                  </label>
                  <input
                    type="number"
                    id="smtp-port-input"
                    value={port}
                    onChange={(e) => {
                      setPort(Number(e.target.value));
                      setSelectedPresetName('');
                    }}
                    placeholder="587"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between bg-black/20 p-4 rounded-lg border border-white/5">
                <div>
                  <span className="block text-xs font-bold text-white">
                    Require Secure TLS Handshake (SSL)
                    <InfoTooltip content="Enable this for port 465. Keep disabled/unchecked for port 587 which uses opportunistic STARTTLS." />
                  </span>
                  <span className="text-[10px] text-white/30 font-mono">Typically required for port 465, uncheck for port 587</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="smtp-secure-toggle"
                    checked={secure}
                    onChange={(e) => setSecure(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
            </div>

            {/* Authentication */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                Authentication & Verification
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-white/40 uppercase tracking-wider mb-2">
                    SMTP Username / Login
                    <InfoTooltip content="Your login username. Usually the full email address used to log in and authorize relays." />
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-white/20" />
                    <input
                      type="text"
                      id="smtp-username-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. user@domain.com"
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white/40 uppercase tracking-wider mb-2">
                    SMTP Password / App Secret
                    <InfoTooltip content="Authentication password. If utilizing standard services like Gmail/Outlook, please configure and input a secure App-Specific Password." />
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 w-4 h-4 text-white/20" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="smtp-password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-white/40 hover:text-white transition-colors focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sender Identity */}
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                Sender Mask / Outbound Identity
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-white/40 uppercase tracking-wider mb-2">
                    Sender Display Name
                    <InfoTooltip content="The human-readable sender name displayed in recipients' inbox (e.g. 'Campaign Support' or 'Nexus Team')." />
                  </label>
                  <input
                    type="text"
                    id="smtp-sender-name-input"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Campaign Office"
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white/40 uppercase tracking-wider mb-2">
                    Sender Email Address
                    <InfoTooltip content="The reply-to or bounce email address. For high inbox delivery rate, this should match your authenticated SMTP username domain." />
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-white/20" />
                    <input
                      type="email"
                      id="smtp-sender-email-input"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="e.g. bounce@domain.com"
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status alerts */}
            {status.type !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                id="smtp-status-alert"
                className={`p-4 rounded-lg flex items-start gap-3 border text-xs leading-relaxed ${
                  status.type === 'success' 
                    ? 'bg-accent/10 border-accent/20 text-accent' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {status.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                )}
                <div className="flex-1 font-mono">
                  {status.message}
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
              
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  id="smtp-handshake-btn"
                  disabled={testing || saving}
                  onClick={() => setShowTestInput(!showTestInput)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5 text-accent" />
                  {showTestInput ? 'Hide Handshake Test' : 'Test Handshake Connection'}
                </button>
                
                {showTestInput && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        id="smtp-test-recipient-input"
                        placeholder="Test email recipient"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-accent w-48"
                      />
                      <button
                        type="button"
                        id="smtp-execute-test-btn"
                        onClick={handleTestHandshake}
                        disabled={testing}
                        className="bg-accent hover:bg-accent/80 text-slate-950 font-bold px-3 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1"
                      >
                        {testing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : 'Send Test Mail'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  id="smtp-save-btn"
                  disabled={saving || testing}
                  className="px-6 py-2 bg-accent hover:bg-accent/80 text-slate-950 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/10 hover:shadow-accent/20"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                      Synchronizing Relay...
                    </>
                  ) : (
                    <>
                      Save & Apply Configuration
                    </>
                  )}
                </button>
              </div>

            </div>

          </form>
        </div>

      </div>
    </div>
  );
};
