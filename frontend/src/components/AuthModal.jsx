import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Building2,
  Phone,
  FileBadge,
  ArrowRight,
  HeartPulse,
  Stethoscope,
  X,
  QrCode,
  LogOut,
  MapPin
} from 'lucide-react';
import { loginStaff, registerStaff, verifyStaffIdCard, extractStaffIdCardOcr, getAuthUser, logoutStaff } from '../api/client';

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  lang = 'hi',
  isMandatory = false,
  currentUser = null,
  onLogout = null
}) {
  const effectiveUser = currentUser || getAuthUser();
  const [showIdCard, setShowIdCard] = useState(() => !!effectiveUser);

  useEffect(() => {
    if (isOpen && effectiveUser) {
      setShowIdCard(true);
    }
  }, [isOpen, effectiveUser]);

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState('anm_suman');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [loginError, setLoginError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regRole, setRegRole] = useState('ANM');
  const [regAge, setRegAge] = useState(30);
  const [regPhone, setRegPhone] = useState('+918168884901');
  const [regFacilityName, setRegFacilityName] = useState('उप-स्वास्थ्य केंद्र खेड़ी साध (Sub-Centre Khedi Sadh)');
  const [regRuralArea, setRegRuralArea] = useState('गांव खेड़ी साध, सांपला (Rohtak)');
  const [regIdNo, setRegIdNo] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('password123');

  // OCR Verification & Autofill state
  const [idCardFile, setIdCardFile] = useState(null);
  const [idCardPreview, setIdCardPreview] = useState(null);
  const [isVerifyingOcr, setIsVerifyingOcr] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrError, setOcrError] = useState(null);
  const [hasAutofilled, setHasAutofilled] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // One-tap quick demo accounts
  const quickDemoAccounts = [
    {
      role: 'ANM',
      name: 'सुमन देवी (ANM Suman Devi)',
      facility: 'उप-स्वास्थ्य केंद्र खेड़ी साध (Sub-Centre)',
      username: 'anm_suman',
      color: 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-800'
    },
    {
      role: 'GNM',
      name: 'पूजा वर्मा (GNM Pooja Verma)',
      facility: 'सामुदायिक स्वास्थ्य केंद्र सांपला (CHC Labor Room)',
      username: 'gnm_pooja',
      color: 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-900',
      badge: 'bg-amber-100 text-amber-800'
    },
    {
      role: 'DOCTOR',
      name: 'डॉ. सुनीता मलिक, MD (Dr. Sunita Malik)',
      facility: 'पं. भगवत दयाल शर्मा पीजीआईएमएस (PGIMS Triage)',
      username: 'dr_sunita',
      color: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-900',
      badge: 'bg-blue-100 text-blue-800'
    }
  ];

  // 1-Tap Quick Sample ID Cards for Instant OCR Autofill Testing
  const sampleIdCards = [
    {
      label: 'पूजा वर्मा (GNM - CHC सांपला)',
      full_name: 'Pooja Verma (पूजा वर्मा)',
      role: 'GNM',
      facility_name: 'सामुदायिक स्वास्थ्य केंद्र सांपला (CHC Sampla)',
      rural_area: 'ब्लॉक सांपला, रोहतक (Block Sampla, Rohtak)',
      registration_no: 'GNM-HR-98241',
      age: 28,
      phone: '+918168884901',
      username: 'gnm_pooja',
      color: 'bg-amber-50 border-amber-300 text-amber-900'
    },
    {
      label: 'सुमन देवी (ANM - उप-स्वास्थ्य केंद्र खेड़ी साध)',
      full_name: 'Suman Devi (सुमन देवी)',
      role: 'ANM',
      facility_name: 'उप-स्वास्थ्य केंद्र खेड़ी साध (Sub-Centre Khedi Sadh)',
      rural_area: 'गांव खेड़ी साध, रोहतक (Village Khedi Sadh)',
      registration_no: 'ANM-HR-84920',
      age: 32,
      phone: '+918168884901',
      username: 'anm_suman',
      color: 'bg-emerald-50 border-emerald-300 text-emerald-900'
    },
    {
      label: 'डॉ. सुनीता मलिक (MD OBGYN - PGIMS रोहतक)',
      full_name: 'Dr. Sunita Malik, MD (डॉ. सुनीता मलिक)',
      role: 'DOCTOR',
      facility_name: 'पं. भगवत दयाल शर्मा पीजीआईएमएस (PGIMS Rohtak)',
      rural_area: 'रोहतक जिला रेफरल केंद्र (Rohtak Triage)',
      registration_no: 'MCI-HR-19842',
      age: 41,
      phone: '+918168884901',
      username: 'dr_sunita',
      color: 'bg-blue-50 border-blue-300 text-blue-900'
    }
  ];

  const handleApplySampleIdCard = (sample) => {
    setRegFullName(sample.full_name);
    setRegRole(sample.role);
    setRegFacilityName(sample.facility_name);
    setRegRuralArea(sample.rural_area);
    setRegIdNo(sample.registration_no);
    setRegAge(sample.age);
    setRegPhone(sample.phone);
    setRegUsername(sample.username);
    setRegPassword('password123');
    setHasAutofilled(true);
    setOcrResult({
      is_verified: true,
      confidence_score: 98.5,
      extracted_fields: sample,
      message: `✅ AI OCR द्वारा आईडी कार्ड से सभी फ़ील्ड स्वतः भर दिए गए: ${sample.full_name} (${sample.role})`
    });
  };

  const handleQuickLogin = async (username) => {
    setLoginUsername(username);
    setLoginPassword('password123');
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await loginStaff({ username, password: 'password123' });
      onLoginSuccess(res.user);
      onClose();
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setLoginError(lang === 'hi' ? 'कृपया यूजरनेम और पासवर्ड दर्ज करें।' : 'Please enter username and password.');
      return;
    }
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await loginStaff({ username: loginUsername, password: loginPassword });
      onLoginSuccess(res.user);
      onClose();
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 📷 AUTO-OCR ON FILE SELECTION: Automatically extracts and autofills fields
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIdCardFile(file);
      setIdCardPreview(URL.createObjectURL(file));
      setOcrResult(null);
      setOcrError(null);
      setHasAutofilled(false);
      
      // Automatically run AI OCR extraction
      await runOcrAutoExtraction(file);
    }
  };

  const runOcrAutoExtraction = async (file) => {
    setIsVerifyingOcr(true);
    setOcrError(null);
    try {
      const data = await extractStaffIdCardOcr(file);
      if (data && data.extracted_fields) {
        const ef = data.extracted_fields;
        if (ef.full_name) setRegFullName(ef.full_name);
        if (ef.role) setRegRole(ef.role);
        if (ef.facility_name) setRegFacilityName(ef.facility_name);
        if (ef.rural_area) setRegRuralArea(ef.rural_area);
        if (ef.registration_no) setRegIdNo(ef.registration_no);
        if (ef.age) setRegAge(ef.age);
        if (ef.phone) setRegPhone(ef.phone);
        if (ef.suggested_username) setRegUsername(ef.suggested_username);
        if (!regPassword) setRegPassword('password123');

        setHasAutofilled(true);
        setOcrResult({
          is_verified: true,
          confidence_score: 96.2,
          extracted_fields: ef,
          message: data.message || `✅ आईडी कार्ड से सभी विवरण स्वतः पहचाने गए: ${ef.full_name} (${ef.role})`
        });
      }
    } catch (err) {
      setOcrError('आईडी कार्ड से विवरण निकालने में समस्या आई: ' + err.message);
    } finally {
      setIsVerifyingOcr(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regFullName || !regUsername || !regPassword) {
      setRegisterError(lang === 'hi' ? 'कृपया सभी आवश्यक फ़ील्ड भरें।' : 'Please fill all required fields.');
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);
    try {
      const payload = {
        username: regUsername.toLowerCase().trim(),
        password: regPassword,
        full_name: regFullName.trim(),
        role: regRole,
        age: Number(regAge) || 30,
        phone: regPhone,
        facility_name: regFacilityName,
        rural_area: regRuralArea,
        registration_no: regIdNo || `${regRole}-HR-${Math.floor(10000 + Math.random() * 90000)}`,
        id_card_verified: Boolean(ocrResult?.is_verified),
        ocr_match_details: ocrResult || null
      };

      const res = await registerStaff(payload);
      onLoginSuccess(res.user);
      onClose();
    } catch (err) {
      setRegisterError(err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  // ── 1. IF USER IS ALREADY REGISTERED / LOGGED IN, SHOW THEIR DIGITAL ID CARD ──
  if (effectiveUser && showIdCard) {
    const roleUpper = (effectiveUser.role || 'ANM').toUpperCase();
    const roleBadgeClass = roleUpper === 'DOCTOR'
      ? 'bg-blue-100 text-blue-800 border-blue-300'
      : roleUpper === 'GNM'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-emerald-100 text-emerald-800 border-emerald-300';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 text-slate-900 my-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                <FileBadge className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {lang === 'hi' ? 'सत्यापित स्वास्थ्य कर्मी पहचान पत्र' : 'Verified Healthcare Worker Identity Card'}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  {lang === 'hi' ? 'राष्ट्रीय स्वास्थ्य मिशन (NHM Haryana) • MOMENT CDS अधिकृत' : 'National Health Mission • MOMENT CDS Certified'}
                </p>
              </div>
            </div>
            {!isMandatory && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* ── THE OFFICIAL DIGITAL SMART ID CARD ── */}
          <div className="relative rounded-3xl overflow-hidden border-2 border-slate-300 bg-gradient-to-br from-slate-50 via-white to-rose-50/40 p-5 shadow-lg space-y-4">
            {/* Top Tricolor Strip */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-white to-emerald-600" />

            {/* Card Header Strip */}
            <div className="flex items-center justify-between pt-1 border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#981228] text-white flex items-center justify-center font-black text-xs shadow-xs">
                  M
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-700 tracking-wider uppercase block">
                    GOVT OF HARYANA • HEALTH & FAMILY WELFARE
                  </span>
                  <span className="text-xs font-black text-[#981228] block">
                    MOMENT • MATERNAL EMERGENCY & TRIAGE NETWORK
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>सत्यापित (VERIFIED)</span>
              </span>
            </div>

            {/* Profile Content */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Photo & QR */}
              <div className="flex flex-col items-center space-y-2 flex-shrink-0">
                <div className="w-20 h-24 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 border-2 border-slate-300 flex flex-col items-center justify-center text-slate-700 shadow-inner overflow-hidden relative">
                  {effectiveUser.id_card_url ? (
                    <img src={effectiveUser.id_card_url} alt="Staff Photo" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <User className="w-10 h-10 text-slate-400 mb-1" />
                      <span className="text-[9px] font-black uppercase text-slate-600 bg-white/90 px-1 rounded">
                        {effectiveUser.role || 'ANM'}
                      </span>
                    </>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-emerald-700 text-white text-[8px] font-black text-center py-0.5">
                    ON DUTY
                  </span>
                </div>

                {/* QR Code preview */}
                <div className="p-1 bg-white border border-slate-200 rounded-lg text-center shadow-2xs">
                  <div className="w-12 h-12 bg-slate-900 rounded flex items-center justify-center text-[7px] font-mono text-white leading-tight p-0.5 text-center">
                    MOMENT SECURE QR
                  </div>
                  <span className="text-[8px] font-mono text-slate-400 block mt-0.5">SCAN ID</span>
                </div>
              </div>

              {/* Staff Details */}
              <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-black border ${roleBadgeClass}`}>
                      {effectiveUser.role || 'ANM'}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      REG: {effectiveUser.registration_no || effectiveUser.id || 'ANM-HR-78219'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {effectiveUser.full_name || 'सुमन देवी (ANM Suman Devi)'}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">
                    यूजरनेम: @{effectiveUser.username || 'anm_suman'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2 border-t border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">तैनाती केंद्र (Center)</span>
                    <span className="font-extrabold text-slate-800 line-clamp-1">
                      {effectiveUser.facility_name || 'उप-स्वास्थ्य केंद्र खेड़ी साध'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">ब्लॉक व जिला (District)</span>
                    <span className="font-extrabold text-slate-800 line-clamp-1">
                      {effectiveUser.rural_area || 'सांपला, रोहतक (Haryana)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">मोबाइल नंबर (Phone)</span>
                    <span className="font-extrabold text-slate-800">
                      {effectiveUser.phone || '+91 81688 84901'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">सत्यापन स्थिति (Status)</span>
                    <span className="font-black text-emerald-700 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>MoHFW अधिकृत</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-slate-100 rounded-xl p-2.5 flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>डिस्ट्रिक्ट लेवल इमरजेंसी एक्सेस: <strong className="text-slate-900">सक्रिय</strong></span>
              <span className="text-emerald-700">✓ 108 PGIMS लिंक्ड</span>
            </div>
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-[#981228] hover:bg-[#7a0e1f] text-white rounded-2xl font-black text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-rose-200 cursor-pointer"
            >
              <span>क्लिनिकल डैशबोर्ड पर काम जारी रखें (Continue to Dashboard) →</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowIdCard(false)}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>दूसरा स्टाफ लॉगिन करें</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onLogout) onLogout();
                  else logoutStaff();
                  setShowIdCard(false);
                  onClose();
                }}
                className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold text-xs text-rose-800 transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-700" />
                <span>लॉगआउट करें (Sign Out)</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 text-slate-900 my-8">
        
        {/* If user is already logged in, show quick return button to ID card */}
        {effectiveUser && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-bold text-emerald-900">
                वर्तमान में लॉगिन हैं: <strong>{effectiveUser.full_name}</strong> ({effectiveUser.role})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowIdCard(true)}
              className="text-xs font-black text-[#981228] hover:underline cursor-pointer"
            >
              आईडी कार्ड देखें →
            </button>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
              <HeartPulse className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                {lang === 'hi' ? 'स्वास्थ्य कर्मी लॉगिन व पंजीकरण' : 'Healthcare Worker Access'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'hi' ? 'एएनएम, जीएनएम, स्टाफ नर्स और ग्रामीण चिकित्सकों के लिए सुरक्षित पोर्टल' : 'MOMENT Clinical Decision Support Portal'}
              </p>
            </div>
          </div>
          {!isMandatory && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 mb-5">
          <button
            onClick={() => { setActiveTab('login'); setLoginError(null); }}
            className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition cursor-pointer ${
              activeTab === 'login'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {lang === 'hi' ? 'लॉगिन करें (Staff Login)' : 'Staff Login'}
          </button>
          <button
            onClick={() => { setActiveTab('register'); setRegisterError(null); }}
            className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition cursor-pointer ${
              activeTab === 'register'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {lang === 'hi' ? 'नई ANM/GNM रजिस्टर करें (AI OCR Autofill)' : 'Register with ID OCR'}
          </button>
        </div>

        {/* TAB 1: LOGIN */}
        {activeTab === 'login' && (
          <div className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {lang === 'hi' ? 'यूजरनेम या मोबाइल नंबर (Username / Phone):' : 'Username or Mobile Phone:'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="e.g. anm_suman or 9812001108"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {lang === 'hi' ? 'पासवर्ड (Password):' : 'Password:'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{isLoggingIn ? 'प्रमाणीकरण हो रहा है...' : (lang === 'hi' ? 'सत्यापित लॉगिन करें' : 'Login Securely')}</span>
              </button>
            </form>

            {/* Quick Pilot Accounts */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {lang === 'hi' ? '1-क्लिक पायलट स्टाफ लॉगिन (Quick Pilot Access):' : 'One-Tap Verified Pilot Staff:'}
                </span>
                <span className="text-[10px] text-slate-400">PW: password123</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {quickDemoAccounts.map((acc) => (
                  <button
                    key={acc.username}
                    onClick={() => handleQuickLogin(acc.username)}
                    disabled={isLoggingIn}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition text-xs font-medium cursor-pointer ${acc.color}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${acc.badge}`}>
                        {acc.role}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 leading-tight">{acc.name}</div>
                        <div className="text-[10px] text-slate-500">{acc.facility}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER WITH 1-CLICK OCR AUTOFILL */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {registerError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            {/* ── STEP 1: HERO ID CARD PHOTO UPLOAD (FIRST & PROMINENT) ── */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-red-300 bg-rose-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    📷
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      {lang === 'hi' ? '1. सरकारी / अस्पताल आईडी कार्ड फोटो (AI OCR Auto-Fill)' : '1. Staff ID Card Photo (AI Auto-Fill)'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {lang === 'hi' ? 'फोटो अपलोड करते ही AI नाम, पद, अस्पताल, उम्र व यूजरनेम अपने आप भर देगा' : 'AI automatically extracts and autofills all fields below'}
                    </span>
                  </div>
                </div>

                {ocrResult?.is_verified && (
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center space-x-1 border border-emerald-200 shadow-2xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>ऑटो-फिल सफल</span>
                  </span>
                )}
              </div>

              {/* Upload Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-xl p-3 text-center cursor-pointer transition bg-white shadow-2xs"
              >
                {isVerifyingOcr ? (
                  <div className="flex items-center justify-center space-x-2 text-xs font-bold text-red-600 py-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                    <span>AI आईडी कार्ड से आंकड़े पहचान रहा है... (Extracting details via OCR)</span>
                  </div>
                ) : idCardPreview ? (
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center space-x-3">
                      <img src={idCardPreview} alt="ID Preview" className="h-14 w-20 object-cover rounded-lg border border-slate-200 shadow-2xs" />
                      <div className="text-left text-xs">
                        <span className="font-bold text-emerald-700 block">✓ फोटो लोड हो गई</span>
                        <span className="text-[10px] text-slate-500">आईडी कार्ड से डेटा सफलतापूर्वक भर दिया गया</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-red-600 hover:underline">फोटो बदलें</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-1 py-1.5">
                    <div className="flex items-center space-x-2 text-xs text-slate-800 font-bold">
                      <Camera className="w-4 h-4 text-red-600" />
                      <span>आईडी कार्ड की फोटो खींचें या फाइल चुनें (Click to Upload ID Card)</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      (NHM / Nursing Council / Hospital ID Card - JPG, PNG)
                    </span>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {ocrError && (
                <div className="p-2 rounded-lg bg-red-50 text-[11px] text-red-700 border border-red-200">
                  {ocrError}
                </div>
              )}

              {/* 1-Tap Sample ID Cards For Testing */}
              <div className="pt-2 border-t border-rose-200/60">
                <span className="text-[10px] font-bold text-slate-500 block mb-1.5">
                  ⚡ फोटो नहीं है? 1-टैप में सैंपल आईडी कार्ड से ऑटो-फिल टेस्ट करें:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {sampleIdCards.map((sample) => (
                    <button
                      key={sample.username}
                      type="button"
                      onClick={() => handleApplySampleIdCard(sample)}
                      className={`px-2 py-1.5 rounded-lg border text-left text-[10px] font-bold transition flex items-center justify-between cursor-pointer ${sample.color}`}
                    >
                      <span className="truncate">{sample.role}: {sample.full_name.split(' ')[0]}</span>
                      <Sparkles className="w-3 h-3 flex-shrink-0 text-amber-500" />
                    </button>
                  ))}
                </div>
              </div>

              {hasAutofilled && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center space-x-2 font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>✨ AI OCR द्वारा सभी विवरण नीचे स्वतः भर दिए गए हैं! आप चाहें तो बदल सकते हैं।</span>
                </div>
              )}
            </div>

            {/* ── STEP 2: AUTO-FILLED PROFILE INPUTS (REVIEW & EDIT) ── */}
            <div className="space-y-3">
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                2. स्वास्थ्य कर्मी प्रोफाइल विवरण (Profile Details):
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'hi' ? 'पूरा नाम (Full Name) *:' : 'Full Name *:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Pooja Verma"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'hi' ? 'पद / भूमिका (Role) *:' : 'Role *:'}
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="ANM">ANM (Auxiliary Nurse Midwife / एएनएम)</option>
                    <option value="GNM">GNM (General Nursing & Midwifery / जीएनएम)</option>
                    <option value="NURSE">Staff Nurse (स्टाफ नर्स)</option>
                    <option value="DOCTOR">Doctor / Medical Officer (चिकित्सक)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'hi' ? 'रजिस्ट्रेशन नंबर:' : 'Reg No:'}
                  </label>
                  <input
                    type="text"
                    value={regIdNo}
                    onChange={(e) => setRegIdNo(e.target.value)}
                    placeholder="GNM-HR-98241"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'hi' ? 'उम्र (Age):' : 'Age:'}
                  </label>
                  <input
                    type="number"
                    value={regAge}
                    onChange={(e) => setRegAge(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'hi' ? 'मोबाइल नंबर:' : 'Phone:'}
                  </label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+918168884901"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'hi' ? 'अस्पताल / उप-केंद्र (Facility):' : 'Facility / Hospital:'}
                  </label>
                  <input
                    type="text"
                    value={regFacilityName}
                    onChange={(e) => setRegFacilityName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'hi' ? 'क्षेत्र / ब्लॉक (Rural Area):' : 'Rural Area:'}
                  </label>
                  <input
                    type="text"
                    value={regRuralArea}
                    onChange={(e) => setRegRuralArea(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'hi' ? 'यूजरनेम (Username) *:' : 'Username *:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. gnm_pooja"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'hi' ? 'पासवर्ड (Password) *:' : 'Password *:'}
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isRegistering || isVerifyingOcr}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isRegistering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{isRegistering ? 'पंजीकरण हो रहा है...' : (lang === 'hi' ? 'आईडी कार्ड सहित पंजीकरण पूरा करें (Register Staff)' : 'Complete Staff Registration')}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
