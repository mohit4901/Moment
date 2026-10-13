import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  UserPlus,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  Phone,
  Droplet,
  Activity,
  ArrowRight,
  RefreshCw,
  Building2,
  Stethoscope,
  Clock,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { fetchPatients, createPatient } from '../api/client';
import { t } from '../i18n/languages';

export default function MaternalRegistryView({
  currentUser,
  onSelectPatient,
  onOpenNewAssessment,
  onBackToLanding,
  onOpenDashboard,
  lang = 'hi'
}) {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL'); // 'ALL' | 'ESCALATED' | 'ENHANCED' | 'ROUTINE'
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // New Mother Form state
  const [newName, setNewName] = useState('');
  const [newHindiName, setNewHindiName] = useState('');
  const [newAge, setNewAge] = useState(25);
  const [newBloodGroup, setNewBloodGroup] = useState('O+');
  const [newGravidity, setNewGravidity] = useState(2);
  const [newParity, setNewParity] = useState(1);
  const [newGestationalAge, setNewGestationalAge] = useState(38.0);
  const [newPriorCs, setNewPriorCs] = useState(0);
  const [newHb, setNewHb] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('+91');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('+91');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      // If ANM/GNM, pass user ID to filter by assigned mothers
      const userId = (currentUser?.role === 'ANM' || currentUser?.role === 'GNM') ? currentUser.id : 'ALL';
      const data = await fetchPatients(searchTerm);
      setPatients(data);
    } catch (err) {
      console.error('Failed to load patients', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [searchTerm, currentUser]);

  const handleRegisterMother = async (e) => {
    e.preventDefault();
    if (!newName) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        name: newName.trim(),
        hindi_name: newHindiName.trim() || newName.trim(),
        age: Number(newAge),
        blood_group: newBloodGroup,
        gravidity: Number(newGravidity),
        parity: Number(newParity),
        gestational_age: Number(newGestationalAge),
        prior_csections: Number(newPriorCs),
        maternal_hemoglobin_gdl: newHb !== '' ? Number(newHb) : null,
        contact_phone: newContactPhone,
        emergency_contact_phone: newEmergencyPhone,
        primary_facility_id: currentUser?.facility_id || 'FAC-SC-KHEDI',
        registered_by_user_id: currentUser?.id || 'USR-ANM',
        registered_by_name: currentUser?.full_name || 'Suman Devi (ANM)'
      };

      const res = await createPatient(payload);
      setIsRegisterModalOpen(false);
      // Reset form
      setNewName('');
      setNewHindiName('');
      setNewAge(25);
      await loadPatients();
      // Directly open assessment for newly registered female
      if (res.patient_id) {
        onSelectPatient(res.patient_id);
      }
    } catch (err) {
      setSubmitError(err.message || 'पंजीकरण विफल रहा।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    if (riskFilter !== 'ALL' && p.current_risk_tier !== riskFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.hindi_name?.toLowerCase().includes(term) ||
      p.id?.toLowerCase().includes(term)
    );
  });

  const escalatedCount = patients.filter(p => p.current_risk_tier === 'ESCALATED').length;
  const enhancedCount = patients.filter(p => p.current_risk_tier === 'ENHANCED').length;
  const routineCount = patients.filter(p => p.current_risk_tier === 'ROUTINE').length;

  const handleWipeDatabase = async () => {
    const confirmMsg = lang === 'hi'
      ? 'क्या आप सभी पुराने और सैंपल मरीज हटाकर शून्य (0) से खुद नया डाटा दर्ज करना चाहते हैं?'
      : 'Are you sure you want to clear all patient data to enter everything fresh?';
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsLoading(true);
      await fetch('/api/db/clear-patients', { method: 'POST' });
      await loadPatients();
    } catch (err) {
      console.error('Failed to clear database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── Top Navigation Bar ── */}
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
        >
          <span>{t('reg_back_home', lang)}</span>
        </button>
        {onOpenDashboard && (
          <button
            onClick={() => onOpenDashboard()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <span>{t('openDashboardBtn', lang)}</span>
          </button>
        )}
      </div>

      {/* ── Top Staff Banner ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-red-600 font-black text-lg">
            {currentUser?.role || 'ANM'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black text-slate-900">{currentUser?.full_name || 'सुमन देवी (ANM Suman Devi)'}</h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-red-100 text-red-700">
                {currentUser?.role || 'ANM'}
              </span>
              {currentUser?.id_card_verified ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>ID सत्यापित</span>
                </span>
              ) : null}
            </div>
            <div className="text-xs text-slate-500 font-medium flex items-center space-x-3 mt-1">
              <span className="flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentUser?.facility_name || 'उप-स्वास्थ्य केंद्र खेड़ी साध (Sub-Centre Khedi Sadh)'}</span>
              </span>
              <span>•</span>
              <span className="text-slate-600 font-semibold">{currentUser?.rural_area || 'गांव खेड़ी साध, रोहतक'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-stretch md:self-auto">
          <button
            onClick={handleWipeDatabase}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-red-700 transition flex items-center space-x-1.5 justify-center cursor-pointer"
            title="Wipe sample data to start 100% fresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('reg_clear_data', lang)}</span>
          </button>

          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-xs transition flex items-center space-x-2 justify-center cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('reg_add_mother', lang)}</span>
          </button>
        </div>
      </div>

      {/* ── Maternal Risk Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        <div
          onClick={() => setRiskFilter('ALL')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            riskFilter === 'ALL' ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-bold opacity-75 block">कुल पंजीकृत माताएं (Total Mothers)</span>
          <span className="text-2xl font-black mt-1 block">{patients.length}</span>
          <span className="text-[10px] opacity-60 mt-0.5 block">सक्रिय प्रसव निगरानी (Under Surveillance)</span>
        </div>

        <div
          onClick={() => setRiskFilter('ESCALATED')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            riskFilter === 'ESCALATED' ? 'border-red-600 bg-red-600 text-white shadow-sm' : 'bg-white border-red-200 text-red-700 hover:bg-red-50/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold block">गंभीर PPH जोखिम (Critical)</span>
            <AlertOctagon className="w-4 h-4 animate-pulse" />
          </div>
          <span className="text-2xl font-black mt-1 block">{escalatedCount}</span>
          <span className="text-[10px] opacity-80 mt-0.5 block">अस्पताल स्टैंडबाय व रक्त आवश्यक</span>
        </div>

        <div
          onClick={() => setRiskFilter('ENHANCED')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            riskFilter === 'ENHANCED' ? 'border-amber-500 bg-amber-500 text-white shadow-sm' : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold block">सतर्कता स्तर (Enhanced Watch)</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black mt-1 block">{enhancedCount}</span>
          <span className="text-[10px] opacity-80 mt-0.5 block">सक्रिय 3rd स्टेज प्रबंधन (AMTSL)</span>
        </div>

        <div
          onClick={() => setRiskFilter('ROUTINE')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            riskFilter === 'ROUTINE' ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm' : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold block">सामान्य स्तर (Routine Normal)</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black mt-1 block">{routineCount}</span>
          <span className="text-[10px] opacity-80 mt-0.5 block">मानक प्रसव प्रोटोकॉल</span>
        </div>

      </div>

      {/* ── Search & Registry Filter ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('reg_search_placeholder', lang)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500 w-full sm:w-auto justify-end">
          <span className="font-semibold">{filteredPatients.length} महिलाएं सूचीबद्ध</span>
          <button
            onClick={loadPatients}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Registered Mothers List (Cards Grid) ── */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
          <span className="text-xs font-bold">मरीज सूची लोड हो रही है...</span>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <HeartPulse className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">कोई मरीज नहीं मिला</h3>
          <p className="text-xs text-slate-400 mt-1">खोज शब्द बदलें या ऊपर दिए गए बटन से नई महिला का पंजीकरण करें।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPatients.map((mother) => {
            const isEscalated = mother.current_risk_tier === 'ESCALATED';
            const isEnhanced = mother.current_risk_tier === 'ENHANCED';

            return (
              <div
                key={mother.id}
                className={`bg-white rounded-2xl border p-5 transition shadow-xs hover:shadow-md flex flex-col justify-between ${
                  isEscalated
                    ? 'border-red-300 hover:border-red-500'
                    : isEnhanced
                    ? 'border-amber-300 hover:border-amber-500'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black text-slate-900 capitalize">{mother.name}</span>
                        {mother.hindi_name && mother.hindi_name.trim().toLowerCase() !== mother.name.trim().toLowerCase() && (
                          <span className="text-xs text-slate-500 font-bold">({mother.hindi_name})</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <div className="text-[11px] text-slate-400 font-medium">
                          ID: <span className="font-mono text-slate-600 font-bold">{mother.id}</span>
                        </div>
                        {mother.abha_id ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span>🇮🇳 ABHA: {mother.abha_id}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            + ABHA Unlinked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Risk Badge with Clinical Odds Ratio */}
                    <span
                      className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                        isEscalated
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : isEnhanced
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : mother.current_risk_percent !== null && mother.current_risk_percent !== undefined
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {mother.current_risk_tier
                        ? (mother.current_risk_percent !== null && mother.current_risk_percent !== undefined
                            ? (() => {
                                const base = Number(mother.current_risk_percent);
                                const low = Math.max(0.5, base - 1.5).toFixed(1);
                                const high = (base + 1.8).toFixed(1);
                                const odds = Math.max(2, Math.round(100 / base));
                                return `${mother.current_risk_tier} [${low}% – ${high}%] • 1 in ${odds}`;
                              })()
                            : `${mother.current_risk_tier} (जांच बाकी)`)
                        : 'जांच बाकी (Pending)'}
                    </span>
                  </div>

                  {/* Obstetric & Health Vitals Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-xs mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">उम्र व रक्त (Age/Blood):</span>
                      <span className="font-bold text-slate-800">{mother.age} वर्ष • {mother.blood_group}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">गर्भावस्था (G/P):</span>
                      <span className="font-bold text-slate-800">
                        G{mother.gravidity || 1} P{mother.parity || 0} ({mother.gestational_age ? `${mother.gestational_age} हफ्ते` : 'अवधि बाकी'})
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">हीमोग्लोबिन (Hb):</span>
                      {mother.maternal_hemoglobin_gdl !== null && mother.maternal_hemoglobin_gdl !== undefined && mother.maternal_hemoglobin_gdl !== '' ? (
                        <span className={`font-black ${Number(mother.maternal_hemoglobin_gdl) < 9.0 ? 'text-red-600 font-extrabold' : 'text-slate-800'}`}>
                          {mother.maternal_hemoglobin_gdl} g/dL
                          {Number(mother.maternal_hemoglobin_gdl) < 9.0 ? ' (एनीमिया ⚠️)' : ''}
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-400 text-[11px]">जांच बाकी (Pending)</span>
                      )}
                    </div>
                  </div>

                  {/* Prior C-Section / Alert flags */}
                  {Number(mother.prior_csections) > 0 && (
                    <div className="mb-3 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>पिछला सिजेरियन प्रसव ({mother.prior_csections} बार C-Section) — टांके की निगरानी आवश्यक</span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between mb-4">
                    <span>पंजीकृत स्वास्थ्य कर्मी: <strong>{mother.registered_by_name || 'एएनएम सुमन देवी'}</strong></span>
                    <span>{mother.contact_phone}</span>
                  </div>

                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center space-x-2">
                  <button
                    onClick={() => onSelectPatient(mother.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white transition flex items-center justify-center space-x-1.5 shadow-xs"
                  >
                    <span>PPH क्लिनिकल जांच व प्रसव मॉनिटरिंग</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── REGISTER NEW MOTHER MODAL ── */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 text-slate-900 my-8">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {lang === 'hi' ? 'नई गर्भवती महिला का पंजीकरण (Register Pregnant Mother)' : 'New Mother Registration'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    प्रसव निगरानी और PPH जोखिम रोकथाम हेतु प्राथमिक विवरण दर्ज करें
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterMother} className="space-y-3.5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">मरीज का नाम (English) *:</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">हिंदी में नाम (Hindi Name):</label>
                  <input
                    type="text"
                    value={newHindiName}
                    onChange={(e) => setNewHindiName(e.target.value)}
                    placeholder="उदा. प्रिया शर्मा"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">उम्र (Age) *:</label>
                  <input
                    type="number"
                    min="14"
                    max="55"
                    required
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">रक्त समूह (Blood Group) *:</label>
                  <select
                    value={newBloodGroup}
                    onChange={(e) => setNewBloodGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  >
                    <option value="O+">O+ (Rh Positive)</option>
                    <option value="O-">O- (Universal Donor)</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Gravida (कुल गर्भ):</label>
                  <input
                    type="number"
                    min="1"
                    value={newGravidity}
                    onChange={(e) => setNewGravidity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Para (पूर्व प्रसव):</label>
                  <input
                    type="number"
                    min="0"
                    value={newParity}
                    onChange={(e) => setNewParity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">गर्भ सप्ताह (GA Wks):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newGestationalAge}
                    onChange={(e) => setNewGestationalAge(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    हीमोग्लोबिन स्तर (Hb g/dL) <span className="text-[10px] text-slate-400 font-normal">वैकल्पिक</span>:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="3"
                    max="20"
                    placeholder="जाँच न हुई हो तो खाली छोड़ें"
                    value={newHb}
                    onChange={(e) => setNewHb(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">पिछला सिजेरियन (Prior C-Section):</label>
                  <select
                    value={newPriorCs}
                    onChange={(e) => setNewPriorCs(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  >
                    <option value={0}>नहीं (None)</option>
                    <option value={1}>हाँ (1 C-Section ⚠️)</option>
                    <option value={2}>हाँ (2+ C-Sections 🚨)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">मोबाइल नंबर (Phone):</label>
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="+919812345678"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">आपातकालीन संपर्क (Emergency Phone):</label>
                  <input
                    type="text"
                    value={newEmergencyPhone}
                    onChange={(e) => setNewEmergencyPhone(e.target.value)}
                    placeholder="+919812999999"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              {submitError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>{isSubmitting ? 'पंजीकरण हो रहा है...' : 'महिला पंजीकृत करें (Register)'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
