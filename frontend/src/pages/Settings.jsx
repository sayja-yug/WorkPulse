import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Building2, MapPin, Shield, CheckCircle2, Globe } from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';

export const Settings = () => {
  const { business } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoading(true);
        const res = await api.get('/branches/');
        const data = res.data.data;
        setBranches(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error('Failed to load branches', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, [business]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-950 tracking-tight">Organization &amp; Branch Configuration</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Manage multi-site branch geofences, business timezone, and localization</p>
      </div>

      {/* Business Details Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-950 dark:text-zinc-50 text-base leading-tight">{business?.name}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Tenant UUID: {business?.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-400 block font-semibold mb-0.5">Operating Timezone</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">{business?.timezone || 'Asia/Kolkata'}</span>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-400 block font-semibold mb-0.5">Base Currency</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">{business?.currency || 'INR (₹)'}</span>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-400 block font-semibold mb-0.5">URL Identifier</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">{business?.slug}</span>
          </div>
        </div>
      </div>

      {/* Branch Geofences Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">Worksite Branches &amp; Geofence Radiuses</h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{branches.length} locations configured</span>
        </div>

        {loading ? (
          <Loader message="Loading branch settings..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Branch Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">GPS Coordinates</th>
                  <th className="py-3 px-4">Geofence Radius</th>
                  <th className="py-3 px-4">Head Office</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">{b.name}</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-700 dark:text-zinc-300">{b.code}</td>
                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">{b.city}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {b.latitude ? `${Number(b.latitude).toFixed(4)}, ${Number(b.longitude).toFixed(4)}` : 'Not Set'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700">
                        {b.geofence_radius || 500} meters
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {b.is_head_office ? (
                        <Badge variant="default">HQ</Badge>
                      ) : (
                        <span className="text-zinc-400 text-xs">Branch</span>
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
  );
};

