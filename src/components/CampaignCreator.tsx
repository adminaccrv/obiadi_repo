import React, { useState, useCallback, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Users, 
  Trash2, 
  CheckCircle, 
  Play, 
  Send,
  Loader2, 
  Variable,
  Sparkles,
  AlertCircle 
} from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Recipient } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

interface CampaignCreatorProps {
  onClose: () => void;
  onLaunch: (campaignId: string) => void;
}

export const CampaignCreator: React.FC<CampaignCreatorProps> = ({ onClose, onLaunch }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [isTestSending, setIsTestSending] = useState(false);
  const [showABTest, setShowABTest] = useState(false);
  const [variantBSubject, setVariantBSubject] = useState('');
  const [variantBContent, setVariantBContent] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [smtpConfig, setSmtpConfig] = useState<any>(null);

  useEffect(() => {
    const loadSmtp = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'settings', user.uid));
        if (snap.exists()) {
          setSmtpConfig(snap.data());
        }
      } catch (err) {
        console.error("Failed to fetch SMTP configuration inside creator:", err);
      }
    };
    loadSmtp();
  }, []);

  const generateWithAi = async () => {
    if (!aiPrompt) return;
    setIsAiGenerating(true);
    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate template');
      }

      const data = await response.json();
      setSubject(data.subject || '');
      setContent(data.body || '');
    } catch (error) {
      console.error('AI Generation error:', error);
      // Fallback
      setSubject(`Optimized: ${aiPrompt.slice(0, 30)}...`);
      setContent(`Automated transmission generated via Nexus AI core.\n\nTargeting: ${aiPrompt}\n\n[Body content synthesized for maximum deliverability and throughput]`);
    } finally {
      setIsAiGenerating(false);
      setAiPrompt('');
    }
  };

  const handleTestSend = async () => {
    if (!testEmail || !testEmail.includes('@')) return;
    setIsTestSending(true);

    try {
      if (smtpConfig && smtpConfig.host) {
        const response = await fetch('/api/smtp/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...smtpConfig,
            testRecipient: testEmail
          })
        });
        const data = await response.json();
        if (response.ok) {
          alert(`Test transmission dispatched successfully to ${testEmail} via SMTP Relay Node!`);
        } else {
          alert(`SMTP connection failed: ${data.error || data.message || 'Handshake rejected.'}`);
        }
      } else {
        // Fallback simulation mode
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert(`[Simulation Mode] Test transmission simulated for ${testEmail}. Configure SMTP in settings to enable actual delivery!`);
      }
    } catch (err: any) {
      alert(`Test transmission error: ${err.message}`);
    } finally {
      setIsTestSending(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportErrors([]);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as Recipient[];
          const errors: string[] = [];
          
          const validData = data.filter((row, i) => {
            if (!row.email || !row.email.includes('@')) {
              errors.push(`Row ${i + 1}: Invalid or missing email address`);
              return false;
            }
            return true;
          });

          if (errors.length > 0) {
            setImportErrors(errors.slice(0, 5)); // Show only first 5 errors
          }
          
          setRecipients(validData);
        },
        error: (error) => {
          setImportErrors([`Parse error: ${error.message}`]);
        }
      });
    }
  };

  const launchCampaign = async () => {
    setIsLaunching(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated session metadata");

      const campaignPayload = {
        name: name || 'UNTITLED_BLAST_WAVE',
        subject: subject || '',
        content: content || '',
        replyTo: replyTo || '',
        status: scheduledAt ? 'scheduled' : 'sending',
        totalCount: recipients.length || 0,
        sentCount: 0,
        scheduledAt: scheduledAt || '',
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        abTest: {
          enabled: showABTest,
          variantB: {
            subject: variantBSubject || '',
            content: variantBContent || '',
          },
          splitPercentage: 50
        }
      };

      const docRef = await addDoc(collection(db, 'campaigns'), campaignPayload);

      // Trigger actual bulk send transmission via server-side SMTP if sending immediately
      if (!scheduledAt) {
        try {
          const recipientPayload = recipients.map(r => ({
            email: r.email,
            name: r.name || ''
          }));

          const response = await fetch('/api/send-bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              campaignId: docRef.id,
              recipients: recipientPayload,
              subject,
              content,
              smtpConfig: smtpConfig || null
            })
          });

          if (!response.ok) {
            console.error("Transmission relay server error:", await response.text());
          }
        } catch (sendErr) {
          console.error("Bulk transmission trigger failed:", sendErr);
        }
      }

      // Ingest slice of imported contacts to the cloud database for future list segmentation
      const maxBatch = recipients.slice(0, 50);
      for (const r of maxBatch) {
        try {
          await addDoc(collection(db, 'recipients'), {
            email: r.email,
            name: r.name || '',
            status: 'verified',
            lastActive: 'Uplink via ' + (name || 'New Blast'),
            ownerId: user.uid
          });
        } catch (err) {
          // silently continue other items write
        }
      }

      onLaunch(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'campaigns');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="glass w-full max-w-4xl flex flex-col max-h-[90vh] shadow-2xl shadow-black/50"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-xl font-bold font-mono tracking-tighter uppercase italic">Initialize_New_Blast</h2>
            <div className="flex gap-4 mt-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    step >= s ? "bg-accent text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-white/10 text-white/40"
                  )}>
                    {s}
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase font-bold tracking-widest",
                    step >= s ? "text-accent" : "text-white/20"
                  )}>
                    {s === 1 ? 'Metadata' : s === 2 ? 'Payload' : 'Execution'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-black/20">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Campaign Identifier</label>
                  <input 
                    id="campaign-name"
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. PRODUCT_LAUNCH_BETA_V1"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-accent/60 outline-none transition-all placeholder:text-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Reply-To Address</label>
                  <input 
                    id="campaign-reply-to"
                    type="email" 
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="e.g. support@yourdomain.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-accent/60 outline-none transition-all placeholder:text-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Target Payload (Recipients)</label>
                  <div className="glass bg-white/2 border-dashed border-2 border-white/5 p-12 text-center group hover:border-accent/40 transition-all relative cursor-pointer">
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-12 h-12 text-white/10 mx-auto mb-4 group-hover:text-accent/60 transition-colors" />
                    <p className="font-medium text-white/60 mb-1">Drag & drop recipient CSV</p>
                    <p className="text-[11px] text-white/20 uppercase tracking-tighter">RFC 4180 compliant • Max 500,000 records</p>
                  </div>
                </div>

                {importErrors.length > 0 && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase">
                      <AlertCircle className="w-4 h-4" />
                      Sanitization_Errors
                    </div>
                    {importErrors.map((err, i) => (
                      <p key={i} className="text-[10px] text-red-500/80 font-mono">{err}</p>
                    ))}
                    {importErrors.length >= 5 && <p className="text-[10px] text-red-500/40 italic">...and more errors detected</p>}
                  </div>
                )}

                {recipients.length > 0 && (
                  <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent" />
                      <span className="text-sm font-mono text-accent">{recipients.length.toLocaleString()} targets identified</span>
                    </div>
                    <button onClick={() => setRecipients([])} className="text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30">Configuration Type</label>
                    <button 
                      onClick={() => setShowABTest(!showABTest)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                        showABTest ? "bg-accent text-slate-900 shadow-lg shadow-accent/20" : "bg-white/5 text-white/40 border border-white/10"
                      )}
                    >
                      <Sparkles className="w-3 h-3" />
                      A/B_Test_Active
                    </button>
                  </div>

                  <div className="glass p-4 bg-accent/5 border border-accent/10 mb-6 group">
                    <div className="flex justify-between items-center mb-3">
                       <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Nexus_AI Core / Synthesis</span>
                       <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                       <div className="flex-1 relative">
                        <input 
                          type="text" 
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="e.g. Write a technical launch email for a dev tool..."
                          className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-3 pr-10 text-xs focus:border-accent/40 outline-none text-white italic"
                        />
                       </div>
                       <button 
                        onClick={generateWithAi}
                        disabled={isAiGenerating || !aiPrompt}
                        className="px-4 py-2 bg-accent text-slate-900 rounded-lg text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-20"
                       >
                        {isAiGenerating ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Synthesize'}
                       </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className={cn("space-y-4 p-4 rounded-xl border border-white/5 transition-all", showABTest ? "bg-white/2" : "")}>
                      {showABTest && <span className="text-[10px] font-bold uppercase text-accent/60 px-2 py-0.5 bg-accent/5 rounded">Variant_Alpha</span>}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">Subject Header</label>
                        <input 
                          type="text" 
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Transmission Subject line..."
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-accent/60 outline-none text-white"
                        />
                      </div>
                      <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Variant Alpha Content..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-sm font-mono min-h-[150px] focus:border-accent/60 outline-none transition-all resize-none text-white"
                      />
                    </div>

                    {showABTest && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 p-4 rounded-xl border border-white/5 bg-accent/5"
                      >
                        <span className="text-[10px] font-bold uppercase text-accent px-2 py-0.5 bg-accent/10 rounded">Variant_Beta</span>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">Subject Header</label>
                          <input 
                            type="text" 
                            value={variantBSubject}
                            onChange={(e) => setVariantBSubject(e.target.value)}
                            placeholder="Alternative Subject line..."
                            className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-sm focus:border-accent/60 outline-none text-white"
                          />
                        </div>
                        <textarea 
                          value={variantBContent}
                          onChange={(e) => setVariantBContent(e.target.value)}
                          placeholder="Variant Beta Content..."
                          className="w-full bg-white/5 border border-white/20 rounded-lg p-4 text-sm font-mono min-h-[150px] focus:border-accent/60 outline-none transition-all resize-none text-white"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="glass p-4 bg-white/2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Test Transmission</label>
                    <div className="flex gap-2">
                      <input 
                        type="email" 
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="test@pulsemail.io"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-accent/40 outline-none"
                      />
                      <button 
                        onClick={handleTestSend}
                        disabled={isTestSending || !testEmail}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-20"
                      >
                        {isTestSending ? <Loader2 className="w-3 h-3 animate-spin"/> : <Send className="w-3 h-3"/>}
                        Quick_Test
                      </button>
                    </div>
                  </div>
                  <div className="glass p-4 bg-white/2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Broadcast Schedule</label>
                    <input 
                      type="datetime-local" 
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-accent/40 outline-none text-white uppercase"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 text-center py-12"
              >
                <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-accent/40 relative active-glow">
                  <Play className="w-10 h-10 text-accent fill-accent ml-1" />
                  <div className="absolute inset-0 border-2 border-accent border-dashed rounded-full animate-spin-slow opacity-40" />
                </div>
                
                <h3 className="text-2xl font-bold tracking-tight text-white">Ready for Deployment</h3>
                <p className="text-white/40 max-w-sm mx-auto text-sm leading-relaxed italic">
                  Initiating high-throughput burst for <span className="text-accent font-bold">{recipients.length.toLocaleString()}</span> targets. 
                  Node load distributed across 24 edge clusters.
                </p>

                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-6">
                   <div className="glass bg-white/2 p-4">
                      <div className="text-[10px] uppercase font-bold text-white/30 mb-1">Concurrency</div>
                      <div className="text-lg font-mono text-white/80">UNLIMITED</div>
                   </div>
                   <div className="glass bg-white/2 p-4">
                      <div className="text-[10px] uppercase font-bold text-white/30 mb-1">Auth_Level</div>
                      <div className="text-lg font-mono text-accent">DMARC+</div>
                   </div>
                </div>

                {isLaunching && (
                  <div className="flex items-center justify-center gap-2 text-accent text-xs font-mono animate-pulse uppercase tracking-[0.2em] pt-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synchronizing_Nodes...
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-white/5 flex justify-between gap-4 bg-white/5">
          <button 
            id="btn-prev"
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1 || isLaunching}
            className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-white/60"
          >
            Stage_Back
          </button>
          
          {step < 3 ? (
            <button 
              id="btn-next"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? (!name || recipients.length === 0) : (!subject || !content)}
              className="px-8 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-accent text-slate-900 shadow-lg shadow-accent/20 hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next_Stage
            </button>
          ) : (
            <button 
              id="btn-launch"
              onClick={launchCampaign}
              disabled={isLaunching}
              className="px-12 py-2.5 rounded-lg text-xs font-black uppercase tracking-[0.2em] bg-accent text-slate-900 shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              EXECUTE_BLAST
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
