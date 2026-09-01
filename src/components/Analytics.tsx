import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  MousePointer2, 
  MailOpen, 
  AlertTriangle, 
  Globe2,
  Zap,
  Info,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const deviceData = [
  { name: 'Mobile', value: 58 },
  { name: 'Desktop', value: 32 },
  { name: 'Tablet', value: 10 },
];

const engagementByHour = [
  { hour: '08:00', opens: 240, clicks: 45 },
  { hour: '10:00', opens: 480, clicks: 120 },
  { hour: '12:00', opens: 380, clicks: 90 },
  { hour: '14:00', opens: 620, clicks: 156 },
  { hour: '16:00', opens: 890, clicks: 210 },
  { hour: '18:00', opens: 450, clicks: 98 },
];

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6'];

export const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Aggregated Intelligence</h2>
          <p className="text-white/40 text-sm italic font-mono uppercase tracking-widest">Global Telemetry • Real-time engagement matrix</p>
        </div>
        <div className="flex gap-2">
          <div className="glass px-3 py-1 bg-white/5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Live_Stream</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Open Rate', value: '38.4%', icon: MailOpen, color: 'text-accent' },
          { label: 'Click-Through', value: '12.2%', icon: MousePointer2, color: 'text-blue-400' },
          { label: 'Spam Complaints', value: '0.02%', icon: AlertTriangle, color: 'text-yellow-400' },
          { label: 'Delivery Latency', value: '0.8s', icon: Zap, color: 'text-purple-400' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-5 bg-white/2"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{stat.label}</span>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </div>
            <div className="text-2xl font-mono font-bold">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass p-6 bg-white/2 min-h-[350px]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            Engagement Velocity
          </h3>
          <div className="h-[250px] w-full min-h-[250px]" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1} debounce={50}>
              <LineChart data={engagementByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <ReTooltip 
                  contentStyle={{ backgroundColor: '#0c0e14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="opens" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-6 bg-white/2 min-h-[350px] flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-blue-400" />
            Target Demographics
          </h3>
          <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-8">
            <div className="h-[200px] w-[200px] min-h-[200px]" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1} debounce={50}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {deviceData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs font-mono text-white/60">{d.name}</span>
                  <span className="text-xs font-bold text-white/80">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass p-6 bg-white/2 min-h-[350px]">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            A/B Variant Comparison
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {[
             { label: 'Variant A (Control)', opens: 42, clicks: 12, color: 'border-white/10' },
             { label: 'Variant B (Challenger)', opens: 51, clicks: 18, color: 'border-accent/40 bg-accent/5' },
           ].map(variant => (
             <div key={variant.label} className={cn("glass p-6 group transition-all", variant.color)}>
                <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">{variant.label}</div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <div className="text-[10px] uppercase font-bold text-white/20 mb-1">Open_Rate</div>
                      <div className="text-2xl font-mono">{variant.opens}%</div>
                   </div>
                   <div>
                      <div className="text-[10px] uppercase font-bold text-white/20 mb-1">CTR</div>
                      <div className="text-2xl font-mono">{variant.clicks}%</div>
                   </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                   <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-accent transition-all" style={{ width: `${variant.opens}%` }} />
                   </div>
                </div>
             </div>
           ))}
        </div>
        <div className="mt-8 flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
           <Zap className="w-5 h-5 text-accent" />
           <p className="text-xs text-white/40 italic">Nexus Intelligence indicates a <span className="text-white font-bold">significant statistical advantage</span> for Variant B. Recommendation: Divert remaining 50K payloads to Variant B.</p>
        </div>
      </div>

      <div className="glass p-6 bg-accent/5 border-accent/10">
        <div className="flex gap-4">
          <div className="p-3 bg-accent/10 rounded-xl">
             <Info className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-accent uppercase tracking-widest mb-1">AI Performance Insight</h4>
            <p className="text-xs text-white/60 leading-relaxed max-w-2xl italic">
              "Variant B (Concise) outperformed Variant A (Descriptive) by 24% in the last 48 hours. 
              The technical-grid layout has triggered high engagement from Desktop users in the DACH region. 
              Recommended optimization: Shift transmission window to 16:00 UTC for maximum open velocity."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
