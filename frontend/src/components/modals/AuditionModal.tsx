import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Headphones, Play, Info, RefreshCw } from 'lucide-react';

export interface AuditionClip {
  id: string;
  badge: string;
  badgeClass: string;
  title: string;
  duration: string;
  description: string;
  audioSrc: string;
  codec: string;
  targetProfile: string;
  riskClass: string;
  scenario: 'safe' | 'deepfake' | 'caution' | null;
  actionLabel: string;
}

interface AuditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateScenario?: (scenario: 'safe' | 'deepfake' | 'caution') => void;
  onTriggerChallenge?: () => void;
  onInjectClip?: (clip: AuditionClip) => Promise<any>;
}

export const clips: AuditionClip[] = [
  {
    id: 'human',
    badge: 'BONAFIDE HUMAN',
    badgeClass: 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]',
    title: 'Natural Human Voice',
    duration: '60.0s · 16kHz PCM',
    description: 'Dynamic pitch variance (~130Hz) with natural micro-jitter vibrato, organic vocal-tract formants, and natural breathing pauses every 4–5s.',
    audioSrc: '/demo_clips/bonafide_human_speech.wav',
    codec: 'clean_pcm',
    targetProfile: 'Benchmark Profile: Bonafide (~2.1% Risk)',
    riskClass: 'text-[#22C55E]',
    scenario: 'safe' as const,
    actionLabel: 'Inject Safe Simulation',
  },
  {
    id: 'deepfake',
    badge: 'SYNTHETIC DEEPFAKE',
    badgeClass: 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]',
    title: 'AI Voice Clone Attack',
    duration: '60.0s · 16kHz PCM',
    description: 'Unnaturally rigid mechanical pitch (145Hz), high-frequency neural vocoder phase artifacts (>7.5kHz), and GAN frame clicks.',
    audioSrc: '/demo_clips/deepfake_voice_clone.wav',
    codec: 'g711_ulaw',
    targetProfile: 'Benchmark Profile: AI Clone (~96.4% Risk)',
    riskClass: 'text-[#EF4444]',
    scenario: 'deepfake' as const,
    actionLabel: 'Inject Deepfake Attack',
  },
  {
    id: 'jitter',
    badge: 'TELECOM JITTER',
    badgeClass: 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]',
    title: 'Degraded PSTN Line',
    duration: '60.0s · 16kHz PCM',
    description: 'PSTN 50Hz electrical ground hum, GSM line static, and packet loss dropouts causing acoustic hesitation.',
    audioSrc: '/demo_clips/caution_noisy_telecom.wav',
    codec: 'pstn_narrowband',
    targetProfile: 'Benchmark Profile: PSTN Noise (~48.0% Risk)',
    riskClass: 'text-[#F59E0B]',
    scenario: 'caution' as const,
    actionLabel: 'Inject Jitter Scenario',
  },
  {
    id: 'challenge',
    badge: 'ACTIVE LIVENESS',
    badgeClass: 'bg-[#0EA5E9]/15 border-[#0EA5E9]/40 text-[#0EA5E9]',
    title: 'Dynamic Token Response',
    duration: '60.0s · 16kHz PCM',
    description: 'Spoken security challenge tokens with rapid sub-second biological turnaround reflex (458ms), defeating generative AI pipelines.',
    audioSrc: '/demo_clips/challenge_response_digits.wav',
    codec: 'clean_pcm',
    targetProfile: 'Benchmark Profile: Human Reflex (<1.2s)',
    riskClass: 'text-[#0EA5E9]',
    scenario: null,
    actionLabel: 'Launch Dynamic Challenge',
  },
];

export const AuditionModal: React.FC<AuditionModalProps> = ({
  isOpen,
  onClose,
  onSimulateScenario,
  onTriggerChallenge,
  onInjectClip,
}) => {
  const [injectingId, setInjectingId] = React.useState<string | null>(null);
  const [injectedScores, setInjectedScores] = React.useState<Record<string, { score: number; verdict: string }>>({});

  const handleInject = async (clip: AuditionClip) => {
    setInjectingId(clip.id);
    try {
      if (onInjectClip) {
        const res = await onInjectClip(clip);
        if (res && typeof res.score === 'number') {
          setInjectedScores((prev) => ({
            ...prev,
            [clip.id]: { score: res.score, verdict: res.verdict || res.risk_verdict || 'ALLOW' }
          }));
        }
      } else {
        if (clip.scenario && onSimulateScenario) {
          onSimulateScenario(clip.scenario);
        } else if (clip.id === 'challenge' && onTriggerChallenge) {
          onTriggerChallenge();
        }
      }
      setTimeout(() => {
        setInjectingId(null);
        onClose();
      }, 400);
    } catch (err) {
      console.error('Failed to inject clip:', err);
      setInjectingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Surface Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-[#0D0F11] border border-[#1E2225] rounded-2xl shadow-2xl p-6 text-[#F2F4F5] z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#1E2225]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF4713]/15 border border-[#FF4713]/30 flex items-center justify-center text-[#FF4713]">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-bold tracking-tight">Forensic Audio Audition Station</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF4713]/10 text-[#FF4713] border border-[#FF4713]/25">
                    SIH26104 BENCHMARKS
                  </span>
                </div>
                <p className="text-[12px] text-[#9BA3A8] mt-0.5">
                  Listen to the 60-second reference audio profiles used to calibrate the MEIKURAL neural pipeline
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#141719] hover:bg-[#1E2225] text-[#9BA3A8] hover:text-[#F2F4F5] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5 overflow-y-auto pr-1">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className="p-4 rounded-xl bg-[#07090D] border border-[#1E2225] hover:border-[#2A2F33] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${clip.badgeClass}`}
                    >
                      {clip.badge}
                    </span>
                    <span className="text-[11px] text-[#5E666B] font-mono">{clip.duration}</span>
                  </div>

                  <h3 className="text-[14px] font-bold text-[#F2F4F5] mb-1">{clip.title}</h3>
                  <p className="text-[11.5px] text-[#9BA3A8] leading-relaxed mb-3">
                    {clip.description}
                  </p>
                </div>

                <div>
                  {/* HTML5 Audio Player */}
                  <audio
                    controls
                    preload="metadata"
                    className="w-full h-8 rounded mb-3 outline-none"
                    src={clip.audioSrc}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1E2225] text-[11px]">
                    <div>
                      <span className="text-[#5E666B] block text-[9.5px] uppercase font-mono tracking-wider">
                        {injectedScores[clip.id] ? 'Live Neural Score' : 'Benchmark Reference Profile'}
                      </span>
                      <span className={`font-mono text-[11px] ${clip.riskClass}`}>
                        {injectedScores[clip.id]
                          ? `${(injectedScores[clip.id].score * 100).toFixed(1)}% [${injectedScores[clip.id].verdict}] (Live AASIST)`
                          : clip.targetProfile}
                      </span>
                    </div>

                    <button
                      disabled={injectingId !== null}
                      onClick={() => handleInject(clip)}
                      className="px-2.5 py-1 rounded bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] hover:border-[#FF4713]/40 text-[#F2F4F5] font-medium text-[11px] flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {injectingId === clip.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 text-[#FF4713] animate-spin" />
                          <span className="text-[#FF4713]">Scoring...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-[#FF4713]" />
                          <span>{clip.actionLabel}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Jury Explainer Box */}
          <div className="p-3.5 rounded-xl bg-[#141719]/60 border border-[#1E2225] text-[12px] text-[#9BA3A8]">
            <div className="flex items-center gap-2 font-semibold text-[#F2F4F5] mb-1">
              <Info className="w-3.5 h-3.5 text-[#FF4713]" />
              <span>Demonstration Guide for Hackathon Jury</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#9BA3A8]">
              High-frequency neural vocoders (Bark, XTTS, ElevenLabs) sound authentic to the human ear. Point out to judges that MEIKURAL analyzes raw sinc-convolution filterbanks beyond 7.5kHz to expose synthetic phase discontinuities in real-time under 500ms.
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-4 pt-3 border-t border-[#1E2225]">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#1E2225] hover:bg-[#2A2F33] text-[#F2F4F5] text-[12px] font-medium transition-colors"
            >
              Close Station
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
