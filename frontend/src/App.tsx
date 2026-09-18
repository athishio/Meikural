import React, { useState } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { SiteBackgroundWave } from './components/layout/SiteBackgroundWave';

// Views
import { OverviewView } from './components/dashboard/OverviewView';
import { ActiveCallsPage } from './components/pages/ActiveCallsPage';
import { IncidentsPage } from './components/pages/IncidentsPage';
import { AuditTrailPage } from './components/pages/AuditTrailPage';
import { RulesPage } from './components/pages/RulesPage';
import { IntegrationsPage } from './components/pages/IntegrationsPage';
import { PrivacyCompliancePage } from './components/pages/PrivacyCompliancePage';

// Modals
import { DynamicVoiceChallengeModal } from './components/modals/DynamicVoiceChallengeModal';
import { EscalateConfirmModal } from './components/modals/EscalateConfirmModal';
import { ForensicCertificateModal } from './components/modals/ForensicCertificateModal';
import { SearchCommandPalette } from './components/modals/SearchCommandPalette';
import { UploadModal } from './components/modals/UploadModal';
import { BatchAnalysisModal } from './components/modals/BatchAnalysisModal';
import { AuditionModal } from './components/modals/AuditionModal';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const {
    sessionId,
    setSessionId,
    voiceTrust,
    rawLogit,
    spoofProbability,
    confidence,
    verdict,
    wsState,
    connectWebSocket,
    isMonitoring,
    analyserNode,
    toggleMonitoring,
    runVerification,
    activeScenario,
    setSimulationScenario,
    showChallengeModal,
    setShowChallengeModal,
    challengeDigits,
    triggerChallenge,
    resolveChallenge,
    escalateIncident,
    rules,
    saveRulesConfig,
    diagnostics,
    evidenceItems,
    kpis,
    notifications,
    markAllNotificationsRead,
    runPurge,
    testDispatch,
    updateRecipients,
    syncDb,
  } = useDashboardData();

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isAuditionOpen, setIsAuditionOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'audition':
        setIsAuditionOpen(true);
        break;
      case 'upload':
        setIsUploadOpen(true);
        break;
      case 'record':
        toggleMonitoring();
        break;
      case 'batch':
        setIsBatchOpen(true);
        break;
      case 'reports':
        setActiveTab('audit-trail');
        break;
      default:
        break;
    }
  };

  const handleCommandSelect = (action: string) => {
    const actLower = action.toLowerCase();
    if (actLower.includes('audition') || actLower.includes('clip')) setIsAuditionOpen(true);
    else if (actLower.includes('overview')) setActiveTab('overview');
    else if (actLower.includes('active call')) setActiveTab('active-calls');
    else if (actLower.includes('incident')) setActiveTab('incidents');
    else if (actLower.includes('audit')) setActiveTab('audit-trail');
    else if (actLower.includes('rule')) setActiveTab('rules');
    else if (actLower.includes('integration')) setActiveTab('integrations');
    else if (actLower.includes('privacy')) setActiveTab('privacy');
    else if (actLower.includes('monitoring')) toggleMonitoring();
    else if (actLower.includes('challenge')) triggerChallenge();
    else if (actLower.includes('escalate')) setIsEscalateOpen(true);
    else if (actLower.includes('call_')) {
      setSessionId(action);
      setActiveTab('overview');
    }
  };

  return (
    <div className="min-h-screen bg-[#050607] text-[#F2F4F5] flex flex-col font-sans selection:bg-[#FF4713] selection:text-white relative">
      {/* Site-Wide Fixed Ambient Background Wave */}
      <SiteBackgroundWave />

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onEscalate={() => setIsEscalateOpen(true)}
        onReconnectWs={connectWebSocket}
        wsState={wsState}
        notifications={notifications}
        onMarkNotificationsRead={markAllNotificationsRead}
      />

      {/* Disconnect Warning Banner */}
      {wsState === 'offline' && (
        <div className="w-full bg-[#EF4444]/15 border-b border-[#EF4444]/30 px-4 py-2 flex items-center justify-center gap-3 text-[12px] font-mono text-[#EF4444]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>WebSocket Offline · Live acoustic stream disconnected from backend</span>
          <button
            onClick={connectWebSocket}
            className="px-2.5 py-0.5 rounded bg-[#EF4444] text-white text-[11px] font-semibold hover:bg-[#DC2626] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0D0F11] border border-[#22C55E]/40 text-[#22C55E] text-[12px] font-mono px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {activeTab === 'overview' && (
          <OverviewView
            kpis={kpis}
            voiceTrust={voiceTrust}
            verdict={verdict}
            sessionId={sessionId}
            rawLogit={rawLogit}
            confidence={confidence}
            spoofProbability={spoofProbability}
            isMonitoring={isMonitoring}
            onToggleMonitoring={toggleMonitoring}
            onRunVerification={runVerification}
            onEscalate={() => setIsEscalateOpen(true)}
            onSimulationScenario={setSimulationScenario}
            onTriggerChallenge={triggerChallenge}
            onOpenAudition={() => setIsAuditionOpen(true)}
            activeScenario={activeScenario}
            analyserNode={analyserNode}
            diagnostics={diagnostics}
            evidenceItems={evidenceItems}
            onQuickAction={handleQuickAction}
            rules={rules}
            isOffline={wsState === 'offline'}
          />
        )}

        {activeTab === 'active-calls' && (
          <ActiveCallsPage
            isOffline={wsState === 'offline'}
            onSelectSession={(sess) => {
              setSessionId(sess);
              setActiveTab('overview');
            }}
            onInspectSession={(sess) => {
              setSelectedCert({
                sessionId: sess,
                prevHash: '7f9e8a12bc44d019f8e23a4b9102c98d761234ef',
                blockHash: 'da5c6a8b1276e1582c66251e75127b9b1d6c4b0f2b673176d903ad9d68f64f66',
                score: 0.14,
                verdict: 'ALLOW',
                timestamp: 'Live Active Stream',
              });
            }}
            onIsolateTrunk={(sess) => {
              showToast(`Trunk ${sess} isolated. Dispatched emergency alert.`);
            }}
          />
        )}

        {activeTab === 'incidents' && (
          <IncidentsPage
            onViewCert={(certData) => setSelectedCert(certData)}
          />
        )}

        {activeTab === 'audit-trail' && (
          <AuditTrailPage
            onViewCert={(certData) => setSelectedCert(certData)}
            onSyncDb={syncDb}
          />
        )}

        {activeTab === 'rules' && (
          <RulesPage
            initialRules={rules}
            onSaveRules={async (r) => {
              await saveRulesConfig(r);
              showToast('Decision rules persisted & active across all channels.');
            }}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsPage
            rules={rules}
            onTestDispatch={async (ch) => {
              await testDispatch(ch);
              showToast(`Test dispatch for ${ch.toUpperCase()} gateway executed.`);
            }}
            onUpdateRecipients={async (rec) => {
              await updateRecipients(rec);
              showToast('Alert roster updated.');
            }}
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
      </main>

      {/* Big Wordmark Footer */}
      <Footer onOpenPrivacy={() => setActiveTab('privacy')} wsState={wsState} />

      {/* Dynamic Voice Challenge Full-Screen HUD */}
      <DynamicVoiceChallengeModal
        isOpen={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        onResolve={(passed) => {
          resolveChallenge(passed);
          showToast(
            passed
              ? 'Caller passed voice challenge. Allow verdict recorded.'
              : 'Caller failed voice challenge. Alert quarantine enforced.'
          );
        }}
        challengeDigits={challengeDigits}
        sessionId={sessionId}
      />

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

      {/* Search Command Palette (Ctrl+K / ⌘K) */}
      <SearchCommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectAction={handleCommandSelect}
      />

      {/* Audio File Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      {/* Batch Analysis Modal */}
      <BatchAnalysisModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
      />

      {/* Forensic Audio Audition Station Modal */}
      <AuditionModal
        isOpen={isAuditionOpen}
        onClose={() => setIsAuditionOpen(false)}
        onSimulateScenario={setSimulationScenario}
        onTriggerChallenge={triggerChallenge}
      />
    </div>
  );
};

export default App;
