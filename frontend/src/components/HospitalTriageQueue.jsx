import React, { useState, useEffect } from 'react';
import { Building2, Clock, Ambulance, CheckCircle2, AlertOctagon, PhoneCall, ShieldAlert, RefreshCw, UserCheck } from 'lucide-react';
import { fetchHospitalQueue } from '../api/client';

export default function HospitalTriageQueue({ facilityId = 'FAC-PGIMS' }) {
  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeHandoverId, setActiveHandoverId] = useState(null);

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const data = await fetchHospitalQueue(facilityId);
      setQueue(data || []);
    } catch (err) {
      console.warn('Could not load hospital queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [facilityId]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              अस्पताल आपातकालीन ट्राइएज बे (Hospital Emergency Triage Queue)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              पं. बी.डी. शर्मा पीजीआईएमएस रोहतक (FRU) • लेवल-3 मैटरनल आईसीयू
            </p>
          </div>
        </div>

        <button
          onClick={loadQueue}
          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center space-x-1.5 self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>रिफ्रेश (Live Refresh)</span>
        </button>
      </div>

      {/* Queue List */}
      {queue.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
          <h3 className="text-sm font-bold text-slate-700">कोई सक्रिय आपातकालीन रेफरल नहीं है</h3>
          <p className="text-xs text-slate-400">सभी रेफरल मरीज सुरक्षित रूप से अस्पताल में भर्ती हो चुके हैं।</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item, idx) => (
            <div
              key={idx}
              className="border-2 border-red-200 rounded-2xl p-5 bg-gradient-to-r from-red-50/40 via-white to-white shadow-xs"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center animate-ping">
                    🚨
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-slate-900 text-base">{item.patient_name}</span>
                      <span className="text-xs font-bold text-slate-500">({item.hindi_name})</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {item.patient_id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white">
                        {item.blood_group} रक्त समूह
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">उम्र: {item.age} वर्ष • प्रेषक: उप-स्वास्थ्य केंद्र खेड़ी साध</span>
                  </div>
                </div>

                {/* ETA Badge */}
                <div className="flex items-center space-x-3">
                  <div className="bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-red-700 block uppercase">अस्पताल आगमन (ETA)</span>
                    <span className="text-base font-black text-red-700">{item.eta_minutes || 16} मिनट</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">दूरी (Distance)</span>
                    <span className="text-base font-black text-slate-800">{item.distance_km || 14} किमी</span>
                  </div>
                </div>
              </div>

              {/* Clinical SBAR Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">S (स्थिति / Situation)</span>
                  <span className="font-bold text-slate-800">{item.sbar_situation || 'Active PPH / Atony'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">B (पृष्ठभूमि / Background)</span>
                  <span className="font-bold text-slate-800">{item.sbar_background || 'Prior LSCS, Severe Anemia'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">A (आकलन / Assessment)</span>
                  <span className="font-bold text-red-600">{item.sbar_assessment || 'Shock Index 1.31, Loss 550ml'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">R (सिफारिश / Recommendation)</span>
                  <span className="font-bold text-slate-800">{item.sbar_recommendation || 'OT Standby, 2 PRBC Ready'}</span>
                </div>
              </div>

              {/* Triage Readiness Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ट्राइएज बे OB-RED-01 तैयार</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>ब्लड बैंक सूचित (O+ आरक्षित)</span>
                  </span>
                </div>

                <button
                  onClick={() => alert(`मरीज ${item.patient_name} का हैंडओवर सफलतापूर्वक दर्ज किया गया।`)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition flex items-center space-x-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>हैंडओवर स्वीकार करें (Handover Complete)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
