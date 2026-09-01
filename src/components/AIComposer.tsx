import React, { useState } from 'react';
import { Sparkles, Loader2, SendHorizontal, Save, Check, FileText, AlertCircle, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AIComposerProps {
  onGenerate: (subject: string, content: string) => void;
}

export const AIComposer: React.FC<AIComposerProps> = ({ onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [optimizationTip, setOptimizationTip] = useState<string | null>(null);

  // States for copy draft review and save flow
  const [generatedSubject, setGeneratedSubject] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setOptimizationTip(null);
    setGeneratedSubject(null);
    setGeneratedContent(null);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate template');
      }

      const data = await response.json();
      const subject = data.subject || '';
      const body = data.body || '';

      setGeneratedSubject(subject);
      setGeneratedContent(body);

      // Default template name based on generated subject
      const shortSubject = subject.length > 30 ? subject.substring(0, 27) + '...' : subject;
      setTemplateName(`AI Draft: ${shortSubject || prompt.substring(0, 25)}`);

      onGenerate(subject, body);
      if (data.optimizationTip) {
        setOptimizationTip(data.optimizationTip);
      }
      setPrompt('');
    } catch (error) {
      console.error('AI Generation error:', error);
      setSaveError('AI Generation service failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!generatedSubject || !generatedContent) return;
    if (!templateName.trim()) {
      setSaveError('Template name is required to save');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No active credentials found. Please sign in.");
      }

      await addDoc(collection(db, 'templates'), {
        name: templateName,
        subject: generatedSubject,
        content: generatedContent,
        ownerId: user.uid,
        updatedAt: serverTimestamp()
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    } catch (error: any) {
      console.error('Failed to save AI generated copy to template:', error);
      setSaveError(error.message || 'Failed to save template payload.');
      handleFirestoreError(error, OperationType.CREATE, 'templates');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass p-4 relative overflow-hidden bg-white/5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold uppercase tracking-widest text-accent">AI Campaign Draftsman</span>
      </div>
      
      <div className="relative">
        <textarea
          id="ai-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your campaign goals..."
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-accent/40 transition-all pr-12 resize-none text-white placeholder:text-white/20"
        />
        <button
          id="btn-generate-ai"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt}
          className={cn(
            "absolute bottom-3 right-3 p-2 rounded-md transition-all",
            prompt ? "bg-accent text-slate-900 shadow-lg shadow-accent/20" : "bg-white/10 text-white/20 cursor-not-allowed"
          )}
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {optimizationTip && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-accent/5 border border-accent/15 rounded-lg text-[11px] text-white/80"
          >
            <div className="flex items-center gap-1.5 text-accent font-bold uppercase tracking-wider text-[9px] mb-1">
              <Sparkles className="w-3 h-3 text-accent" />
              Gemini Copywriter Insights
            </div>
            <p className="leading-relaxed font-sans">{optimizationTip}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {generatedSubject !== null && generatedContent !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-white/5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Generated Copy Draft
              </span>
              <button
                id="btn-clear-ai-draft"
                onClick={() => {
                  setGeneratedSubject(null);
                  setGeneratedContent(null);
                  setSaveSuccess(false);
                  setSaveError(null);
                }}
                className="text-[10px] font-mono uppercase tracking-wider text-white/40 hover:text-red-400 transition-colors cursor-pointer"
              >
                Clear_Draft
              </button>
            </div>

            {/* Template Saving Form */}
            <div className="space-y-3 bg-black/20 p-4 border border-white/5 rounded-xl">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Template Registry Name</label>
                <input 
                  id="ai-template-name"
                  type="text" 
                  value={templateName} 
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="e.g. Welcome Series AI Draft" 
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-accent/40 outline-none text-white font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Subject Header</label>
                <input 
                  id="ai-subject-line"
                  type="text" 
                  value={generatedSubject} 
                  onChange={e => setGeneratedSubject(e.target.value)}
                  placeholder="Subject Line" 
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-accent/40 outline-none text-white font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Email Body Payload (HTML/Markdown)</label>
                <textarea 
                  id="ai-email-body"
                  value={generatedContent} 
                  onChange={e => setGeneratedContent(e.target.value)}
                  placeholder="Email Body Content" 
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-xs font-mono min-h-[120px] focus:border-accent/40 outline-none resize-none text-white"
                />
              </div>

              {saveError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-mono rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-lg flex items-center gap-1.5 animate-pulse">
                  <Check className="w-3.5 h-3.5 text-accent" />
                  <span>Draft saved successfully to templates collection!</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  id="btn-copy-ai-content"
                  type="button"
                  onClick={handleCopyToClipboard}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? 'Copied!' : 'Copy Copy'}
                </button>
                <button
                  id="btn-save-ai-template"
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={isSaving || saveSuccess}
                  className={cn(
                    "px-4 py-1.5 font-bold uppercase tracking-wider rounded-md text-[10px] flex items-center gap-1.5 transition-all cursor-pointer",
                    saveSuccess 
                      ? "bg-emerald-500 text-slate-950" 
                      : "bg-accent text-slate-950 hover:scale-105 shadow-lg shadow-accent/20"
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : saveSuccess ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {saveSuccess ? 'Payload_Saved' : 'Save_to_Templates'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

