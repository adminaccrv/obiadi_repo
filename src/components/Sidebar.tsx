import React, { useState, useEffect } from 'react';
import { Mail, Send, Users, BarChart3, Settings, LayoutDashboard, Terminal, LogOut, ShieldCheck, HardDrive, Cloud } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFirebase } from './FirebaseProvider';
import { auth } from '../lib/firebase';
import { isDriveConnected, subscribeToDriveAuth } from '../lib/googleDrive';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Campaigns', icon: Send },
  { id: 'recipients', label: 'Recipients', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'templates', label: 'Templates', icon: Mail },
  { id: 'gdrive', label: 'Google Drive', icon: HardDrive, isDrive: true },
  { id: 'settings', label: 'SMTP Config', icon: Settings },
  { id: 'licensing', label: 'Packaging & License', icon: ShieldCheck },
  { id: 'terminal', label: 'Logs', icon: Terminal },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useFirebase();
  const [driveConnected, setDriveConnected] = useState(isDriveConnected());

  useEffect(() => {
    const unsub = subscribeToDriveAuth(() => {
      setDriveConnected(isDriveConnected());
    });
    return unsub;
  }, []);

  return (
    <aside className="w-64 glass-panel h-full flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
          <Mail className="w-6 h-6 text-slate-950" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-xl tracking-tight leading-none text-white">Pulse<span className="text-accent underline decoration-accent/30 underline-offset-4">Mail</span></span>
          <span className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Enterprise Bulk</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] font-medium text-white/20 mb-4 px-2">
          Management
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm font-medium",
              activeTab === item.id 
                ? "bg-white/10 text-accent shadow-[0_0_15px_rgba(16,185,129,0.2)] border border-accent/30" 
                : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className={cn(
                "w-4 h-4",
                activeTab === item.id ? "text-accent" : "text-white/20 group-hover:text-white/40"
              )} />
              {item.label}
            </div>
            {item.isDrive && driveConnected && (
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" title="Google Drive Connected" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-2">
        {user && (
          <div className="flex items-center gap-3 px-3 py-4 mb-2 bg-white/2 rounded-xl border border-white/5">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-white/20" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                {user.displayName?.charAt(0) || user.email?.charAt(0)}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{user.displayName || 'Node_Primary'}</span>
              <span className="text-[9px] text-white/30 truncate font-mono uppercase italic">Authenticated</span>
            </div>
          </div>
        )}
        
        <button 
          id="btn-settings"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all text-xs font-medium"
        >
          <Settings className="w-4 h-4 text-white/20" />
          General_Settings
        </button>

         <button 
          onClick={() => auth.signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-400/5 transition-all text-xs font-medium"
        >
          <LogOut className="w-4 h-4 text-red-400/20" />
          Terminate_Session
        </button>
      </div>
    </aside>
  );
};
