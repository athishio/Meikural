import React from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Mic, Layers, FileText, ChevronRight, Zap, Headphones } from 'lucide-react';
import type { QuickActionItem } from '../../types/dashboard';

interface QuickActionsProps {
  onActionClick: (id: string) => void;
}

const defaultActions: QuickActionItem[] = [
  {
    id: 'audition',
    title: 'Audition Clips',
    subtitle: 'Play 4 benchmark reference clips',
    icon: 'Headphones',
  },
  {
    id: 'upload',
    title: 'Upload Audio',
    subtitle: 'File Upload & Forensics Studio',
    icon: 'UploadCloud',
  },
  {
    id: 'record',
    title: 'Record Live',
    subtitle: 'Live Microphone Test Studio',
    icon: 'Mic',
  },
  {
    id: 'reports',
    title: 'View Reports',
    subtitle: 'Compliance & forensic dossiers',
    icon: 'FileText',
  },
];

export const QuickActions: React.FC<QuickActionsProps> = ({ onActionClick }) => {
  const renderIcon = (name: string) => {
    switch (name) {
      case 'Headphones':
        return <Headphones className="w-4 h-4 text-text-primary group-hover:text-accent-primary transition-colors" strokeWidth={1.5} />;
      case 'UploadCloud':
        return <UploadCloud className="w-4 h-4 text-text-primary group-hover:text-accent-primary transition-colors" strokeWidth={1.5} />;
      case 'Mic':
        return <Mic className="w-4 h-4 text-text-primary group-hover:text-accent-primary transition-colors" strokeWidth={1.5} />;
      case 'Layers':
        return <Layers className="w-4 h-4 text-text-primary group-hover:text-accent-primary transition-colors" strokeWidth={1.5} />;
      case 'FileText':
        return <FileText className="w-4 h-4 text-text-primary group-hover:text-accent-primary transition-colors" strokeWidth={1.5} />;
      default:
        return <Zap className="w-4 h-4 text-text-primary group-hover:text-accent-primary transition-colors" strokeWidth={1.5} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="bg-card-panel border border-card-border rounded-xl p-5 shadow-card hover:border-card-border-hover transition-all flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-14 font-semibold text-text-primary tracking-tight">Quick Actions</h3>
            <span className="text-10 uppercase tracking-widest text-text-subtle font-mono bg-surface-elevated/60 px-1.5 py-0.5 rounded border border-card-border">
              Tools
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {defaultActions.map((action) => (
            <motion.button
              key={action.id}
              onClick={() => onActionClick(action.id)}
              whileHover={{ x: 2, backgroundColor: 'rgba(30, 34, 37, 0.5)' }}
              whileTap={{ scale: 0.98 }}
              className="group w-full flex items-center justify-between p-3 rounded-lg bg-surface-ground/70 border border-card-border hover:border-accent-border/50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-surface-elevated border border-card-border flex items-center justify-center group-hover:bg-accent-glow/10 group-hover:border-accent-border/50 transition-all">
                  {renderIcon(action.icon || '')}
                </div>
                <div>
                  <div className="text-13 font-medium text-text-primary group-hover:text-accent-primary transition-colors">
                    {action.title}
                  </div>
                  <div className="text-11 text-text-muted line-clamp-1">
                    {action.subtitle}
                  </div>
                </div>
              </div>

              <ChevronRight
                className="w-4 h-4 text-text-subtle group-hover:text-text-primary group-hover:translate-x-0.5 transition-all"
                strokeWidth={1.5}
              />
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-card-border flex items-center justify-between text-11 text-text-muted">
        <span>AASIST INT8 v2.4.1</span>
        <span className="flex items-center gap-1.5 text-accent-success">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse" />
          Ready
        </span>
      </div>
    </motion.div>
  );
};
