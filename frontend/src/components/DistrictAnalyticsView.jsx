import React, { useState, useEffect } from 'react';
import { BarChart3, Users, AlertTriangle, ShieldCheck, Clock, Droplet, RefreshCw, Building2 } from 'lucide-react';
import { fetchDistrictAnalytics } from '../api/client';

export default function DistrictAnalyticsView() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDistrictAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.warn('Could not load district analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading || !analytics) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-600 mb-2" />
        <span className="text-xs font-bold">जिला मातृत्व स्वास्थ्य आंकड़े लोड हो रहे हैं...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-slate-800" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              जिला मातृत्व स्वास्थ्य एवं पीपीएच निगरानी डैशबोर्ड (District Command)
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {analytics.district} • वास्तविक डेटाबेस गणना (Real Database Aggregation)
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center space-x-1.5 self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>रिफ्रेश</span>
        </button>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">पंजीकृत माताएं (Mothers)</span>
            <Users className="w-4 h-4 text-slate-600" />
          </div>
          <span className="text-2xl font-black text-slate-900">{analytics.total_mothers_registered}</span>
          <span className="text-[11px] text-slate-500 block mt-1">उप-स्वास्थ्य केंद्र व पीएचसी कुल</span>
        </div>

        <div className="p-4 rounded-2xl bg-red-50/50 border border-red-200">
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-xs font-bold">सक्रिय आपातकाल (Active PPH)</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <span className="text-2xl font-black text-red-600">{analytics.active_pph_emergencies}</span>
          <span className="text-[11px] text-red-700 block mt-1">अस्पताल ट्राइएज सक्रिय</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold">रेफरल पूर्णता दर (KPI Rate)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700">{analytics.referral_completion_kpi_percent}%</span>
          <span className="text-[11px] text-emerald-800 block mt-1">{analytics.completed_referrals} / {analytics.total_referrals} हैंडओवर संपन्न</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">औसत पारगमन समय (Avg ETA)</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <span className="text-2xl font-black text-slate-900">{analytics.average_transit_eta_minutes} मिनट</span>
          <span className="text-[11px] text-slate-500 block mt-1">108 आपातकालीन एम्बुलेंस</span>
        </div>
      </div>

      {/* Blood Bank Availability Table */}
      <div className="border border-slate-200 rounded-2xl p-4">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
          <Droplet className="w-4 h-4 text-red-600" />
          <span>जिले में रक्त बैंक स्टॉक स्थिति (Verified Blood Inventory)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {analytics.blood_inventory_summary.map((b, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-sm font-black text-slate-900 block">{b.blood_group}</span>
                <span className="text-[10px] text-slate-500">रक्त समूह</span>
              </div>
              <span className="text-base font-black text-red-600">{b.total_units} यूनिट</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
