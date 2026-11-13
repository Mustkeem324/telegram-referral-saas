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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Anti-Fraud & Abuse Prevention</h1>
            <p className="text-sm text-slate-400 mt-1">
              Automated risk scoring, burst velocity detection, and suspicious activity mitigation queue.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterResolved === undefined ? 'all' : filterResolved ? 'resolved' : 'unresolved'}
              onChange={(e) => {
                const val = e.target.value;
                setFilterResolved(val === 'all' ? undefined : val === 'resolved');
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="unresolved">Unresolved Incidents Only</option>
              <option value="resolved">Resolved Incidents</option>
              <option value="all">All Incidents</option>
            </select>
          </div>
        </div>

        {/* Incidents Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" /> Flagged Incidents Queue ({events.length})
          </h2>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading risk signals...</div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No fraudulent incidents flagged. Your campaigns are running cleanly!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l">Incident Type</th>
                    <th className="py-2.5 px-3">Suspect Telegram ID</th>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Detection Details</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 rounded-r text-right">Mitigation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {events.map((ev) => (
                    <tr key={ev._id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-semibold text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {ev.event_type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{ev.user_telegram_id}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ev.risk_score >= 80
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {ev.risk_score} / 100
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                        {JSON.stringify(ev.details || {})}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ev.resolved
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {ev.resolved ? ev.resolution_action : 'pending review'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!ev.resolved ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResolve(ev._id, 'dismissed')}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleResolve(ev._id, 'rejected_referral')}
                              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-[11px] font-medium"
                            >
                              Reject & Reverse
                            </button>
                            <button
                              onClick={() => handleResolve(ev._id, 'banned_user')}
                              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-medium"
                            >
                              Ban User
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">Resolved</span>
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
