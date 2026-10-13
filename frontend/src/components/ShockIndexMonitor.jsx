import React, { useState, useEffect } from 'react';
import { HeartPulse, Activity, AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw, Gauge } from 'lucide-react';
import { calculateShockIndex } from '../api/client';

export default function ShockIndexMonitor({ lang = 'en' }) {
  const [heartRate, setHeartRate] = useState(82);
  const [systolicBp, setSystolicBp] = useState(118);
  const [shockData, setShockData] = useState(null);
  const [loading, setLoading] = useState(false);

  const presets = [
    { label: 'Normal Postpartum', hr: 76, sbp: 122, desc: 'Healthy hemodynamic tone' },
    { label: 'Compensated Shock (Early)', hr: 104, sbp: 110, desc: 'Tachycardia masking blood loss' },
    { label: 'Severe Decompensation', hr: 138, sbp: 82, desc: 'Critical vascular collapse (SI > 1.3)' },
  ];

  const updateVitals = async (hr, sbp) => {
    setLoading(true);
    try {
      const data = await calculateShockIndex(hr, sbp);
      setShockData(data);
    } catch (err) {
      // Local fallback calculation
      const siVal = sbp > 0 ? hr / sbp : 0;
      setShockData({
        heart_rate: hr,
        systolic_bp: sbp,
        shock_index: Number(siVal.toFixed(2)),
        alert_level: siVal >= 1.3 ? 'CRITICAL CRISIS' : siVal >= 0.9 ? 'ELEVATED WATCH' : 'NORMAL STABLE',
        clinical_interpretation:
          siVal >= 1.3
            ? 'Shock Index >= 1.3 indicates massive blood loss. High probability of transfusion or intensive care admission. Mobilize 108 emergency transfer immediately.'
            : siVal >= 0.9
            ? 'Shock Index between 0.9 and 1.3 suggests occult hemorrhage. Reassess blood loss immediately and secure second large-bore IV cannula.'
            : 'Vitals within expected hemodynamic parameters for postpartum transition.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateVitals(heartRate, systolicBp);
  }, [heartRate, systolicBp]);

  const applyPreset = (preset) => {
    setHeartRate(preset.hr);
    setSystolicBp(preset.sbp);
  };

  const si = systolicBp > 0 ? (heartRate / systolicBp).toFixed(2) : 0;
  const isCritical = Number(si) >= 1.3;
  const isAmber = Number(si) >= 0.9 && Number(si) < 1.3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-red-100 text-red-700">
              <HeartPulse className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {lang === 'hi' ? '15-मिनट शॉक इंडेक्स व हेमोडायनामिक मॉनिटर' : 'Real-Time Shock Index & Hemodynamic Monitor'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Module B Vitals
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {lang === 'hi'
              ? 'रक्तचाप गिरने से पहले छिपे हुए रक्तस्राव का पता लगाएँ (SI = हृदय गति / सिस्टोलिक बीपी)। सामान्य < 0.9।'
              : 'Detect occult hemorrhage before blood pressure plummets (SI = Heart Rate / Systolic BP). Normal < 0.9.'}
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 transition-all font-bold shadow-xs cursor-pointer active:scale-95"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Input Panel */}
        <div className="lg:col-span-6 bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-5">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {lang === 'hi' ? 'मातृ वाइटल्स इनपुट (Maternal Vitals)' : 'Live Maternal Vitals Input'}
          </h3>

          {/* Heart Rate Slider */}
          <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <HeartPulse className="w-4 h-4 text-red-600" />
                <span>Maternal Heart Rate (HR)</span>
              </label>
              <div className="flex items-center space-x-1">
                <span className="text-2xl font-black font-mono text-slate-900">{heartRate}</span>
                <span className="text-xs text-slate-500 font-mono font-bold">bpm</span>
              </div>
            </div>
            <input
              type="range"
              min="40"
              max="180"
              value={heartRate}
              onChange={(e) => setHeartRate(Number(e.target.value))}
              className="w-full accent-red-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>40 (Bradycardia)</span>
              <span>100 (Tachycardia alert)</span>
              <span>180 (Extreme)</span>
            </div>
          </div>

          {/* Systolic BP Slider */}
          <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>Systolic Blood Pressure (SBP)</span>
              </label>
              <div className="flex items-center space-x-1">
                <span className="text-2xl font-black font-mono text-slate-900">{systolicBp}</span>
                <span className="text-xs text-slate-500 font-mono font-bold">mmHg</span>
              </div>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              value={systolicBp}
              onChange={(e) => setSystolicBp(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>50 (Profound Hypotension)</span>
              <span>90 (Hypotension cut-off)</span>
              <span>200 (Severe HTN)</span>
            </div>
          </div>

          {/* Clinical Reference Box */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-slate-600 shadow-xs">
            <div className="font-bold text-slate-900">Why Shock Index matters in Rural Labor Rooms:</div>
            <p className="text-[11px] leading-relaxed">
              Healthy mothers compensate for bleeding by peripheral vasoconstriction until 30-40% of blood is lost. Shock Index ($HR / SBP$) flags hemodynamic compromise hours earlier than traditional blood pressure cuffs alone.
            </p>
          </div>
        </div>

        {/* Gauge & Clinical Alert Panel */}
        <div className="lg:col-span-6 space-y-5">
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isCritical
                ? 'bg-rose-50/70 border-rose-300'
                : isAmber
                ? 'bg-amber-50/70 border-amber-300'
                : 'bg-emerald-50/70 border-emerald-300'
            } shadow-xs`}
          >
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Hemodynamic Gauge
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black font-mono uppercase ${
                  isCritical
                    ? 'bg-red-700 text-white'
                    : isAmber
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {shockData?.alert_level || (isCritical ? 'CRITICAL CRISIS' : isAmber ? 'ELEVATED WATCH' : 'NORMAL STABLE')}
              </span>
            </div>

            {/* Big Shock Index Number */}
            <div className="flex flex-col items-center justify-center py-4">
              <div className="text-6xl font-black font-mono tracking-tight text-slate-950">
                {si}
              </div>
              <div className="text-xs text-slate-600 font-bold mt-1">
                Shock Index ($HR / SBP$)
              </div>
            </div>

            {/* Threshold Visual Bar */}
            <div className="space-y-2 mt-4">
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                <div className="w-[50%] bg-emerald-500" title="Normal (< 0.9)" />
                <div className="w-[25%] bg-amber-400" title="Elevated (0.9 - 1.3)" />
                <div className="w-[25%] bg-red-600" title="Critical (>= 1.3)" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono font-bold">
                <span>0.5 (Normal)</span>
                <span>0.9 (Warning)</span>
                <span>1.3 (Emergency)</span>
                <span>2.0+</span>
              </div>
            </div>

            {/* Dynamic Clinical Alert */}
            <div className="mt-6 pt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm">
                {isCritical ? (
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                ) : isAmber ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                <span>
                  {isCritical
                    ? 'IMMEDIATE HEMODYNAMIC CRISIS: 108 REFERRAL ALERT'
                    : isAmber
                    ? 'COMPENSATED SHOCK SUSPECTED'
                    : 'HEMODYNAMICALLY STABLE'}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {shockData?.clinical_interpretation ||
                  (isCritical
                    ? 'Shock Index >= 1.3 indicates massive blood loss. High probability of transfusion or intensive care admission. Mobilize OB emergency response team.'
                    : isAmber
                    ? 'Shock Index between 0.9 and 1.3 suggests occult hemorrhage. Reassess blood loss immediately and secure second large-bore IV cannula.'
                    : 'Vitals within expected hemodynamic parameters for postpartum transition.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
