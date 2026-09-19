import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, ShieldCheck, Fingerprint, Search, Phone, Info, X, Sparkles } from 'lucide-react';

interface Person {
  id: string;
  name: string;
  role: string;
  department: string;
  enrolledDate: string;
  assuranceLevel: 'High' | 'Standard';
  lastVerified: string;
  avatarBg: string;
}

const previewProfiles: Person[] = [
  {
    id: 'usr-1',
    name: 'Kamalesh S.',
    role: 'Principal SecOps Architect',
    department: 'Cyber Threat Intelligence',
    enrolledDate: 'Jan 12, 2026',
    assuranceLevel: 'High',
    lastVerified: '12 mins ago',
    avatarBg: '#FF4713',
  },
  {
    id: 'usr-2',
    name: 'Evelyn Vance',
    role: 'Chief Financial Officer',
    department: 'Executive Leadership',
    enrolledDate: 'Feb 03, 2026',
    assuranceLevel: 'High',
    lastVerified: '2 hours ago',
    avatarBg: '#22C55E',
  },
  {
    id: 'usr-3',
    name: 'Marcus Thorne',
    role: 'VP Treasury Operations',
    department: 'Corporate Banking',
    enrolledDate: 'Feb 18, 2026',
    assuranceLevel: 'High',
    lastVerified: 'Yesterday',
    avatarBg: '#3B82F6',
  },
  {
    id: 'usr-4',
    name: 'Sarah Chen',
    role: 'Lead Network Engineer',
    department: 'Infrastructure',
    enrolledDate: 'Mar 01, 2026',
    assuranceLevel: 'Standard',
    lastVerified: '3 days ago',
    avatarBg: '#EC4899',
  },
];

export const PeoplePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [roadmapModal, setRoadmapModal] = useState<{ title: string; desc: string } | null>(null);

  const filtered = previewProfiles.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.role.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Concept Preview Notice Banner */}
      <div className="p-4 rounded-xl bg-accent-primary/10 border border-accent-primary/30 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-lg bg-accent-primary/20 border border-accent-primary/40 flex items-center justify-center text-accent-primary flex-shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-13 font-semibold text-text-primary">
              Concept Preview · Enterprise Tier 2 Biometric Roadmap
            </h4>
            <span className="text-10 font-mono font-medium px-2 py-0.5 rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/40">
              PLANNED Q3 2026
            </span>
          </div>
          <p className="text-12 text-text-muted leading-relaxed">
            In strict compliance with India&apos;s <strong>DPDP Act 2023</strong> and zero-trust privacy mandates,
            MEIKURAL&apos;s active production defense pipeline avoids storing permanent raw biometric voiceprints.
            Incoming callers are identified through <strong>salted SHA-256 hashes</strong>. Dedicated speaker-embedding enrollment
            and automated outbound SIP re-verification will be delivered in Tier 2 with hardware-isolated biometric key storage.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-20 font-bold text-text-primary tracking-tight">Identity & Biometrics Directory</h1>
          <p className="text-12 text-text-muted mt-0.5">
            Architecture mockup for high-assurance executive voice profiles and automated step-up re-authentication
          </p>
        </div>

        <button
          onClick={() =>
            setRoadmapModal({
              title: 'Voiceprint Biometric Enrollment Wizard',
              desc: 'Biometric voiceprint enrollment is scheduled on the Tier 2 roadmap. Under our current zero-trust DPDP Act 2023 architecture, permanent audio recordings and speaker embeddings are deliberately not collected or stored. Future enterprise releases will support client-side HSM-sealed voice templates.',
            })
          }
          className="px-4 py-2 rounded-lg bg-surface-elevated border border-card-border hover:border-accent-border text-text-primary text-12 font-medium flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5 text-accent-primary" />
          Enroll New Identity (Preview)
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-card-panel border border-card-border">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search preview profiles by name, title, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-ground border border-card-border rounded-lg pl-8 pr-3 py-1.5 text-12 text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-accent-border transition-colors"
          />
        </div>

        <span className="text-11 font-mono text-text-muted">
          Showing {filtered.length} of {previewProfiles.length} Conceptual Profiles
        </span>
      </div>

      {/* Grid of Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((person) => (
          <div
            key={person.id}
            className="bg-card-panel border border-card-border rounded-xl p-5 shadow-card hover:border-card-border-hover transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: person.avatarBg }}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-13 shadow-md"
                  >
                    {person.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <h3 className="text-13 font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                      {person.name}
                    </h3>
                    <p className="text-11 text-text-muted">{person.role}</p>
                  </div>
                </div>

                <span className="text-10 font-mono text-text-subtle px-1.5 py-0.5 rounded bg-surface-ground border border-card-border">
                  Mockup
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-card-border space-y-2 text-11 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-text-subtle">Department:</span>
                  <span className="text-text-secondary">{person.department}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-subtle">Voiceprint Assurance:</span>
                  <span className="inline-flex items-center gap-1 text-accent-success">
                    <ShieldCheck className="w-3 h-3" />
                    {person.assuranceLevel} (Target 99.8%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-subtle">Last Verified:</span>
                  <span className="text-text-muted">{person.lastVerified}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-card-border flex items-center justify-between">
              <span className="text-10 font-mono text-text-subtle flex items-center gap-1">
                <Fingerprint className="w-3 h-3 text-accent-primary" />
                RawNet3 Template
              </span>
              <button
                onClick={() =>
                  setRoadmapModal({
                    title: `Outbound Biometric Verification Dialing (${person.name})`,
                    desc: `Automated outbound dialer verification for ${person.name} is scheduled on the Tier 2 roadmap. In production, this service will connect to a SIP trunk or Twilio voice bridge to dispatch dynamic micro-challenges directly to enrolled executive phone endpoints.`,
                  })
                }
                className="px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface-elevated/80 border border-card-border text-11 text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Phone className="w-3 h-3 text-accent-primary" />
                Auth Spec
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Roadmap Detail Modal */}
      <AnimatePresence>
        {roadmapModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card-panel border border-card-border rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-card-border pb-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-accent-primary" />
                  <h3 className="text-14 font-semibold text-text-primary">{roadmapModal.title}</h3>
                </div>
                <button
                  onClick={() => setRoadmapModal(null)}
                  className="p-1 rounded text-text-subtle hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-12 text-text-muted leading-relaxed">{roadmapModal.desc}</p>

              <div className="p-3 rounded-lg bg-surface-ground border border-card-border text-11 font-mono text-text-subtle">
                Status: Tier 2 Roadmap Design Specification
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setRoadmapModal(null)}
                  className="px-4 py-1.5 rounded-lg text-12 font-medium bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors cursor-pointer"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
