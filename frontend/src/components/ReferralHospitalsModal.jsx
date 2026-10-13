import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Ambulance,
  Phone,
  CheckCircle2,
  Clock,
  Compass,
  ArrowRight,
  Shield,
  MapPin,
  Sparkles,
  ChevronRight,
  Radio,
  Send,
  X,
  Volume2,
  Search,
  Crosshair,
  Building2
} from 'lucide-react';

// Referral Facilities with accurate GIS map coordinates in the Light Apple/Uber Map grid
const FACILITIES = [
  {
    id: "FAC-PGIMS-ROHTAK",
    name: "Pt. B.D. Sharma PGIMS",
    name_hi: "पं. भगवत दयाल शर्मा पीजीआईएमएस",
    short_label: "PGIMS Rohtak",
    tagline: "Premier Tertiary Medical College & Research Institute",
    type: "TERTIARY_INSTITUTE",
    type_badge: "Tertiary College",
    distance_km: 11.1,
    eta_minutes: 17,
    eta_time: "18:15",
    speed_kmh: 76,
    has_blood_bank: 1,
    has_csection_ot: 1,
    icu_beds: 40,
    total_beds: 2100,
    phone: "01262-281300",
    phone_raw: "+911262281300",
    address: "Medical Mor, Rohtak 124001",
    blood_units: "48 यूनिट उपलब्ध (O-, A+, B+, AB+)",
    ot_status: "2 OT तुरंत सक्रिय (24x7 सर्जन ऑन-ड्यूटी)",
    rating: "4.9 ★",
    route_color: "#6366f1", // Indigo / Violet Apple Maps style
    is_recommended: true,
    map_x: 230,
    map_y: 110,
    route_path: "M 460,260 L 370,260 L 370,160 L 230,160 L 230,110",
    next_turn: "Go straight on NH-9 Rohtak Bypass",
    next_turn_hi: "NH-9 रोहतक बाईपास पर सीधा चलें"
  },
  {
    id: "FAC-CIVIL-ROHTAK",
    name: "District Civil Hospital Rohtak",
    name_hi: "जिला नागरिक अस्पताल, रोहतक",
    short_label: "Civil Hospital",
    tagline: "Secondary District Healthcare Facility",
    type: "DISTRICT_HOSPITAL",
    type_badge: "District Hospital",
    distance_km: 14.7,
    eta_minutes: 22,
    eta_time: "18:20",
    speed_kmh: 68,
    has_blood_bank: 1,
    has_csection_ot: 1,
    icu_beds: 8,
    total_beds: 200,
    phone: "01262-245200",
    phone_raw: "+911262245200",
    address: "Bhiwani Stand, Rohtak 124001",
    blood_units: "18 यूनिट उपलब्ध",
    ot_status: "1 OT सक्रिय",
    rating: "4.3 ★",
    route_color: "#f59e0b", // Amber
    is_recommended: false,
    map_x: 130,
    map_y: 190,
    route_path: "M 460,260 L 370,260 L 370,190 L 130,190",
    next_turn: "Turn left at Bhiwani Stand Junction",
    next_turn_hi: "भिवानी स्टैंड चौराहे पर बाएं मुड़ें"
  },
  {
    id: "FAC-CHC-SAMPLA",
    name: "Community Health Centre (CHC) Sampla",
    name_hi: "सामुदायिक स्वास्थ्य केंद्र सांपला",
    short_label: "CHC Sampla",
    tagline: "First Referral Unit (Stabilisation Only)",
    type: "CHC",
    type_badge: "CHC FRU",
    distance_km: 15.8,
    eta_minutes: 24,
    eta_time: "18:22",
    speed_kmh: 72,
    has_blood_bank: 0,
    has_csection_ot: 0,
    icu_beds: 0,
    total_beds: 30,
    phone: "01262-260100",
    phone_raw: "+911262260100",
    address: "NH-9 Highway, Sampla 124501",
    blood_units: "ब्लड बैंक उपलब्ध नहीं (प्राथमिक उपचार)",
    ot_status: "सामान्य प्रसव केवल (सिजेरियन नहीं)",
    rating: "3.9 ★",
    route_color: "#0284c7", // Sky Blue
    is_recommended: false,
    map_x: 720,
    map_y: 190,
    route_path: "M 460,260 L 610,260 L 610,190 L 720,190",
    next_turn: "Take flyover towards Sampla Mandi",
    next_turn_hi: "सांपला मंडी की ओर फ्लाईओवर लें"
  },
  {
    id: "FAC-CIVIL-JHAJJAR",
    name: "District Civil Hospital Jhajjar",
    name_hi: "जिला नागरिक अस्पताल झज्जर",
    short_label: "Civil Jhajjar",
    tagline: "District General Hospital",
    type: "DISTRICT_HOSPITAL",
    type_badge: "District Hospital",
    distance_km: 36.0,
    eta_minutes: 51,
    eta_time: "18:49",
    speed_kmh: 75,
    has_blood_bank: 1,
    has_csection_ot: 1,
    icu_beds: 6,
    total_beds: 100,
    phone: "01251-252100",
    phone_raw: "+911251252100",
    address: "Gurugram Road, Jhajjar 124103",
    blood_units: "12 यूनिट उपलब्ध",
    ot_status: "1 OT तैयार",
    rating: "4.1 ★",
    route_color: "#8b5cf6", // Purple
    is_recommended: false,
    map_x: 340,
    map_y: 470,
    route_path: "M 460,260 L 460,370 L 340,370 L 340,470",
    next_turn: "Take SH-22 South towards Jhajjar",
    next_turn_hi: "SH-22 दक्षिण की ओर झज्जर रोड लें"
  },
  {
    id: "FAC-CIVIL-BAHADURGARH",
    name: "Civil Hospital Bahadurgarh",
    name_hi: "नागरिक अस्पताल बहादुरगढ़",
    short_label: "Bahadurgarh Hospital",
    tagline: "Sub-Divisional Civil Hospital",
    type: "DISTRICT_HOSPITAL",
    type_badge: "Sub-Div Hospital",
    distance_km: 38.7,
    eta_minutes: 54,
    eta_time: "18:52",
    speed_kmh: 70,
    has_blood_bank: 1,
    has_csection_ot: 1,
    icu_beds: 4,
    total_beds: 100,
    phone: "01276-230100",
    phone_raw: "+911276230100",
    address: "Delhi-Rohtak Road, Bahadurgarh",
    blood_units: "15 यूनिट उपलब्ध",
    ot_status: "1 OT सक्रिय",
    rating: "4.2 ★",
    route_color: "#f97316", // Orange
    is_recommended: false,
    map_x: 880,
    map_y: 290,
    route_path: "M 460,260 L 750,260 L 750,290 L 880,290",
    next_turn: "Continue on Delhi-Rohtak Highway",
    next_turn_hi: "दिल्ली-रोहतक हाईवे पर आगे बढ़ें"
  },
  {
    id: "FAC-AIIMS-BADSA",
    name: "AIIMS Badsa Campus (NCI Jhajjar)",
    name_hi: "एम्स बाढ़सा राष्ट्रीय कैंसर संस्थान",
    short_label: "AIIMS Badsa",
    tagline: "National Institute of Eminence",
    type: "TERTIARY_INSTITUTE",
    type_badge: "AIIMS Tertiary",
    distance_km: 49.0,
    eta_minutes: 68,
    eta_time: "19:06",
    speed_kmh: 78,
    has_blood_bank: 1,
    has_csection_ot: 1,
    icu_beds: 50,
    total_beds: 710,
    phone: "01251-241000",
    phone_raw: "+911251241000",
    address: "Badsa, Jhajjar 124105",
    blood_units: "50+ यूनिट उपलब्ध",
    ot_status: "अत्याधुनिक 6 OT सक्रिय",
    rating: "4.9 ★",
    route_color: "#e11d48", // Crimson
    is_recommended: false,
    map_x: 760,
    map_y: 470,
    route_path: "M 460,260 L 610,260 L 610,470 L 760,470",
    next_turn: "Exit towards AIIMS Badsa campus gate",
    next_turn_hi: "एम्स बाढ़सा कैंपस गेट की ओर मुड़ें"
  }
];

// Origin: Sub-Centre Khedi Sadh
const ORIGIN = {
  name: "Sub-Centre Khedi Sadh",
  name_hi: "उप-स्वास्थ्य केंद्र खेड़ी साध",
  x: 460,
  y: 260
};

export default function ReferralHospitalsModal({
  isOpen,
  onClose,
  lang = 'hi',
  facilitiesData = []
}) {
  const [selectedFacilityId, setSelectedFacilityId] = useState("FAC-PGIMS-ROHTAK");
  const [hoveredFacilityId, setHoveredFacilityId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dispatchedToast, setDispatchedToast] = useState(false);
  const [carLaneOffset, setCarLaneOffset] = useState(0);

  // Active facility
  const activeFacility = FACILITIES.find(f => f.id === selectedFacilityId) || FACILITIES[0];
  const nearestCriticalFacility = FACILITIES.find(f => f.is_recommended) || FACILITIES[0];

  // Road stripe animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCarLaneOffset(prev => (prev + 4) % 40);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Voice directions simulation
  const handlePlayVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = lang === 'hi'
        ? `108 एम्बुलेंस आपातकालीन रूट: ${activeFacility.eta_minutes} मिनट में ${activeFacility.name_hi} पहुंचें। ${activeFacility.next_turn_hi}।`
        : `108 Ambulance route: ${activeFacility.eta_minutes} minutes to ${activeFacility.name}. ${activeFacility.next_turn}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDispatch108 = () => {
    setDispatchedToast(true);
    handlePlayVoice();
    setTimeout(() => setDispatchedToast(false), 6000);
  };

  if (!isOpen) return null;

  const filteredFacilities = searchQuery
    ? FACILITIES.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.name_hi.includes(searchQuery))
    : FACILITIES;

  // Reusable 3D In-Cab Navigation Card Content
  const renderNavigationHudContent = (isMobileView = false) => (
    <div className={`bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-[28px] border border-slate-200/90 shadow-xl p-4 sm:p-5 space-y-3 ${isMobileView ? 'w-full' : ''}`}>
      {/* Top Row: ETA + Distance + Close */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {activeFacility.eta_minutes} minutes
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            {activeFacility.distance_km} km • {activeFacility.eta_time} ETA • {activeFacility.short_label}
          </p>
        </div>

        {!isMobileView && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Next Turn Instruction */}
      <div className="flex items-center space-x-2.5 text-xs font-black text-slate-800 bg-slate-50 border border-slate-100 p-2 sm:p-2.5 rounded-xl">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs sm:text-sm flex-shrink-0">
          ↑
        </div>
        <div className="truncate">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Direction
          </span>
          <span className="text-xs font-black text-slate-900 truncate block">
            {lang === 'hi' ? activeFacility.next_turn_hi : activeFacility.next_turn}
          </span>
        </div>
      </div>

      {/* 3D Road Lane with Ambulance (गाड़ी 🚑) View */}
      <div className="relative h-24 sm:h-28 w-full bg-gradient-to-b from-slate-100 to-slate-200 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col items-center justify-center border border-slate-200/60">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 110" preserveAspectRatio="none">
          <line x1="100" y1="0" x2="60" y2="110" stroke="#818cf8" strokeWidth="2" strokeDasharray="6 4" strokeDashoffset={carLaneOffset} />
          <line x1="200" y1="0" x2="240" y2="110" stroke="#818cf8" strokeWidth="2" strokeDasharray="6 4" strokeDashoffset={carLaneOffset} />
          <line x1="150" y1="0" x2="150" y2="110" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="8 6" strokeDashoffset={carLaneOffset} />
        </svg>

        {/* 3D Car Vehicle */}
        <div className="relative z-10 flex flex-col items-center scale-90 sm:scale-100">
          <div className="w-12 h-18 sm:h-20 bg-gradient-to-b from-slate-100 via-white to-slate-200 rounded-2xl border-2 border-slate-300 shadow-xl relative flex flex-col items-center justify-between p-1.5">
            <div className="flex justify-between w-full px-1">
              <span className="w-2.5 h-1 bg-amber-300 rounded-full shadow-md shadow-amber-300"></span>
              <span className="w-2.5 h-1 bg-amber-300 rounded-full shadow-md shadow-amber-300"></span>
            </div>
            <div className="w-8 h-3.5 bg-slate-800 rounded-md"></div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" style={{ animationDelay: '0.3s' }}></span>
            </div>
            <div className="w-8 h-2 bg-slate-700 rounded-sm"></div>
            <div className="flex justify-between w-full px-1">
              <span className="w-2 h-1 bg-red-500 rounded-full"></span>
              <span className="w-2 h-1 bg-red-500 rounded-full"></span>
            </div>
          </div>
        </div>

        {/* Speedometer */}
        <div className="absolute bottom-1.5 text-center">
          <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none">
            {activeFacility.speed_kmh}
          </span>
          <span className="text-[9px] font-bold text-slate-500 ml-1">km/h</span>
        </div>
      </div>

      {/* Control Action Buttons */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePlayVoice}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
            title="Audio Directions"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <a
            href={`tel:${activeFacility.phone_raw}`}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition cursor-pointer"
            title="Call Emergency Room"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>

        <button
          type="button"
          onClick={handleDispatch108}
          className="flex-1 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl text-xs font-black transition flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-200 cursor-pointer min-h-[40px]"
        >
          <Ambulance className="w-4 h-4" />
          <span>108 अलर्ट भेजें</span>
        </button>
      </div>

      {dispatchedToast && (
        <div className="bg-emerald-600 text-white p-2.5 rounded-xl text-[11px] font-bold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
            <span className="truncate">108 चालक व {activeFacility.short_label} ER को अलर्ट भेजा गया!</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#f8fafc] rounded-none sm:rounded-[32px] border-0 sm:border border-slate-200/80 max-w-6xl w-full shadow-2xl flex flex-col h-full sm:h-auto max-h-screen sm:max-h-[96vh] overflow-hidden">

        {/* ── 1. MAP TOP FLOATING BAR (Responsive Header) ── */}
        <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-3 z-20 flex-shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-2xs">
              <Navigation className="w-4 h-4 sm:w-5 sm:h-5 fill-indigo-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h2 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 truncate">
                  {lang === 'hi' ? 'आपातकालीन GPS नेविगेशन' : 'Emergency GPS Navigation'}
                </h2>
                <span className="hidden xs:inline-flex px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 flex-shrink-0">
                  Apple Maps GIS
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                खेड़ी साध (मरीज) → PGIMS रोहतक कॉरिडोर
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* ── 2. SCROLLABLE CONTAINER ── */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-5 space-y-3.5 sm:space-y-4">

          {/* ── 3. HORIZONTAL SWIPEABLE HOSPITAL CAROUSEL (Touch Friendly on Mobile) ── */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none select-none">
            {FACILITIES.map((fac) => {
              const isSelected = fac.id === selectedFacilityId;
              return (
                <button
                  key={fac.id}
                  type="button"
                  onClick={() => setSelectedFacilityId(fac.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
                    isSelected
                      ? 'bg-white border-indigo-600 text-indigo-700 shadow-xs ring-2 ring-indigo-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: fac.route_color }} />
                  <span className="font-black text-slate-900">{fac.short_label}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">({fac.eta_minutes}m)</span>
                  {fac.is_recommended && <span className="text-amber-500 font-black">★</span>}
                </button>
              );
            })}
          </div>

          {/* ── 4. LIGHT VECTOR MAP CANVAS ── */}
          <div className="relative w-full rounded-2xl sm:rounded-3xl bg-[#f1f5f9] border border-slate-200 shadow-sm overflow-hidden select-none min-h-[260px] sm:min-h-[460px]">
            
            {/* Top Floating Search Pill & Re-center */}
            <div className="absolute top-2.5 inset-x-2.5 sm:top-4 sm:inset-x-4 z-20 flex items-center justify-between pointer-events-none gap-2">
              <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-full shadow-md border border-slate-200/80 px-3 py-1.5 sm:px-4 sm:py-2 flex items-center space-x-2 flex-1 max-w-xs sm:max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'hi' ? 'अस्पताल खोजें...' : 'Search hospital...'}
                  className="bg-transparent text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none w-full"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 text-xs">
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedFacilityId("FAC-PGIMS-ROHTAK")}
                className="pointer-events-auto w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-slate-200/80 text-slate-700 flex items-center justify-center hover:bg-slate-50 transition cursor-pointer flex-shrink-0"
                title="Center on Mother"
              >
                <Crosshair className="w-4 h-4 text-indigo-600" />
              </button>
            </div>

            {/* SVG MAP CANVAS: 1000 x 560 */}
            <svg
              className="w-full h-[260px] sm:h-[460px] block"
              viewBox="0 0 1000 560"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <radialGradient id="radarBeam" cx="0%" cy="0%" r="100%">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                </radialGradient>
                <filter id="appleCardShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.1" />
                </filter>
              </defs>

              {/* Base Ground */}
              <rect width="1000" height="560" fill="#f8fafc" />

              {/* City Blocks */}
              <g fill="#e9edf2" stroke="#e2e8f0" strokeWidth="1">
                <rect x="60" y="30" width="130" height="90" rx="6" />
                <rect x="210" y="30" width="120" height="60" rx="6" />
                <rect x="350" y="30" width="150" height="70" rx="6" />
                <rect x="520" y="30" width="180" height="90" rx="6" />
                <rect x="720" y="30" width="220" height="90" rx="6" />

                <rect x="60" y="140" width="80" height="100" rx="6" />
                <rect x="160" y="140" width="120" height="100" rx="6" />
                <rect x="300" y="140" width="140" height="90" rx="6" />
                <rect x="460" y="130" width="120" height="100" rx="6" />
                <rect x="600" y="140" width="180" height="100" rx="6" />
                <rect x="800" y="140" width="140" height="110" rx="6" />

                <rect x="60" y="290" width="160" height="110" rx="6" />
                <rect x="240" y="290" width="140" height="130" rx="6" />
                <rect x="400" y="290" width="180" height="140" rx="6" />
                <rect x="600" y="290" width="170" height="120" rx="6" />
                <rect x="790" y="290" width="150" height="130" rx="6" />

                <rect x="100" y="440" width="180" height="90" rx="6" />
                <rect x="300" y="450" width="150" height="80" rx="6" />
                <rect x="470" y="450" width="200" height="80" rx="6" />
                <rect x="690" y="440" width="250" height="90" rx="6" />
              </g>

              {/* Park Spaces */}
              <g fill="#ecfdf5" stroke="#d1fae5" strokeWidth="1">
                <rect x="160" y="260" width="110" height="60" rx="10" />
                <text x="215" y="295" textAnchor="middle" fill="#059669" fontSize="9" fontWeight="bold">
                  PGIMS Gardens
                </text>
                <rect x="680" y="230" width="100" height="50" rx="8" />
                <text x="730" y="260" textAnchor="middle" fill="#059669" fontSize="9" fontWeight="bold">
                  Sampla Green Belt
                </text>
              </g>

              {/* Clean Streets Network */}
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d="
                    M 30,160 L 970,160
                    M 30,260 L 970,260
                    M 30,370 L 970,370
                    M 150,20 L 150,540
                    M 370,20 L 370,540
                    M 610,20 L 610,540
                    M 750,20 L 750,540
                    M 230,20 L 230,260
                  "
                  stroke="#cbd5e1"
                  strokeWidth="24"
                />
                <path
                  d="
                    M 30,160 L 970,160
                    M 30,260 L 970,260
                    M 30,370 L 970,370
                    M 150,20 L 150,540
                    M 370,20 L 370,540
                    M 610,20 L 610,540
                    M 750,20 L 750,540
                    M 230,20 L 230,260
                  "
                  stroke="#ffffff"
                  strokeWidth="20"
                />
              </g>

              {/* Street Names */}
              <g fill="#94a3b8" fontSize="9" fontWeight="bold" letterSpacing="0.5">
                <text x="50" y="156">MEDICAL MOR / PGIMS ROAD</text>
                <text x="50" y="256">NH-9 ROHTAK EXPRESSWAY</text>
                <text x="50" y="366">SH-22 JHAJJAR HIGHWAY</text>
                <text x="770" y="256">DELHI-ROHTAK ROAD</text>
                <text x="618" y="90" transform="rotate(90 618,90)">SAMPLA SECTOR LINK</text>
                <text x="378" y="90" transform="rotate(90 378,90)">BYPASS RING ROAD</text>
              </g>

              {/* Active Route Polyline */}
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d={activeFacility.route_path}
                  stroke={activeFacility.route_color}
                  strokeWidth="14"
                  opacity="0.25"
                />
                <path
                  d={activeFacility.route_path}
                  stroke={activeFacility.route_color}
                  strokeWidth="7"
                />
                <circle cx={ORIGIN.x} cy={ORIGIN.y} r="6" fill="#ffffff" stroke={activeFacility.route_color} strokeWidth="3" />
                <circle cx={activeFacility.map_x} cy={activeFacility.map_y} r="7" fill={activeFacility.route_color} stroke="#ffffff" strokeWidth="2.5" />
              </g>

              {/* "Your Location" Conical Radar Beam */}
              <g transform={`translate(${ORIGIN.x}, ${ORIGIN.y})`}>
                <path
                  d="M 0,0 L -70,-80 A 110 110 0 0 1 -20,-110 Z"
                  fill="url(#radarBeam)"
                  opacity="0.8"
                />
                <circle cx="0" cy="0" r="18" fill="#7c3aed" opacity="0.2" className="animate-ping" style={{ animationDuration: '2.5s' }} />
                <circle cx="0" cy="0" r="9" fill="#7c3aed" stroke="#ffffff" strokeWidth="3" />
                <circle cx="0" cy="0" r="3.5" fill="#ffffff" />

                <g transform="translate(14, -28)" filter="url(#appleCardShadow)">
                  <rect x="0" y="0" width="165" height="26" rx="13" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                  <circle cx="13" cy="13" r="5" fill="#7c3aed" />
                  <text x="26" y="17" fill="#0f172a" fontSize="10" fontWeight="900">
                    Your Location (मरीज यहाँ है)
                  </text>
                </g>
              </g>

              {/* Hospital Markers */}
              {FACILITIES.map((fac) => {
                const isSelected = fac.id === selectedFacilityId;

                return (
                  <g
                    key={fac.id}
                    transform={`translate(${fac.map_x}, ${fac.map_y})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedFacilityId(fac.id)}
                    filter="url(#appleCardShadow)"
                  >
                    <circle cx="0" cy="0" r="5" fill={isSelected ? fac.route_color : "#94a3b8"} />
                    <g transform="translate(-18, -34)">
                      <rect
                        x="0"
                        y="0"
                        width={fac.is_recommended ? "180" : "150"}
                        height="32"
                        rx="16"
                        fill="#ffffff"
                        stroke={isSelected ? fac.route_color : "#e2e8f0"}
                        strokeWidth={isSelected ? "2" : "1"}
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r="11"
                        fill={isSelected ? fac.route_color : "#f1f5f9"}
                      />
                      <text x="16" y="20" textAnchor="middle" fontSize="11">
                        {fac.is_recommended ? "🏥" : fac.has_blood_bank ? "🩸" : "⚕️"}
                      </text>
                      <text x="34" y="16" fill="#0f172a" fontSize="10" fontWeight="900">
                        {fac.short_label}
                      </text>
                      <text x="34" y="26" fill={isSelected ? fac.route_color : "#64748b"} fontSize="8.5" fontWeight="bold">
                        {fac.eta_minutes} min • {fac.distance_km} km
                      </text>
                      {fac.is_recommended && (
                        <g transform="translate(156, 16)">
                          <circle cx="0" cy="0" r="8" fill="#ecfdf5" stroke="#10b981" strokeWidth="1" />
                          <text x="0" y="3" textAnchor="middle" fill="#059669" fontSize="8" fontWeight="bold">★</text>
                        </g>
                      )}
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* Desktop Floating In-Cab 3D Navigation HUD Card (hidden on mobile, floats on desktop) */}
            <div className="hidden md:block absolute bottom-4 left-4 z-20 max-w-[340px] w-full">
              {renderNavigationHudContent(false)}
            </div>

            {/* Desktop Top-Right Selected Hospital Preview Card */}
            <div className="hidden lg:block absolute top-4 right-4 z-20 max-w-xs w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                    {activeFacility.type_badge}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    {activeFacility.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {activeFacility.name_hi}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {activeFacility.rating}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">24x7 ब्लड बैंक:</span>
                  <span className={`font-black ${activeFacility.has_blood_bank ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {activeFacility.has_blood_bank ? '✓ 48 यूनिट सक्रिय' : '✗ उपलब्ध नहीं'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">सिजेरियन OT:</span>
                  <span className={`font-black ${activeFacility.has_csection_ot ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {activeFacility.has_csection_ot ? '✓ 2 OT तुरंत तैयार' : '✗ सुविधा नहीं'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">कंट्रोल रूम फोन:</span>
                  <span className="font-mono font-bold text-slate-800">{activeFacility.phone}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Mobile In-Cab 3D Navigation HUD Card (Seamlessly docked right under map on phones!) */}
          <div className="block md:hidden">
            {renderNavigationHudContent(true)}
          </div>

          {/* ── 5. NICHE US MAP KE: NEAREST HOSPITAL JISME SUVIDHA HAIN (Mobile Optimized) ── */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
                <h3 className="text-xs sm:text-base font-black text-slate-900 uppercase tracking-tight">
                  {lang === 'hi'
                    ? 'सर्वश्रेष्ठ निकटतम अस्पताल (पूर्ण सुविधा युक्त)'
                    : 'Recommended Nearest Critical Facility'}
                </h3>
              </div>
              <span className="text-[10px] sm:text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
                ✓ 24x7 Blood Bank + OT
              </span>
            </div>

            {/* GOLDEN HIGHLIGHT RECOMMENDATION CARD */}
            <div className="bg-gradient-to-br from-white via-indigo-50/30 to-emerald-50/20 rounded-2xl sm:rounded-3xl border-2 border-indigo-500/80 p-4 sm:p-6 shadow-md space-y-3.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] sm:text-[10px] font-black px-3 sm:px-4 py-1 rounded-bl-xl sm:rounded-bl-2xl shadow-xs">
                ⭐ FASTEST CRITICAL CARE
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 sm:pt-0">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <h4 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                      {nearestCriticalFacility.name}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 font-bold">
                    {nearestCriticalFacility.name_hi} • {nearestCriticalFacility.address}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {nearestCriticalFacility.tagline} • कुल बेड्स: {nearestCriticalFacility.total_beds}
                  </p>
                </div>

                <div className="flex items-center space-x-3 bg-white border border-indigo-200 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 px-3.5 shadow-2xs self-start sm:self-center">
                  <div className="text-right">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">पहुंचने का समय</span>
                    <span className="text-xl sm:text-2xl font-black text-indigo-700">
                      {nearestCriticalFacility.eta_minutes} मिनट
                    </span>
                  </div>
                  <div className="h-7 w-px bg-slate-200"></div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">सड़क दूरी</span>
                    <span className="text-base sm:text-lg font-black text-slate-800">
                      {nearestCriticalFacility.distance_km} किमी
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Key Critical Care Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-start space-x-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-black flex-shrink-0 text-sm sm:text-base">
                    🩸
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">24x7 ब्लड बैंक सक्रिय</span>
                    <span className="text-[11px] text-slate-600 font-medium">{nearestCriticalFacility.blood_units}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-start space-x-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-black flex-shrink-0 text-sm sm:text-base">
                    ✂️
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">सिजेरियन OT तैयार</span>
                    <span className="text-[11px] text-slate-600 font-medium">{nearestCriticalFacility.ot_status}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-start space-x-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black flex-shrink-0 text-sm sm:text-base">
                    🛏️
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">ICU व नवजात शिशु NICU</span>
                    <span className="text-[11px] text-slate-600 font-medium">{nearestCriticalFacility.icu_beds} क्रिटिकल बेड्स</span>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDispatch108}
                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 shadow-md shadow-indigo-200 cursor-pointer min-h-[44px]"
                  >
                    <Ambulance className="w-4 h-4" />
                    <span>🚨 108 एम्बुलेंस अलर्ट भेजें</span>
                  </button>

                  <a
                    href={`tel:${nearestCriticalFacility.phone_raw}`}
                    className="w-full sm:w-auto px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-2xs min-h-[44px]"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>कॉल: {nearestCriticalFacility.phone}</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFacilityId(nearestCriticalFacility.id)}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center justify-center space-x-1 cursor-pointer py-1"
                >
                  <span>मैप पर यह रूट एक्टिव करें</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── 6. ALL OTHER HOSPITALS SELECTOR GRID ── */}
            <div className="pt-1">
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-2">
                अन्य नजदीकी अस्पताल (टैप करके रूट देखें):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {filteredFacilities.map((fac) => {
                  const isSelected = fac.id === selectedFacilityId;

                  return (
                    <div
                      key={fac.id}
                      onClick={() => setSelectedFacilityId(fac.id)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-2 min-h-[90px] ${
                        isSelected
                          ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: fac.route_color }}
                          />
                          <span className="text-xs font-black text-slate-900 truncate">{fac.name}</span>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap flex-shrink-0">
                          {fac.eta_minutes}m • {fac.distance_km}km
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1 text-[10px]">
                        {fac.has_blood_bank ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                            🩸 ब्लड बैंक
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
                            ब्लड बैंक नहीं
                          </span>
                        )}

                        {fac.has_csection_ot ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                            ✂️ OT Ready
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
                            OT नहीं
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                        <span className="text-slate-500 font-medium truncate">{fac.address}</span>
                        <span className="text-indigo-600 font-bold whitespace-nowrap ml-2">
                          {isSelected ? '✓ एक्टिव' : 'रूट देखें →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* ── 7. MODAL FOOTER (Sticky on Mobile) ── */}
        <div className="bg-white border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2 text-[11px] sm:text-xs text-slate-500 font-medium truncate">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
            <span className="truncate">NHM हरियाणा 108 जीपीएस • PGIMS रोहतक</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 sm:px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition cursor-pointer flex-shrink-0 min-h-[38px]"
          >
            {lang === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
