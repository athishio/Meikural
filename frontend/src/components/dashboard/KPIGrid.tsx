import React from 'react';
import type { KPICardData } from '../../types/dashboard';
import { KPICard } from './KPICard';

interface KPIGridProps {
  kpis: KPICardData[];
}

export const KPIGrid: React.FC<KPIGridProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
      {kpis.map((kpi, idx) => (
        <KPICard key={kpi.id} data={kpi} index={idx} />
      ))}
    </div>
  );
};
