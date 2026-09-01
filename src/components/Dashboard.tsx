import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Send, 
  Activity, 
  Clock, 
  Plus, 
  FileText, 
  Upload, 
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  CheckCircle,
  Zap,
  Play,
  RotateCcw,
  Server,
  RefreshCw,
  Sliders,
  Database,
  Calendar,
  Gauge
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { MetricCard } from './MetricCard';
import { AIComposer } from './AIComposer';
import { cn } from '../lib/utils';
import { Recipient, Campaign } from '../types';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const chartData = [
  { time: '00:00', sent: 12000, bounce: 400 },
  { time: '04:00', sent: 28000, bounce: 600 },
  { time: '08:00', sent: 15000, bounce: 300 },
  { time: '12:00', sent: 45000, bounce: 1200 },
  { time: '16:00', sent: 32000, bounce: 800 },
  { time: '20:00', sent: 50000, bounce: 1500 },
];

interface DashboardProps {
  setShowCreator: (show: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setShowCreator }) => {
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([
    {
      id: '1',
      name: 'Spring Launch 2026',
      subject: 'It\'s finally here!',
      content: '...',
      recipients: [],
      status: 'sending',
      sentCount: 34200,
      totalCount: 50000,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Monthly Newsletter',
      subject: 'April Updates',
      content: '...',
      recipients: [],
      status: 'completed',
      sentCount: 12500,
      totalCount: 12500,
      createdAt: new Date().toISOString(),
    }
  ]);

  // Firestore counts and settings status
  const [dbCounts, setDbCounts] = useState({
    campaigns: 0,
    recipients: 0,
    templates: 0,
    smtpHost: '',
    smtpStatus: 'loading' as 'loading' | 'active' | 'unconfigured' | 'error'
  });
  const [isDbLoading, setIsDbLoading] = useState(true);

  // Smart Auto-Refresh Configurations
  const [refreshInterval, setRefreshInterval] = useState<number>(15); // in seconds
  const [progress, setProgress] = useState<number>(0); // 0 to 100
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [flashRefreshed, setFlashRefreshed] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Dynamic fluctuation telemetry metrics (to simulate live network data on refresh)
  const [throughput, setThroughput] = useState(1250);
  const [avgLatency, setAvgLatency] = useState(12);
  const [queueSize, setQueueSize] = useState(12504);

  const fetchDbMetrics = async () => {
    const user = auth.currentUser;
    if (!user) {
      setDbCounts(prev => ({ ...prev, smtpStatus: 'unconfigured' }));
      setIsDbLoading(false);
      return;
    }

    try {
      // 1. Fetch campaigns count
      const campaignsQuery = query(
        collection(db, 'campaigns'),
        where('ownerId', '==', user.uid)
      );
      const campaignsSnap = await getDocs(campaignsQuery);
      const campaignsCount = campaignsSnap.size;

      // 2. Fetch recipients count
      const recipientsQuery = query(
        collection(db, 'recipients'),
        where('ownerId', '==', user.uid)
      );
      const recipientsSnap = await getDocs(recipientsQuery);
      const recipientsCount = recipientsSnap.size;

      // 3. Fetch templates count
      const templatesQuery = query(
        collection(db, 'templates'),
        where('ownerId', '==', user.uid)
      );
      const templatesSnap = await getDocs(templatesQuery);
      const templatesCount = templatesSnap.size;

      // 4. Fetch SMTP Config
      const smtpDocRef = doc(db, 'settings', user.uid);
      const smtpDocSnap = await getDoc(smtpDocRef);
      let smtpHost = '';
      let smtpStatus: 'active' | 'unconfigured' | 'error' = 'unconfigured';
      if (smtpDocSnap.exists()) {
        const smtpData = smtpDocSnap.data();
        if (smtpData.host) {
          smtpHost = smtpData.host;
          smtpStatus = 'active';
        }
      }

      setDbCounts({
        campaigns: campaignsCount,
        recipients: recipientsCount,
        templates: templatesCount,
        smtpHost,
        smtpStatus
      });
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('offline')) {
        console.warn("Firestore client is offline. Dashboard metrics will retry or use cached state.");
      } else {
        console.error("Failed to fetch dashboard DB metrics:", error);
      }
    } finally {
      setIsDbLoading(false);
    }
  };

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    setFlashRefreshed(true);
    
    // 1. Fetch live database metrics
    await fetchDbMetrics();

    // 2. Refresh/update telemetry metrics with slight high-tech fluctuations
    setThroughput(prev => Math.max(800, Math.min(2200, prev + Math.floor(Math.random() * 200) - 100)));
    setAvgLatency(prev => Math.max(6, Math.min(25, prev + Math.floor(Math.random() * 4) - 2)));
    setQueueSize(prev => Math.max(500, prev + Math.floor(Math.random() * 80) - 40));
    
    setLastRefreshed(new Date());

    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);

    setTimeout(() => {
      setFlashRefreshed(false);
    }, 1500);
  };

  // Auth changed listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchDbMetrics();
      } else {
        setIsDbLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Tab Visibility listener to pause auto-refresh when backgrounded
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Silky smooth interval progress loop
  useEffect(() => {
    if (refreshInterval === 0 || !isTabVisible) {
      setProgress(0);
      return;
    }

    const intervalTimeMs = 100; // update progress every 100ms
    const totalSteps = (refreshInterval * 1000) / intervalTimeMs;
    const stepIncrement = 100 / totalSteps;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Trigger refresh!
          triggerRefresh();
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalTimeMs);

    return () => clearInterval(timer);
  }, [refreshInterval, isTabVisible]);

  // Campaign progress simulation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCampaigns(prev => prev.map(c => {
        if (c.status === 'sending' && c.sentCount < c.totalCount) {
          const increment = Math.floor(Math.random() * 50) + 10;
          return { ...c, sentCount: Math.min(c.totalCount, c.sentCount + increment) };
        }
        return c;
      }));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 technical-grid scroll-smooth">
      <header className="glass p-6 flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">Pulse <span className="text-accent">Nexus</span></h1>
          <p className="text-xs text-white/40 uppercase tracking-widest">Distributed Mailing Engine v2.4</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Throughput</span>
            <span className="text-sm font-mono text-accent">{throughput.toLocaleString()} mails/sec</span>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <button 
            id="btn-new-campaign" 
            onClick={() => setShowCreator(true)}
            className="bg-accent text-slate-900 px-6 py-2.5 rounded-lg font-bold text-sm hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-accent/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-900 stroke-[3px]" />
            Initiate Blast
          </button>
        </div>
      </header>

      {/* Quick State Summary & Smart Auto-Refresh Panel */}
      <div 
        className={cn(
          "glass p-4 relative overflow-hidden transition-all duration-500 bg-white/[0.03] border",
          flashRefreshed ? "border-accent bg-accent/[0.02]" : "border-white/5"
        )}
      >
        {/* Progress indicator at the very bottom */}
        {refreshInterval > 0 && isTabVisible && (
          <div className="absolute bottom-0 left-0 h-[2px] bg-accent/40 transition-all duration-100 ease-linear shadow-[0_0_8px_#10b981]" style={{ width: `${progress}%` }} />
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left Side: Quick State Summary */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-white/50">
                Workspace State Ledger
              </span>
              {isDbLoading ? (
                <span className="text-[9px] font-mono text-white/30 lowercase animate-pulse">
                  (collating cluster segments...)
                </span>
              ) : (
                <span className="text-[9px] font-mono text-accent uppercase tracking-wider bg-accent/15 px-1.5 py-0.5 rounded">
                  SYS_HEALTH_ACTIVE
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Campaigns */}
              <div className="bg-black/20 p-2.5 rounded-lg border border-white/5 flex items-center gap-2.5 hover:bg-white/5 transition-colors">
                <div className="p-1.5 bg-accent/10 border border-accent/20 rounded-md">
                  <Send className="w-3.5 h-3.5 text-accent" />
                </div>
                <div>
                  <div className="text-[9px] font-mono text-white/35 uppercase tracking-wide">Campaigns</div>
                  <div className="text-xs font-mono font-bold text-white">
                    {isDbLoading ? "..." : dbCounts.campaigns} <span className="text-[9px] text-white/40">registered</span>
                  </div>
                </div>
              </div>

              {/* Recipients */}
              <div className="bg-black/20 p-2.5 rounded-lg border border-white/5 flex items-center gap-2.5 hover:bg-white/5 transition-colors">
                <div className="p-1.5 bg-accent/10 border border-accent/20 rounded-md">
                  <Users className="w-3.5 h-3.5 text-accent" />
                </div>
                <div>
                  <div className="text-[9px] font-mono text-white/35 uppercase tracking-wide">Uplinks</div>
                  <div className="text-xs font-mono font-bold text-white">
                    {isDbLoading ? "..." : dbCounts.recipients.toLocaleString()} <span className="text-[9px] text-white/40">nodes</span>
                  </div>
                </div>
              </div>

              {/* Templates */}
              <div className="bg-black/20 p-2.5 rounded-lg border border-white/5 flex items-center gap-2.5 hover:bg-white/5 transition-colors">
                <div className="p-1.5 bg-accent/10 border border-accent/20 rounded-md">
                  <FileText className="w-3.5 h-3.5 text-accent" />
                </div>
                <div>
                  <div className="text-[9px] font-mono text-white/35 uppercase tracking-wide">Blueprints</div>
                  <div className="text-xs font-mono font-bold text-white">
                    {isDbLoading ? "..." : dbCounts.templates} <span className="text-[9px] text-white/40">saved</span>
                  </div>
                </div>
              </div>

              {/* SMTP Connection */}
              <div className="bg-black/20 p-2.5 rounded-lg border border-white/5 flex items-center gap-2.5 hover:bg-white/5 transition-colors">
                <div className="p-1.5 bg-accent/10 border border-accent/20 rounded-md">
                  <Server className="w-3.5 h-3.5 text-accent" />
                </div>
                <div className="truncate flex-1">
                  <div className="text-[9px] font-mono text-white/35 uppercase tracking-wide">Mailing Relay</div>
                  <div className="text-xs font-mono font-bold text-white truncate flex items-center gap-1.5">
                    {isDbLoading ? (
                      "..."
                    ) : dbCounts.smtpStatus === 'active' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-pulse" />
                        <span className="truncate">{dbCounts.smtpHost}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                        <span className="text-amber-500">Unconfigured</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Smart Auto-Refresh Console */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5 lg:w-[420px]">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Sliders className="w-3 h-3 text-accent" />
                <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-white/40">
                  Telemetry Engine Speed
                </span>
              </div>
              <div className="text-[10px] font-mono text-white/60">
                {isRefreshing ? (
                  <span className="text-accent animate-pulse font-bold flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
                    SYSTEM_SYNCHRONIZING...
                  </span>
                ) : !isTabVisible ? (
                  <span className="text-amber-500 font-bold">● SLEEPING (TAB_INACTIVE)</span>
                ) : refreshInterval === 0 ? (
                  <span className="text-white/40">STANDBY (MANUAL ONLY)</span>
                ) : (
                  <span>LAST SYNC: {lastRefreshed.toLocaleTimeString()}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Speed Selector */}
              <select
                id="select-refresh-speed"
                value={refreshInterval}
                onChange={(e) => {
                  setRefreshInterval(Number(e.target.value));
                  setProgress(0);
                }}
                className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-mono font-bold text-accent uppercase tracking-wider outline-none focus:border-accent/40 cursor-pointer"
              >
                <option value={5}>Ultra (5s)</option>
                <option value={15}>Balanced (15s)</option>
                <option value={30}>Eco (30s)</option>
                <option value={60}>Eco Slow (60s)</option>
                <option value={0}>Standby (Off)</option>
              </select>

              {/* Force Sync button */}
              <button
                id="btn-force-sync"
                onClick={triggerRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3 h-3 text-accent", isRefreshing && "animate-spin")} />
                Sync
              </button>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Sent" value="842.5k" trend="+12.4%" icon={Send} sublabel="Current period stats" />
        <MetricCard label="Delivery Rate" value="98.2%" trend="+0.5%" icon={CheckCircle2} sublabel="Node verification active" />
        <MetricCard label="Avg. Latency" value={`${avgLatency}ms`} trend="-2ms" icon={Activity} sublabel="Global Edge distribution" />
        <MetricCard label="Queue Size" value={queueSize.toLocaleString()} icon={Clock} sublabel="Next processing batch" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass p-6 h-[400px]">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest text-white/60">
                   <Activity className="w-4 h-4 text-accent" />
                   Transmission Flow
                </h3>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">In-Flight</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Dropped</span>
                   </div>
                </div>
             </div>
             <div className="h-[300px] w-full min-h-[300px]" style={{ minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1} debounce={50}>
                   <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(8px)' }}
                        itemStyle={{ color: '#FFFFFF', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="sent" stroke="#10b981" fillOpacity={1} fill="url(#colorSent)" />
                      <Area type="monotone" dataKey="bounce" stroke="#EF4444" fill="#EF4444" fillOpacity={0.05} />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="glass overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Active Deployments</h3>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                <span className="text-[10px] text-accent uppercase font-bold tracking-widest">Monitoring</span>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {activeCampaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center border transition-all",
                      campaign.status === 'sending' ? "bg-accent/10 border-accent/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "bg-white/5 border-white/10"
                    )}>
                      {campaign.status === 'sending' ? (
                        <RotateCcw className="w-5 h-5 text-accent animate-spin-slow" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-accent/60" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-white/90">{campaign.name}</h4>
                      <p className="text-[10px] text-white/30 uppercase tracking-tight">{campaign.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-xs font-mono text-white/60">{campaign.sentCount.toLocaleString()} / {campaign.totalCount.toLocaleString()}</div>
                      <div className="w-48 bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden flex shadow-inner">
                        <div 
                          className="bg-accent h-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                          style={{ width: `${(campaign.sentCount / campaign.totalCount) * 100}%` }} 
                        />
                      </div>
                    </div>
                    {campaign.status === 'sending' ? (
                      <button className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                        <AlertCircle className="w-5 h-5" />
                      </button>
                    ) : (
                      <button className="p-2 text-white/20 hover:text-accent hover:bg-accent/10 rounded-lg transition-all">
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
             {[
               { name: 'GMAIL', success: 99.8, color: 'bg-blue-500' },
               { name: 'OUTLOOK', success: 100, color: 'bg-sky-400' },
               { name: 'YAHOO', success: 94.2, color: 'bg-purple-500' }
             ].map(provider => (
               <div key={provider.name} className="glass p-4 bg-white/2 border-white/5">
                 <div className="flex justify-between items-center mb-1.5">
                   <span className="text-[10px] font-bold text-white/30 tracking-widest">{provider.name}</span>
                   <span className="text-[10px] font-mono text-accent">{provider.success}%</span>
                 </div>
                 <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <div 
                     className={cn("h-full rounded-full transition-all duration-1000", provider.color)} 
                     style={{ width: `${provider.success}%` }} 
                   />
                 </div>
               </div>
             ))}
          </div>

          <div className="glass p-6 bg-black/20 overflow-hidden relative group">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              Live_Node_Throughput
            </h3>
            
            <div className="grid grid-cols-12 gap-1 pb-2">
               {Array.from({ length: 48 }).map((_, i) => (
                 <motion.div 
                   key={i}
                   animate={{ 
                     opacity: [0.1, 1, 0.1],
                     backgroundColor: ['rgba(16,185,129,0.1)', 'rgba(16,185,129,0.8)', 'rgba(16,185,129,0.1)']
                   }}
                   transition={{ 
                     duration: Math.random() * 2 + 1,
                     repeat: Infinity,
                     delay: Math.random() * 2
                   }}
                   className="h-4 rounded-[2px] bg-accent/20"
                 />
               ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/5 relative z-10">
               <div className="flex gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Active_Clusters</div>
                    <div className="text-xl font-mono">14 / 24</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Peak_Velocity</div>
                    <div className="text-xl font-mono text-accent">12.4K <span className="text-[10px]">msg/s</span></div>
                  </div>
               </div>
               <div className="text-right">
                  <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Global_Consensus</div>
                  <div className="flex items-center justify-end gap-1 text-accent font-mono">
                    <CheckCircle className="w-3 h-3" />
                    99.9%
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <AIComposer onGenerate={(s, c) => console.log(s, c)} />

          <div className="glass p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-accent/60" />
              Target Inventory
            </h3>
            <div className="space-y-4">
              <div className="p-6 border-2 border-dashed border-white/5 rounded-xl text-center hover:border-accent/30 transition-all cursor-pointer group bg-white/2">
                <FileSpreadsheet className="w-8 h-8 text-white/10 mx-auto mb-2 group-hover:text-accent/40 transition-colors" />
                <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Drop Dataset to ingest</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 glass bg-white/2 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors border-white/5">DB_Archive</button>
                <button className="flex-1 glass bg-white/2 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors border-white/5">Segments</button>
              </div>
            </div>
          </div>

          <div className="glass bg-accent/5 border-accent/20 p-4">
            <div className="flex items-center gap-2 mb-2">
               <AlertCircle className="w-4 h-4 text-accent" />
               <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Security Audit</span>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed italic">
              All 24 transit nodes report high sender reputation. 
              DMARC and SPF verification bypass successful for 99.8% of providers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
