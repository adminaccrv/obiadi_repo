import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
  icon: LucideIcon;
  sublabel?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, trend, icon: Icon, sublabel, className }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass p-6 flex flex-col justify-between relative overflow-hidden group hover:active-glow transition-all duration-300",
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 mb-1 block">
            {label}
          </span>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-mono font-medium tracking-tighter">{value}</h3>
            {trend && (
              <span className="text-xs font-medium text-accent">
                {trend}
              </span>
            )}
          </div>
        </div>
        <div className="p-2 bg-white/5 rounded-lg border border-white/5 group-hover:border-accent/30 transition-colors">
          <Icon className="w-5 h-5 text-white/20 group-hover:text-accent transition-colors" />
        </div>
      </div>
      
      {sublabel && (
        <div className="mt-2 text-xs text-white/20 font-mono italic">
          {sublabel}
        </div>
      )}
    </motion.div>
  );
};
