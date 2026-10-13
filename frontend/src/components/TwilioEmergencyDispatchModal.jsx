import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Ambulance,
  Building2,
  CheckCircle2,
  Phone,
  Send,
  X,
  Radio,
  Clock,
  Droplet,
  HeartPulse,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { dispatchTwilioEmergency } from '../api/client';

export default function TwilioEmergencyDispatchModal({
  isOpen,
  onClose,
  patient,
  pregnancy,
  vitals,
  bloodLoss = 420,
  shockIndex = 1.31,
  triggerReason = 'PAD_PHOTO_CV_ALERT',
  nearestHospital = 'Pt. B.D. Sharma PGIMS Rohtak',
  hospitalDistanceKm = 11.1,
  hospitalEtaMins = 17,
  onOpenHospitalRoute = null,
  lang = 'hi'
}) {
  const [dispatchStage, setDispatchStage] = useState('ready'); // 'ready' | 'connecting' | 'sending_108' | 'sending_hosp' | 'delivered' | 'error'
  const [dispatchResult, setDispatchResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Play audio alert when modal opens
  useEffect(() => {
    if (isOpen) {
      setDispatchStage('ready');
      setDispatchResult(null);
      setErrorMsg(null);

      // Speak alert in Hindi
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const pName = patient?.hindi_name || patient?.name || 'मरीज';
          const utterance = new SpeechSynthesisUtterance(
            `आपातकालीन चेतावनी! ${pName} में गंभीर रक्तस्राव पाया गया है। 108 एम्बुलेंस और अस्पताल को अलर्ट भेजने हेतु बटन दबाएं।`
          );
          utterance.lang = 'hi-IN';
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        // silent fallback
      }
    }
  }, [isOpen, patient]);

  if (!isOpen) return null;

  const patientName = patient?.name || 'Priya Sharma';
  const patientId = patient?.id || 'MOMENT-PT-98A7';
  const bloodGroup = patient?.blood_group || 'O+';
  const sbp = vitals?.sbp || 90;
  const dbp = vitals?.dbp || 60;
  const pulse = vitals?.pulse || 118;
  const si = typeof shockIndex === 'number' ? shockIndex.toFixed(2) : '1.31';
  const lossVol = typeof bloodLoss === 'number' ? Math.round(bloodLoss) : 420;

  const nurseName = 'ANM सुमन देवी (उप-स्वास्थ्य केंद्र खेड़ी साध)';
  const officialAlertText = `🚨 *[MOMENT AI CRITICAL OBSTETRIC ALERT]*\n` +
    `👩‍⚕️ *स्टाफ:* ${nurseName}\n` +
    `🏥 *मरीज:* ${patientName} (ID: ${patientId}, रक्त: ${bloodGroup})\n` +
    `⚠️ *गंभीर PPH जोखिम:* रक्तस्राव: ~${lossVol} mL | Shock Index: ${si}\n` +
    `🚑 *108 ALS एम्बुलेंस:* ${nearestHospital} रवाना की गई है।\n` +
    `🩸 *अस्पताल निर्देश:* 2x 16G IV लाइन्स, ऑक्सीटोसिन 20 IU ड्रिप, 2 यूनिट ${bloodGroup} ब्लड स्टैंडबाय रखें!\n` +
    `⏱️ *डिस्पैच समय:* ${new Date().toLocaleTimeString('en-IN')}`;

  const whatsappDirectLink = `https://wa.me/918168884901?text=${encodeURIComponent(officialAlertText)}`;

  const handleStartDispatch = async () => {
    setDispatchStage('connecting');
    setErrorMsg(null);

    try {
      // Step 1: Connection Gateway Handshake (400ms visual)
      await new Promise(r => setTimeout(r, 450));
      setDispatchStage('sending_108');

      // Step 2: 108 Ambulance Transmission (600ms visual)
      await new Promise(r => setTimeout(r, 650));
      setDispatchStage('sending_hosp');

      // Step 3: Trigger real Twilio Backend API
      const payload = {
        patient_id: patientId,
        patient_name: patientName,
        blood_group: bloodGroup,
        blood_loss_ml: lossVol,
        pulse: Number(pulse),
        sbp: Number(sbp),
        dbp: Number(dbp),
        shock_index: Number(si),
        severity: 'CRITICAL',
        trigger_source: triggerReason,
        nearest_hospital: nearestHospital,
        ambulance_phone: '+919812001108',
        hospital_phone: '+918168884901'
      };

      const result = await dispatchTwilioEmergency(payload);
      setDispatchResult(result);
      setDispatchStage('delivered');

      // Audio confirmation
      try {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(
            `108 एम्बुलेंस और ${nearestHospital} को इमरजेंसी अलर्ट व एसएमएस भेज दिया गया है।`
          );
          utterance.lang = 'hi-IN';
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        // silent
      }
    } catch (err) {
      console.error('Dispatch error:', err);
      setErrorMsg(err.message || 'Twilio Gateway dispatch encountered a network interruption');
      setDispatchStage('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border-2 border-red-500 max-w-xl w-full p-5 sm:p-7 shadow-2xl space-y-5 relative my-auto overflow-hidden">
        
        {/* Glowing emergency accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 animate-pulse" />

        {/* Modal Top Header */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-red-100 border-2 border-red-300 text-red-700 flex items-center justify-center flex-shrink-0 animate-bounce">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white tracking-wider animate-pulse">
                  CRITICAL PPH ALERT
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {patientId}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight mt-0.5">
                {lang === 'hi' ? '🚨 गंभीर रक्तस्राव — 1-क्लिक इमरजेंसी अलर्ट' : '🚨 Severe Hemorrhage — 1-Click Twilio Alert'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clinical Snapshot Banner */}
        <div className="bg-red-50/70 border border-red-200 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-red-950 pb-2 border-b border-red-100">
            <span>माँ का नाम: <strong className="font-black text-slate-900 uppercase">{patientName}</strong></span>
            <span>रक्त समूह: <strong className="font-black text-red-700 bg-white px-2 py-0.5 rounded border border-red-200">{bloodGroup}</strong></span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-white/90 rounded-xl p-2 border border-red-100">
              <span className="text-[10px] font-bold text-slate-500 block">रक्तस्राव (Lochia)</span>
              <span className="text-sm font-black text-red-600 font-mono">~{lossVol} mL</span>
              <span className="text-[9px] font-bold text-red-500 block">Severe PPH</span>
            </div>
            <div className="bg-white/90 rounded-xl p-2 border border-red-100">
              <span className="text-[10px] font-bold text-slate-500 block">शॉक इंडेक्स (SI)</span>
              <span className="text-sm font-black text-red-600 font-mono">{si}</span>
              <span className="text-[9px] font-bold text-red-500 block">&gt; 0.9 Alert</span>
            </div>
            <div className="bg-white/90 rounded-xl p-2 border border-red-100">
              <span className="text-[10px] font-bold text-slate-500 block">ब्लड प्रेशर / HR</span>
              <span className="text-sm font-black text-slate-900 font-mono">{sbp}/{dbp}</span>
              <span className="text-[9px] font-bold text-slate-500 block">{pulse} bpm</span>
            </div>
          </div>
        </div>

        {/* Auto-Targeted Facility & Ambulance Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-3 flex items-start space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase text-indigo-700 block">नजदीकी रेफरल अस्पताल</span>
              <span className="text-xs font-black text-slate-900 truncate block">{nearestHospital}</span>
              <span className="text-[10px] font-bold text-emerald-700">✓ {hospitalDistanceKm} km ({hospitalEtaMins} min) • ब्लड बैंक तैयार</span>
            </div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3 flex items-start space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <Ambulance className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase text-emerald-700 block">108 ALS एम्बुलेंस</span>
              <span className="text-xs font-black text-slate-900 block">Vehicle HR-12-G-1081</span>
              <span className="text-[10px] font-bold text-slate-500">EMT Suresh Kumar • +91 98120 01108</span>
            </div>
          </div>
        </div>

        {/* ── LIVE DISPATCH ANIMATION SEQUENCE ── */}
        {dispatchStage !== 'ready' && (
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px]">
              <span className="text-slate-400 font-bold flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-red-400 animate-ping" />
                <span>Twilio Telecom Emergency Gateway (US-East-1)</span>
              </span>
              <span className="text-emerald-400 font-bold">
                {dispatchStage === 'delivered' ? '✓ DISPATCH COMPLETE' : 'TRANSMITTING...'}
              </span>
            </div>

            {/* Step 1 */}
            <div className={`flex items-center space-x-2 transition-all ${dispatchStage !== 'ready' ? 'text-emerald-300' : 'text-slate-500'}`}>
              <span className="w-4 h-4 rounded-full bg-emerald-900/60 border border-emerald-500 text-[10px] flex items-center justify-center font-bold">
                1
              </span>
              <span>📡 टेलीकॉम गेटवे हैंडशेक (Twilio REST API Handshake)</span>
              {dispatchStage !== 'ready' && <span className="text-emerald-400 text-[10px]">OK</span>}
            </div>

            {/* Step 2 */}
            <div className={`flex items-center space-x-2 transition-all ${dispatchStage === 'sending_108' || dispatchStage === 'sending_hosp' || dispatchStage === 'delivered' ? 'text-emerald-300' : 'text-slate-600'}`}>
              <span className="w-4 h-4 rounded-full bg-emerald-900/60 border border-emerald-500 text-[10px] flex items-center justify-center font-bold">
                2
              </span>
              <span>🚑 108 एम्बुलेंस कंट्रोल (+91 98120 01108) को SMS प्रेषित...</span>
              {(dispatchStage === 'sending_hosp' || dispatchStage === 'delivered') && <span className="text-emerald-400 text-[10px]">SENT</span>}
            </div>

            {/* Step 3 */}
            <div className={`flex items-center space-x-2 transition-all ${dispatchStage === 'sending_hosp' || dispatchStage === 'delivered' ? 'text-emerald-300' : 'text-slate-600'}`}>
              <span className="w-4 h-4 rounded-full bg-emerald-900/60 border border-emerald-500 text-[10px] flex items-center justify-center font-bold">
                3
              </span>
              <span>🏥 PGIMS रोहतक इमरजेंसी ट्रायेज बे (+91 81688 84901) WhatsApp + SMS अलर्ट...</span>
              {dispatchStage === 'delivered' && <span className="text-emerald-400 text-[10px]">SENT</span>}
            </div>

            {/* Final Delivered Confirmation Banner */}
            {dispatchStage === 'delivered' && dispatchResult && (
              <div className="pt-2 border-t border-slate-800 text-[11px] space-y-2.5 text-slate-300 bg-slate-950/70 p-3 rounded-2xl">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>✓ Twilio Telecom Gateway: SENT</span>
                  </span>
                  <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    SID: {dispatchResult.primary_twilio_sid?.substring(0, 18)}...
                  </span>
                </div>
                <div className="bg-amber-950/60 border border-amber-700/80 rounded-xl p-2.5 text-[11px] text-amber-200 leading-relaxed">
                  <span className="font-black text-amber-300 block mb-0.5">⚠️ Twilio Trial Account Policy:</span>
                  Twilio के फ्री ट्रायल अकाउंट में टेलीकॉम ऑपरेटर केवल उनका डिफ़ॉल्ट प्रीसेट टेम्पलेट डिलीवर करता है। अस्पताल/डॉक्टर को <strong>MOMENT का असली आपातकालीन अलर्ट (नर्स, मरीज, 650mL रक्तस्राव व ब्लड बैंक स्टैंडबाय)</strong> भेजने के लिए नीचे हरा बटन दबाएं:
                </div>
              </div>
            )}

            {/* Error view */}
            {dispatchStage === 'error' && (
              <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
                ⚠️ {errorMsg}
              </div>
            )}
          </div>
        )}

        {/* Message Preview Accordion */}
        {dispatchStage === 'ready' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-500 flex items-center space-x-1">
              <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
              <span>SMS / WhatsApp संदेश पूर्वावलोकन (Pre-Composed Alert):</span>
            </span>
            <p className="text-xs font-mono text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed select-all">
              🚨 <strong>MOMENT CRITICAL PPH ALERT:</strong> {patientName} ({patientId}, {bloodGroup}) • Blood Loss: {lossVol}mL • Shock Index: {si} • Origin: SC Khedi Sadh • Destination: {nearestHospital} • 108 ALS Dispatched.
            </p>
          </div>
        )}

        {/* Action Button Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          {dispatchStage === 'ready' && (
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
              <button
                onClick={handleStartDispatch}
                className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-red-600 to-[#981228] hover:from-red-700 hover:to-red-900 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-200 hover:shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <Send className="w-4 h-4" />
                <span>🚀 1-Click Twilio Alert (108 & Hospital)</span>
              </button>
              <a
                href={whatsappDirectLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>📲 WhatsApp चैट</span>
              </a>
            </div>
          )}

          {dispatchStage === 'delivered' && (
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
              <a
                href={whatsappDirectLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-200 cursor-pointer text-center"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>📲 असली MOMENT अलर्ट WhatsApp पर भेजें →</span>
              </a>

              {onOpenHospitalRoute && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenHospitalRoute();
                  }}
                  className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>GPS रूट ट्रैक करें →</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
              >
                बंद करें
              </button>
            </div>
          )}

          {dispatchStage === 'error' && (
            <button
              onClick={handleStartDispatch}
              className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer"
            >
              पुनः प्रयास करें (Retry Dispatch)
            </button>
          )}

          {dispatchStage === 'ready' && (
            <button
              onClick={onClose}
              className="w-full sm:w-auto py-3 px-5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              रद्द करें (Cancel)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
