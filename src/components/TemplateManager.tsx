import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit3, 
  Copy, 
  Trash2, 
  Sparkles, 
  Layout, 
  Code, 
  X, 
  Loader2,
  HardDrive,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmailTemplate } from '../types';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { isDriveConnected, exportTemplatesArchiveToDrive, authorizeGoogleDrive } from '../lib/googleDrive';

export const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveSyncSuccess, setDriveSyncSuccess] = useState<string | null>(null);
  
  // Create state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Secure Query matching Firestore regulations: MUST explicitly filter by ownerId to pass allow rules
    const templatesQuery = query(
      collection(db, 'templates'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(templatesQuery, (snapshot) => {
      const loaded: EmailTemplate[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loaded.push({
          id: doc.id,
          name: data.name || 'Untitled Blueprint',
          subject: data.subject || '',
          content: data.content || '',
          updatedAt: data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toLocaleDateString() : 'Just now'
        });
      });
      setTemplates(loaded);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'templates');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No active credentials");

      await addDoc(collection(db, 'templates'), {
        name,
        subject,
        content,
        ownerId: user.uid,
        updatedAt: serverTimestamp()
      });

      setName('');
      setSubject('');
      setContent('');
      setShowCreateModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'templates');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you certain you want to delete this template payload?')) return;
    try {
      await deleteDoc(doc(db, 'templates', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `templates/${id}`);
    }
  };

  const handleBackupToDrive = async () => {
    if (!isDriveConnected()) {
      try {
        await authorizeGoogleDrive();
      } catch (err: any) {
        alert(`Google Drive Authorization error: ${err.message}`);
        return;
      }
    }

    if (templates.length === 0) {
      alert('No templates available to export.');
      return;
    }

    setIsDriveSyncing(true);
    try {
      const driveItem = await exportTemplatesArchiveToDrive(templates);
      setDriveSyncSuccess(`Exported ${templates.length} templates to Google Drive (${driveItem.name})`);
      setTimeout(() => setDriveSyncSuccess(null), 5000);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const filtered = templates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Content Foundry</h2>
          <p className="text-white/40 text-sm italic font-mono uppercase tracking-widest">Template Registry • Reusable transmission payloads</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackupToDrive}
            disabled={isDriveSyncing}
            className="glass border border-white/10 text-white/80 hover:text-white hover:border-accent/40 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Export all templates to Google Drive"
          >
            {isDriveSyncing ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : <HardDrive className="w-4 h-4 text-accent" />}
            Sync to Drive
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-accent text-slate-950 px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-accent/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Define_New
          </button>
        </div>
      </div>

      {driveSyncSuccess && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-accent text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{driveSyncSuccess}</span>
        </div>
      )}

      <div className="glass p-4 bg-white/2 relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <input 
          type="text" 
          placeholder="Filter blueprints by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:border-accent/40 transition-colors text-white"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-accent animate-spin mb-2" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-white/40">Synchronizing blueprints...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filtered.map((template, i) => (
              <motion.div 
                key={template.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="glass p-6 bg-white/2 group hover:border-accent/40 transition-all flex flex-col h-64 justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/5 rounded-xl group-hover:bg-accent/10 transition-colors">
                      <Layout className="w-5 h-5 text-white/30 group-hover:text-accent" />
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          setName(template.name + ' (Copy)');
                          setSubject(template.subject);
                          setContent(template.content);
                          setShowCreateModal(true);
                        }}
                        className="p-2 text-white/20 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Duplicate Template"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(template.id)}
                        className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Delete Template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1 group-hover:text-accent transition-colors truncate">{template.name}</h3>
                    <p className="text-xs text-white/40 font-mono mb-4 truncate">{template.subject || 'No Subject line'}</p>
                    <div className="flex gap-2">
                       <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-white/30 uppercase tracking-widest">Liquid_v2</div>
                       <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-white/30 uppercase tracking-widest">Cloud_Sync</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-between items-center mt-auto">
                  <span className="text-[10px] text-white/20 font-mono italic">Updated {template.updatedAt}</span>
                  <button 
                    onClick={() => {
                      setName(template.name);
                      setSubject(template.subject);
                      setContent(template.content);
                      setShowCreateModal(true);
                    }}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-accent hover:underline"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit_Blueprint
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <div 
            onClick={() => setShowCreateModal(true)}
            className="glass p-6 bg-white/2 border-dashed border-2 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-white/5 transition-all h-64"
          >
             <div className="w-12 h-12 rounded-full bg-accent/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
               <Sparkles className="w-6 h-6 text-accent animate-pulse" />
             </div>
             <h4 className="font-bold text-white/60 mb-2">Create New Blueprint</h4>
             <p className="text-xs text-white/20 px-6 uppercase tracking-wider font-mono">Tap here to construct a technical transmission layout.</p>
          </div>
        </div>
      )}

      {/* Slide-out Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass w-full max-w-xl p-8 bg-white/5 border border-white/10 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="text-lg font-bold font-mono text-accent uppercase tracking-wider">Blueprint_Payload Creator</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Template Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Onboarding Welcome V1" 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-accent/60 outline-none text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Subject Line</label>
                  <input 
                    type="text" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Welcome to PulseMail Nexus, {{name}}!" 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-accent/60 outline-none text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Email Body Payload (HTML/Markdown)</label>
                  <textarea 
                    value={content} 
                    onChange={e => setContent(e.target.value)}
                    placeholder="Type or paste your email body core here..." 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-sm font-mono min-h-[160px] focus:border-accent/60 outline-none resize-none text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-white/10 rounded-lg text-xs font-bold uppercase text-white/60 hover:bg-white/5"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="px-6 py-2 bg-accent text-slate-950 font-bold rounded-lg text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save_Payload
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
