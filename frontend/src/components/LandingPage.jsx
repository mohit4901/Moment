import React, { useState, useEffect } from 'react';
import {
  Heart,
  HeartPulse,
  Sparkles,
  Ambulance,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  Check,
  AlertTriangle,
  Activity,
  Users,
  Building2,
  BellRing,
  PhoneCall,
  Clock,
  CheckCircle2,
  UserCheck,
  Menu,
  X,
  MapPin,
  Compass,
  Navigation,
  Phone,
  ChevronRight
} from 'lucide-react';
import { fetchPatients, fetchNearbyFacilities } from '../api/client';
import ReferralHospitalsModal from './ReferralHospitalsModal';
import LanguagePickerTrigger from './LanguagePickerTrigger';
import { t as translate } from '../i18n/languages';

export default function LandingPage({
  onOpenDashboard,
  onStartAssessment,
  onOpenRegistry,
  onOpenAuthModal,
  onOpenAlertsModal,
  currentUser,
  userRole = 'anm',
  setUserRole,
  lang,
  setLang,
  backendStatus = 'healthy'
}) {
  const [activeNav, setActiveNav] = useState('home');
  const [showPatientsModal, setShowPatientsModal] = useState(false);
  const [showHospitalsModal, setShowHospitalsModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dbPatients, setDbPatients] = useState([]);
  const [dbFacilities, setDbFacilities] = useState([]);

  useEffect(() => {
    fetchPatients()
      .then(pts => { if (pts && pts.length > 0) setDbPatients(pts); })
      .catch(() => {});
    fetchNearbyFacilities(28.8520, 76.6850)
      .then(facs => { if (facs && facs.length > 0) setDbFacilities(facs); })
      .catch(() => {});
  }, []);

  // Multilingual resolution for all 23 Indic Languages + English
  const str = {
    brand: translate('brand', lang),
    home: translate('home', lang),
    patients: translate('patients', lang),
    assessments: translate('assessments', lang),
    hospitals: translate('hospitals', lang),
    alerts: translate('alerts', lang),
    dashboard: translate('dashboard', lang),
    heroTitle1: translate('heroTitle1', lang),
    heroTitle2: translate('heroTitle2', lang),
    heroSubtitle: translate('heroSubtitle', lang),
    startAssessment: translate('startAssessment', lang),
    viewDashboard: translate('viewDashboard', lang),
    anmBadge: translate('anmBadge', lang),
    staffName: translate('staffName', lang),
    subCentre: translate('subCentre', lang),
    openDashboardBtn: translate('openDashboardBtn', lang),
    switchStaff: translate('switchStaff', lang),
    feature1Title: translate('feature1Title', lang),
    feature1Sub: translate('feature1Sub', lang),
    feature2Title: translate('feature2Title', lang),
    feature2Sub: translate('feature2Sub', lang),
    feature3Title: translate('feature3Title', lang),
    feature3Sub: translate('feature3Sub', lang),
    feature4Title: translate('feature4Title', lang),
    feature4Sub: translate('feature4Sub', lang),
    phoneTitle: translate('phoneTitle', lang),
    phoneWeeks: translate('phoneWeeks', lang),
    phoneHighRisk: translate('phoneHighRisk', lang),
    phoneScore: translate('phoneScore', lang),
    phoneFactor1: translate('phoneFactor1', lang),
    phoneFactor2: translate('phoneFactor2', lang),
    phoneChecklist: translate('phoneChecklist', lang),
    phoneCheck1: translate('phoneCheck1', lang),
    phoneCheck2: translate('phoneCheck2', lang),
    phoneCheck3: translate('phoneCheck3', lang),
    btnHospitalsMap: translate('btnHospitalsMap', lang),
    btnMotherRegistry: translate('btnMotherRegistry', lang),
    staffAuthReq: translate('staffAuthReq', lang),
    staffAuthSub: translate('staffAuthSub', lang),
    staffLoginBtn: translate('staffLoginBtn', lang),
    ocrBadge: translate('ocrBadge', lang),
  };

  const samplePatientsList = [
    { id: 'MOMENT-PT-2916', name: 'Priya Sharma', age: 26, weeks: 38, risk: 'High Risk (18.5%)', riskColor: 'text-rose-600 bg-rose-50 border-rose-200' },
    { id: 'MOMENT-PT-2917', name: 'Ananya Verma', age: 24, weeks: 39, risk: 'Low Risk (3.2%)', riskColor: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { id: 'MOMENT-PT-2918', name: 'Sunita Devi', age: 31, weeks: 37, risk: 'Moderate Risk (9.8%)', riskColor: 'text-amber-600 bg-amber-50 border-amber-200' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveNav('home')}>
              <div className="w-10 h-10 rounded-2xl bg-red-700 flex items-center justify-center shadow-md shadow-red-700/20">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-black text-2xl tracking-tight text-slate-900">
                MOMENT
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
              <button
                onClick={() => setActiveNav('home')}
                className={`transition-colors ${
                  activeNav === 'home'
                    ? 'text-slate-900 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {str.home}
              </button>
              <button
                onClick={() => (onOpenRegistry ? onOpenRegistry() : setShowPatientsModal(true))}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                {str.patients}
              </button>
              <button
                onClick={onStartAssessment}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                {str.assessments}
              </button>
              <button
                onClick={() => setShowHospitalsModal(true)}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                {str.hospitals}
              </button>
              <button
                onClick={() => (onOpenAlertsModal ? onOpenAlertsModal() : setShowAlertsModal(true))}
                className="text-slate-600 hover:text-slate-900 transition-colors flex items-center space-x-1"
              >
                <span>{str.alerts}</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              </button>
              <button
                onClick={() => onOpenDashboard()}
                className="text-slate-600 hover:text-slate-900 transition-colors font-semibold"
              >
                {str.dashboard}
              </button>
            </nav>

            {/* Right Controls: Staff Login/Profile & Bilingual Language Switcher */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Staff Profile / Login Button */}
              {currentUser ? (
                <button
                  onClick={() => (onOpenAuthModal ? onOpenAuthModal() : setShowStaffModal(true))}
                  className="flex items-center space-x-1.5 p-1 rounded-full hover:bg-slate-100 transition-all border border-slate-200"
                  title="Staff Profile & Authentication"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-sm">
                    {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 pr-0.5" />
                </button>
              ) : (
                <button
                  onClick={onOpenAuthModal}
                  className="hidden sm:flex px-3.5 py-1.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-black text-xs shadow-xs transition items-center space-x-1.5 cursor-pointer"
                >
                  <span>🔐 {lang === 'hi' ? 'लॉगिन' : 'Login'}</span>
                </button>
              )}

              {/* 22+ Regional Languages Selector */}
              <div className="flex items-center flex-shrink-0">
                <LanguagePickerTrigger lang={lang} setLang={setLang} />
              </div>

              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition cursor-pointer border border-slate-200 shadow-2xs"
                aria-label="Open Mobile Menu"
              >
                <Menu className="w-5 h-5 text-slate-800" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE SLIDE-OUT DRAWER / SIDEBAR ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
            {/* Top Branding & Close */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-red-700 flex items-center justify-center text-white shadow-xs">
                  <Heart className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-black text-lg tracking-tight text-slate-900">MOMENT</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-red-700">CLINICAL</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold">Maternal Health Corridor</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* PROMINENT HOSPITALS & ROUTE BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setShowHospitalsModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-rose-50 border-2 border-indigo-500 text-left transition flex items-center justify-between shadow-xs cursor-pointer group active:scale-98"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block group-hover:text-indigo-700">
                      🏥 {str.btnHospitalsMap}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-black block">
                      ✓ 11.1km PGIMS (17m ETA)
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              </button>

              <div className="pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {str.home} • {str.dashboard}
              </div>

              <button
                type="button"
                onClick={() => {
                  onOpenDashboard();
                  setMobileMenuOpen(false);
                }}
                className="w-full p-3 rounded-xl hover:bg-slate-100 text-left transition flex items-center space-x-3 text-xs font-black text-slate-800 cursor-pointer"
              >
                <Activity className="w-4 h-4 text-red-600" />
                <span>{str.dashboard}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenRegistry) onOpenRegistry();
                  else setShowPatientsModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full p-3 rounded-xl hover:bg-slate-100 text-left transition flex items-center space-x-3 text-xs font-black text-slate-800 cursor-pointer"
              >
                <Users className="w-4 h-4 text-slate-600" />
                <span>{str.patients}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onStartAssessment();
                  setMobileMenuOpen(false);
                }}
                className="w-full p-3 rounded-xl hover:bg-slate-100 text-left transition flex items-center space-x-3 text-xs font-black text-slate-800 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{str.assessments}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenAlertsModal) onOpenAlertsModal();
                  else setShowAlertsModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full p-3 rounded-xl hover:bg-slate-100 text-left transition flex items-center space-x-3 text-xs font-black text-slate-800 cursor-pointer"
              >
                <BellRing className="w-4 h-4 text-rose-600" />
                <div className="flex items-center space-x-1.5">
                  <span>{str.alerts}</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                </div>
              </button>

              {/* Health Worker Profile & Login */}
              <div className="pt-3 border-t border-slate-100">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  {translate('staffName', lang)}
                </div>
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAuthModal) onOpenAuthModal();
                      else setShowStaffModal(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-left flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-black text-xs flex items-center justify-center">
                        {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">{currentUser.full_name || str.staffName}</span>
                        <span className="text-[10px] font-bold text-emerald-700">{currentUser.role || 'ANM'}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAuthModal) onOpenAuthModal();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-black text-xs rounded-xl shadow-xs text-center cursor-pointer"
                  >
                    🔐 {str.staffLoginBtn}
                  </button>
                )}
              </div>

              {/* Language Switcher in Mobile Drawer */}
              <div className="pt-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  {translate('select_language', lang)}
                </div>
                <LanguagePickerTrigger lang={lang} setLang={setLang} />
              </div>
            </div>

            {/* Bottom 108 Emergency Dial Action */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <a
                href="tel:108"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Ambulance className="w-4 h-4" />
                <span>📞 {translate('call_108', lang)}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center py-6 sm:py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">

          {/* ── MOBILE QUICK ACTION CARDS (DIRECTLY VISIBLE ON PHONES!) ── */}
          <div className="md:hidden mb-6 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setShowHospitalsModal(true)}
              className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex flex-col items-center text-center shadow-xs active:scale-95 transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-1 shadow-2xs">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-black leading-tight">{str.btnHospitalsMap}</span>
              <span className="text-[9px] text-emerald-700 font-black mt-0.5">17m PGIMS</span>
            </button>

            <button
              type="button"
              onClick={() => (onOpenRegistry ? onOpenRegistry() : setShowPatientsModal(true))}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 flex flex-col items-center text-center shadow-xs active:scale-95 transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center mb-1 shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-black leading-tight">{str.btnMotherRegistry}</span>
              <span className="text-[9px] text-slate-500 font-bold mt-0.5">24</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenDashboard()}
              className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[#981228] flex flex-col items-center text-center shadow-xs active:scale-95 transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[#981228] text-white flex items-center justify-center mb-1 shadow-2xs">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-black leading-tight">{str.dashboard}</span>
              <span className="text-[9px] text-rose-700 font-black mt-0.5">Live AI</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* LEFT: Realistic Smartphone Mockup */}
            <div className="lg:col-span-4 flex justify-center order-2 lg:order-1">
              <div className="w-[300px] sm:w-[320px] rounded-[44px] bg-slate-900 p-3 shadow-2xl ring-1 ring-slate-900/10 transform transition-transform hover:scale-[1.01]">
                {/* Phone Outer Shell */}
                <div className="relative bg-white rounded-[36px] overflow-hidden border border-slate-200">
                  {/* Status Bar */}
                  <div className="bg-white px-6 pt-3 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-800 border-b border-slate-50">
                    <span>09:41</span>
                    {/* Dynamic Island / Camera Notch */}
                    <div className="w-18 h-3.5 bg-slate-900 rounded-full mx-auto"></div>
                    <div className="flex items-center space-x-1.5 text-slate-700">
                      <span className="text-[10px]">5G</span>
                      <div className="w-4 h-2 rounded-xs border border-slate-700 flex items-center p-0.5">
                        <div className="w-full h-full bg-slate-800 rounded-xs"></div>
                      </div>
                    </div>
                  </div>

                  {/* Phone Screen Body */}
                  <div className="p-4 space-y-3.5 bg-slate-50/60 min-h-[390px]">
                    {/* Title */}
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">
                        {str.phoneTitle}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {str.phoneWeeks}
                      </p>
                    </div>

                    {/* Red High Risk Card */}
                    <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="bg-red-700 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {str.phoneHighRisk}
                        </span>
                        <span className="text-xs font-bold text-rose-800">
                          {str.phoneScore}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-rose-950 font-medium pt-1">
                        <p className="font-semibold text-red-900">• {str.phoneFactor1}</p>
                        <p className="text-rose-800 text-[11px]">• {str.phoneFactor2}</p>
                      </div>
                    </div>

                    {/* Preparedness Checklist Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                      <h5 className="text-xs font-bold text-slate-900">
                        {str.phoneChecklist}
                      </h5>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center space-x-2 text-emerald-700 font-medium">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-emerald-700 stroke-[3]" />
                          </div>
                          <span className="text-[11px] text-slate-800">{str.phoneCheck1}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-emerald-700 font-medium">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-emerald-700 stroke-[3]" />
                          </div>
                          <span className="text-[11px] text-slate-800">{str.phoneCheck2}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-emerald-700 font-medium">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-emerald-700 stroke-[3]" />
                          </div>
                          <span className="text-[11px] text-slate-800">{str.phoneCheck3}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phone Home Bar */}
                  <div className="bg-white py-2 flex justify-center">
                    <div className="w-24 h-1 bg-slate-300 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* CENTER: Hero Copy & CTA Buttons */}
            <div className="lg:col-span-4 text-center lg:text-center order-1 lg:order-2 space-y-6">
              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl lg:text-5xl font-black text-slate-950 tracking-tight leading-[1.1]">
                  <span>{str.heroTitle1}</span>
                  <br />
                  <span>{str.heroTitle2}</span>
                </h1>
                <p className="text-slate-600 text-sm sm:text-base font-normal max-w-md mx-auto pt-2 leading-relaxed">
                  {str.heroSubtitle}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    if (!currentUser && onOpenAuthModal) onOpenAuthModal();
                    else onStartAssessment();
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-red-700 hover:bg-red-800 text-white font-bold text-sm shadow-lg shadow-red-700/25 transition-all hover:scale-102 active:scale-98 cursor-pointer"
                >
                  {str.startAssessment}
                </button>
                <button
                  onClick={() => {
                    if (!currentUser && onOpenAuthModal) onOpenAuthModal();
                    else onOpenDashboard();
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-sm shadow-xs transition-all hover:scale-102 active:scale-98 cursor-pointer"
                >
                  {str.viewDashboard}
                </button>
              </div>
            </div>

            {/* RIGHT: ANM Staff Session Card OR Authentication Box */}
            <div className="lg:col-span-4 flex justify-center order-3">
              {currentUser ? (
                <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xl shadow-slate-200/50 space-y-4">
                  {/* Active Session Box */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-xs">
                      {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{currentUser.role ? `${currentUser.role} • ${lang === 'hi' ? 'सक्रिय सत्र' : 'Active Session'}` : str.anmBadge}</span>
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">
                        {currentUser.full_name || str.staffName}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate font-medium">
                        {currentUser.facility_name || str.subCentre}
                      </p>
                    </div>
                  </div>

                  {/* Primary Red CTA Button */}
                  <button
                    onClick={() => onOpenDashboard()}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#b91c1c] hover:bg-[#991b1b] text-white font-extrabold text-sm shadow-md shadow-red-900/20 transition-all flex items-center justify-center space-x-2 group cursor-pointer"
                  >
                    <span>{str.openDashboardBtn}</span>
                  </button>

                  {/* Secondary Staff Switcher Link */}
                  <div className="text-center pt-1">
                    <button
                      onClick={() => (onOpenAuthModal ? onOpenAuthModal() : setShowStaffModal(true))}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                    >
                      {str.switchStaff}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-sm bg-white rounded-3xl border-2 border-dashed border-red-300 p-5 sm:p-6 shadow-xl shadow-slate-200/50 space-y-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-red-700 mx-auto">
                    <UserCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">
                      {str.staffAuthReq}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {str.staffAuthSub}
                    </p>
                  </div>

                  {/* Primary Red Login CTA Button */}
                  <button
                    onClick={onOpenAuthModal}
                    className="w-full py-3.5 px-4 rounded-xl bg-red-700 hover:bg-red-800 text-white font-extrabold text-xs shadow-md shadow-red-900/20 transition-all flex items-center justify-center space-x-2 group cursor-pointer"
                  >
                    <span>🔐 {str.staffLoginBtn}</span>
                  </button>

                  <p className="text-[11px] text-slate-400 font-medium">
                    {str.ocrBadge}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* BOTTOM FEATURE PILL CARDS (4 in a row) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Feature 1 */}
            <div
              onClick={onStartAssessment}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center space-x-3.5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {str.feature1Title}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {str.feature1Sub}
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div
              onClick={() => onOpenDashboard()}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center space-x-3.5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <HeartPulse className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {str.feature2Title}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {str.feature2Sub}
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div
              onClick={() => setShowAlertsModal(true)}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center space-x-3.5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Ambulance className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {str.feature3Title}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {str.feature3Sub}
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div
              onClick={() => onOpenDashboard()}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center space-x-3.5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {str.feature4Title}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {str.feature4Sub}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* MODAL: Patients Directory (DATABASE-DRIVEN) */}
      {showPatientsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-red-700" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {lang === 'hi' ? 'सक्रिय माताएँ (डेटाबेस रिकॉर्ड्स)' : 'Active Mothers Directory (Live DB)'}
                </h3>
              </div>
              <button
                onClick={() => setShowPatientsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {(dbPatients.length > 0 ? dbPatients : samplePatientsList).map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setShowPatientsModal(false);
                    onOpenDashboard(p.id);
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-red-300 hover:bg-rose-50/30 flex items-center justify-between cursor-pointer transition-all"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                      <span>{p.name}</span>
                      {p.hindi_name && <span className="text-xs text-slate-500">({p.hindi_name})</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {p.age} yrs • G{p.gravidity || 2}P{p.parity || 1} • {p.gestational_age || 38} wks • {p.id}
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${p.riskColor || 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {p.current_risk_tier ? `${p.current_risk_tier} (${p.current_risk_percent}%)` : (p.risk || 'High Risk')}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 flex-shrink-0">
              <button
                onClick={() => {
                  setShowPatientsModal(false);
                  onOpenDashboard('MOMENT-PT-2916');
                }}
                className="w-full py-2.5 rounded-xl bg-red-700 text-white font-bold text-xs shadow-xs hover:bg-red-800 transition-all"
              >
                {lang === 'hi' ? 'प्रिया शर्मा का क्लिनिकल चार्ट खोलें' : 'Open Priya Sharma Clinical Chart'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Emergency Referral Hospitals & Live GPS Map */}
      <ReferralHospitalsModal
        isOpen={showHospitalsModal}
        onClose={() => setShowHospitalsModal(false)}
        lang={lang}
        facilitiesData={dbFacilities}
      />

      {/* MODAL: Active Clinical Alerts */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <BellRing className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {lang === 'hi' ? 'सक्रिय आपातकालीन अलर्ट' : 'Active Emergency Alerts'}
                </h3>
              </div>
              <button
                onClick={() => setShowAlertsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 rounded-2xl border border-rose-300 bg-rose-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-700 uppercase tracking-wider">MOMENT-PT-2916 (Priya Sharma)</span>
                <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full">HIGH RISK PPH</span>
              </div>
              <p className="text-xs text-rose-950 font-medium">
                PPH Probability 18.5% with Shock Index 1.05. Prior Cesarean scar detected. Immediate two 16G IV line preparation active.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  setShowAlertsModal(false);
                  onOpenDashboard('MOMENT-PT-2916');
                }}
                className="w-full py-2.5 rounded-xl bg-red-700 text-white font-bold text-xs hover:bg-red-800 transition-all"
              >
                {lang === 'hi' ? 'सीधे आपातकालीन प्रोटोकॉल खोलें' : 'Open Emergency Protocol Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Switch Staff / 6 Clinical Roles */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {lang === 'hi' ? 'क्लिनिकल भूमिका चुनें (Switch Role)' : 'Select Clinical Role & Access'}
                </h3>
                <p className="text-xs text-slate-500">6 अनुकूली क्लिनिकल वर्कफ्लो</p>
              </div>
              <button
                onClick={() => setShowStaffModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { role: 'anm', name: 'सुमन देवी (ANM / ASHA)', desc: 'उप-स्वास्थ्य केंद्र खेड़ी साध • ग्रामीण स्पर्श स्क्रीन मोड', icon: '👩‍⚕️' },
                { role: 'nurse', name: 'कविता शर्मा (Labor Room Staff Nurse)', desc: '15-मिनट निगरानी, आईवी ड्रिप व दवा चेकलिस्ट', icon: '🩺' },
                { role: 'doctor', name: 'डॉ. राजेश मेहरा (MO / Obstetrician FRU)', desc: 'पूर्ण क्लिनिकल मूल्यांकन, FT-Transformer AI व ब्लड रिजर्वेशन', icon: '👨‍⚕️' },
                { role: 'hospital', name: 'पीजीआईएमएस रोहतक (Triage Emergency Bay)', desc: 'लाइव आने वाली एम्बुलेंस, SBAR हैंडओवर व ओटी तैयारी', icon: '🏥' },
                { role: 'district', name: 'जिला स्वास्थ्य अधिकारी (Admin / CMO)', desc: 'रोहतक जिला पीपीएच एनालिटिक्स, रेफरल ऑडिट व रक्त उपलब्धता', icon: '📊' },
                { role: 'ambulance', name: '108 एम्बुलेंस ऑपरेटर (CAD Rohtak)', desc: 'वाहन HR-12-G-1081 लाइव जीपीएस रूट व टेलीमेट्री', icon: '🚑' },
              ].map((item) => (
                <div
                  key={item.role}
                  onClick={() => {
                    if (setUserRole) setUserRole(item.role);
                    setShowStaffModal(false);
                    onOpenDashboard('MOMENT-PT-2916', item.role);
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    userRole === item.role
                      ? 'border-red-400 bg-red-50/50 text-red-900 shadow-2xs font-bold'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <div className="font-bold text-xs">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.desc}</div>
                    </div>
                  </div>
                  {userRole === item.role && (
                    <span className="text-[10px] font-bold bg-red-700 text-white px-2 py-0.5 rounded-full">
                      सक्रिय
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="pt-1">
              <button
                onClick={() => setShowStaffModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
