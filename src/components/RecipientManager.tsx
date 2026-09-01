import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trash2, 
  UserPlus, 
  Filter, 
  Download, 
  Mail, 
  CheckCircle2, 
  Clock, 
  X, 
  Loader2, 
  AlertCircle,
  Upload,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  HardDrive
} from 'lucide-react';
import { Recipient } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, deleteDoc, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import Papa from 'papaparse';
import { isDriveConnected, exportRecipientsCsvToDrive, authorizeGoogleDrive } from '../lib/googleDrive';

export const RecipientManager: React.FC = () => {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveSyncSuccess, setDriveSyncSuccess] = useState<string | null>(null);

  // Modal State
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'verified' | 'bounced' | 'unsubscribed'>('verified');
  const [saving, setSaving] = useState(false);

  // Tab selector for modal
  const [ingestTab, setIngestTab] = useState<'single' | 'csv'>('single');

  // CSV State variables
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState({ emailKey: '', nameKey: '', statusKey: '' });
  const [parsedRecipients, setParsedRecipients] = useState<Array<{
    email: string;
    name: string;
    status: 'verified' | 'unsubscribed' | 'bounced';
    valid: boolean;
    duplicate: boolean;
    reason?: string;
  }>>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [importingProgress, setImportingProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSummary, setImportSummary] = useState<{
    successCount: number;
    duplicateCount: number;
    invalidCount: number;
  } | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Must query with ownerId matching security rules constraint
    const recipientsQuery = query(
      collection(db, 'recipients'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(recipientsQuery, (snapshot) => {
      const loaded: Recipient[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loaded.push({
          id: doc.id,
          email: data.email || '',
          name: data.name || '',
          status: data.status || 'verified',
          lastActive: data.lastActive || 'Just now',
        });
      });
      setRecipients(loaded);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recipients');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (csvRows.length === 0) {
      setParsedRecipients([]);
      return;
    }

    const { emailKey, nameKey, statusKey } = columnMapping;
    const mapped = csvRows.map(row => {
      const rawEmail = (row[emailKey] || '').toString().trim();
      const rawName = nameKey ? (row[nameKey] || '').toString().trim() : '';
      const rawStatus = statusKey ? (row[statusKey] || '').toString().trim().toLowerCase() : 'verified';

      let parsedStatus: 'verified' | 'unsubscribed' | 'bounced' = 'verified';
      if (rawStatus === 'unsubscribed' || rawStatus === 'unsubscribe' || rawStatus === 'optout') {
        parsedStatus = 'unsubscribed';
      } else if (rawStatus === 'bounced' || rawStatus === 'bounce' || rawStatus === 'failed') {
        parsedStatus = 'bounced';
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(rawEmail);
      const isDuplicate = recipients.some(r => r.email.toLowerCase() === rawEmail.toLowerCase());

      return {
        email: rawEmail,
        name: rawName,
        status: parsedStatus,
        valid: isValidEmail,
        duplicate: isDuplicate,
        reason: !isValidEmail ? 'Invalid email format' : isDuplicate ? 'Email already in list' : undefined
      };
    });

    setParsedRecipients(mapped);
  }, [csvRows, columnMapping, recipients]);

  const resetCsvFlow = () => {
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping({ emailKey: '', nameKey: '', statusKey: '' });
    setParsedRecipients([]);
    setImportingProgress(null);
    setImportSummary(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCsvFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCsvFile(e.dataTransfer.files[0]);
    }
  };

  const processCsvFile = (file: File) => {
    setCsvFile(file);
    setImportSummary(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data;
        setCsvHeaders(headers);
        setCsvRows(rows);

        // Smart mapping prediction
        const emailKey = headers.find(h => /email|mail|uplink|address/i.test(h)) || headers[0] || '';
        const nameKey = headers.find(h => /name|identity|full.*name|first/i.test(h)) || '';
        const statusKey = headers.find(h => /status/i.test(h)) || '';

        setColumnMapping({ emailKey, nameKey, statusKey });
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
        alert("Parsing failure: verify CSV file integrity.");
      }
    });
  };

  const handleBulkImport = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const targets = parsedRecipients.filter(r => r.valid && (!skipDuplicates || !r.duplicate));
    if (targets.length === 0) return;

    setSaving(true);
    setImportingProgress({ current: 0, total: targets.length });

    let successCount = 0;
    const batchSize = 10;
    for (let i = 0; i < targets.length; i += batchSize) {
      const chunk = targets.slice(i, i + batchSize);
      await Promise.all(chunk.map(async (item) => {
        try {
          await addDoc(collection(db, 'recipients'), {
            email: item.email,
            name: item.name || '',
            status: item.status,
            lastActive: 'Imported via CSV',
            ownerId: user.uid
          });
          successCount++;
        } catch (err) {
          console.error("Failed to import row:", item.email, err);
        }
      }));

      setImportingProgress(prev => prev ? { ...prev, current: Math.min(i + batchSize, targets.length) } : null);
    }

    setSaving(false);
    setImportingProgress(null);

    setImportSummary({
      successCount,
      duplicateCount: parsedRecipients.filter(r => r.duplicate).length,
      invalidCount: parsedRecipients.filter(r => !r.valid).length
    });

    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated session info");

      await addDoc(collection(db, 'recipients'), {
        email,
        name,
        status,
        lastActive: 'Added manually',
        ownerId: user.uid
      });

      setEmail('');
      setName('');
      setStatus('verified');
      setShowIngestModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'recipients');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you certain you want to remove this node from your target list?')) return;
    try {
      await deleteDoc(doc(db, 'recipients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `recipients/${id}`);
    }
  };

  const filtered = recipients.filter(r => {
    const matchesSearch = r.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = 'Email,Name,Status,LastSync\n';
    const rows = filtered.map(r => `"${r.email}","${r.name || ''}","${r.status}","${r.lastActive}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recipients_export_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const filteredIds = filtered.map(r => r.id).filter(Boolean) as string[];
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const union = new Set([...prev, ...filteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you absolutely certain you want to permanently delete the ${selectedIds.length} selected target nodes?`)) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, 'recipients', id));
      });
      await batch.commit();
      setSelectedIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bulk-delete`);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplateCSV = () => {
    const headers = 'Email,Name,Status\n';
    const sampleRows = 'john.doe@example.com,John Doe,verified\njane.smith@example.com,Jane Smith,unsubscribed\nbounce-test@example.com,Bounce Test,bounced\n';
    const blob = new Blob([headers + sampleRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recipient_template.csv';
    link.click();
    URL.revokeObjectURL(url);
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

    if (recipients.length === 0) {
      alert('No recipients available to export.');
      return;
    }

    setIsDriveSyncing(true);
    try {
      const driveItem = await exportRecipientsCsvToDrive(recipients);
      setDriveSyncSuccess(`Exported ${recipients.length} recipients to Google Drive (${driveItem.name})`);
      setTimeout(() => setDriveSyncSuccess(null), 5000);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Target Inventory</h2>
          <p className="text-white/40 text-sm italic font-mono uppercase tracking-widest">
            Central Intelligence • {recipients.length.toLocaleString()} nodes indexed
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleBackupToDrive}
            disabled={isDriveSyncing || recipients.length === 0}
            className="glass border border-white/10 text-white/80 hover:text-white hover:border-accent/40 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Export all recipients as CSV directly to Google Drive"
          >
            {isDriveSyncing ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : <HardDrive className="w-4 h-4 text-accent" />}
            Sync to Drive
          </button>
          <button 
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="glass bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-20 cursor-pointer rounded-lg"
          >
            <Download className="w-4 h-4 text-accent" />
            Export_CSV
          </button>
          <button 
            onClick={() => setShowIngestModal(true)}
            className="bg-accent text-slate-950 px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-accent/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Ingest_Record
          </button>
        </div>
      </div>

      {driveSyncSuccess && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-accent text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{driveSyncSuccess}</span>
        </div>
      )}

      <div className="glass p-4 flex gap-4 bg-white/2">
        <div className="flex-1 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input 
            type="text" 
            placeholder="Search nodes by identity or uplink..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent/40 transition-colors text-white"
          />
        </div>
        <div className="h-10 w-px bg-white/10" />
        <div className="flex items-center gap-2 px-2">
          <span className="text-[10px] font-bold uppercase text-white/20">Status:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-xs font-bold text-accent uppercase tracking-widest focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
          </select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl"
        >
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-white/60">
              Selected <strong className="text-white">{selectedIds.length}</strong> target nodes for bulk modification
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 border border-white/10 hover:bg-white/5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white/60 cursor-pointer transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-rose-950/40 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedIds.length})
            </button>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-accent animate-spin mb-2" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-white/40">Synchronizing inventory...</span>
        </div>
      ) : (
        <div className="glass overflow-hidden bg-black/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="pl-6 pr-2 py-4 w-12 text-left">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every(r => selectedIds.includes(r.id!))}
                    onChange={handleToggleSelectAll}
                    className="accent-accent bg-[#111319] border border-white/10 rounded cursor-pointer w-4 h-4"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Uplink (Email)</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Identity (Name)</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Last_Sync</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {filtered.map((r, i) => (
                  <motion.tr 
                    key={r.id || r.email}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: i * 0.01 }}
                    className={cn(
                      "group hover:bg-white/5 transition-colors",
                      selectedIds.includes(r.id!) && "bg-white/[0.02]"
                    )}
                  >
                    <td className="pl-6 pr-2 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id!)}
                        onChange={() => handleToggleSelect(r.id!)}
                        className="accent-accent bg-[#111319] border border-white/10 rounded cursor-pointer w-4 h-4"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-md group-hover:bg-accent/10 transition-colors">
                          <Mail className="w-3.5 h-3.5 text-white/40 group-hover:text-accent" />
                        </div>
                        <span className="text-sm font-mono text-white/80">{r.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white/60">{r.name || 'Anonymous_Node'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        r.status === 'verified' ? "bg-accent/10 text-accent border border-accent/20" :
                        r.status === 'bounced' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                        "bg-white/10 text-white/40 border border-white/20"
                      )}>
                        {r.status === 'verified' ? <CheckCircle2 className="w-2.5 h-2.5" /> : 
                         r.status === 'bounced' ? <AlertCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                        {r.status}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-white/30 font-mono tracking-tighter italic">{r.lastActive}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleDelete(r.id!)}
                        className="p-2 text-white/10 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-20 text-center text-white/20 uppercase tracking-[0.5em] font-mono text-xs italic bg-white/2">
              Zero_nodes_recorded
            </div>
          )}
        </div>
      )}

      {/* Ingest Modal */}
      <AnimatePresence>
        {showIngestModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className={cn(
                "glass w-full p-8 bg-white/5 border border-white/10 shadow-2xl space-y-6 transition-all duration-300",
                ingestTab === 'csv' && csvFile && !importSummary && !importingProgress ? "max-w-3xl" : "max-w-md"
              )}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="text-lg font-bold font-mono text-accent uppercase tracking-wider">Ingest_Target Record</h3>
                <button 
                  onClick={() => { setShowIngestModal(false); resetCsvFlow(); }} 
                  className="text-white/40 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!importSummary && !importingProgress && (
                <div className="flex bg-black/40 p-1 rounded-lg gap-1 border border-white/5">
                  <button
                    type="button"
                    onClick={() => setIngestTab('single')}
                    className={cn(
                      "flex-1 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider text-center transition cursor-pointer",
                      ingestTab === 'single' ? "bg-accent text-slate-950 shadow" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Single Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setIngestTab('csv')}
                    className={cn(
                      "flex-1 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider text-center transition cursor-pointer",
                      ingestTab === 'csv' ? "bg-accent text-slate-950 shadow" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Bulk Upload (.csv)
                  </button>
                </div>
              )}

              {importSummary ? (
                <div className="text-center py-6 space-y-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/35 mb-2 text-emerald-400">
                    <CheckCircle2 className="w-10 h-10 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold font-mono text-white uppercase tracking-wider">Ingestion Cycle Complete</h4>
                    <p className="text-xs text-white/40 font-mono mt-1">THE SYSTEM UPDATED TARGET DIRECTORY SECURELY</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto pt-2">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg">
                      <span className="block text-[10px] font-mono text-emerald-400 font-bold uppercase">INGESTED</span>
                      <span className="text-2xl font-bold font-mono text-white">{importSummary.successCount}</span>
                    </div>
                    <div className="bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-lg">
                      <span className="block text-[10px] font-mono text-yellow-400 font-bold uppercase">DUPLICATES</span>
                      <span className="text-2xl font-bold font-mono text-white">{importSummary.duplicateCount}</span>
                    </div>
                    <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-lg">
                      <span className="block text-[10px] font-mono text-rose-400 font-bold uppercase">INVALID</span>
                      <span className="text-2xl font-bold font-mono text-white">{importSummary.invalidCount}</span>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => { resetCsvFlow(); setIngestTab('csv'); }}
                      className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Import Another
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowIngestModal(false); resetCsvFlow(); }}
                      className="px-6 py-2.5 bg-accent hover:scale-105 text-slate-950 rounded-lg text-xs font-bold uppercase tracking-wider transition font-mono shadow-lg shadow-accent/25 cursor-pointer"
                    >
                      Finish Cycle
                    </button>
                  </div>
                </div>
              ) : importingProgress ? (
                <div className="text-center py-10 space-y-6">
                  <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                      Processing Outbound Batch...
                    </h4>
                    <p className="text-[11px] text-white/40 font-mono">
                      Synchronizing with Firestore secure node inventory
                    </p>
                  </div>
                  
                  <div className="max-w-md mx-auto">
                    <div className="flex justify-between text-[11px] text-white/50 font-mono mb-2">
                      <span>Ingesting node {importingProgress.current} of {importingProgress.total}</span>
                      <span>{Math.round((importingProgress.current / importingProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-white/5 border border-white/5 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-accent h-full transition-all duration-300"
                        style={{ width: `${(importingProgress.current / importingProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : ingestTab === 'single' ? (
                <form onSubmit={handleIngest} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Node Email Uplink</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. contact@domain.com" 
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-accent/60 outline-none text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Contact Name (Identity)</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Richard Hendricks" 
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-accent/60 outline-none text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Initial Node Status</label>
                    <select 
                      value={status} 
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full bg-[#111319] border border-white/10 rounded-lg p-3 text-xs font-bold uppercase tracking-widest text-accent outline-none cursor-pointer"
                    >
                      <option value="verified">Verified</option>
                      <option value="unsubscribed">Unsubscribed</option>
                      <option value="bounced">Bounced</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => { setShowIngestModal(false); resetCsvFlow(); }}
                      className="px-4 py-2 border border-white/10 rounded-lg text-xs font-bold uppercase text-white/60 hover:bg-white/5 cursor-pointer"
                    >
                      Abort
                    </button>
                    <button 
                      type="submit" 
                      disabled={saving}
                      className="px-6 py-2 bg-accent text-slate-950 font-bold rounded-lg text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all cursor-pointer"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Ingest_Node
                    </button>
                  </div>
                </form>
              ) : !csvFile ? (
                <div className="space-y-4 animate-fade-in">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center space-y-4",
                      isDragging 
                        ? "border-accent bg-accent/10" 
                        : "border-white/15 bg-white/2 hover:border-white/30 hover:bg-white/[0.04]"
                    )}
                    onClick={() => document.getElementById('csv-file-picker')?.click()}
                  >
                    <input 
                      type="file" 
                      id="csv-file-picker" 
                      accept=".csv,text/csv" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                    <div className="p-4 bg-white/5 rounded-full border border-white/5 text-white/30">
                      <Upload className="w-8 h-8 text-accent" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Drag and drop CSV here</p>
                      <p className="text-[10px] text-white/40">or click to browse your local file system</p>
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] font-mono font-bold bg-white/5 border border-white/5 text-accent/80 px-2.5 py-1 rounded-full uppercase tracking-widest">
                        Supports standard CSV files
                      </span>
                    </div>
                  </div>
                  
                  {/* CSV Structure Tip */}
                  <div className="bg-black/20 border border-white/5 rounded-lg p-3.5 space-y-3.5 text-[11px] leading-relaxed text-white/50">
                    <div>
                      <p className="font-bold text-white/70 uppercase text-[10px] font-mono tracking-wider">Pro-Tip: Ideal Column Headers</p>
                      <p className="mt-1">The parser automatically detects header columns for you. Ensure your CSV has columns like <code className="text-accent font-mono">Email</code>, <code className="text-accent font-mono">Name</code> (optional), and <code className="text-accent font-mono">Status</code> (optional).</p>
                    </div>
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-white/30 font-mono uppercase">Need a starting template?</span>
                      <button
                        type="button"
                        onClick={downloadTemplateCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-accent rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        Download Template
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => { setShowIngestModal(false); resetCsvFlow(); }}
                      className="px-4 py-2 border border-white/10 rounded-lg text-xs font-bold uppercase text-white/60 hover:bg-white/5 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  {/* Uploaded File Header */}
                  <div className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider">{csvFile.name}</p>
                        <p className="text-[10px] text-white/40 font-mono">{(csvFile.size / 1024).toFixed(1)} KB • {csvRows.length} rows detected</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetCsvFlow}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer"
                    >
                      Remove File
                    </button>
                  </div>

                  {/* Schema column mapping dropdown selectors */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] font-mono border-b border-white/5 pb-2">
                      Column Configuration & Fields Mapping
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Email Key Mapping */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest font-mono">
                          Email (Required)
                        </label>
                        <select
                          value={columnMapping.emailKey}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, emailKey: e.target.value }))}
                          className="w-full bg-[#111319] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-accent outline-none cursor-pointer"
                        >
                          <option value="">-- Choose Field --</option>
                          {csvHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      {/* Name Key Mapping */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest font-mono">
                          Name (Optional)
                        </label>
                        <select
                          value={columnMapping.nameKey}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, nameKey: e.target.value }))}
                          className="w-full bg-[#111319] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-accent outline-none cursor-pointer"
                        >
                          <option value="">-- Skip Column --</option>
                          {csvHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      {/* Status Key Mapping */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest font-mono">
                          Status (Optional)
                        </label>
                        <select
                          value={columnMapping.statusKey}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, statusKey: e.target.value }))}
                          className="w-full bg-[#111319] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-accent outline-none cursor-pointer"
                        >
                          <option value="">-- Skip Column (Verified Default) --</option>
                          {csvHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Validation Summary badges */}
                  <div className="flex gap-3 bg-white/[0.01] border border-white/5 p-4 rounded-xl font-mono text-[11px] justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-white/60">
                        <strong className="text-white">{parsedRecipients.filter(r => r.valid && (!skipDuplicates || !r.duplicate)).length}</strong> Ready to Ingest
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-white/60">
                        <strong className="text-white">{parsedRecipients.filter(r => r.duplicate).length}</strong> Existing Duplicates
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span className="text-white/60">
                        <strong className="text-white">{parsedRecipients.filter(r => !r.valid).length}</strong> Invalid Emails
                      </span>
                    </div>
                  </div>

                  {/* Validation Table (Pre-view of parsed records) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] font-mono">
                        Target Nodes Preview (First 5 records)
                      </h4>
                      <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skipDuplicates}
                          onChange={(e) => setSkipDuplicates(e.target.checked)}
                          className="accent-accent bg-[#111319] border-white/10 rounded cursor-pointer"
                        />
                        <span>Skip Existing Duplicates</span>
                      </label>
                    </div>

                    <div className="border border-white/5 rounded-xl overflow-hidden bg-black/40">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/5 font-mono text-[10px] text-white/40 uppercase">
                            <th className="p-3">Email Uplink</th>
                            <th className="p-3">Identity Name</th>
                            <th className="p-3">Mapped Status</th>
                            <th className="p-3 text-right">Validation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[11px]">
                          {parsedRecipients.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-white/2">
                              <td className="p-3 font-mono text-white/80">{row.email || <span className="text-rose-400 italic">Missing Email</span>}</td>
                              <td className="p-3 text-white/60">{row.name || <span className="text-white/20 font-mono text-[10px]">Anonymous</span>}</td>
                              <td className="p-3 uppercase font-mono tracking-wider font-bold text-accent">{row.status}</td>
                              <td className="p-3 text-right">
                                {row.valid ? (
                                  row.duplicate ? (
                                    <span className="inline-flex items-center gap-1 text-yellow-400 bg-yellow-400/5 border border-yellow-400/10 px-1.5 py-0.5 rounded text-[10px]">
                                      <AlertTriangle className="w-3 h-3" /> Duplicate
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-400/5 border border-emerald-400/10 px-1.5 py-0.5 rounded text-[10px]">
                                      <Check className="w-3 h-3 animate-pulse" /> Valid Node
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-400/5 border border-rose-400/10 px-1.5 py-0.5 rounded text-[10px]">
                                    <X className="w-3 h-3" /> Invalid format
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedRecipients.length > 5 && (
                        <div className="p-2.5 border-t border-white/5 text-center text-[10px] font-mono text-white/30 italic">
                          And {parsedRecipients.length - 5} more records parsed successfully
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer of the CSV configuration page */}
                  <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
                    <button
                      type="button"
                      onClick={resetCsvFlow}
                      className="px-4 py-2 border border-white/10 rounded-lg text-xs font-bold uppercase text-white/60 hover:bg-white/5 font-mono cursor-pointer"
                    >
                      Clear File
                    </button>
                    <button
                      type="button"
                      disabled={saving || parsedRecipients.filter(r => r.valid && (!skipDuplicates || !r.duplicate)).length === 0}
                      onClick={handleBulkImport}
                      className="px-6 py-2 bg-accent text-slate-950 font-bold rounded-lg text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all cursor-pointer disabled:opacity-20 disabled:scale-100 disabled:cursor-not-allowed font-mono shadow-lg shadow-accent/25"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Ingest_Valid_Nodes ({parsedRecipients.filter(r => r.valid && (!skipDuplicates || !r.duplicate)).length})
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
