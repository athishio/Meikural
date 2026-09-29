import React, { useState } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

// Views
import { OverviewView } from './components/dashboard/OverviewView';
import { RulesPage } from './components/pages/RulesPage';
import { AuditTrailPage } from './components/pages/AuditTrailPage';
import { PrivacyCompliancePage } from './components/pages/PrivacyCompliancePage';

// Modals
import { EscalateConfirmModal } from './components/modals/EscalateConfirmModal';
import { ForensicCertificateModal } from './components/modals/ForensicCertificateModal';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const {
    sessionId,
    voiceTrust,
    rawLogit,
    spoofProbability,
    confidence,
    verdict,
    wsState,
    connectWebSocket,
    activeScenario,
    showChallengeModal,
    setShowChallengeModal,
    challengeDigits,
    triggerChallenge,
    resolveChallenge,
    escalateIncident,
    rules,
    saveRulesConfig,
    diagnostics,
    runPurge,
    syncDb,
    isDemoMode,
    uploadLoading,
    uploadError,
    lastUploadResult,
    handleFileUpload,
  } = useDashboardData();

  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme state: default to 'light' (warm archival paper-white dossier) with localStorage persistence
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('meikural-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    return 'light';
  });

  React.useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('meikural-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('meikural-theme', 'light');
      }
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col font-sans select-none relative transition-colors duration-150">
      {/* 4-Item Minimalist Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onReconnectWs={connectWebSocket}
        wsState={wsState}
        isDemoMode={isDemoMode}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Disconnect Warning Banner */}
      {wsState === 'offline' && (
        <div className="w-full bg-[#FDEFEF] dark:bg-[#2B0F0F] border-b border-[#E79E9E] dark:border-[#5E1A1A] px-4 py-2 flex items-center justify-center gap-3 text-[12px] font-mono text-[#941818] dark:text-[#F87171]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>WebSocket Offline · Live acoustic stream disconnected from backend</span>
          <button
            onClick={connectWebSocket}
            className="px-2.5 py-0.5 rounded-sm bg-[#941818] dark:bg-[#DC2626] text-white text-[11px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="fixed bottom-6 right-6 z-50 bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#9CD1B2] dark:border-[#1B5233] text-[#165A34] dark:text-[#34D399] text-[12px] font-mono px-4 py-2.5 rounded-sm shadow-lg flex items-center gap-2"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container with Snappy Page Transitions */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'overview' && (
              <OverviewView
                voiceTrust={voiceTrust}
                verdict={verdict}
                sessionId={sessionId}
                rawLogit={rawLogit}
                confidence={confidence}
                spoofProbability={spoofProbability}
                uploadLoading={uploadLoading}
                uploadError={uploadError}
                lastUploadResult={lastUploadResult}
                onFileUpload={handleFileUpload}
                onTriggerChallenge={triggerChallenge}
                onEscalate={() => setIsEscalateOpen(true)}
                showChallengeModal={showChallengeModal}
                onCloseChallengeModal={() => setShowChallengeModal(false)}
                challengeDigits={challengeDigits}
                onResolveChallenge={(passed) => {
                  resolveChallenge(passed);
                  showToast(
                    passed
                      ? 'Caller passed voice challenge. Allow verdict recorded.'
                      : 'Caller failed voice challenge. Alert quarantine enforced.'
                  );
                }}
                activeScenario={activeScenario}
                diagnostics={diagnostics}
                rules={rules}
              />
            )}

            {activeTab === 'rules' && (
              <RulesPage
                initialRules={rules}
                onSaveRules={async (r) => {
                  await saveRulesConfig(r);
                  const allowPct = Math.round((r.bonafide_allow_threshold ?? 0.35) * 100);
                  const stepUpPct = Math.round((r.step_up_challenge_threshold ?? 0.65) * 100);
                  showToast(
                    `Decision rules updated: Allow ≤ ${allowPct}%, Warn = ${allowPct}-${stepUpPct}%, Step-Up ≥ ${stepUpPct}%. Live scoring synchronized.`
                  );
                }}
              />
            )}

            {activeTab === 'audit-trail' && (
              <AuditTrailPage
                onViewCert={(certData) => setSelectedCert(certData)}
                onSyncDb={syncDb}
              />
            )}

            {activeTab === 'privacy' && (
              <PrivacyCompliancePage
                onRunPurge={async () => {
                  const res = await runPurge();
                  showToast(`Regulatory purge completed: ${res.purged_count} records expunged.`);
                  return res;
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Minimalist Utilitarian Footer */}
      <Footer onOpenPrivacy={() => setActiveTab('privacy')} />

      {/* Emergency Trunk Escalation Modal */}
      <EscalateConfirmModal
        isOpen={isEscalateOpen}
        onClose={() => setIsEscalateOpen(false)}
        onConfirm={async () => {
          await escalateIncident();
          showToast('Trunk isolated. Twilio SMS and SMTP alerts dispatched.');
        }}
        sessionId={sessionId}
      />

      {/* Forensic Certificate Modal */}
      <ForensicCertificateModal
        cert={selectedCert}
        isOpen={!!selectedCert}
        onClose={() => setSelectedCert(null)}
      />
    </div>
  );
};

export default App;
