import React, { useState } from 'react';
import {
  HeartPulse,
  Mail,
  Phone,
  Building2,
  MapPin,
  CheckCircle2,
  ExternalLink,
  Shield,
  Activity,
  Ambulance,
  Sparkles,
  FileText,
  Clock,
  ArrowRight,
  Send
} from 'lucide-react';

export default function AnimatedWaveFooter({
  onOpenDashboard,
  onOpenRegistry,
  onOpenAuditModal,
  lang = 'hi'
}) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail('');
      setSubscribed(false);
    }, 4000);
  };

  return (
    <footer className="relative bg-white border-t border-slate-200/90 pt-12 pb-6 overflow-hidden text-slate-900 selection:bg-rose-100 selection:text-rose-900">
      
      {/* ── 1. ANIMATED WAVE SVG BACKGROUND (BOTTOM ANCHORED) ── */}
      <div className="absolute bottom-0 inset-x-0 h-64 overflow-hidden pointer-events-none opacity-90 z-0">
        <div className="absolute bottom-0 h-64 w-[2400px] animate-wave">
          <svg
            className="h-full w-full"
            viewBox="0 0 2400 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Wave Layer 1 (Subtle Rose Tint) */}
            <path
              d="M0,180 C320,100 640,240 960,160 C1280,90 1600,230 1920,150 C2120,90 2280,130 2400,160 L2400,320 L0,320 Z"
              fill="rgba(152, 18, 40, 0.04)"
            />
            {/* Wave Layer 2 (Crimson Wave Accent) */}
            <path
              d="M0,220 C360,140 720,270 1080,180 C1440,100 1800,250 2160,170 L2400,210 L2400,320 L0,320 Z"
              fill="rgba(152, 18, 40, 0.07)"
            />
          </svg>
        </div>

        {/* Counter Wave Layer for Natural Fluid Ripple */}
        <div className="absolute bottom-0 h-64 w-[2400px] animate-wave-slow opacity-60">
          <svg
            className="h-full w-full"
            viewBox="0 0 2400 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,240 C400,160 800,280 1200,200 C1600,130 2000,270 2400,190 L2400,320 L0,320 Z"
              fill="rgba(225, 29, 72, 0.04)"
            />
          </svg>
        </div>
      </div>

      {/* ── 2. FOOTER CONTENT CONTAINER ── */}
      <div className="max-w-7xl relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Brand Banner Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-10 border-b border-slate-200/80 gap-6">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#981228] text-white flex items-center justify-center shadow-lg shadow-rose-200 flex-shrink-0">
              <HeartPulse className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black text-slate-900 tracking-tight">MOMENT</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-[#981228] border border-rose-200">
                  CLINICAL AI
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  NHM Haryana
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Maternal Obstetric Monitoring & Emergency Notification Technology
              </p>
            </div>
          </div>

          {/* Quick Pilot Stats Badge */}
          <div className="flex items-center space-x-3 text-xs bg-white border border-slate-200 shadow-2xs rounded-2xl p-2.5 px-4">
            <div className="flex items-center space-x-2 border-r border-slate-200 pr-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-black text-slate-800">12 सब-सेंटर सक्रिय</span>
            </div>
            <div className="text-slate-500 font-bold">
              रोहतक जिला पायलट • PGIMS लिंक्ड
            </div>
          </div>
        </div>

        {/* 4-Column Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 py-12">
          
          {/* Column 1: Stay Connected & Protocol Updates */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-[#981228]" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                क्लिनिकल अपडेट्स (Stay Connected)
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              WHO, FIGO और MoHFW के नए PPH दिशा-निर्देश व AI मॉडल अपडेट सीधे ईमेल पर प्राप्त करें।
            </p>

            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="डॉक्टर / एएनएम ईमेल आईडी"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#981228] transition shadow-2xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#981228] hover:bg-[#7a0e1f] text-white rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 shadow-md shadow-rose-200 cursor-pointer"
              >
                {subscribed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>सदस्यता पूर्ण (Subscribed!)</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>अपडेट्स पाएं (Subscribe)</span>
                  </>
                )}
              </button>
            </form>
            <p className="text-[10px] text-slate-400">
              * केवल प्रमाणित स्वास्थ्य कर्मियों व चिकित्सकों के लिए।
            </p>
          </div>

          {/* Column 2: Quick Clinical Links */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#981228]" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                क्विक टूल्स (Quick Tools)
              </h3>
            </div>
            <nav className="space-y-2 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => onOpenDashboard && onOpenDashboard()}
                className="flex items-center space-x-2 hover:text-[#981228] transition text-left cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span>Antepartum PPH Risk Predictor</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenDashboard && onOpenDashboard()}
                className="flex items-center space-x-2 hover:text-[#981228] transition text-left cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span>15-Minute Dakshata Monitoring</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenDashboard && onOpenDashboard()}
                className="flex items-center space-x-2 hover:text-[#981228] transition text-left cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span>Computer Vision Pad Saturation</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenRegistry && onOpenRegistry()}
                className="flex items-center space-x-2 hover:text-[#981228] transition text-left cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span>गर्भवती महिला रजिस्टर (Registry)</span>
              </button>
              {onOpenAuditModal && (
                <button
                  type="button"
                  onClick={onOpenAuditModal}
                  className="flex items-center space-x-2 text-[#981228] hover:underline transition text-left cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Clinical Audit Trail & Security Logs</span>
                </button>
              )}
            </nav>
          </div>

          {/* Column 3: Emergency Contacts & Nodal Center */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Ambulance className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                आपातकालीन हॉटलाइन (Emergency)
              </h3>
            </div>
            <address className="space-y-2.5 text-xs not-italic text-slate-600 font-medium">
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl">
                <span className="text-[10px] font-black text-red-800 uppercase block">108 एम्बुलेंस आपातकाल</span>
                <span className="text-base font-black text-[#981228]">📞 डायल करें: 108</span>
                <span className="text-[10px] text-red-700 block">24x7 जीपीएस ट्रैक्ड रेफरल डिस्पैच</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">रेफरल मेडिकल कॉलेज</span>
                <span className="font-extrabold text-slate-900">पं. भगवत दयाल शर्मा पीजीआईएमएस, रोहतक</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">ब्लड बैंक डायरेक्ट लाइन</span>
                <span className="font-bold text-slate-800">01262-281300 (पीजीआईएमएस ब्लड बैंक)</span>
              </div>
            </address>
          </div>

          {/* Column 4: AI Architecture & Evidence */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                AI व क्लिनिकल मॉडल
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              56,014 भारतीय व अंतरराष्ट्रीय प्रसव डेटासेट पर प्रशिक्षित 4-मॉडल क्लिनिकल सहमति इंजन:
            </p>

            <div className="space-y-1.5 text-[11px] font-bold">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-700">XGBoost High-Recall</span>
                <span className="text-[#981228]">81% Precision</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-700">LightGBM Screening</span>
                <span className="text-[#981228]">&lt;2ms Latency</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-700">FT-Transformer Deep Attention</span>
                <span className="text-[#981228]">Self-Attention</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <span>NFHS-5 भारत मान्य (N=6,88,803)</span>
                <span>ECE 0.0023</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── 3. BOTTOM COPYRIGHT & ACCREDITATION BAR ── */}
        <div className="border-t border-slate-200 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-700" />
            <span>
              © 2026 <strong>MOMENT</strong>. सर्वाधिकार सुरक्षित (All Rights Reserved).
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
              WHO & FIGO 2023 Guidelines
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
              Dakshata MoHFW Protocol
            </span>
            <span className="text-rose-700 font-black">
              Target: Zero Preventable Maternal PPH Deaths
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
