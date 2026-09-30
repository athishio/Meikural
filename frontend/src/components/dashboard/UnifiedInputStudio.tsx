import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, AlertTriangle, FileAudio, Mic, MicOff } from 'lucide-react';
import type { ForensicUploadResult } from '../../types/dashboard';
import { LiveAudioVisualizer } from './LiveAudioVisualizer';

interface UnifiedInputStudioProps {
  uploadLoading?: boolean;
  uploadError?: string | null;
  lastUploadResult?: ForensicUploadResult | null;
  onFileUpload: (file: File, codec?: string) => Promise<any>;
  isMonitoring?: boolean;
  onToggleMonitoring?: () => void;
  analyserNode?: AnalyserNode | null;
  micError?: string | null;
  onClearMicError?: () => void;
}

export const UnifiedInputStudio: React.FC<UnifiedInputStudioProps> = ({
  uploadLoading = false,
  uploadError = null,
  lastUploadResult = null,
  onFileUpload,
  isMonitoring = false,
  onToggleMonitoring,
  analyserNode,
  micError = null,
  onClearMicError,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedCodec, setSelectedCodec] = useState('clean_pcm');
  const [loadingClip, setLoadingClip] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const handleCaptureSample = async () => {
    if (isCapturing) return;
    try {
      setIsCapturing(true);
      setLocalError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported by your browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/wav' });
        const file = new File([blob], 'live_mic_sample.wav', { type: 'audio/wav' });
        stream.getTracks().forEach((t) => t.stop());
        setIsCapturing(false);
        await onFileUpload(file, 'live_mic');
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 4000);
    } catch (err: any) {
      setIsCapturing(false);
      setLocalError(err.message || 'Microphone recording error. Please check permissions.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setLocalError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await onFileUpload(file, selectedCodec);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await onFileUpload(file, selectedCodec);
    }
  };

  const loadBenchmarkClip = async (filename: string, suggestedCodec: string) => {
    setLoadingClip(filename);
    setLocalError(null);
    try {
      const resp = await fetch(`/demo_clips/${filename}`);
      if (!resp.ok) {
        throw new Error(`Failed to load benchmark clip "${filename}" (HTTP ${resp.status})`);
      }
      const blob = await resp.blob();
      const file = new File([blob], filename, { type: blob.type || 'audio/wav' });
      setSelectedCodec(suggestedCodec);
      await onFileUpload(file, suggestedCodec);
    } catch (err: any) {
      setLocalError(err.message || `Could not load benchmark clip ${filename}`);
    } finally {
      setLoadingClip(null);
    }
  };

  return (
    <div id="unified-input-studio" className="relative bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] rounded-sm p-5 space-y-4 select-none shadow-xs transition-colors overflow-hidden">
      {/* Scanning Beam Indicator during uploadLoading */}
      {uploadLoading && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D8D3C8] dark:bg-[#2B3037] overflow-hidden rounded-t-sm z-10">
          <div className="h-full bg-linear-to-r from-transparent via-[#165A34] dark:via-[#34D399] to-transparent animate-scanner-beam w-1/3" />
        </div>
      )}

      {/* Header Bar: Benchmark Buttons + Live Mic Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8D3C8] dark:border-[#2B3037] pb-3.5">
        <div>
          <h2 className="text-[13px] font-bold text-[#1A1D20] dark:text-[#F0EEE9] uppercase tracking-wider font-mono">
            Acoustic Ingestion & Forensic Benchmark
          </h2>
          <p className="text-[11px] text-[#525860] dark:text-[#A2A8B0] mt-0.5">
            Test calibrated AASIST neural pipeline via live mic stream, 1-click clips, or file upload
          </p>
        </div>

        {/* 1-Click Forensic Benchmark Buttons & Live Mic Control */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-[#78808A] dark:text-[#6E7681] uppercase tracking-wider font-semibold">
            Benchmarks:
          </span>

          <button
            disabled={uploadLoading || loadingClip !== null}
            onClick={() => loadBenchmarkClip('bonafide_human_speech.wav', 'clean_pcm')}
            className="px-2.5 py-1 rounded-sm bg-[#EAF5EE] hover:bg-[#D1E7D9] dark:bg-[#0E2316] dark:hover:bg-[#143320] text-[#165A34] dark:text-[#34D399] border border-[#9CD1B2] dark:border-[#1B5233] text-[11px] font-mono font-medium transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50"
            title="Clean human speech (Yields ALLOW / Low Risk)"
          >
            {loadingClip === 'bonafide_human_speech.wav' ? 'Scoring...' : 'Human Speech'}
          </button>

          <button
            disabled={uploadLoading || loadingClip !== null}
            onClick={() => loadBenchmarkClip('deepfake_voice_clone.wav', 'g711_ulaw')}
            className="px-2.5 py-1 rounded-sm bg-[#FDEFEF] hover:bg-[#FBEAEA] dark:bg-[#2B0F0F] dark:hover:bg-[#3D1414] text-[#941818] dark:text-[#F87171] border border-[#E79E9E] dark:border-[#5E1A1A] text-[11px] font-mono font-medium transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50"
            title="Synthetic voice clone (Yields STEP-UP / Deepfake)"
          >
            {loadingClip === 'deepfake_voice_clone.wav' ? 'Scoring...' : 'Voice Clone'}
          </button>

          <button
            disabled={uploadLoading || loadingClip !== null}
            onClick={() => loadBenchmarkClip('caution_noisy_telecom.wav', 'pstn_narrowband')}
            className="px-2.5 py-1 rounded-sm bg-[#FDF6E8] hover:bg-[#F8E5BF] dark:bg-[#291B06] dark:hover:bg-[#3B2609] text-[#924A00] dark:text-[#FBBF24] border border-[#E5BA78] dark:border-[#5C3E08] text-[11px] font-mono font-medium transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50"
            title="Degraded PSTN line (Yields WARN / Jitter)"
          >
            {loadingClip === 'caution_noisy_telecom.wav' ? 'Scoring...' : 'Noisy PSTN'}
          </button>

          {/* Primary Live Microphone Toggle Button */}
          {onToggleMonitoring && (
            <button
              disabled={uploadLoading}
              onClick={onToggleMonitoring}
              className={`px-2.5 py-1 rounded-sm border text-[11px] font-mono font-semibold transition-all active:scale-[0.97] cursor-pointer shadow-xs flex items-center gap-1.5 ${
                isMonitoring
                  ? 'bg-[#FDEFEF] dark:bg-[#2B0F0F] text-[#941818] dark:text-[#F87171] border-[#E79E9E] dark:border-[#5E1A1A] animate-pulse'
                  : 'bg-[#1A1D20] dark:bg-[#F0EEE9] text-white dark:text-[#121417] border-[#1A1D20] dark:border-[#F0EEE9] hover:bg-[#33383F] dark:hover:bg-[#FFFFFF]'
              }`}
              title={isMonitoring ? 'Click to stop live microphone stream' : 'Capture and stream live voice via microphone'}
            >
              {isMonitoring ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#941818] dark:bg-[#F87171] animate-ping" />
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Stop Live Mic</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-[#34D399]" />
                  <span>Live Mic</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Live Acoustic Oscilloscope & Spectrum Visualizer Component */}
      {onToggleMonitoring && (
        <LiveAudioVisualizer
          isMonitoring={isMonitoring}
          analyserNode={analyserNode}
          onToggleMonitoring={onToggleMonitoring}
          onCaptureSample={handleCaptureSample}
          isCapturing={isCapturing}
        />
      )}

      {/* Codec Selection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F7F5F0] dark:bg-[#121417] p-3 rounded-sm border border-[#D8D3C8] dark:border-[#2B3037]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#525860] dark:text-[#A2A8B0] uppercase tracking-wider font-semibold">
            Calibrated Codec Profile:
          </span>
          <select
            value={selectedCodec}
            onChange={(e) => setSelectedCodec(e.target.value)}
            className="bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] text-[#1A1D20] dark:text-[#F0EEE9] text-[12px] font-mono rounded-sm px-2.5 py-1 focus:outline-none focus:border-[#BCB6A8]"
          >
            <option value="clean_pcm">Clean PCM (16kHz Uncompressed) [Thresh -10.45]</option>
            <option value="g711_ulaw">G.711 &mu;-law Telephony (8kHz) [Thresh -8.64]</option>
            <option value="pstn_narrowband">PSTN Narrowband (300-3400Hz) [Thresh -1.13]</option>
            <option value="live_mic">Live Microphone Capture (16kHz) [Thresh -8.94]</option>
          </select>
        </div>

        <span className="text-[10px] font-mono text-[#78808A] dark:text-[#6E7681]">
          Supports WAV, MP3, M4A, FLAC, OGG, WEBM & Live Mic
        </span>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border border-dashed rounded-sm p-7 text-center transition-all cursor-pointer active:scale-[0.99] ${
          dragActive
            ? 'border-[#1A1D20] dark:border-[#F0EEE9] bg-[#EFECE6] dark:bg-[#1F2328]'
            : 'border-[#BCB6A8] dark:border-[#3F4752] hover:border-[#1A1D20] dark:hover:border-[#F0EEE9] bg-[#FAF9F5] dark:bg-[#15171A]'
        }`}
      >
        {/* Tactical Forensic Corner Brackets */}
        <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-[#BCB6A8] dark:border-[#3F4752] animate-corner-bracket" />
        <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-[#BCB6A8] dark:border-[#3F4752] animate-corner-bracket" />
        <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-[#BCB6A8] dark:border-[#3F4752] animate-corner-bracket" />
        <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-[#BCB6A8] dark:border-[#3F4752] animate-corner-bracket" />

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.m4a,.flac,.ogg,.webm"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-sm bg-[#EFECE6] dark:bg-[#1F2328] border border-[#D8D3C8] dark:border-[#2B3037] flex items-center justify-center text-[#525860] dark:text-[#A2A8B0]">
            <UploadCloud className="w-5 h-5" />
          </div>

          <div className="text-[13px] font-medium text-[#1A1D20] dark:text-[#F0EEE9]">
            Drag & drop audio recording, or click to browse
          </div>
          <div className="text-[11px] text-[#525860] dark:text-[#A2A8B0] font-mono">
            Scored with calibrated log-likelihood ratio (LLR) threshold & AASIST backbone
          </div>
        </div>
      </div>

      {/* Live Mic Permission Error Alert */}
      {micError && (
        <div className="p-3 rounded-sm bg-[#FDEFEF] dark:bg-[#2B0F0F] border border-[#E79E9E] dark:border-[#5E1A1A] text-[#941818] dark:text-[#F87171] text-[12px] font-mono flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{micError}</span>
          </div>
          {onClearMicError && (
            <button onClick={onClearMicError} className="underline text-[11px] hover:opacity-80 cursor-pointer">
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Upload/Scoring State / Errors */}
      {uploadLoading && (
        <div className="p-3 rounded-sm bg-[#F7F5F0] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] flex items-center justify-center gap-2 text-[12px] font-mono text-[#1A1D20] dark:text-[#F0EEE9]">
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Executing AASIST neural inference on audio stream...</span>
        </div>
      )}

      {(uploadError || localError) && (
        <div className="p-3 rounded-sm bg-[#FDEFEF] dark:bg-[#2B0F0F] border border-[#E79E9E] dark:border-[#5E1A1A] text-[#941818] dark:text-[#F87171] text-[12px] font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{uploadError || localError}</span>
        </div>
      )}

      {/* Scored Result Card */}
      {lastUploadResult && !uploadLoading && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="p-4 rounded-sm bg-[#F7F5F0] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] space-y-3 font-mono"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8D3C8] dark:border-[#2B3037] pb-2.5">
            <div className="flex items-center gap-2 text-[12px] text-[#1A1D20] dark:text-[#F0EEE9] truncate max-w-md">
              <FileAudio className="w-4 h-4 text-[#525860] dark:text-[#A2A8B0] shrink-0" />
              <span className="font-semibold truncate">{lastUploadResult.filename}</span>
              <span className="text-[#78808A] dark:text-[#6E7681]">({(lastUploadResult.fileSize / 1024).toFixed(1)} KB)</span>
            </div>

            {/* Verdict Badge */}
            <span
              className={`px-2.5 py-0.5 rounded-sm text-[11px] font-bold border ${
                lastUploadResult.verdict === 'ALLOW'
                  ? 'bg-[#EAF5EE] dark:bg-[#0E2316] text-[#165A34] dark:text-[#34D399] border-[#9CD1B2] dark:border-[#1B5233]'
                  : lastUploadResult.verdict === 'STEP_UP_VERIFICATION'
                  ? 'bg-[#FDEFEF] dark:bg-[#2B0F0F] text-[#941818] dark:text-[#F87171] border-[#E79E9E] dark:border-[#5E1A1A]'
                  : 'bg-[#FDF6E8] dark:bg-[#291B06] text-[#924A00] dark:text-[#FBBF24] border-[#E5BA78] dark:border-[#5C3E08]'
              }`}
            >
              {lastUploadResult.verdict === 'ALLOW'
                ? 'ALLOW (AUTHENTIC HUMAN)'
                : lastUploadResult.verdict === 'STEP_UP_VERIFICATION'
                ? 'STEP-UP (DEEPFAKE CLONE)'
                : 'WARN (SUSPICIOUS JITTER)'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div>
              <div className="text-[#78808A] dark:text-[#6E7681] uppercase">Voice Trust Index</div>
              <div className="text-[14px] font-bold text-[#1A1D20] dark:text-[#F0EEE9] mt-0.5">
                {Math.round(lastUploadResult.voiceTrust)}/100
              </div>
            </div>

            <div>
              <div className="text-[#78808A] dark:text-[#6E7681] uppercase">Spoof Probability</div>
              <div className="text-[14px] font-bold text-[#1A1D20] dark:text-[#F0EEE9] mt-0.5">
                {(lastUploadResult.score * 100).toFixed(1)}%
              </div>
            </div>

            <div>
              <div className="text-[#78808A] dark:text-[#6E7681] uppercase">Inference Latency</div>
              <div className="text-[14px] font-bold text-[#1A1D20] dark:text-[#F0EEE9] mt-0.5">
                {lastUploadResult.inferenceLatencyMs.toFixed(1)} ms
              </div>
            </div>

            <div>
              <div className="text-[#78808A] dark:text-[#6E7681] uppercase">Threshold & Codec</div>
              <div className="text-[12px] font-semibold text-[#1A1D20] dark:text-[#F0EEE9] mt-0.5 truncate">
                {lastUploadResult.codecProfile} ({lastUploadResult.thresholdUsed.toFixed(2)})
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
