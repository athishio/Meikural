import React from 'react';
import { Mic, MicOff, PlayCircle, AlertOctagon, Zap } from 'lucide-react';

interface SentinelControlsProps {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  onRunVerification: () => void;
  onEscalate: () => void;
  onSimulationScenario: (scenario: 'safe' | 'deepfake' | 'caution') => void;
  onTriggerChallenge: () => void;
  activeScenario?: string | null;
  isOffline?: boolean;
}

export const SentinelControls: React.FC<SentinelControlsProps> = ({
  isMonitoring,
  onToggleMonitoring,
  onRunVerification,
  onEscalate,
  onSimulationScenario,
  onTriggerChallenge,
  activeScenario,
  isOffline = false,
}) => {
  const offlineTooltip = isOffline ? 'Unavailable — backend disconnected' : undefined;

  return (
    <div className="bg-[#0D0F11] border border-[#1E2225] hover:border-[#2A2F33] rounded-[16px] p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-4 transition-all">
      {/* Action Buttons Cluster */}
      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
        <span className="text-[10px] font-mono text-[#5E666B] uppercase tracking-wider font-semibold mr-1">
          SENTINEL CONTROLS:
        </span>

        {/* Start / Stop Monitoring Button */}
        <button
          disabled={isOffline}
          title={offlineTooltip}
          onClick={onToggleMonitoring}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all shadow-sm ${
            isOffline
              ? 'opacity-40 cursor-not-allowed bg-[#1E2225] text-[#9BA3A8]'
              : isMonitoring
              ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse'
              : 'bg-[#FF4713] hover:bg-[#FF4713]/90 text-white shadow-[0_0_15px_rgba(255,71,19,0.25)]'
          }`}
        >
          {isMonitoring ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>{isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}</span>
        </button>

        {/* Run Verification Button */}
        <button
          disabled={isOffline}
          title={offlineTooltip}
          onClick={onRunVerification}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[12.5px] font-medium transition-all ${
            isOffline
              ? 'opacity-40 cursor-not-allowed bg-[#141719] border-[#1E2225] text-[#5E666B]'
              : 'bg-[#141719] hover:bg-[#1E2225] border-[#1E2225] hover:border-[#2A2F33] text-[#F2F4F5]'
          }`}
        >
          <PlayCircle className="w-4 h-4 text-[#22C55E]" />
          <span>Run Verification</span>
        </button>

        {/* Escalate Incident Button */}
        <button
          disabled={isOffline}
          title={offlineTooltip}
          onClick={onEscalate}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[12.5px] font-medium transition-all ${
            isOffline
              ? 'opacity-40 cursor-not-allowed bg-[#EF4444]/5 border-[#EF4444]/15 text-[#EF4444]/40'
              : 'bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border-[#EF4444]/30 text-[#EF4444]'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Escalate Incident</span>
        </button>
      </div>

      {/* Calibrated Simulation Chips */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end overflow-x-auto pb-1 md:pb-0">
        <span className="text-[10px] font-mono text-[#5E666B] uppercase tracking-wider font-semibold">
          SIMULATION:
        </span>

        {/* Human Chip */}
        <button
          disabled={isOffline}
          title={offlineTooltip}
          onClick={() => onSimulationScenario('safe')}
          className={`px-3 py-1.5 rounded-lg text-[11.5px] font-mono font-medium border flex items-center gap-1.5 transition-all ${
            isOffline
              ? 'opacity-40 cursor-not-allowed bg-[#141719] border-[#1E2225] text-[#5E666B]'
              : activeScenario === 'safe'
              ? 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
              : 'bg-[#141719] text-[#9BA3A8] border-[#1E2225] hover:text-[#F2F4F5] hover:border-[#2A2F33]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          Human
        </button>

        {/* Deepfake Chip */}
        <button
          disabled={isOffline}
          title={offlineTooltip}
          onClick={() => onSimulationScenario('deepfake')}
          className={`px-3 py-1.5 rounded-lg text-[11.5px] font-mono font-medium border flex items-center gap-1.5 transition-all ${
            isOffline
              ? 'opacity-40 cursor-not-allowed bg-[#141719] border-[#1E2225] text-[#5E666B]'
              : activeScenario === 'deepfake'
              ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
              : 'bg-[#141719] text-[#9BA3A8] border-[#1E2225] hover:text-[#F2F4F5] hover:border-[#2A2F33]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
          Deepfake
        </button>

        {/* Jitter Chip */}
        <button
          disabled={isOffline}
          title={offlineTooltip}
          onClick={() => onSimulationScenario('caution')}
          className={`px-3 py-1.5 rounded-lg text-[11.5px] font-mono font-medium border flex items-center gap-1.5 transition-all ${
            isOffline
              ? 'opacity-40 cursor-not-allowed bg-[#141719] border-[#1E2225] text-[#5E666B]'
              : activeScenario === 'caution'
              ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
              : 'bg-[#141719] text-[#9BA3A8] border-[#1E2225] hover:text-[#F2F4F5] hover:border-[#2A2F33]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          Jitter
        </button>

        {/* Dynamic Challenge Chip */}
        <button
          disabled={isOffline}
          title={offlineTooltip}
          onClick={onTriggerChallenge}
          className={`px-3 py-1.5 rounded-lg text-[11.5px] font-mono font-medium border flex items-center gap-1.5 transition-all ${
            isOffline
              ? 'opacity-40 cursor-not-allowed bg-[#141719] border-[#1E2225] text-[#5E666B]'
              : 'bg-[#141719] hover:bg-[#FF4713]/15 text-[#FF4713] border-[#FF4713]/30 hover:border-[#FF4713]/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Challenge
        </button>
      </div>
    </div>
  );
};
