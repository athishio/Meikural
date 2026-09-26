export type VerdictType = 'ALLOW' | 'WARN' | 'ALERT';
export type RiskLevel = 'low' | 'medium' | 'high';
export type RiskBand = 'Low' | 'Medium' | 'High';
export type WebSocketState = 'live' | 'reconnecting' | 'offline';

export interface KPICardData {
  id: string;
  title: string;
  value: string;
  numericValue: number;
  delta: string;
  isPositive: boolean;
  deltaLabel: string;
  semanticColor: 'green' | 'red' | 'neutral';
  sparkline: number[];
}

export interface RiskPoint {
  date: string;
  timestamp: string;
  score: number;
  volume: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RiskAnnotation {
  id: string;
  riskLevel: 'High Risk' | 'Medium Risk' | 'Low Risk';
  score: number;
  timestamp: string;
  dateKey: string;
  color: string;
}

export interface TrunkSession {
  id: string;
  gateway: string;
  sessionId: string;
  callerHash: string;
  startTime: number;
  durationSeconds: number;
  voiceTrust: number; // 0 - 100
  channelState: 'Streaming' | 'Isolated';
  isIsolated: boolean;
  codec: string;
}

export interface IncidentRecord {
  id: string;
  sessionId: string;
  callerHash: string;
  riskClass: 'Critical Deepfake' | 'Suspicious Jitter' | 'Synthetic Speech Artifacts';
  spoofProbability: number; // 0.0 - 1.0
  voiceTrust: number; // 0 - 100
  triggerMechanism: string;
  dispatchedAlerts: string[];
  timestamp: string;
  certAvailable: boolean;
  prevHash: string;
  blockHash: string;
  verdict: VerdictType;
  details?: string;
}

export interface AuditRecord {
  id: string;
  sessionId: string;
  callerHash: string;
  voiceTrust: number; // 0 - 100
  verdict: VerdictType;
  challenge: 'Yes' | 'No';
  recordedTime: string;
  hashChainIntegrity: 'Valid Block' | 'Broken Chain' | 'Verification Failed';
  blockHash: string;
  prevHash: string;
  score: number;
  verified?: boolean;
}

export interface RulesConfig {
  bonafide_allow_threshold: number; // e.g. 0.35
  step_up_challenge_threshold: number; // e.g. 0.65
  critical_deepfake_threshold: number; // e.g. 0.65
  alert_recipients: string[];
  last_dispatch: {
    sip: number;
    twilio: number;
    smtp: number;
  };
}

export interface TelemetryDiagnostics {
  speechVad: 'ACTIVE' | 'SILENCE';
  rmsEnergy: string;
  inferenceMs: number;
  turnaroundMs: number;
  turnaroundLabel: 'Bio' | 'Synthetic-Lag';
  codec: string;
  sampleRate: string;
}

export interface ModelEvidenceItem {
  feature: string;
  value: string;
  percentage: number;
  weight: number;
  contribution: 'safe' | 'alert' | 'neutral';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'alert' | 'warn' | 'safe' | 'info';
  read: boolean;
}

export interface ActiveCallSummary {
  sessionId: string;
  rawLogit: number;
  spoofProbability: number;
  confidence: number;
  voiceTrust: number;
  verdict: VerdictType;
}

// Backward compatibility interfaces
export interface RecentAnalysis {
  id: string;
  sessionId?: string;
  fileName: string;
  result: 'Authentic' | 'Deepfake' | 'Uncertain';
  confidence: number;
  time: string;
  isPlaying?: boolean;
  duration?: string;
  size?: string;
  channel?: string;
  riskScore?: number;
  title?: string;
  status?: 'Authentic' | 'Deepfake' | 'Uncertain';
  timestamp?: string;
}

export interface ThreatType {
  id: string;
  name: string;
  count: number;
  percentage: number;
  severityColor: 'red' | 'amber' | 'amber-yellow' | 'gray';
}

export interface QuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  icon?: string;
  iconName?: 'upload' | 'mic' | 'files' | 'bar-chart';
  actionType?: 'upload' | 'record' | 'batch' | 'reports';
}

export interface ForensicUploadResult {
  filename: string;
  fileSize: number;
  sessionId: string;
  score: number;
  voiceTrust: number;
  verdict: 'ALLOW' | 'WARN' | 'STEP_UP_VERIFICATION';
  confidence: string;
  thresholdUsed: number;
  codecProfile: string;
  inferenceLatencyMs: number;
  audioHealth?: {
    is_speech: boolean;
    rms_db: number;
    duration_ms: number;
  };
  rawLogits?: number[];
  timestamp: number;
}

