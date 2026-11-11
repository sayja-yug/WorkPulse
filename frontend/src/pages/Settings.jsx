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
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Organization & Branch Configuration</h2>
        <p className="text-xs text-slate-500 mt-0.5">Manage multi-site branch geofences, business timezone, and localization</p>
      </div>

      {/* Business Details Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base leading-tight">{business?.name}</h3>
            <p className="text-xs text-slate-500 font-mono">Tenant UUID: {business?.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block font-semibold mb-0.5">Operating Timezone</span>
            <span className="font-bold text-slate-800">{business?.timezone || 'Asia/Kolkata'}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block font-semibold mb-0.5">Base Currency</span>
            <span className="font-bold text-slate-800">{business?.currency || 'INR (₹)'}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block font-semibold mb-0.5">URL Identifier</span>
            <span className="font-bold text-slate-800 font-mono">{business?.slug}</span>
          </div>
        </div>
      </div>

      {/* Branch Geofences Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Worksite Branches & Geofence Radiuses</h3>
          <span className="text-xs text-slate-500 font-medium">{branches.length} locations configured</span>
        </div>

        {loading ? (
          <Loader message="Loading branch settings..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Branch Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">GPS Coordinates</th>
                  <th className="py-3 px-4">Geofence Radius</th>
                  <th className="py-3 px-4">Head Office</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{b.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{b.code}</td>
                    <td className="py-3.5 px-4 text-slate-600">{b.city}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {b.latitude ? `${Number(b.latitude).toFixed(4)}, ${Number(b.longitude).toFixed(4)}` : 'Not Set'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {b.geofence_radius || 500} meters
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {b.is_head_office ? (
                        <Badge variant="success">HQ</Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">Branch</span>
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
