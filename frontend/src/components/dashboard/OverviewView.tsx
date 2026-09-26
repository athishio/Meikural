import React from 'react';
import { HeroBand } from './HeroBand';
import { KPIGrid } from './KPIGrid';
import { UnifiedInputStudio } from './UnifiedInputStudio';
import { LiveVoiceSignalPanel } from './LiveVoiceSignalPanel';
import { VoiceTrustIndexPanel } from './VoiceTrustIndexPanel';
import { ThreatTimeline } from './ThreatTimeline';
import { QuickActions } from './QuickActions';
import type {
  KPICardData,
  VerdictType,
  TelemetryDiagnostics,
  ModelEvidenceItem,
  RulesConfig,
  ForensicUploadResult,
} from '../../types/dashboard';

interface OverviewViewProps {
  kpis: KPICardData[];
  voiceTrust: number;
  verdict: VerdictType;
  sessionId: string;
  rawLogit: number;
  confidence: number;
  spoofProbability: number;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  micError?: string | null;
  onClearMicError?: () => void;
  uploadLoading?: boolean;
  uploadError?: string | null;
  lastUploadResult?: ForensicUploadResult | null;
  onFileUpload: (file: File, codec?: string) => Promise<any>;
  onRunVerification: () => void;
  onEscalate: () => void;
  onSimulationScenario: (scenario: 'safe' | 'deepfake' | 'caution') => void;
  onTriggerChallenge: () => void;
  onOpenAudition?: () => void;
  activeScenario?: string | null;
  analyserNode: AnalyserNode | null;
  diagnostics: TelemetryDiagnostics;
  evidenceItems: ModelEvidenceItem[];
  onQuickAction: (actionId: string) => void;
  rules?: RulesConfig;
  isOffline?: boolean;
  demoMode?: boolean;
  activeInputMode?: 'upload' | 'mic' | 'telephony';
  onInputModeChange?: (mode: 'upload' | 'mic' | 'telephony') => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  kpis,
  voiceTrust,
  verdict,
  sessionId,
  rawLogit,
  confidence,
  spoofProbability,
  isMonitoring,
  onToggleMonitoring,
  micError,
  onClearMicError,
  uploadLoading,
  uploadError,
  lastUploadResult,
  onFileUpload,
  onRunVerification,
  onEscalate,
  onSimulationScenario,
  onTriggerChallenge,
  onOpenAudition,
  activeScenario,
  analyserNode,
  diagnostics,
  evidenceItems,
  onQuickAction,
  rules,
  isOffline = false,
  demoMode = false,
}) => {
  return (
    <div className="space-y-6 select-none">
      {/* Hero Banner (Master SOC Real-Time Status & Benchmark HUD) */}
      <HeroBand
        verdict={verdict}
        spoofProbability={spoofProbability}
        voiceTrust={voiceTrust}
        sessionId={sessionId}
        isMonitoring={isMonitoring}
        activeScenario={activeScenario}
        codec={diagnostics.codec}
        inferenceMs={diagnostics.inferenceMs}
        onTriggerChallenge={onTriggerChallenge}
        onEscalate={onEscalate}
      />

      {/* Row 1: Hero Stat Blocks (Voice Trust Index, Spoof Probability, Neural Inference, Chained Blocks) */}
      <KPIGrid kpis={kpis} />

      {/* Unified Input Studio: File Upload Mode, Live Mic Mode, Telephony Simulation */}
      <UnifiedInputStudio
        isMonitoring={isMonitoring}
        onToggleMonitoring={onToggleMonitoring}
        micError={micError}
        onClearMicError={onClearMicError}
        uploadLoading={uploadLoading}
        uploadError={uploadError}
        lastUploadResult={lastUploadResult}
        onFileUpload={onFileUpload}
        onRunVerification={onRunVerification}
        onEscalate={onEscalate}
        onSimulationScenario={onSimulationScenario}
        onTriggerChallenge={onTriggerChallenge}
        onOpenAudition={onOpenAudition}
        activeScenario={activeScenario}
        isOffline={isOffline}
        demoMode={demoMode}
      />

      {/* Row 2: Live Voice Signal Panel (Waveform / Spectrum / Model Evidence + 6 Telemetry Tiles) & Voice Trust Index Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveVoiceSignalPanel
            analyserNode={analyserNode}
            isRecording={isMonitoring}
            diagnostics={diagnostics}
            evidenceItems={evidenceItems}
            isOffline={isOffline}
          />
        </div>

        <div className="lg:col-span-1">
          <VoiceTrustIndexPanel
            score={voiceTrust}
            verdict={verdict}
            sessionId={sessionId}
            rawLogit={rawLogit}
            confidence={confidence}
            rules={rules}
            onTriggerChallenge={onTriggerChallenge}
          />
        </div>
      </div>

      {/* Row 3: Threat Timeline (30s rolling confidence) & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ThreatTimeline score={spoofProbability} />
        </div>

        <div className="lg:col-span-1">
          <QuickActions onActionClick={onQuickAction} />
        </div>
      </div>
    </div>
  );
};
