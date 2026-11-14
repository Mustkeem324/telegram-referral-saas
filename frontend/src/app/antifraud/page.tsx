'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import {
  ShieldAlert,
  AlertTriangle,
  UserX,
  CheckCircle,
  XCircle,
  Shield,
  Filter,
  CheckCircle2,
  Activity,
  Lock,
} from 'lucide-react';

export default function AntiFraudPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterResolved, setFilterResolved] = useState<boolean | undefined>(false);

  useEffect(() => {
    loadEvents();
  }, [filterResolved]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getFraudEvents(1, filterResolved);
      setEvents(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (eventId: string, action: string) => {
    try {
      await api.resolveFraudEvent(eventId, action);
      await loadEvents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Anti-Fraud & Abuse Prevention</span>
              <span className="text-xs font-bold text-dangerRed bg-dangerRed/10 px-2.5 py-0.5 rounded-full border border-dangerRed/25 font-mono">
                Active Shield
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Automated risk scoring, burst velocity detection, and suspicious activity mitigation queue.
            </p>
          </div>

          <div className="flex items-center gap-2.5 bg-navy-800 px-3.5 py-1.5 rounded-xl border border-navy-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterResolved === undefined ? 'all' : filterResolved ? 'resolved' : 'unresolved'}
              onChange={(e) => {
                const val = e.target.value;
                setFilterResolved(val === 'all' ? undefined : val === 'resolved');
              }}
              className="bg-transparent text-xs font-bold text-white focus:outline-none"
            >
              <option value="unresolved" className="bg-navy-900">Unresolved Incidents Only</option>
              <option value="resolved" className="bg-navy-900">Resolved Incidents</option>
              <option value="all" className="bg-navy-900">All Incidents</option>
            </select>
          </div>
        </div>

        {/* 3 Summary Risk Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-5 shadow-card space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Velocity Monitoring</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-white">50 / user / day</span>
              <span className="text-xs text-electric font-semibold font-mono">Max Cap</span>
            </div>
            <p className="text-[11px] text-slate-400">Automated burst protection enabled</p>
          </div>

          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-5 shadow-card space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Self-Referral Guard</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-successGreen">100% Blocked</span>
              <span className="text-xs text-successGreen font-semibold">Active</span>
            </div>
            <p className="text-[11px] text-slate-400">Self-join attribution strictly rejected</p>
          </div>

          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-5 shadow-card space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Risk Threshold</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-warningOrange">Score &gt; 60</span>
              <span className="text-xs text-warningOrange font-semibold font-mono">Auto-Hold</span>
            </div>
            <p className="text-[11px] text-slate-400">Holds rewards for manual creator approval</p>
          </div>
        </div>

        {/* Incidents Table */}
        <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 space-y-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-dangerRed" /> Flagged Incidents Queue ({events.length})
            </h2>
            <span className="text-xs text-slate-400 font-mono">Real-time inspection</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading risk signals...</div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <Shield className="w-8 h-8 text-successGreen mx-auto opacity-70" />
              <p className="font-semibold text-slate-400">No fraudulent incidents flagged.</p>
              <p className="text-[11px]">All campaigns are operating cleanly with zero detected abuses.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-900/60 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-xl">Incident Type</th>
                    <th className="py-2.5 px-3">Suspect Telegram ID</th>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Detection Details</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 rounded-r-xl text-right">Mitigation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/60">
                  {events.map((ev) => (
                    <tr key={ev._id} className="hover:bg-navy-750/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-dangerRed flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="capitalize">{ev.event_type.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-white font-semibold">{ev.user_telegram_id}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            ev.risk_score >= 80
                              ? 'bg-dangerRed/15 text-dangerRed border border-dangerRed/30'
                              : 'bg-warningOrange/15 text-warningOrange border border-warningOrange/30'
                          }`}
                        >
                          {ev.risk_score} / 100
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 max-w-xs truncate font-mono text-[11px]">
                        {JSON.stringify(ev.details || {})}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ev.resolved
                              ? 'bg-successGreen/15 text-successGreen border border-successGreen/30'
                              : 'bg-warningOrange/15 text-warningOrange border border-warningOrange/30'
                          }`}
                        >
                          {ev.resolved ? 'Resolved' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!ev.resolved ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResolve(ev._id, 'reversed')}
                              className="px-2.5 py-1 rounded-lg bg-dangerRed/15 hover:bg-dangerRed/25 border border-dangerRed/30 text-dangerRed text-[11px] font-bold transition-colors"
                            >
                              Reverse & Void
                            </button>
                            <button
                              onClick={() => handleResolve(ev._id, 'dismissed')}
                              className="px-2.5 py-1 rounded-lg bg-navy-750 hover:bg-navy-700 border border-navy-650 text-slate-300 text-[11px] font-bold transition-colors"
                            >
                              Dismiss False Positive
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-mono">
                            {ev.resolution_action}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
