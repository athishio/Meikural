import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, ShieldCheck, Fingerprint, Search, MoreVertical, Phone } from 'lucide-react';

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

const enrolledPeople: Person[] = [
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
  {
    id: 'usr-5',
    name: 'David Miller',
    role: 'Managing Director, Risk',
    department: 'Enterprise Compliance',
    enrolledDate: 'Mar 10, 2026',
    assuranceLevel: 'High',
    lastVerified: '5 days ago',
    avatarBg: '#F59E0B',
  },
];

export const PeoplePage: React.FC = () => {
  const [search, setSearch] = useState('');

  const filtered = enrolledPeople.filter(
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-20 font-bold text-text-primary tracking-tight">Enrolled Voiceprints & Identities</h1>
          <p className="text-12 text-text-muted mt-0.5">
            Cryptographically sealed biometric voice templates for high-assurance executive and agent authorization
          </p>
        </div>

        <button
          onClick={() => alert('Launching Voiceprint Enrollment Wizard...')}
          className="px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary/90 text-white text-12 font-medium shadow-glow flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Enroll New Identity
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-card-panel border border-card-border">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search enrolled personnel by name, title, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-ground border border-card-border rounded-lg pl-8 pr-3 py-1.5 text-12 text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-accent-border transition-colors"
          />
        </div>

        <span className="text-11 font-mono text-text-muted">
          Showing {filtered.length} of {enrolledPeople.length} Enrolled Profiles
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

                <button className="p-1 text-text-subtle hover:text-text-primary">
                  <MoreVertical className="w-4 h-4" />
                </button>
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
                    {person.assuranceLevel} (99.8%)
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
                RawNet3 SHA Sealed
              </span>
              <button
                onClick={() => alert(`Simulating outbound verification call to ${person.name}...`)}
                className="px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface-elevated/80 border border-card-border text-11 text-text-primary flex items-center gap-1.5 transition-colors"
              >
                <Phone className="w-3 h-3 text-accent-primary" />
                Test Auth
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
