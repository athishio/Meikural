import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileAudio,
  AlertTriangle,
  ShieldCheck,
  Mic,
  MicOff,
  Radio,
  PlayCircle,
  AlertOctagon,
  Zap,
  Headphones,
  Clock,
  X,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import type { ForensicUploadResult } from '../../types/dashboard';

interface UnifiedInputStudioProps {
  // Live mic & monitoring
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  micError?: string | null;
  onClearMicError?: () => void;

  // File upload mode
  uploadLoading?: boolean;
  uploadError?: string | null;
  lastUploadResult?: ForensicUploadResult | null;
  onFileUpload: (file: File, codec?: string) => Promise<any>;

  // Telephony simulation & sentinel actions
  onRunVerification: () => void;
  onEscalate: () => void;
  onSimulationScenario: (scenario: 'safe' | 'deepfake' | 'caution') => void;
  onTriggerChallenge: () => void;
  onOpenAudition?: () => void;
  activeScenario?: string | null;
  isOffline?: boolean;
  demoMode?: boolean;
  activeInputMode?: 'upload' | 'mic' | 'telephony';
  onInputModeChange?: (mode: 'upload' | 'mic' | 'telephony') => void;
}

export const UnifiedInputStudio: React.FC<UnifiedInputStudioProps> = ({
  isMonitoring,
  onToggleMonitoring,
  micError,
  onClearMicError,
  uploadLoading = false,
  uploadError = null,
  lastUploadResult = null,
  onFileUpload,
  onRunVerification,
  onEscalate,
  onSimulationScenario,
  onTriggerChallenge,
  onOpenAudition,
  activeScenario,
  isOffline = false,
  demoMode = false,
  activeInputMode: propInputMode,
  onInputModeChange,
}) => {
  const [internalMode, setInternalMode] = useState<'upload' | 'mic' | 'telephony'>('upload');
  const activeInputMode = propInputMode !== undefined ? propInputMode : internalMode;
  const setActiveInputMode = (m: 'upload' | 'mic' | 'telephony') => {
    setInternalMode(m);
    if (onInputModeChange) onInputModeChange(m);
  };
  const [selectedCodec, setSelectedCodec] = useState<string>('clean_pcm');
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadingClip, setLoadingClip] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const offlineTooltip = isOffline ? 'Unavailable — backend disconnected' : undefined;
  const isSimulationDisabled = isOffline || demoMode === false;
  const simTooltip = isOffline
    ? 'Unavailable — backend disconnected'
    : demoMode === false
    ? 'Simulation disabled: server DEMO_MODE=0 (AASIST pure neural inference path)'
    : undefined;

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setLocalError(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      await processSelectedFile(droppedFile);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    if (e.target.files && e.target.files.length > 0) {
      const pickedFile = e.target.files[0];
      await processSelectedFile(pickedFile);
    }
  };

  const processSelectedFile = async (file: File) => {
    // Validate format
    const validExtensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setLocalError(`Unsupported file format: "${file.name}". Please upload a WAV, MP3, M4A, FLAC, OGG, or WEBM audio file.`);
      return;
    }

    if (file.size === 0) {
      setLocalError('The selected file is empty (0 bytes). Please upload a valid audio recording.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setLocalError(`File size exceeds 25MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a shorter clip.`);
      return;
    }

    await onFileUpload(file, selectedCodec);
  };

  // 1-Click Benchmark Clip Loader
  const handleLoadDemoClip = async (filename: string, label: string, suggestedCodec: string) => {
    try {
      setLoadingClip(label);
      setLocalError(null);
      setSelectedCodec(suggestedCodec);

      const resp = await fetch(`/demo_clips/${filename}`);
      if (!resp.ok) {
        throw new Error(`Failed to load benchmark clip "${filename}" (HTTP ${resp.status})`);
      }

      const blob = await resp.blob();
      const file = new File([blob], filename, { type: blob.type || 'audio/wav' });
      await onFileUpload(file, suggestedCodec);
    } catch (err: any) {
      setLocalError(err.message || `Could not load benchmark clip ${filename}`);
    } finally {
      setLoadingClip(null);
    }
  };

  return (
    <div id="unified-input-studio" className="bg-[#0D0F11] border border-[#1E2225] hover:border-[#2A2F33] rounded-[16px] p-4 sm:p-5 shadow-card space-y-4 transition-all">
      {/* Top Bar: Input Mode Tabs & Sentinel Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#1E2225] pb-3.5">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#141719] rounded-xl border border-[#1E2225] overflow-x-auto">
          <button
            onClick={() => setActiveInputMode('upload')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all shrink-0 ${
              activeInputMode === 'upload'
                ? 'bg-[#FF4713] text-white shadow-[0_0_12px_rgba(255,71,19,0.3)] font-semibold'
                : 'text-[#9BA3A8] hover:text-[#F2F4F5] hover:bg-[#1E2225]'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>File Upload & Forensics</span>
          </button>

          <button
            onClick={() => setActiveInputMode('mic')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all shrink-0 ${
              activeInputMode === 'mic'
                ? 'bg-[#FF4713] text-white shadow-[0_0_12px_rgba(255,71,19,0.3)] font-semibold'
                : 'text-[#9BA3A8] hover:text-[#F2F4F5] hover:bg-[#1E2225]'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Live Microphone Test</span>
            {isMonitoring && (
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveInputMode('telephony')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all shrink-0 ${
              activeInputMode === 'telephony'
                ? 'bg-[#FF4713] text-white shadow-[0_0_12px_rgba(255,71,19,0.3)] font-semibold'
                : 'text-[#9BA3A8] hover:text-[#F2F4F5] hover:bg-[#1E2225]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Telephony Simulation</span>
          </button>
        </div>

        {/* Sentinel Actions: Verify & Escalate */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            disabled={isOffline}
            title={offlineTooltip}
            onClick={onRunVerification}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11.5px] font-medium transition-all ${
              isOffline
                ? 'opacity-40 cursor-not-allowed bg-[#141719] border-[#1E2225] text-[#5E666B]'
                : 'bg-[#141719] hover:bg-[#1E2225] border-[#1E2225] hover:border-[#2A2F33] text-[#F2F4F5]'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Verify Ledger</span>
          </button>

          <button
            disabled={isOffline}
            title={offlineTooltip}
            onClick={onEscalate}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11.5px] font-medium transition-all ${
              isOffline
                ? 'opacity-40 cursor-not-allowed bg-[#EF4444]/5 border-[#EF4444]/15 text-[#EF4444]/40'
                : 'bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border-[#EF4444]/30 text-[#EF4444]'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Escalate</span>
          </button>
        </div>
      </div>

      {/* MODE 1: FILE UPLOAD MODE */}
      {activeInputMode === 'upload' && (
        <div className="space-y-4">
          {/* Codec Selection & Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141719] p-3 rounded-xl border border-[#1E2225]">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#9BA3A8] uppercase tracking-wider font-semibold">
                Calibrated Codec Profile:
              </span>
              <select
                value={selectedCodec}
                onChange={(e) => setSelectedCodec(e.target.value)}
                className="bg-[#0D0F11] border border-[#2A2F33] text-[#F2F4F5] text-[11.5px] font-mono rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#FF4713] transition-colors"
              >
                <option value="clean_pcm">Clean PCM (16kHz Uncompressed) [Thresh -10.45]</option>
                <option value="g711_ulaw">G.711 µ-law Telephony (8kHz) [Thresh -8.64]</option>
                <option value="g711_alaw">G.711 A-law Telephony (8kHz) [Thresh -8.64]</option>
                <option value="pstn_narrowband">PSTN Narrowband (300-3400Hz) [Thresh -1.13]</option>
                <option value="amr_wb">AMR-WB Wideband (16kHz) [Thresh -7.98]</option>
              </select>
            </div>

            {/* Benchmark Quick Clips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-[#5E666B] uppercase font-semibold">
                Benchmark Clips:
              </span>
              <button
                disabled={uploadLoading || loadingClip !== null}
                onClick={() => handleLoadDemoClip('bonafide_human_speech.wav', 'human', 'clean_pcm')}
                className="px-2.5 py-1 rounded bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30 text-[11px] font-mono transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {loadingClip === 'human' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileCheck className="w-3 h-3" />}
                <span>Human Speech</span>
              </button>

              <button
                disabled={uploadLoading || loadingClip !== null}
                onClick={() => handleLoadDemoClip('deepfake_voice_clone.wav', 'deepfake', 'g711_ulaw')}
                className="px-2.5 py-1 rounded bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-[11px] font-mono transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {loadingClip === 'deepfake' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                <span>Voice Clone</span>
              </button>

              <button
                disabled={uploadLoading || loadingClip !== null}
                onClick={() => handleLoadDemoClip('caution_noisy_telecom.wav', 'caution', 'pstn_narrowband')}
                className="px-2.5 py-1 rounded bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 text-[11px] font-mono transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {loadingClip === 'caution' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3" />}
                <span>Noisy PSTN</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-[#FF4713] bg-[#FF4713]/10 shadow-[0_0_20px_rgba(255,71,19,0.2)]'
                : 'border-[#1E2225] hover:border-[#FF4713]/50 bg-[#141719]/60 hover:bg-[#141719]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".wav,.mp3,.m4a,.flac,.ogg,.webm,audio/*"
              className="hidden"
            />

            <div className="w-12 h-12 rounded-full bg-[#1E2225] flex items-center justify-center mb-3 text-[#FF4713]">
              {uploadLoading ? (
                <RefreshCw className="w-6 h-6 animate-spin text-[#FF4713]" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <p className="text-[13.5px] font-semibold text-[#F2F4F5]">
              {uploadLoading ? 'Running AASIST Neural Scoring...' : 'Drag & drop audio recording, or click to browse'}
            </p>
            <p className="text-[11.5px] text-[#9BA3A8] mt-1">
              Supports WAV, MP3, M4A, FLAC, OGG, WEBM · Scored with calibrated LLR threshold & AASIST backbone
            </p>
          </div>

          {/* Error Banner */}
          {(localError || uploadError) && (
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl flex items-start justify-between gap-3 text-[#EF4444] text-[12px] font-mono">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{localError || uploadError}</span>
              </div>
              <button
                onClick={() => setLocalError(null)}
                className="text-[#EF4444] hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Forensic Result Card (matches live call view) */}
          {lastUploadResult && (
            <div className="bg-[#141719] border border-[#2A2F33] rounded-xl p-4 space-y-3 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E2225] pb-2.5">
                <div className="flex items-center gap-2.5">
                  <FileAudio className="w-4 h-4 text-[#FF4713]" />
                  <span className="text-[12.5px] font-mono font-semibold text-[#F2F4F5] truncate max-w-[280px]">
                    {lastUploadResult.filename}
                  </span>
                  <span className="text-[11px] font-mono text-[#5E666B]">
                    ({(lastUploadResult.fileSize / 1024).toFixed(1)} KB)
                  </span>
                </div>

                {/* Verdict Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-lg text-[11.5px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                      lastUploadResult.verdict === 'ALLOW'
                        ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/40'
                        : lastUploadResult.verdict === 'WARN'
                        ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40'
                        : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40 animate-pulse'
                    }`}
                  >
                    {lastUploadResult.verdict === 'ALLOW' && <ShieldCheck className="w-3.5 h-3.5" />}
                    {lastUploadResult.verdict === 'WARN' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {lastUploadResult.verdict === 'STEP_UP_VERIFICATION' && <AlertOctagon className="w-3.5 h-3.5" />}
                    <span>
                      {lastUploadResult.verdict === 'ALLOW'
                        ? 'ALLOW (AUTHENTIC HUMAN)'
                        : lastUploadResult.verdict === 'WARN'
                        ? 'WARN (SUSPICIOUS JITTER)'
                        : 'STEP-UP (DEEPFAKE CLONE)'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="bg-[#0D0F11] p-2.5 rounded-lg border border-[#1E2225]">
                  <span className="text-[10px] font-mono text-[#5E666B] uppercase block">Voice Trust Index</span>
                  <span className="text-[15px] font-mono font-bold text-[#F2F4F5]">
                    {lastUploadResult.voiceTrust}/100
                  </span>
                </div>

                <div className="bg-[#0D0F11] p-2.5 rounded-lg border border-[#1E2225]">
                  <span className="text-[10px] font-mono text-[#5E666B] uppercase block">Spoof Probability</span>
                  <span className={`text-[15px] font-mono font-bold ${
                    lastUploadResult.score > 0.5 ? 'text-[#EF4444]' : 'text-[#22C55E]'
                  }`}>
                    {(lastUploadResult.score * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="bg-[#0D0F11] p-2.5 rounded-lg border border-[#1E2225]">
                  <span className="text-[10px] font-mono text-[#5E666B] uppercase block">Inference Latency</span>
                  <span className="text-[15px] font-mono font-bold text-[#22C55E] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#22C55E]" />
                    {lastUploadResult.inferenceLatencyMs.toFixed(1)} ms
                  </span>
                </div>

                <div className="bg-[#0D0F11] p-2.5 rounded-lg border border-[#1E2225]">
                  <span className="text-[10px] font-mono text-[#5E666B] uppercase block">Threshold & Codec</span>
                  <span className="text-[11.5px] font-mono text-[#9BA3A8] block truncate" title={`${lastUploadResult.codecProfile} (threshold: ${lastUploadResult.thresholdUsed})`}>
                    {lastUploadResult.codecProfile} ({lastUploadResult.thresholdUsed})
                  </span>
                </div>
              </div>

              {/* Audio Health Details */}
              {lastUploadResult.audioHealth && (
                <div className="flex items-center gap-4 text-[11px] font-mono text-[#9BA3A8] pt-1">
                  <span>RMS Energy: {lastUploadResult.audioHealth.rms_db.toFixed(1)} dB</span>
                  <span>Speech Detected: {lastUploadResult.audioHealth.is_speech ? 'YES' : 'NO'}</span>
                  <span>Duration: {(lastUploadResult.audioHealth.duration_ms / 1000).toFixed(2)}s</span>
                  <span className="text-[#22C55E] font-semibold">Score Pipeline: /score (AASIST INT8)</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: LIVE MICROPHONE MODE */}
      {activeInputMode === 'mic' && (
        <div className="space-y-4">
          <div className="bg-[#141719] p-4 rounded-xl border border-[#1E2225] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="text-[13.5px] font-semibold text-[#F2F4F5]">
                  Browser Microphone Ingest
                </span>
                {isMonitoring ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 animate-pulse">
                    STREAMING ACTIVE (20ms G.711 µ-law frames)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#9BA3A8] bg-[#0D0F11] border border-[#1E2225]">
                    STANDBY
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-[#9BA3A8]">
                Streams live voice over WebSocket to the AASIST neural ring buffer using ITU-T G.711 µ-law quantization.
              </p>
            </div>

            {/* Start / Stop Live Mic Button */}
            <button
              disabled={isOffline}
              title={offlineTooltip}
              onClick={onToggleMonitoring}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all shadow-md shrink-0 ${
                isOffline
                  ? 'opacity-40 cursor-not-allowed bg-[#1E2225] text-[#9BA3A8]'
                  : isMonitoring
                  ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-[0_0_20px_rgba(239,68,68,0.35)] animate-pulse'
                  : 'bg-[#FF4713] hover:bg-[#FF4713]/90 text-white shadow-[0_0_20px_rgba(255,71,19,0.3)]'
              }`}
            >
              {isMonitoring ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isMonitoring ? 'Stop Live Test' : 'Start Live Test'}</span>
            </button>
          </div>

          {/* Mic Permission / Hardware Error Banner */}
          {micError && (
            <div className="p-3 bg-[#EF4444]/15 border border-[#EF4444]/40 rounded-xl flex items-start justify-between gap-3 text-[#EF4444] text-[12px] font-mono">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{micError}</span>
              </div>
              {onClearMicError && (
                <button
                  onClick={onClearMicError}
                  className="text-[#EF4444] hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Live Mic Telemetry HUD */}
          {isMonitoring && (
            <div className="bg-[#0D0F11] border border-[#22C55E]/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#9BA3A8]">
              <div className="flex items-center gap-2 text-[#22C55E]">
                <Radio className="w-3.5 h-3.5 animate-spin" />
                <span>Web Audio Buffer: 8kHz Downsampled · 160B Frame Packetization</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Channel: Inbound Mic</span>
                <span>Endpoint: /ws/audio</span>
                <span className="text-[#F2F4F5] font-semibold">Gauge: Live Reacting</span>
              </div>
            </div>
          )}

          {/* Practical Live Demo Guidance Note */}
          <div className="p-3.5 rounded-xl bg-[#141719]/80 border border-[#1E2225] text-[11px] text-[#9BA3A8] leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#FF4713] font-semibold font-mono text-[11.5px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Grand Finale Live Demo Protocol & Stage Safeguards:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[#C4C9CC]">
              <li><strong className="text-[#F2F4F5]">Microphone Proximity:</strong> Keep mic 5–10 cm from mouth; speak with consistent conversational volume.</li>
              <li><strong className="text-[#F2F4F5]">Acoustic Filtering:</strong> The live-mic pipeline uses calibrated thresholding (&tau; = -8.94) with single-pass companding and silence freeze gating (&le; -45 dBFS).</li>
              <li><strong className="text-[#F2F4F5]">Stage Safety Net (Primary Demo Path):</strong> Unrehearsed auditorium acoustics and PA speaker bleed can degrade acoustic SNR. If live audio fluctuates, smoothly pivot to the <span className="text-[#FF4713] font-medium">1-Click Benchmark Reference Clips</span> in File Upload mode or the <span className="text-[#FF4713] font-medium">Telephony Simulation</span> as the proven, bulletproof presentation path.</li>
            </ul>
          </div>
        </div>
      )}

      {/* MODE 3: TELEPHONY SIMULATION MODE */}
      {activeInputMode === 'telephony' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141719] p-3 rounded-xl border border-[#1E2225]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-[#5E666B] uppercase tracking-wider font-semibold">
                SCENARIOS:
              </span>

              {/* Human Scenario */}
              <button
                disabled={isSimulationDisabled}
                title={simTooltip}
                onClick={() => onSimulationScenario('safe')}
                className={`px-3 py-1.5 rounded-lg text-[11.5px] font-mono font-medium border flex items-center gap-1.5 transition-all ${
                  isSimulationDisabled
                    ? 'opacity-40 cursor-not-allowed bg-[#141719] border-[#1E2225] text-[#5E666B]'
                    : activeScenario === 'safe'
                    ? 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                    : 'bg-[#141719] text-[#9BA3A8] border-[#1E2225] hover:text-[#F2F4F5] hover:border-[#2A2F33]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                Human (Allow)
              </button>

              {/* Deepfake Scenario */}
              <button
                disabled={isSimulationDisabled}
                title={simTooltip}
                onClick={() => onSimulationScenario('deepfake')}
                className={`px-3 py-1.5 rounded-lg text-[11.5px] font-mono font-medium border flex items-center gap-1.5 transition-all ${
                  isSimulationDisabled
                    ? 'opacity-40 cursor-not-allowed bg-[#141719] border-[#1E2225] text-[#5E666B]'
                    : activeScenario === 'deepfake'
                    ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                    : 'bg-[#141719] text-[#9BA3A8] border-[#1E2225] hover:text-[#F2F4F5] hover:border-[#2A2F33]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                Deepfake (Step-Up)
              </button>

              {/* Jitter Scenario */}
              <button
                disabled={isSimulationDisabled}
                title={simTooltip}
                onClick={() => onSimulationScenario('caution')}
                className={`px-3 py-1.5 rounded-lg text-[11.5px] font-mono font-medium border flex items-center gap-1.5 transition-all ${
                  isSimulationDisabled
                    ? 'opacity-40 cursor-not-allowed bg-[#141719] border-[#1E2225] text-[#5E666B]'
                    : activeScenario === 'caution'
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'bg-[#141719] text-[#9BA3A8] border-[#1E2225] hover:text-[#F2F4F5] hover:border-[#2A2F33]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                Jitter (Warn)
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Dynamic Challenge */}
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
                <span>Issue Dynamic Challenge</span>
              </button>

              {/* Audition Benchmark Clips Button */}
              {onOpenAudition && (
                <button
                  onClick={onOpenAudition}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-mono font-medium border flex items-center gap-1.5 bg-[#FF4713]/15 hover:bg-[#FF4713]/25 text-[#FF4713] border-[#FF4713]/40 shadow-[0_0_12px_rgba(255,71,19,0.2)] transition-all cursor-pointer"
                  title="Audition 30-second reference clips: Natural Human vs Generative Deepfake"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Audition Audio Clips</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
