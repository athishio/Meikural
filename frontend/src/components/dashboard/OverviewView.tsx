import React from 'react';
import { HeroBand } from './HeroBand';
import { VoiceTrustIndexPanel } from './VoiceTrustIndexPanel';
import { ThreatTimeline } from './ThreatTimeline';
import { UnifiedInputStudio } from './UnifiedInputStudio';
import { ActiveChallengePanel } from './ActiveChallengePanel';
import type {
  VerdictType,
  RulesConfig,
  ForensicUploadResult,
  TelemetryDiagnostics,
} from '../../types/dashboard';

interface OverviewViewProps {
  voiceTrust: number;
  verdict: VerdictType;
  sessionId: string;
  rawLogit: number;
  confidence: number;
  spoofProbability: number;
  uploadLoading?: boolean;
  uploadError?: string | null;
  lastUploadResult?: ForensicUploadResult | null;
  onFileUpload: (file: File, codec?: string) => Promise<any>;
  onTriggerChallenge: () => void;
  onEscalate?: () => void;
  showChallengeModal?: boolean;
  onCloseChallengeModal?: () => void;
  challengeDigits?: string;
  onResolveChallenge?: (passed: boolean) => void;
  activeScenario?: string | null;
  diagnostics?: TelemetryDiagnostics;
  rules?: RulesConfig;
  isMonitoring?: boolean;
  onToggleMonitoring?: () => void;
  analyserNode?: AnalyserNode | null;
  micError?: string | null;
  onClearMicError?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  voiceTrust,
  verdict,
  sessionId,
  rawLogit,
  spoofProbability,
  uploadLoading,
  uploadError,
  lastUploadResult,
  onFileUpload,
  onTriggerChallenge,
  onEscalate,
  showChallengeModal = false,
  onCloseChallengeModal = () => {},
  challengeDigits = '',
  onResolveChallenge = () => {},
  activeScenario,
  diagnostics,
  rules,
  isMonitoring,
  onToggleMonitoring,
  analyserNode,
  micError,
  onClearMicError,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Single Status Banner (State + One Line of Context) */}
      <HeroBand
        verdict={verdict}
        spoofProbability={spoofProbability}
        voiceTrust={voiceTrust}
        sessionId={sessionId}
        codec={lastUploadResult?.codecProfile || diagnostics?.codec || 'Clean PCM (16kHz)'}
        inferenceMs={lastUploadResult?.inferenceLatencyMs ?? diagnostics?.inferenceMs ?? 564.9}
        activeScenario={activeScenario}
        onTriggerChallenge={onTriggerChallenge}
        onEscalate={onEscalate}
      />

      {/* 2. Active Challenge Panel (Rendered ONLY when a challenge is active) */}
      <ActiveChallengePanel
        isOpen={showChallengeModal}
        onClose={onCloseChallengeModal}
        onResolve={onResolveChallenge}
        challengeDigits={challengeDigits}
      />

      {/* 3. Middle Grid: Trust Gauge (Left) + Threat Timeline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <VoiceTrustIndexPanel
          score={voiceTrust}
          verdict={verdict}
          sessionId={sessionId}
          rawLogit={rawLogit}
          inferenceMs={lastUploadResult?.inferenceLatencyMs ?? diagnostics?.inferenceMs ?? 564.9}
          rules={rules}
        />

        <ThreatTimeline score={spoofProbability} />
      </div>

      {/* 4. Bottom: Input Area (Live Mic + 3 Benchmark Buttons + Drop Zone + Visualizer) */}
      <UnifiedInputStudio
        uploadLoading={uploadLoading}
        uploadError={uploadError}
        lastUploadResult={lastUploadResult}
        onFileUpload={onFileUpload}
        isMonitoring={isMonitoring}
        onToggleMonitoring={onToggleMonitoring}
        analyserNode={analyserNode}
        micError={micError}
        onClearMicError={onClearMicError}
      />
    </div>
  );
};
