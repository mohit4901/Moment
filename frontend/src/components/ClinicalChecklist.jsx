import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Play, Pause, RotateCcw, AlertTriangle, ShieldAlert, Pill, CheckSquare, Square, Heart, Clock, Ambulance } from 'lucide-react';
import { fetchEmergencyProtocol } from '../api/client';

export default function ClinicalChecklist({ lang = 'en' }) {
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [checkedItems, setCheckedItems] = useState({
    'act-1': true,
    'act-2': true,
    'act-4': true,
  });
  const [protocol, setProtocol] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ambulanceDispatched, setAmbulanceDispatched] = useState(false);

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadProtocol = async () => {
      setLoading(true);
      try {
        const data = await fetchEmergencyProtocol('ESCALATED', 1.1, true);
        setProtocol(data);
      } catch (err) {
        // Fallback protocol
        setProtocol({
          risk_tier: 'ESCALATED',
          shock_index: 1.1,
          who_recommendation: 'Active obstetric hemorrhage. Administer IV Oxytocin 20 IU + Tranexamic acid 1g within 3 hours. Prepare 108 transfer.',
        });
      } finally {
        setLoading(false);
      }
    };
    loadProtocol();
  }, []);

  const toggleCheck = (id) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const emergencyActions = [
    { id: 'act-1', category: 'FIRST-LINE (0 - 15 MIN)', title: 'Call for Help & Announce PPH', desc: 'Alert Medical Officer, ANM team, and standby 108 referral driver.', critical: true },
    { id: 'act-2', category: 'FIRST-LINE (0 - 15 MIN)', title: 'Two 14/16G Large-Bore IV Cannulae', desc: 'Draw blood for Crossmatch 2 units, CBC, and coagulation panel.', critical: true },
    { id: 'act-3', category: 'FIRST-LINE (0 - 15 MIN)', title: 'Bimanual Uterine Compression & Rub', desc: 'Expel clots and stimulate myometrial contraction.', critical: true },
    { id: 'act-4', category: 'FIRST-LINE (0 - 15 MIN)', title: 'Oxytocin 10-20 IU IV Infusion', desc: 'Administer in 500 mL normal saline + rapid crystalloid bolus.', critical: true },
    { id: 'act-5', category: 'FIRST-LINE (0 - 15 MIN)', title: 'Tranexamic Acid (TXA) 1g IV', desc: 'Give slowly over 10 minutes (WHO 2024 guideline).', critical: true },
    { id: 'act-6', category: 'SECOND-LINE (15 - 30 MIN)', title: 'Misoprostol 800 mcg Sublingual', desc: 'Prostaglandin E1 analogue if atony persists.', critical: false },
    { id: 'act-7', category: 'SECOND-LINE (15 - 30 MIN)', title: 'Examine for Lacerations & Retained Placenta', desc: 'Inspect cervix, vagina, and ensure placenta is complete.', critical: true },
    { id: 'act-8', category: 'TRANSFER / SURGICAL', title: '108 Ambulance Dispatch with SBAR Sheet', desc: 'Transfer to District Hospital (FRU) with active IV infusion.', critical: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Live Emergency Timer */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-red-100 text-red-700">
              <ClipboardCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {lang === 'hi' ? '108 आपातकालीन प्रोटोकॉल व चेकलिस्ट' : 'Clinical PPH Emergency Bundle (WHO / FIGO)'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
              WHO / FIGO 2024
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {lang === 'hi'
              ? 'प्रसवोत्तर रक्तस्राव (PPH) के पहले गोल्डन आवर (Golden Hour) के लिए चरणबद्ध प्राथमिक हस्तक्षेप।'
              : 'Rapid step-by-step checklist during obstetric hemorrhage golden hour.'}
          </p>
        </div>

        {/* Stopwatch Timer */}
        <div className="flex items-center space-x-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs self-start md:self-auto">
          <Clock className="w-4 h-4 text-red-600" />
          <div className="font-mono text-xl font-black text-slate-900">
            {formatTime(seconds)}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="p-1.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                setTimerRunning(false);
                setSeconds(0);
              }}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SBAR & 108 Dispatch Banner */}
      <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Ambulance className="w-5 h-5 text-red-700" />
            <span className="font-black text-sm text-red-950 uppercase tracking-wider">
              108 Emergency Referral Standby
            </span>
          </div>
          <p className="text-xs text-rose-950 mt-1 font-medium">
            MOMENT-PT-2916 (Priya Sharma, 26y, 38w) • District Women Hospital FRU (14 km • 22 min ETA)
          </p>
        </div>

        <button
          onClick={() => setAmbulanceDispatched(true)}
          disabled={ambulanceDispatched}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-2 cursor-pointer ${
            ambulanceDispatched
              ? 'bg-emerald-700 text-white'
              : 'bg-red-700 hover:bg-red-800 text-white'
          }`}
        >
          <Ambulance className="w-4 h-4" />
          <span>{ambulanceDispatched ? '108 Dispatched (ETA 18 min)' : 'Dispatch 108 Ambulance'}</span>
        </button>
      </div>

      {/* Checklist Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Clinical Intervention Steps
          </span>
          <span className="text-xs font-bold text-slate-500 font-mono">
            {Object.values(checkedItems).filter(Boolean).length} / {emergencyActions.length} Completed
          </span>
        </div>

        <div className="space-y-2.5">
          {emergencyActions.map((act) => {
            const isChecked = Boolean(checkedItems[act.id]);
            return (
              <div
                key={act.id}
                onClick={() => toggleCheck(act.id)}
                className={`p-3.5 rounded-2xl border transition-all flex items-start space-x-3.5 cursor-pointer ${
                  isChecked
                    ? 'bg-emerald-50/50 border-emerald-300 text-slate-900'
                    : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="mt-0.5">
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-extrabold ${isChecked ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {act.title}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">
                      {act.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{act.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
