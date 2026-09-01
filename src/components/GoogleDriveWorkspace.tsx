import React, { useState, useEffect, useMemo } from 'react';
import { 
  HardDrive, 
  Cloud, 
  CloudOff, 
  Plus, 
  Search, 
  FileText, 
  FileSpreadsheet, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  Download, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Pin, 
  Tag, 
  Copy, 
  Edit3, 
  FolderPlus, 
  Layers, 
  Send, 
  Check, 
  X, 
  Eye, 
  Database,
  Loader2,
  FileCode,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  authorizeGoogleDrive, 
  getDriveAccessToken, 
  isDriveConnected, 
  getDriveUserEmail, 
  clearDriveToken, 
  subscribeToDriveAuth,
  listDriveFiles,
  saveNoteToDrive,
  deleteDriveFile,
  getDriveFileText,
  uploadFileToDrive,
  exportTemplatesArchiveToDrive,
  exportRecipientsCsvToDrive,
  DriveFileItem,
  DriveNote
} from '../lib/googleDrive';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';

const NOTE_COLORS: Record<DriveNote['color'], { bg: string; border: string; text: string; badge: string }> = {
  amber: {
    bg: 'bg-amber-950/30',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/20'
  },
  emerald: {
    bg: 'bg-emerald-950/30',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
  },
  violet: {
    bg: 'bg-purple-950/30',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/20'
  },
  rose: {
    bg: 'bg-rose-950/30',
    border: 'border-rose-500/30',
    text: 'text-rose-300',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/20'
  },
  sky: {
    bg: 'bg-sky-950/30',
    border: 'border-sky-500/30',
    text: 'text-sky-300',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/20'
  },
  slate: {
    bg: 'bg-white/[0.03]',
    border: 'border-white/10',
    text: 'text-white/80',
    badge: 'bg-white/10 text-white/70 border-white/15'
  },
};

const DEFAULT_NOTES: DriveNote[] = [
  {
    id: 'note-1',
    title: 'Q4 Product Launch Email Brief',
    content: 'Key bullet points for the upcoming winter blast:\n- Highlight 99.9% uptime SLA\n- Mention hardware micro-soldering capabilities\n- Call-to-Action link to ASUS technical portal\n- Target list: Gauteng enterprise accounts',
    category: 'campaign',
    color: 'emerald',
    isPinned: true,
    tags: ['Launch', 'Q4', 'ASUS'],
    updatedAt: new Date().toLocaleDateString()
  },
  {
    id: 'note-2',
    title: 'High-Converting Subject Line Ideas',
    content: '1. "Action Required: Upgraded Telemetry for your Node"\n2. "Your ASUS Hardware Health Report is Ready"\n3. "PulseMail Nexus: Scheduled Maintenance & Key Features"\n4. "Exclusive Invitation: Johannesburg Technical Summit"',
    category: 'idea',
    color: 'amber',
    isPinned: false,
    tags: ['Copywriting', 'A/B Testing'],
    updatedAt: new Date().toLocaleDateString()
  },
  {
    id: 'note-3',
    title: 'Pre-Flight Campaign Checklist',
    content: '[x] Verified sender domain SPF/DKIM\n[x] Tested custom SMTP credentials handshake\n[ ] Ingested updated CSV target recipients\n[ ] Checked template dynamic tags (e.g. {{name}})\n[ ] Sent test verification ping',
    category: 'checklist',
    color: 'sky',
    isPinned: true,
    tags: ['Pre-Flight', 'Compliance'],
    updatedAt: new Date().toLocaleDateString()
  }
];

export const GoogleDriveWorkspace: React.FC = () => {
  const [connected, setConnected] = useState(isDriveConnected());
  const [userEmail, setUserEmail] = useState<string | null>(getDriveUserEmail());
  const [activeSubTab, setActiveSubTab] = useState<'notes' | 'files' | 'backup'>('notes');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Notes state
  const [notes, setNotes] = useState<DriveNote[]>(() => {
    const saved = localStorage.getItem('NEXUS_GDRIVE_LOCAL_NOTES');
    return saved ? JSON.parse(saved) : DEFAULT_NOTES;
  });
  const [noteSearch, setNoteSearch] = useState('');
  const [noteCategoryFilter, setNoteCategoryFilter] = useState<string>('all');
  const [syncingNoteId, setSyncingNoteId] = useState<string | null>(null);

  // Edit / Create Note Modal
  const [editingNote, setEditingNote] = useState<DriveNote | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<DriveNote['category']>('campaign');
  const [noteColor, setNoteColor] = useState<DriveNote['color']>('emerald');
  const [noteTagsInput, setNoteTagsInput] = useState('');

  // Files state
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [previewFile, setPreviewFile] = useState<{ file: DriveFileItem; content: string } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Backup & Sync state
  const [isBackingUpTemplates, setIsBackingUpTemplates] = useState(false);
  const [isBackingUpRecipients, setIsBackingUpRecipients] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);

  // Sync listener for Drive auth
  useEffect(() => {
    const unsubscribe = subscribeToDriveAuth(() => {
      setConnected(isDriveConnected());
      setUserEmail(getDriveUserEmail());
    });
    return unsubscribe;
  }, []);

  // Save notes locally
  useEffect(() => {
    localStorage.setItem('NEXUS_GDRIVE_LOCAL_NOTES', JSON.stringify(notes));
  }, [notes]);

  // Load files from Google Drive when connected
  const refreshFiles = async () => {
    if (!isDriveConnected()) return;
    setIsLoadingFiles(true);
    try {
      const fetched = await listDriveFiles(fileSearch);
      setFiles(fetched);
    } catch (err: any) {
      console.error('Failed to list files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (connected && activeSubTab === 'files') {
      refreshFiles();
    }
  }, [connected, activeSubTab]);

  const handleConnect = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await authorizeGoogleDrive();
      setConnected(true);
      setUserEmail(getDriveUserEmail());
      if (activeSubTab === 'files') {
        refreshFiles();
      }
    } catch (err: any) {
      console.error('OAuth authorization failed:', err);
      setAuthError(err.message || 'Authorization failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm('Disconnect Google Drive from PulseMail Nexus?')) {
      clearDriveToken();
      setConnected(false);
      setUserEmail(null);
      setFiles([]);
    }
  };

  // Sync note to Google Drive
  const handleSyncNoteToDrive = async (note: DriveNote) => {
    if (!isDriveConnected()) {
      handleConnect();
      return;
    }
    setSyncingNoteId(note.id);
    try {
      const driveFile = await saveNoteToDrive(note);
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, driveFileId: driveFile.id, updatedAt: new Date().toLocaleDateString() } : n));
      setBackupSuccessMessage(`Note "${note.title}" synced directly to Google Drive!`);
      setTimeout(() => setBackupSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncingNoteId(null);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    const tags = noteTagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const updatedNote: DriveNote = {
      id: editingNote ? editingNote.id : `note-${Date.now()}`,
      driveFileId: editingNote?.driveFileId,
      title: noteTitle,
      content: noteContent,
      category: noteCategory,
      color: noteColor,
      isPinned: editingNote ? editingNote.isPinned : false,
      tags: tags.length > 0 ? tags : ['Workspace'],
      updatedAt: new Date().toLocaleDateString()
    };

    if (editingNote) {
      setNotes(prev => prev.map(n => n.id === editingNote.id ? updatedNote : n));
    } else {
      setNotes(prev => [updatedNote, ...prev]);
    }

    // Auto-sync if Drive is connected
    if (isDriveConnected()) {
      handleSyncNoteToDrive(updatedNote);
    }

    setIsCreatingNote(false);
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteTagsInput('');
  };

  const handleDeleteNote = (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    const noteToDelete = notes.find(n => n.id === id);
    if (noteToDelete?.driveFileId && isDriveConnected()) {
      deleteDriveFile(noteToDelete.driveFileId).catch(console.error);
    }
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleTogglePin = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  const openEditNote = (note: DriveNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category);
    setNoteColor(note.color);
    setNoteTagsInput(note.tags.join(', '));
    setIsCreatingNote(true);
  };

  // Convert Note to Template
  const handleSaveNoteAsTemplate = async (note: DriveNote) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('You must be signed in to save templates.');
      await addDoc(collection(db, 'templates'), {
        name: `[Drive] ${note.title}`,
        subject: note.title,
        content: note.content,
        ownerId: user.uid,
        updatedAt: serverTimestamp()
      });
      alert(`Note successfully imported into Content Foundry templates!`);
    } catch (err: any) {
      alert(`Could not save template: ${err.message}`);
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isDriveConnected()) {
      alert('Please connect Google Drive first.');
      return;
    }

    setUploadingFile(true);
    try {
      await uploadFileToDrive(file);
      await refreshFiles();
      setBackupSuccessMessage(`Successfully uploaded "${file.name}" to Google Drive!`);
      setTimeout(() => setBackupSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  // Preview file content
  const handlePreviewFile = async (file: DriveFileItem) => {
    setIsLoadingPreview(true);
    try {
      const text = await getDriveFileText(file.id);
      setPreviewFile({ file, content: text });
    } catch (err: any) {
      alert(`Failed to load file content: ${err.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Full backup of templates
  const handleBackupTemplates = async () => {
    if (!isDriveConnected()) {
      handleConnect();
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    setIsBackingUpTemplates(true);
    try {
      const snap = await getDocs(query(collection(db, 'templates'), where('ownerId', '==', user.uid)));
      const templatesList: any[] = [];
      snap.forEach(doc => templatesList.push({ id: doc.id, ...doc.data() }));

      if (templatesList.length === 0) {
        alert('No templates found in database to back up.');
        return;
      }

      const driveItem = await exportTemplatesArchiveToDrive(templatesList);
      setBackupSuccessMessage(`Successfully exported ${templatesList.length} templates to Google Drive (${driveItem.name})!`);
      setTimeout(() => setBackupSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    } finally {
      setIsBackingUpTemplates(false);
    }
  };

  // Full backup of recipients
  const handleBackupRecipients = async () => {
    if (!isDriveConnected()) {
      handleConnect();
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    setIsBackingUpRecipients(true);
    try {
      const snap = await getDocs(query(collection(db, 'recipients'), where('ownerId', '==', user.uid)));
      const recipientList: any[] = [];
      snap.forEach(doc => recipientList.push({ id: doc.id, ...doc.data() }));

      if (recipientList.length === 0) {
        alert('No recipient nodes found in database to back up.');
        return;
      }

      const driveItem = await exportRecipientsCsvToDrive(recipientList);
      setBackupSuccessMessage(`Successfully exported ${recipientList.length} target nodes as CSV to Google Drive (${driveItem.name})!`);
      setTimeout(() => setBackupSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(`Recipients export failed: ${err.message}`);
    } finally {
      setIsBackingUpRecipients(false);
    }
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = 
        n.title.toLowerCase().includes(noteSearch.toLowerCase()) || 
        n.content.toLowerCase().includes(noteSearch.toLowerCase()) ||
        n.tags.some(t => t.toLowerCase().includes(noteSearch.toLowerCase()));
      const matchesCat = noteCategoryFilter === 'all' || n.category === noteCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [notes, noteSearch, noteCategoryFilter]);

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);

  return (
    <div className="space-y-6">
      {/* Header with Title & Drive Connection Ribbon */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-accent">
              <HardDrive className="w-4 h-4" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Google Drive Workspace</h2>
          </div>
          <p className="text-white/40 text-sm font-mono uppercase tracking-widest italic">
            Keep-Style Scratchpad • Cloud Assets • Automated Drive Backups
          </p>
        </div>

        {/* OAuth Connection Status Box */}
        <div className="flex items-center gap-3">
          {connected ? (
            <div className="glass px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 shadow-lg shadow-emerald-950/20">
              <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-accent font-bold uppercase tracking-wider">
                  Drive Connected
                </span>
                <span className="text-xs text-white/80 font-mono truncate max-w-[180px]">
                  {userEmail || 'OAuth Session Active'}
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                className="ml-2 text-[10px] uppercase font-mono text-red-400/80 hover:text-red-400 hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                title="Disconnect Google Drive"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isAuthenticating}
              className="bg-accent hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-accent/20 hover:scale-105 transition-all cursor-pointer"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting Drive...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  Connect Google Drive
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {authError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
          <button onClick={() => setAuthError(null)} className="text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {backupSuccessMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-accent text-xs flex items-center gap-2 font-mono"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
          <span>{backupSuccessMessage}</span>
        </motion.div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex bg-black/40 p-1 rounded-xl gap-1 border border-white/5 max-w-md">
        <button
          onClick={() => setActiveSubTab('notes')}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center gap-2 cursor-pointer",
            activeSubTab === 'notes' ? "bg-accent text-slate-950 shadow-md font-mono" : "text-white/40 hover:text-white"
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          Notes & Scratchpad
        </button>
        <button
          onClick={() => setActiveSubTab('files')}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center gap-2 cursor-pointer",
            activeSubTab === 'files' ? "bg-accent text-slate-950 shadow-md font-mono" : "text-white/40 hover:text-white"
          )}
        >
          <HardDrive className="w-3.5 h-3.5" />
          Drive Files ({files.length})
        </button>
        <button
          onClick={() => setActiveSubTab('backup')}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center gap-2 cursor-pointer",
            activeSubTab === 'backup' ? "bg-accent text-slate-950 shadow-md font-mono" : "text-white/40 hover:text-white"
          )}
        >
          <Database className="w-3.5 h-3.5" />
          Sync & Backup
        </button>
      </div>

      {/* TAB 1: NOTES & SCRATCHPAD (KEEP-STYLE) */}
      {activeSubTab === 'notes' && (
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="glass p-4 bg-white/2 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                type="text"
                placeholder="Search notes by keyword, tags, or content..."
                value={noteSearch}
                onChange={e => setNoteSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-accent/40 font-sans"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={noteCategoryFilter}
                onChange={e => setNoteCategoryFilter(e.target.value)}
                className="bg-[#111319] text-xs font-bold text-accent uppercase tracking-widest border border-white/10 rounded-lg px-3 py-2 outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="campaign">Campaigns</option>
                <option value="template">Templates</option>
                <option value="idea">Ideas & Copy</option>
                <option value="checklist">Checklists</option>
                <option value="general">General</option>
              </select>

              <button
                onClick={() => {
                  setEditingNote(null);
                  setNoteTitle('');
                  setNoteContent('');
                  setNoteTagsInput('');
                  setNoteCategory('campaign');
                  setNoteColor('emerald');
                  setIsCreatingNote(true);
                }}
                className="bg-accent text-slate-950 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-md shadow-accent/20 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                New Note
              </button>
            </div>
          </div>

          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-accent font-bold">
                <Pin className="w-3.5 h-3.5 fill-accent" />
                Pinned Notes ({pinnedNotes.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => openEditNote(note)}
                    onDelete={() => handleDeleteNote(note.id)}
                    onTogglePin={() => handleTogglePin(note.id)}
                    onSync={() => handleSyncNoteToDrive(note)}
                    onSaveAsTemplate={() => handleSaveNoteAsTemplate(note)}
                    isSyncing={syncingNoteId === note.id}
                    isDriveConnected={connected}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Other Notes */}
          <div className="space-y-3">
            {pinnedNotes.length > 0 && (
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 font-bold">
                Other Notes ({unpinnedNotes.length})
              </div>
            )}
            {unpinnedNotes.length === 0 && pinnedNotes.length === 0 ? (
              <div className="glass p-16 text-center border-dashed border border-white/10 rounded-2xl bg-black/20 space-y-3">
                <FileText className="w-10 h-10 text-white/20 mx-auto" />
                <h4 className="text-white/60 font-bold text-sm uppercase font-mono tracking-wider">No matching notes found</h4>
                <p className="text-xs text-white/30 font-sans max-w-sm mx-auto">
                  Create your first note, checklist, or campaign brief. All items can be synced straight to your Google Drive!
                </p>
                <button
                  onClick={() => setIsCreatingNote(true)}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 font-bold rounded-lg text-xs uppercase tracking-widest cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Note
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpinnedNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => openEditNote(note)}
                    onDelete={() => handleDeleteNote(note.id)}
                    onTogglePin={() => handleTogglePin(note.id)}
                    onSync={() => handleSyncNoteToDrive(note)}
                    onSaveAsTemplate={() => handleSaveNoteAsTemplate(note)}
                    isSyncing={syncingNoteId === note.id}
                    isDriveConnected={connected}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE DRIVE FILE EXPLORER */}
      {activeSubTab === 'files' && (
        <div className="space-y-6">
          <div className="glass p-4 bg-white/2 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                type="text"
                placeholder="Search Google Drive workspace files..."
                value={fileSearch}
                onChange={e => setFileSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && refreshFiles()}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-accent/40 font-sans"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <button
                onClick={refreshFiles}
                disabled={isLoadingFiles || !connected}
                className="glass p-2 text-white/60 hover:text-white rounded-lg transition border border-white/10 cursor-pointer disabled:opacity-30"
                title="Refresh Drive Files"
              >
                <RefreshCw className={cn("w-4 h-4", isLoadingFiles && "animate-spin text-accent")} />
              </button>

              <label className={cn(
                "bg-accent hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer transition shadow-md shadow-accent/20",
                (!connected || uploadingFile) && "opacity-50 pointer-events-none"
              )}>
                {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload to Drive
                <input 
                  type="file" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".csv,.json,.txt,.md,.html,.pdf,.png,.jpg" 
                />
              </label>
            </div>
          </div>

          {!connected ? (
            <div className="glass p-16 text-center border-dashed border border-white/10 rounded-2xl bg-black/20 space-y-4">
              <CloudOff className="w-12 h-12 text-white/20 mx-auto" />
              <h4 className="text-white font-bold text-lg">Google Drive is not connected</h4>
              <p className="text-xs text-white/40 max-w-md mx-auto">
                Authorize Google Drive to browse, store, and import recipient CSVs, email templates, and campaign files directly.
              </p>
              <button
                onClick={handleConnect}
                disabled={isAuthenticating}
                className="px-6 py-2.5 bg-accent text-slate-950 font-bold rounded-lg text-xs uppercase tracking-widest inline-flex items-center gap-2 hover:scale-105 transition shadow-lg shadow-accent/25 cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                Authorize Google Drive
              </button>
            </div>
          ) : isLoadingFiles ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-accent animate-spin mb-2" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-white/40">
                Fetching Google Drive contents...
              </span>
            </div>
          ) : files.length === 0 ? (
            <div className="glass p-16 text-center border-dashed border border-white/10 rounded-2xl bg-black/20 space-y-3">
              <FolderOpen className="w-10 h-10 text-white/20 mx-auto" />
              <h4 className="text-white/60 font-bold text-sm uppercase font-mono tracking-wider">No files found</h4>
              <p className="text-xs text-white/30 max-w-sm mx-auto">
                Upload CSV recipient lists, HTML email templates, or sync notes to see them indexed here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map(file => {
                const isCsv = file.name.endsWith('.csv') || file.mimeType === 'text/csv';
                const isJson = file.name.endsWith('.json') || file.mimeType === 'application/json';
                const isHtml = file.name.endsWith('.html') || file.mimeType === 'text/html';

                return (
                  <div 
                    key={file.id} 
                    className="glass p-5 bg-white/2 hover:border-accent/40 transition-all rounded-xl flex flex-col justify-between h-48 group border border-white/5"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-white/5 rounded-lg text-accent group-hover:bg-accent/10 transition-colors">
                          {isCsv ? (
                            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                          ) : isJson ? (
                            <FileCode className="w-5 h-5 text-amber-400" />
                          ) : (
                            <FileText className="w-5 h-5 text-sky-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handlePreviewFile(file)}
                            className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded-md transition"
                            title="Quick Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-white/30 hover:text-accent hover:bg-white/10 rounded-md transition"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-white group-hover:text-accent transition-colors truncate mb-1" title={file.name}>
                        {file.name}
                      </h4>
                      <p className="text-[10px] text-white/40 font-mono truncate">
                        {file.description || file.mimeType}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/30">
                      <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                      <button
                        onClick={() => handlePreviewFile(file)}
                        className="text-accent uppercase font-bold hover:underline flex items-center gap-1"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BACKUP & DATA VAULT */}
      {activeSubTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Templates Backup Card */}
          <div className="glass p-6 bg-white/2 rounded-2xl border border-white/10 space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Email Templates Cloud Vault</h3>
                <p className="text-xs text-white/40 leading-relaxed font-sans mt-1">
                  Export all Content Foundry blueprints and HTML email bodies directly into a formatted JSON archive in your Google Drive.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-white/30 uppercase">Format: JSON Archive</span>
              <button
                onClick={handleBackupTemplates}
                disabled={isBackingUpTemplates}
                className="bg-accent text-slate-950 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50"
              >
                {isBackingUpTemplates ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Export to Drive
              </button>
            </div>
          </div>

          {/* Recipients CSV Backup Card */}
          <div className="glass p-6 bg-white/2 rounded-2xl border border-white/10 space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Target Inventory CSV Backup</h3>
                <p className="text-xs text-white/40 leading-relaxed font-sans mt-1">
                  Export all active recipient contacts, verified email nodes, and synchronization tags as a clean CSV file to Google Drive.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-white/30 uppercase">Format: CSV Spreadsheet</span>
              <button
                onClick={handleBackupRecipients}
                disabled={isBackingUpRecipients}
                className="bg-accent text-slate-950 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50"
              >
                {isBackingUpRecipients ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Export to Drive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT NOTE MODAL */}
      <AnimatePresence>
        {isCreatingNote && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass w-full max-w-xl p-6 bg-[#0a0d16] border border-white/10 shadow-2xl rounded-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold font-mono text-accent uppercase tracking-wider">
                  {editingNote ? 'Edit Workspace Note' : 'New Cloud Note / Scratchpad'}
                </h3>
                <button
                  onClick={() => { setIsCreatingNote(false); setEditingNote(null); }}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNote} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                    Note Title
                  </label>
                  <input 
                    type="text"
                    value={noteTitle}
                    onChange={e => setNoteTitle(e.target.value)}
                    placeholder="e.g. Campaign Brainstorm or Copy Notes"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent/60 outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                      Category
                    </label>
                    <select
                      value={noteCategory}
                      onChange={e => setNoteCategory(e.target.value as any)}
                      className="w-full bg-[#111319] border border-white/10 rounded-lg p-2.5 text-xs text-accent font-bold uppercase tracking-wider outline-none cursor-pointer"
                    >
                      <option value="campaign">Campaign</option>
                      <option value="template">Template</option>
                      <option value="idea">Idea & Copy</option>
                      <option value="checklist">Checklist</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                      Color Tint
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      {(['emerald', 'amber', 'violet', 'rose', 'sky', 'slate'] as DriveNote['color'][]).map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNoteColor(c)}
                          className={cn(
                            "w-6 h-6 rounded-full border transition-all cursor-pointer",
                            c === 'emerald' && "bg-emerald-500",
                            c === 'amber' && "bg-amber-500",
                            c === 'violet' && "bg-purple-500",
                            c === 'rose' && "bg-rose-500",
                            c === 'sky' && "bg-sky-500",
                            c === 'slate' && "bg-slate-500",
                            noteColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "opacity-60"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                    Content / Checklist / Markdown
                  </label>
                  <textarea 
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    placeholder="Write your email brief, checklist, or campaign ideas here..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-sans min-h-[140px] focus:border-accent/60 outline-none resize-none text-white leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                    Tags (Comma-separated)
                  </label>
                  <input 
                    type="text"
                    value={noteTagsInput}
                    onChange={e => setNoteTagsInput(e.target.value)}
                    placeholder="e.g. Q4, Launch, Urgent, ASUS"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-accent/60 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => { setIsCreatingNote(false); setEditingNote(null); }}
                    className="px-4 py-2 border border-white/10 rounded-lg text-xs font-bold uppercase text-white/60 hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-accent text-slate-950 font-bold rounded-lg text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Save Note
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FILE PREVIEW MODAL */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass w-full max-w-2xl p-6 bg-[#0a0d16] border border-white/10 shadow-2xl rounded-2xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-bold text-white truncate max-w-md font-mono">
                    {previewFile.file.name}
                  </h3>
                </div>
                <button onClick={() => setPreviewFile(null)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-xs text-white/80 whitespace-pre-wrap leading-relaxed">
                {previewFile.content || <span className="text-white/30 italic">File is empty or binary</span>}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/5 text-xs">
                <span className="text-[10px] text-white/30 font-mono">
                  Modified: {new Date(previewFile.file.modifiedTime).toLocaleString()}
                </span>
                <div className="flex gap-2">
                  {previewFile.file.webViewLink && (
                    <a
                      href={previewFile.file.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Drive
                    </a>
                  )}
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="px-4 py-1.5 bg-accent text-slate-950 font-bold rounded-lg text-[10px] uppercase tracking-wider"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Sub-component for individual Note card
interface NoteCardProps {
  note: DriveNote;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onSync: () => void;
  onSaveAsTemplate: () => void;
  isSyncing: boolean;
  isDriveConnected: boolean;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onSync,
  onSaveAsTemplate,
  isSyncing,
  isDriveConnected
}) => {
  const styling = NOTE_COLORS[note.color] || NOTE_COLORS.slate;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "glass p-5 rounded-2xl flex flex-col justify-between min-h-[220px] transition-all group relative border",
        styling.bg,
        styling.border
      )}
    >
      <div>
        {/* Header & Pin */}
        <div className="flex justify-between items-start mb-2.5">
          <span className={cn("px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest border", styling.badge)}>
            {note.category}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onTogglePin}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                note.isPinned ? "text-accent bg-accent/10" : "text-white/20 hover:text-white/60"
              )}
              title={note.isPinned ? "Unpin Note" : "Pin Note"}
            >
              <Pin className={cn("w-3.5 h-3.5", note.isPinned && "fill-accent")} />
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 text-white/20 hover:text-white rounded-lg transition-colors"
              title="Edit Note"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-white/20 hover:text-red-400 rounded-lg transition-colors"
              title="Delete Note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-sm font-bold text-white mb-2 leading-snug group-hover:text-accent transition-colors">
          {note.title}
        </h4>

        {/* Content */}
        <p className="text-xs text-white/70 whitespace-pre-line leading-relaxed line-clamp-4 font-sans mb-3">
          {note.content}
        </p>
      </div>

      <div>
        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {note.tags.map(t => (
              <span key={t} className="text-[9px] font-mono bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-white/40">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Footer & Actions */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1 text-white/30">
            {note.driveFileId ? (
              <span className="flex items-center gap-1 text-accent" title="Saved in Google Drive">
                <Cloud className="w-3 h-3" /> Synced
              </span>
            ) : (
              <span>{note.updatedAt}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSaveAsTemplate}
              className="text-white/40 hover:text-accent transition-colors uppercase tracking-wider font-bold"
              title="Convert Note into Email Template"
            >
              +Template
            </button>
            {isDriveConnected && (
              <button
                onClick={onSync}
                disabled={isSyncing}
                className="text-accent hover:underline uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer"
                title="Sync Note to Google Drive"
              >
                {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <HardDrive className="w-3 h-3" />}
                Sync
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
