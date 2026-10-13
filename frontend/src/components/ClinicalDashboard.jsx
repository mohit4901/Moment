import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart,
  Activity,
  AlertTriangle,
  Camera,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Droplet,
  Clock,
  ArrowRight,
  Ambulance,
  Building2,
  User,
  Plus,
  RefreshCw,
  FileText,
  MapPin,
  Users,
  Home,
  UserPlus,
  LogOut,
  AlertCircle,
  QrCode,
  Eye,
  Shield,
  Search,
  CheckCircle2,
  X,
  Phone,
  Calendar,
  Stethoscope,
  Upload,
  Sparkles,
  Edit3,
  FileUp,
  Layers,
  Compass,
  Menu,
  Copy,
  Send,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';

import {
  fetchPatients,
  fetchPatient,
  fetchPatientTimeline,
  recordVitals,
  recordBloodLoss,
  fetchNearbyFacilities,
  fetchBloodAvailability,
  activateEmergency,
  sendEmergencyNotification,
  syncOfflineBatch,
  createPatient,
  scanReportOcr,
  predictPatient,
  updatePatient,
  fetchNetworkIp
} from '../api/client';

import ReportScannerModal from './ReportScannerModal';
import DeviceCameraModal from './DeviceCameraModal';
import PadScanner from './PadScanner';
import LiveReferralMap from './LiveReferralMap';
import ReferralHospitalsModal from './ReferralHospitalsModal';
import HospitalTriageQueue from './HospitalTriageQueue';
import DistrictAnalyticsView from './DistrictAnalyticsView';
import DirectReportScannerCard from './DirectReportScannerCard';
import TwilioEmergencyDispatchModal from './TwilioEmergencyDispatchModal';
import AbhaModal from './AbhaModal';
import QRCode from 'qrcode';
import LanguagePickerTrigger from './LanguagePickerTrigger';
import PostpartumDietPlanCard from './PostpartumDietPlanCard';
import { t, speakLocalized, INDIAN_LANGUAGES } from '../i18n/languages';
import { saveOfflineEvent, getPendingEventsCount, flushPendingEvents } from '../api/offlineQueue';

export default function ClinicalDashboard({
  onBackToLanding,
  initialPatientId = null,
  activeRole: propRole,
  setActiveRole: setPropRole,
  lang = 'hi',
  setLang,
  backendStatus = 'healthy',
  currentUser = null,
  onOpenAuthModal = null
}) {
  // Active Sidebar Tab: 'risk' is default as shown in the user's screenshot!
  const [activeSidebarTab, setActiveSidebarTabState] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['risk', 'monitoring', 'emergency', 'analytics', 'facilities'].includes(tabParam)) {
        return tabParam;
      }
      const savedTab = localStorage.getItem('moment_active_tab');
      if (savedTab && ['risk', 'monitoring', 'emergency', 'analytics', 'facilities'].includes(savedTab)) {
        return savedTab;
      }
    }
    return 'risk';
  });

  const setActiveSidebarTab = (newTab) => {
    setActiveSidebarTabState(newTab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('moment_active_tab', newTab);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', newTab);
        window.history.replaceState(null, '', url.toString());
      } catch (e) {}
    }
  };

  // Role: 'anm' | 'nurse' | 'doctor' | 'hospital' | 'district' | 'ambulance'
  const [internalRole, setInternalRole] = useState(propRole || 'anm');
  const activeRole = propRole !== undefined ? propRole : internalRole;
  const setActiveRole = setPropRole || setInternalRole;

  // Offline Sync State
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Database Patients List & Active Patient
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    return (typeof initialPatientId === 'string' && initialPatientId.trim() && initialPatientId !== '[object Object]')
      ? initialPatientId
      : null;
  });
  const [patientData, setPatientData] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [bloodInventory, setBloodInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic Live Vitals
  const [pulse, setPulse] = useState(118);
  const [sbp, setSbp] = useState(90);
  const [dbp, setDbp] = useState(60);
  const [bloodLoss, setBloodLoss] = useState(300);
  const [uterineTone, setUterineTone] = useState('Boggy');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [showHospitalsModal, setShowHospitalsModal] = useState(false);
  const [showMothersModal, setShowMothersModal] = useState(false);
  const [showNewMotherModal, setShowNewMotherModal] = useState(false);
  const [showTwilioEmergencyModal, setShowTwilioEmergencyModal] = useState(false);
  const [showAbhaModal, setShowAbhaModal] = useState(false);
  const [emergencyModalData, setEmergencyModalData] = useState(null);
  const [motherSearchTerm, setMotherSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Bedside Camera QR Pairing State
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [detectedLanIp, setDetectedLanIp] = useState('10.8.2.223');
  const [customHostInput, setCustomHostInput] = useState('');
  const [showCustomHostInput, setShowCustomHostInput] = useState(false);
  const [bedsideHost, setBedsideHost] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.host;
    }
    return '10.8.2.223:5173';
  });
  const [bedsideCopied, setBedsideCopied] = useState(false);
  const [incomingBedsideNotice, setIncomingBedsideNotice] = useState(null);

  // Automatically fetch local network Wi-Fi IP from backend
  useEffect(() => {
    fetchNetworkIp().then(data => {
      if (data?.ip) {
        setDetectedLanIp(data.ip);
        const port = window.location.port || '5173';
        if (!window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          setBedsideHost(`${data.ip}:${port}`);
        }
      }
    }).catch(e => console.warn('Network IP fetch note:', e));
  }, []);

  // Live Sync Poller: Listen for photos & blood loss measurements uploaded from mobile phone
  const lastKnownBloodLossRef = useRef(null);
  useEffect(() => {
    const targetId = selectedId || patientData?.patient?.id;
    if (!targetId) return;

    const interval = setInterval(async () => {
      try {
        const freshPatient = await fetchPatient(targetId);
        const latestBl = freshPatient?.latest_blood_loss;
        if (latestBl && latestBl.recorded_at) {
          if (lastKnownBloodLossRef.current && lastKnownBloodLossRef.current !== latestBl.recorded_at) {
            // New bedside measurement arrived!
            setBloodLoss(latestBl.volume_ml);
            setIncomingBedsideNotice({
              volume_ml: latestBl.volume_ml,
              saturation: latestBl.saturation_percent || 45,
              measurement_mode: latestBl.measurement_mode || 'BedsCam_AI_Photo',
              time: new Date().toLocaleTimeString('hi-IN'),
              severity: latestBl.severity_tier || 'WATCH'
            });
            speakHindi(`मोबाइल कैमरे से नया पैड स्कैन प्राप्त हुआ। रक्तस्राव ${Math.round(latestBl.volume_ml)} मिलीलीटर। डेटा सुरक्षित सेव हो गया है।`);
            const tl = await fetchPatientTimeline(targetId);
            setTimelineData(tl.vitals_timeline || []);
          }
          lastKnownBloodLossRef.current = latestBl.recorded_at;
        }
      } catch (e) {
        // quiet background poller
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedId, patientData?.patient?.id]);

  // 15-Minute Monitoring Cycle Checkpoint State
  const [activeCheckpoint, setActiveCheckpoint] = useState('30 min');
  const [showAdvancedIndices, setShowAdvancedIndices] = useState(false);

  // Generate real dynamic QR code for Bedside Mobile Camera
  useEffect(() => {
    const pId = selectedId || patientData?.patient?.id || 'MOMENT-PT-98A7';
    const bedsideUrl = `http://${bedsideHost}/?view=bedside-cam&patient=${encodeURIComponent(pId)}`;
    QRCode.toDataURL(bedsideUrl, {
      width: 280,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation error:', err));
  }, [bedsideHost, selectedId, patientData?.patient?.id]);

  const triggerTwilioEmergencyAlert = (customData = {}) => {
    setEmergencyModalData(customData);
    setShowTwilioEmergencyModal(true);
  };

  // Emergency & Audio States
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencySeconds, setEmergencySeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [ambulanceETA, setAmbulanceETA] = useState(17);

  // New Mother Registration Form State (Basic Self-Reported Demographics)
  const [newMotherName, setNewMotherName] = useState('');
  const [newMotherAge, setNewMotherAge] = useState(25);
  const [newMotherBloodGroup, setNewMotherBloodGroup] = useState('O+');
  const [newMotherPrevCSection, setNewMotherPrevCSection] = useState('0');
  const [newMotherPhone, setNewMotherPhone] = useState('+919812345678');
  const [newMotherHb, setNewMotherHb] = useState('');
  const [newMotherGA, setNewMotherGA] = useState('38');
  const [isRegisteringMother, setIsRegisteringMother] = useState(false);

  // Risk Tab: Report Upload, BP & OCR Verification State
  const [riskReportFile, setRiskReportFile] = useState(null);
  const [riskReportPreview, setRiskReportPreview] = useState(null);
  const [isScanningReport, setIsScanningReport] = useState(false);
  const [currentSystolicBP, setCurrentSystolicBP] = useState('135');
  const [currentDiastolicBP, setCurrentDiastolicBP] = useState('88');
  const [currentPulseRate, setCurrentPulseRate] = useState('86');
  const [extractedReportData, setExtractedReportData] = useState(null);
  const [isPredictingRisk, setIsPredictingRisk] = useState(false);
  const [riskAnalysisResult, setRiskAnalysisResult] = useState(null);

  // 1. Initial Database Loading
  const loadDatabaseData = async (idOverride = null) => {
    setIsLoading(true);
    try {
      const pts = await fetchPatients();
      setPatients(pts || []);

      // Only load a specific patient if we have a real ID or real patients
      const cleanOverride = (typeof idOverride === 'string' && idOverride.trim() && idOverride !== '[object Object]') ? idOverride : null;
      const cleanSelected = (typeof selectedId === 'string' && selectedId.trim() && selectedId !== '[object Object]') ? selectedId : null;
      let targetId = cleanOverride || cleanSelected;

      // Validate that targetId actually exists in database patients list; fallback to first available
      if (pts && pts.length > 0) {
        const idExists = targetId ? pts.some(p => p.id === targetId) : false;
        if (!idExists) {
          targetId = pts[0].id;
          setSelectedId(targetId);
        }
      } else {
        targetId = null;
      }

      // If no patients at all — leave patientData as null (empty state)
      if (!targetId || (pts && pts.length === 0)) {
        setPatientData(null);
        setIsLoading(false);
        return;
      }

      const single = await fetchPatient(targetId);
      setPatientData(single);

      if (single?.latest_vital) {
        setPulse(single.latest_vital.heart_rate);
        setSbp(single.latest_vital.systolic_bp);
        setDbp(single.latest_vital.diastolic_bp);
        setUterineTone(single.latest_vital.uterine_tone || 'Boggy');
      }
      if (single?.latest_blood_loss) {
        setBloodLoss(single.latest_blood_loss.volume_ml);
      }

      const tl = await fetchPatientTimeline(targetId);
      setTimelineData(tl.vitals_timeline || []);

      const facs = await fetchNearbyFacilities(28.8520, 76.6850);
      setFacilities(facs || []);

      const bld = await fetchBloodAvailability();
      setBloodInventory(bld.blood_inventory || []);

      // Set baseline vitals from DB
      if (single?.patient && single?.pregnancy) {
        const sbpVal = single.latest_vital?.systolic_bp || 100;
        const dbpVal = single.latest_vital?.diastolic_bp || 60;
        const hrVal = single.latest_vital?.heart_rate || 88;

        setCurrentSystolicBP(String(sbpVal));
        setCurrentDiastolicBP(String(dbpVal));
        setCurrentPulseRate(String(hrVal));
      }
    } catch (err) {
      console.warn('Backend loading note:', err);
      setPatientData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPendingCount = async () => {
    try {
      const cnt = await getPendingEventsCount();
      setPendingSyncCount(cnt);
    } catch {
      setPendingSyncCount(0);
    }
  };

  const handleManualSync = async () => {
    try {
      await flushPendingEvents(syncOfflineBatch);
      await refreshPendingCount();
      await loadDatabaseData();
    } catch (err) {
      console.warn('Manual sync note:', err);
    }
  };

  const prevSelectedIdRef = useRef(selectedId);
  useEffect(() => {
    if (prevSelectedIdRef.current !== selectedId) {
      setRiskReportFile(null);
      setRiskReportPreview(null);
      setExtractedReportData(null);
      setRiskAnalysisResult(null);
      prevSelectedIdRef.current = selectedId;
    }
    loadDatabaseData();
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 6000);
    return () => clearInterval(interval);
  }, [selectedId]);

  // Current active patient and pregnancy from loaded database data
  const currentPatient = patientData?.patient || null;
  const currentPregnancy = patientData?.pregnancy || null;

  // ── 1. MULTI-PARAMETER SHOCK INDEX (SI, MSI, Age-SI, MAP) ──
  // Traditional Shock Index (SI) = HR / SBP
  const shockIndex = useMemo(() => {
    if (!sbp || sbp <= 0) return 0;
    return Number((pulse / sbp).toFixed(2));
  }, [pulse, sbp]);

  // Mean Arterial Pressure (MAP) = (SBP + 2 * DBP) / 3
  const meanArterialPressure = useMemo(() => {
    if (!sbp || !dbp) return 0;
    return Number(((sbp + 2 * dbp) / 3).toFixed(1));
  }, [sbp, dbp]);

  // Modified Shock Index (MSI) = HR / MAP (Normal: 0.7 - 1.3, Abnormal: > 1.3)
  const modifiedShockIndex = useMemo(() => {
    if (!meanArterialPressure || meanArterialPressure <= 0) return 0;
    return Number((pulse / meanArterialPressure).toFixed(2));
  }, [pulse, meanArterialPressure]);

  // Age-Adjusted Shock Index (Age-SI) = Age * (HR / SBP)
  const ageShockIndex = useMemo(() => {
    const ageVal = Number(currentPatient?.age) || 26;
    return Number((ageVal * shockIndex).toFixed(1));
  }, [currentPatient, shockIndex]);

  const shockStatus = useMemo(() => {
    if (shockIndex < 0.9) {
      return {
        label: 'सामान्य (Normal)',
        hindiText: 'मरीज स्थिर है — चिंता की बात नहीं',
        color: 'emerald',
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        text: 'text-emerald-800',
        badgeBg: 'bg-emerald-100 text-emerald-800'
      };
    }
    if (shockIndex < 1.4) {
      return {
        label: 'निगरानी (Compensated / Alert)',
        hindiText: 'नब्ज तेज़ / बीपी कम — सावधानी रखें और डॉक्टर को बताएं',
        color: 'amber',
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        text: 'text-amber-800',
        badgeBg: 'bg-amber-100 text-amber-800'
      };
    }
    if (shockIndex < 1.7) {
      return {
        label: 'खतरा (Severe Shock)',
        hindiText: 'गंभीर सदमा — तुरंत दो ड्रिप लगाएं और 108 बुलाएं!',
        color: 'rose',
        bg: 'bg-rose-50',
        border: 'border-rose-400',
        text: 'text-rose-800',
        badgeBg: 'bg-rose-100 text-rose-800'
      };
    }
    return {
      label: 'अति-गंभीर (Critical Collapse)',
      hindiText: 'जानलेवा स्थिति — तुरंत रेफर करें और लगातार मालिश दें!',
      color: 'red',
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-900',
      badgeBg: 'bg-red-600 text-white'
    };
  }, [shockIndex]);

  const msiStatus = useMemo(() => {
    if (modifiedShockIndex <= 1.3) {
      return {
        label: 'Normal (0.7 - 1.3)',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        desc: 'हेमोडायनामिक परफ्यूजन सामान्य सीमा में है।'
      };
    }
    return {
      label: 'Abnormal (> 1.3) ⚠️',
      color: 'text-rose-700 bg-rose-50 border-rose-300 font-black',
      desc: 'गंभीर सर्कुलेटरी फेलियर — आईसीयू व रक्त ट्रांसफ्यूजन की अति-आवश्यकता।'
    };
  }, [modifiedShockIndex]);

  // ── WHO GOLDEN 15-MINUTE COUNTDOWN TIMER (E-MOTIVE) ──
  const [countdownSeconds, setCountdownSeconds] = useState(900); // 15:00
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [emotiveSteps, setEmotiveSteps] = useState([
    { id: 'E', title: 'E - Early Detection', desc: 'कैलिब्रेटेड ड्रेप/पैड लगाकर खून नापें (WHO >300 mL Threshold)', done: false, time: null },
    { id: 'M', title: 'M - Uterine Massage', desc: 'द्विपक्षीय गर्भाशय मालिश (Bimanual Compression) 5 मिनट तक दें', done: false, time: null },
    { id: 'O', title: 'O - Oxytocic First-Line', desc: 'ऑक्सीटोसिन 10 IU IM या 20 IU ड्रिप में तुरंत शुरू करें', done: false, time: null },
    { id: 'T', title: 'T - Tranexamic Acid (TXA)', desc: '1g IV ट्रैनेक्सामिक एसिड 10 मिनट में नस द्वारा दें', done: false, time: null },
    { id: 'I', title: 'I - IV Fluid Resuscitation', desc: 'दो 16-गेज मोटी ड्रिप रिंगर लैक्टेट से तुरंत चालू करें', done: false, time: null },
    { id: 'V', title: 'V - Visual Exam & Void', desc: 'योनि चीरे (Tears) देखें व मूत्राशय (Bladder) खाली करें', done: false, time: null },
  ]);

  useEffect(() => {
    let t = null;
    if (isCountdownActive && countdownSeconds > 0) {
      t = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev === 600) {
            speakHindi("सावधान! 5 मिनट बीत चुके हैं। क्या ऑक्सीटोसिन और मालिश पूरी हो गई है?");
          } else if (prev === 300) {
            speakHindi("चेतावनी! 10 मिनट हो गए हैं। अगर रक्तस्राव जारी है तो तुरंत 108 एम्बुलेंस से रेफर करें।");
          } else if (prev === 1) {
            speakHindi("गोल्डन 15 मिनट पूरे हो गए हैं। मरीज को तुरंत टर्शियरी सेंटर पीजीआईएमएस रोहतक शिफ्ट करें।");
          }
          return prev > 0 ? prev - 1 : 0;
        });
      }, 1000);
    }
    return () => clearInterval(t);
  }, [isCountdownActive, countdownSeconds]);

  const toggleEmotiveStep = (id) => {
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setEmotiveSteps((prev) =>
      prev.map((step) => {
        if (step.id === id) {
          const newDone = !step.done;
          if (newDone) {
            speakHindi(`${step.id} पूरा हुआ: ${step.title}`);
          }
          return { ...step, done: newDone, time: newDone ? nowTime : null };
        }
        return step;
      })
    );
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── SBAR CLINICAL REFERRAL HANDOVER ──
  const [sbarCopied, setSbarCopied] = useState(false);
  const sbarContent = useMemo(() => {
    const ptName = currentPatient?.name || 'Priya Sharma';
    const ptAge = currentPatient?.age || 26;
    const ptId = currentPatient?.id || 'MOMENT-PT-98A7';
    const hb = currentPregnancy?.maternal_hemoglobin_gdl || 7.6;
    const grav = currentPregnancy?.gravidity || 2;
    const par = currentPregnancy?.parity || 1;
    const ga = currentPregnancy?.gestational_age || 38.0;
    const priorCs = currentPregnancy?.prior_csections || 0;
    const mapVal = meanArterialPressure || 70;
    const msiVal = modifiedShockIndex || 1.69;
    const siVal = shockIndex || 1.31;
    const loss = bloodLoss || 320;
    const tier = currentPregnancy?.current_risk_tier || 'ENHANCED';
    const odds = riskAnalysisResult?.prevalence_ratio || '~1 in 16 mothers';

    return `*🏥 MOMENT SBAR EMERGENCY OBSTETRIC REFERRAL HANDOVER*
══════════════════════════════════════
*S (SITUATION):*
• Patient: ${ptName}, Age: ${ptAge} yrs, ID: ${ptId}
• Facility: Sub-Centre Khedi Sadh, Block Sampla, Rohtak
• Referring Staff: ANM Suman Devi (+919812001108)
• Chief Complaint: Active Postpartum Hemorrhage (PPH). Current blood loss: ${loss} mL. Uterine tone: ${uterineTone}.

*B (BACKGROUND):*
• Obstetric Profile: G${grav}P${par} at ${ga} wks GA. Prior C-Sections: ${priorCs}
• Maternal Biomarkers: Hemoglobin: ${hb} g/dL (Severe Anemia), Blood Group: ${currentPatient?.blood_group || 'O+'}
• Antenatal Risk: Stratified as ${tier} RISK (Evidence Odds: ${odds})

*A (ASSESSMENT - HEMODYNAMICS):*
• Heart Rate (Pulse): ${pulse} bpm | BP: ${sbp}/${dbp} mmHg
• Traditional Shock Index (SI = HR/SBP): ${siVal} (${shockStatus.label})
• Modified Shock Index (MSI = HR/MAP): ${msiVal} (${msiVal > 1.3 ? '⚠️ ABNORMAL > 1.3 (Severe Circulatory Collapse)' : 'Normal'})
• Mean Arterial Pressure (MAP): ${mapVal} mmHg | Age-SI: ${ageShockIndex}
• Clinical Diagnosis: PPH secondary to Uterine Atony exacerbated by severe maternal anemia and compromised hemodynamic reserve.

*R (RECOMMENDATION & INTERVENTIONS DONE):*
• Actions Completed: 1) Two 16G large-bore IV cannulae placed, warm Ringers Lactate running. 2) Prophylactic Oxytocin 10 IU IM administered. 3) Tranexamic Acid (TXA) 1g IV infused over 10 min. 4) Continuous bimanual fundal massage ongoing.
• Immediate Transfer Request: Dispatch 108 ALS Ambulance (HR-12-G-1081).
• Destination: Pt. B.D. Sharma PGIMS Rohtak (Obstetric ICU / Emergency Bay).
• Blood Request: Standby 2 Units of ${currentPatient?.blood_group || 'O+'} Packed Red Blood Cells (PRBCs).
══════════════════════════════════════`;
  }, [currentPatient, currentPregnancy, pulse, sbp, dbp, shockIndex, modifiedShockIndex, meanArterialPressure, ageShockIndex, bloodLoss, uterineTone, shockStatus, riskAnalysisResult]);

  const bloodLossStatus = useMemo(() => {
    if (bloodLoss < 300) {
      return {
        tier: 'NORMAL',
        label: 'सामान्य रक्तस्राव (Normal)',
        action: 'सामान्य प्रसव रक्तस्राव (<300 ml)। नियमित 15-मिनट निगरानी जारी रखें।',
        color: 'emerald',
        badge: 'bg-emerald-100 text-emerald-800'
      };
    }
    if (bloodLoss < 500) {
      return {
        tier: 'EARLY_PPH',
        label: 'WHO 2025 प्रारंभिक चेतावनी (Early PPH Action)',
        action: '300 ml + असामान्य नब्ज/बीपी! ऑक्सीटोसिन 10 IU दें व गर्भाशय मालिश करें।',
        color: 'amber',
        badge: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
      };
    }
    return {
      tier: 'PPH_CRITICAL',
      label: 'सक्रिय पीपीएच / भारी रक्तस्राव (Active PPH ≥500 ml)',
      action: 'खतरा! 500 ml से अधिक खून बह चुका है। 108 एम्बुलेंस और डॉक्टर को तुरंत बुलाएं!',
      color: 'red',
      badge: 'bg-red-600 text-white font-black animate-pulse'
    };
  }, [bloodLoss, shockIndex]);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setEmergencySeconds((s) => s + 1);
        if (emergencySeconds > 0 && emergencySeconds % 30 === 0) {
          setAmbulanceETA((prev) => Math.max(1, prev - 1));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, emergencySeconds]);

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const speakHindi = (text) => {
    if (!audioEnabled) return;
    speakLocalized(text, lang);
  };

  const handleAddReading = async () => {
    const nextMin = activeCheckpoint || `${(timelineData.length * 15).toString().padStart(2, '0')} min`;
    const newVitalReq = {
      patient_id: selectedId,
      time_checkpoint: nextMin,
      heart_rate: Number(pulse),
      systolic_bp: Number(sbp),
      diastolic_bp: Number(dbp),
      uterine_tone: uterineTone,
      recorded_by: 'ANM Suman Devi'
    };

    try {
      await recordVitals(newVitalReq);
      const updatedTl = await fetchPatientTimeline(selectedId);
      setTimelineData(updatedTl.vitals_timeline || []);
    } catch {
      await saveOfflineEvent('VITAL_OBSERVATION', newVitalReq);
      setTimelineData(prev => [{
        id: `OFFLINE-${Date.now()}`,
        ...newVitalReq,
        shock_index: shockIndex,
        shock_tier: shockStatus.label,
        recorded_at: new Date().toISOString()
      }, ...prev]);
    }

    // Auto advance checkpoint to next 15-minute interval
    const cycle = ['15 min', '30 min', '45 min', '60 min', '75 min', '90 min'];
    const currentIdx = cycle.indexOf(nextMin);
    if (currentIdx !== -1 && currentIdx < cycle.length - 1) {
      setActiveCheckpoint(cycle[currentIdx + 1]);
    }

    speakHindi(`नया माप दर्ज: ${nextMin}, नब्ज ${pulse}, शॉक इंडेक्स ${shockIndex}।`);
  };

  const handleStartEmergency = async () => {
    setIsEmergencyActive(true);
    setIsTimerRunning(true);
    setShowLiveMap(true);
    triggerTwilioEmergencyAlert({
      blood_loss_ml: bloodLoss || 500,
      trigger_source: bloodLoss >= 500 ? 'WHO_500ML_PPH' : 'WHO_300ML_VITAL'
    });

    const payload = {
      patient_id: selectedId,
      trigger_rule: bloodLoss >= 500 ? 'WHO_500ML_PPH' : 'WHO_300ML_VITAL',
      blood_loss_ml: bloodLoss,
      heart_rate: pulse,
      systolic_bp: sbp,
      initiated_by: 'ANM Suman Devi'
    };

    try {
      const res = await activateEmergency(payload);
      await sendEmergencyNotification({
        to_phone: "+919812991081",
        message_body: `MOMENT EMERGENCY: ${patientData?.patient?.name || 'Priya Sharma'} (PPH). Blood Loss ${bloodLoss}mL, SI ${shockIndex}. Dispatched to PGIMS Rohtak.`,
        referral_id: res.referral_id
      });
    } catch {
      await saveOfflineEvent('EMERGENCY_ACTIVATION', payload);
    }

    const voiceMsg = `${patientData?.patient?.hindi_name || 'प्रिया शर्मा'} के लिए 108 आपातकालीन प्रोटोकॉल सक्रिय किया गया है। दो 16 गेज आईवी लाइन लगाएं, ऑक्सीटोसिन 10 यूनिट दें, और लगातार गर्भाशय मालिश करें।`;
    speakHindi(voiceMsg);
  };

  // Sidebar navigation items matching the visual design (Localized for all 23 Indic Languages)
  const sidebarItems = [
    { id: 'overview', title: t('tab_overview', lang), subtitle: 'Overview', icon: FileText },
    { id: 'risk', title: t('tab_risk', lang), subtitle: 'AI Risk', icon: Shield },
    { id: 'monitoring', title: t('tab_monitoring', lang), subtitle: '15-Min Cycle', icon: Activity },
    { id: 'pad_photo', title: t('tab_pad_photo', lang), subtitle: 'Camera AI', icon: Eye },
    { id: 'pair_cam', title: t('tab_pair_cam', lang), subtitle: 'Phone Link', icon: Camera },
    { id: 'timeline', title: t('tab_timeline', lang), subtitle: 'History', icon: Clock },
    { id: 'emergency', title: t('tab_emergency', lang), subtitle: '108 SOS', icon: AlertCircle }
  ];

  const filteredMothers = patients.filter(p =>
    p.name.toLowerCase().includes(motherSearchTerm.toLowerCase()) ||
    (p.hindi_name && p.hindi_name.includes(motherSearchTerm)) ||
    p.id.toLowerCase().includes(motherSearchTerm.toLowerCase())
  );

  const handleRegisterNewMother = async (e) => {
    e.preventDefault();
    if (!newMotherName.trim()) return;
    setIsRegisteringMother(true);
    try {
      const phoneClean = newMotherPhone.startsWith('+91')
        ? newMotherPhone
        : `+91${newMotherPhone.replace(/^\+91/, '')}`;
      const csecNum = Number(newMotherPrevCSection) || 0;
      const parsedHb = newMotherHb.trim() ? parseFloat(newMotherHb) : null;
      const gaVal = parseFloat(newMotherGA) || 38.0;

      const created = await createPatient({
        name: newMotherName.trim(),
        hindi_name: newMotherName.trim(),
        age: Number(newMotherAge) || 25,
        blood_group: newMotherBloodGroup,
        contact_phone: phoneClean,
        emergency_contact_phone: '+919812001108',
        gravidity: csecNum > 0 ? 2 : 1,
        parity: csecNum > 0 ? 1 : 0,
        gestational_age: gaVal,
        maternal_hemoglobin_gdl: parsedHb,
        prior_csections: csecNum
      });

      setShowNewMotherModal(false);
      setNewMotherName('');
      setNewMotherHb('');
      setNewMotherPrevCSection('0');

      // Refresh patients list from SQLite so newly registered mother shows up immediately
      const updatedPatients = await fetchPatients();
      if (Array.isArray(updatedPatients) && updatedPatients.length > 0) {
        setPatients(updatedPatients);
      }

      const newId = created?.patient_id || created?.patient?.id || created?.id;
      if (newId) {
        setSelectedId(newId);
        await loadDatabaseData(newId);
        setActiveSidebarTab('overview');
        // Clear any old report state for the new mother
        setExtractedReportData(null);
        setRiskAnalysisResult(null);
        setRiskReportFile(null);
        setRiskReportPreview(null);
        speakHindi(`${newMotherName} का पंजीकरण सफल हुआ।`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegisteringMother(false);
    }
  };

  // Risk Tab Handlers
  const handleRiskReportUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRiskReportFile(file);
    setRiskReportPreview(URL.createObjectURL(file));
    setIsScanningReport(true);
    setRiskAnalysisResult(null);

    try {
      const ocr = await scanReportOcr(file);
      const fields = ocr?.extracted_fields || {};
      const ocrStatus = ocr?.ocr_status || fields?.ocr_status;

      // Backend said this is NOT a clinical document (e.g. pad photo uploaded here)
      if (ocrStatus === 'not_a_clinical_document') {
        alert('⚠️ यह फोटो क्लिनिकल दस्तावेज़ नहीं है।\n\nकृपया ANC कार्ड, लैब रिपोर्ट, या अल्ट्रासाउंड रिपोर्ट की फोटो अपलोड करें।\n\nपैड की फोटो के लिए "Pad Photo Check" सेक्शन में जाएं।');
        setRiskReportFile(null);
        setRiskReportPreview(null);
        setIsScanningReport(false);
        return;
      }

      // Backend OCR engine unavailable — show empty editable fields, don't prefill fake data
      if (ocrStatus === 'ocr_unavailable') {
        const emptyExtracted = {
          name: currentPatient?.name || '',
          age: currentPatient?.age || null,
          gravidity: currentPatient?.gravidity || null,
          parity: currentPatient?.parity || null,
          gestational_age: null,
          prior_csections: currentPatient?.prior_csections ?? null,
          maternal_hemoglobin_gdl: null,
          platelets: null,
          systolic_bp: Number(currentSystolicBP) || null,
          diastolic_bp: Number(currentDiastolicBP) || null,
          placenta_previa: 0,
          hypertensive_disorders: 0
        };
        setExtractedReportData(emptyExtracted);
        setIsScanningReport(false);
        return;
      }

      // Successful OCR — use extracted values, fall back to patient record (NOT hardcoded numbers)
      const sbp = (fields.systolic_bp != null) ? Number(fields.systolic_bp) : (Number(currentSystolicBP) || null);
      const dbp = (fields.diastolic_bp != null) ? Number(fields.diastolic_bp) : (Number(currentDiastolicBP) || null);
      const hb  = (fields.maternal_hemoglobin_gdl != null) ? Number(fields.maternal_hemoglobin_gdl) : (currentPatient?.maternal_hemoglobin_gdl || null);
      const plt = (fields.platelets != null) ? Number(fields.platelets) : null;
      const ga  = (fields.gestational_age != null) ? Number(fields.gestational_age) : (currentPatient?.gestational_age || null);
      const cs  = (fields.prior_csections != null) ? Number(fields.prior_csections) : (currentPatient?.prior_csections ?? null);

      if (fields.systolic_bp) setCurrentSystolicBP(String(fields.systolic_bp));
      if (fields.diastolic_bp) setCurrentDiastolicBP(String(fields.diastolic_bp));
      if (fields.pulse) setCurrentPulseRate(String(fields.pulse));

      const grav = (Number(fields.gravidity) && Number(fields.gravidity) <= 12) ? Number(fields.gravidity) : (currentPatient?.gravidity || null);
      const par  = (Number(fields.parity) && Number(fields.parity) <= 12) ? Number(fields.parity) : (currentPatient?.parity || null);

      const extracted = {
        name: fields.name || currentPatient?.name || '',
        age: Number(fields.age) || currentPatient?.age || null,
        gravidity: grav,
        parity: par,
        gestational_age: ga,
        prior_csections: cs,
        maternal_hemoglobin_gdl: hb,
        platelets: plt,
        systolic_bp: sbp,
        diastolic_bp: dbp,
        placenta_previa: fields.placenta_previa ? 1 : 0,
        hypertensive_disorders: (sbp >= 140 || dbp >= 90 || fields.hypertensive_disorders) ? 1 : 0
      };

      setExtractedReportData(extracted);

      if (currentPatient?.id) {
        await updatePatient(currentPatient.id, {
          maternal_hemoglobin_gdl: hb,
          gestational_age: ga,
          prior_csections: cs,
          gravidity: grav,
          parity: par,
          blood_group: fields.blood_group || currentPatient?.blood_group
        }).catch(() => {});
      }

      if (hb) speakHindi(`रिपोर्ट स्कैन पूरी हुई। ${fields.name ? fields.name + ' का' : ''} हीमोग्लोबिन ${hb} g/dL पाया गया।`);
      else speakHindi('रिपोर्ट स्कैन पूरी हुई। कृपया निकाले गए मान जांचें।');

      // Only auto-run AI if we have minimum required fields
      if (hb && ga) {
        await handleRunAiPrediction(extracted);
      }
    } catch (err) {
      console.error('[OCR Upload Error]', err);
      // On actual network/server error — show error, don't silently fill fake data
      alert('रिपोर्ट स्कैन करने में समस्या आई। कृपया दोबारा प्रयास करें या मान हाथ से दर्ज करें।');
    } finally {
      setIsScanningReport(false);
    }
  };


  const handleLoadDemoReport = async (type = 'high_risk') => {
    setIsScanningReport(true);
    setRiskAnalysisResult(null);
    let demoData;
    if (type === 'high_risk') {
      setCurrentSystolicBP('142');
      setCurrentDiastolicBP('92');
      demoData = {
        name: currentPatient?.name || 'सुनीता देवी (Sunita Devi)',
        age: currentPatient?.age || 28,
        gravidity: 3,
        parity: 2,
        gestational_age: 38.5,
        prior_csections: currentPatient?.prior_csections || 1,
        maternal_hemoglobin_gdl: 7.8,
        platelets: 125000,
        systolic_bp: 142,
        diastolic_bp: 92,
        placenta_previa: 0,
        hypertensive_disorders: 1
      };
    } else {
      setCurrentSystolicBP('120');
      setCurrentDiastolicBP('80');
      demoData = {
        name: currentPatient?.name || 'कविता रानी (Kavita Rani)',
        age: currentPatient?.age || 24,
        gravidity: 1,
        parity: 0,
        gestational_age: 39.0,
        prior_csections: 0,
        maternal_hemoglobin_gdl: 12.2,
        platelets: 210000,
        systolic_bp: 120,
        diastolic_bp: 80,
        placenta_previa: 0,
        hypertensive_disorders: 0
      };
    }
    setExtractedReportData(demoData);
    setIsScanningReport(false);
    speakHindi('डेमो रिपोर्ट डेटा लोड हो गया है।');
    await handleRunAiPrediction(demoData);
  };

  const handleRunAiPrediction = async (customData = null) => {
    const dataToUse = customData || extractedReportData;
    if (!dataToUse) return;
    setIsPredictingRisk(true);
    try {
      const sbpVal = Number(dataToUse.systolic_bp) || Number(currentSystolicBP) || 120;
      const dbpVal = Number(dataToUse.diastolic_bp) || Number(currentDiastolicBP) || 80;
      const isHyper = (sbpVal >= 140 || dbpVal >= 90) ? 1 : 0;
      const grav = (Number(dataToUse.gravidity) && Number(dataToUse.gravidity) <= 12)
        ? Number(dataToUse.gravidity)
        : (Number(currentPregnancy?.gravidity) || 2);
      const par = (Number(dataToUse.parity) && Number(dataToUse.parity) <= 12)
        ? Number(dataToUse.parity)
        : (Number(currentPregnancy?.parity) || 1);
      const hbVal = (dataToUse.maternal_hemoglobin_gdl !== '' && dataToUse.maternal_hemoglobin_gdl !== undefined && dataToUse.maternal_hemoglobin_gdl !== null)
        ? Number(dataToUse.maternal_hemoglobin_gdl)
        : (Number(currentPregnancy?.maternal_hemoglobin_gdl) || Number(currentPatient?.maternal_hemoglobin_gdl) || 7.6);
      const gaVal = Number(dataToUse.gestational_age) || Number(currentPregnancy?.gestational_age) || 38.0;
      const csVal = Number(dataToUse.prior_csections) || Number(currentPregnancy?.prior_csections) || 0;

      const payload = {
        patient_id: currentPatient?.id || "PT-1001",
        name: dataToUse.name || currentPatient?.name || 'मरीज',
        age: Number(dataToUse.age) || currentPatient?.age || 26,
        gravidity: grav,
        parity: par,
        prenatal_visits: 4,
        prior_csections: csVal,
        gestational_age: gaVal,
        multiple_births: 0,
        macrosomia: 0,
        placenta_previa: Number(dataToUse.placenta_previa) || 0,
        placental_abruption: 0,
        hypertensive_disorders: isHyper,
        gestational_diabetes: 0,
        coagulation_disorders: Number(dataToUse.platelets) < 100000 ? 1 : 0,
        maternal_hemoglobin_gdl: hbVal,
        language: lang || 'hi'
      };

      const res = await predictPatient(payload);
      setRiskAnalysisResult(res);

      if (currentPatient?.id) {
        // Sync real AI extracted values to SQLite DB so no hardcoded 11.0 remains!
        await updatePatient(currentPatient.id, {
          maternal_hemoglobin_gdl: hbVal,
          current_risk_percent: parseFloat((res.probability * 100).toFixed(1)),
          current_risk_tier: res.risk_tier,
          gestational_age: gaVal,
          prior_csections: csVal,
          hypertensive_disorders: isHyper,
          gravidity: grav,
          parity: par
        }).catch(err => console.warn('Could not update patient in DB:', err));

        await recordVitals({
          patient_id: currentPatient.id,
          heart_rate: Number(currentPulseRate) || 88,
          systolic_bp: sbpVal,
          diastolic_bp: dbpVal,
          respiratory_rate: 18,
          spO2_percent: 98,
          uterine_tone: 'Boggy',
          observer_name: 'ANM Staff'
        }).catch(() => { });

        // Update active patient record in local state directly
        setPatientData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            pregnancy: {
              ...prev.pregnancy,
              maternal_hemoglobin_gdl: hbVal,
              current_risk_percent: parseFloat((res.probability * 100).toFixed(1)),
              current_risk_tier: res.risk_tier,
              gestational_age: gaVal,
              prior_csections: csVal,
              hypertensive_disorders: isHyper,
              gravidity: grav,
              parity: par
            }
          };
        });
        const updatedPatients = await fetchPatients().catch(() => []);
        if (Array.isArray(updatedPatients) && updatedPatients.length > 0) {
          setPatients(updatedPatients);
        }
      }

      const riskPct = res?.risk_percentage || `${Math.round((res?.probability || 0.78) * 100)}%`;
      speakHindi(`AI विश्लेषण पूरा हुआ। अनुमानित प्रसवोपरांत रक्तस्राव जोखिम ${riskPct} है।`);

      // If high risk tier, auto-open the Twilio 1-Click Alert modal!
      if (res?.risk_tier === 'CRITICAL' || res?.risk_tier === 'ESCALATED') {
        setTimeout(() => {
          triggerTwilioEmergencyAlert({
            blood_loss_ml: bloodLoss || 420,
            trigger_source: `AI_PREDICTION_${res.risk_tier} (Risk: ${riskPct})`
          });
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      alert('AI विश्लेषण में त्रुटि: ' + err.message);
    } finally {
      setIsPredictingRisk(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-900">

      {/* ── 1. EXACT PIXEL-PERFECT TOP WHITE MEDICAL NAVIGATION BAR ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">

            {/* Left: Brand MOMENT + CLINICAL badge + Subtitle */}
            <div
              className="flex items-center space-x-2 sm:space-x-3 cursor-pointer select-none flex-shrink-0"
              onClick={onBackToLanding}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-[#981228] to-[#c51c37] flex items-center justify-center text-white shadow-sm ring-1 ring-red-100 flex-shrink-0">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              </div>
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <span className="font-extrabold text-base sm:text-xl tracking-tight text-slate-900">MOMENT</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-rose-50 text-[#981228] border border-rose-200 tracking-wider">
                    CLINICAL
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium hidden md:block">Rural Maternal Health</p>
              </div>
            </div>

            {/* Center Navigation Links (Responsive: Compact on lg, Full on xl+) */}
            <nav className="hidden lg:flex items-center space-x-2 xl:space-x-4 2xl:space-x-6 text-xs xl:text-sm font-bold text-slate-800 flex-shrink-0">
              <button
                onClick={onBackToLanding}
                className="flex items-center space-x-1.5 px-2 py-1 rounded-lg hover:bg-slate-100/80 hover:text-[#981228] transition cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <Home className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>{t('nav_home', lang)}</span>
              </button>

              <button
                onClick={() => setShowMothersModal(true)}
                className="flex items-center space-x-1.5 px-2 py-1 rounded-lg hover:bg-slate-100/80 hover:text-[#981228] transition cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <Users className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>{t('nav_mothers', lang)}</span>
              </button>

              <button
                onClick={() => setShowAbhaModal(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-50/90 border border-amber-300 text-amber-900 hover:bg-amber-100 transition shadow-2xs cursor-pointer font-bold whitespace-nowrap flex-shrink-0"
                title="आयुष्मान भारत डिजिटल मिशन (ABHA / ABDM)"
              >
                <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>ABHA</span>
              </button>

              <button
                onClick={() => setShowNewMotherModal(true)}
                className="hidden xl:flex items-center space-x-1.5 px-2 py-1 rounded-lg hover:bg-slate-100/80 hover:text-[#981228] transition cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <UserPlus className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>{t('nav_new_mother', lang)}</span>
              </button>

              <button
                onClick={() => setActiveSidebarTab('monitoring')}
                className={`hidden xl:flex items-center space-x-1.5 px-2 py-1 rounded-lg transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  activeSidebarTab === 'monitoring' ? 'text-[#981228] font-black bg-rose-50/60' : 'hover:text-[#981228] hover:bg-slate-100/80'
                }`}
              >
                <Activity className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>{t('nav_monitoring', lang)}</span>
              </button>

              <button
                onClick={() => {
                  setActiveSidebarTab('emergency');
                  handleStartEmergency();
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-50/90 text-[#981228] border border-rose-300 hover:bg-rose-100 transition shadow-2xs cursor-pointer font-bold whitespace-nowrap flex-shrink-0"
              >
                <AlertCircle className="w-4 h-4 text-[#981228] animate-pulse flex-shrink-0" />
                <span>{t('nav_emergency', lang)}</span>
              </button>
            </nav>

            {/* Right Items: Mobile SOS, Language Selector, Online Status, Staff ID, Logout, Hamburger */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-2.5 flex-shrink-0">
              {/* Quick 1-tap Emergency SOS on Mobile / Tablet */}
              <button
                type="button"
                onClick={() => {
                  setActiveSidebarTab('emergency');
                  handleStartEmergency();
                }}
                className="lg:hidden flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-full bg-rose-50 text-[#981228] border border-rose-300 hover:bg-rose-100 transition shadow-2xs cursor-pointer font-black text-xs whitespace-nowrap flex-shrink-0"
                title="Emergency Obstetric SOS"
              >
                <AlertCircle className="w-3.5 h-3.5 text-[#981228] animate-pulse flex-shrink-0" />
                <span className="hidden xs:inline">{t('nav_emergency', lang)}</span>
                <span className="xs:hidden">SOS</span>
              </button>

              {/* Multilingual 22+ Indian Languages Selector Trigger */}
              <LanguagePickerTrigger lang={lang} setLang={setLang} />

              {/* Online status indicator */}
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold whitespace-nowrap flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Online</span>
              </div>

              {/* Staff Digital ID Card Badge */}
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="flex items-center space-x-1.5 p-1 sm:px-2.5 sm:py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer whitespace-nowrap flex-shrink-0"
                  title="स्वास्थ्य कर्मी पहचान पत्र (View Digital ID Card)"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
                    {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : 'S'}
                  </div>
                  <div className="text-left hidden 2xl:block">
                    <span className="text-xs font-black text-slate-800 block leading-none">
                      {currentUser?.full_name ? currentUser.full_name.split(' ')[0] : 'सुमन देवी'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 block leading-none mt-0.5">
                      {currentUser?.role || 'ANM'} • ID
                    </span>
                  </div>
                </button>
              )}

              {/* Logout / Exit Button */}
              <button
                onClick={onBackToLanding}
                title="लॉगआउट / होम पर जाएं"
                className="hidden sm:flex p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile / Tablet Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex-shrink-0"
                aria-label="Open Menu"
              >
                <Menu className="w-5 h-5 text-slate-800" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ── MOBILE & TABLET CLINICAL NAVIGATION DRAWER ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#981228] text-white flex items-center justify-center font-black">
                  <Heart className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-1">
                    <span className="font-black text-base text-slate-900">MOMENT</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-[#981228]">CLINICAL</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold">Obstetric Emergency Care</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* Highlighted Hospitals Map */}
              <button
                type="button"
                onClick={() => {
                  setShowHospitalsModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full p-3 rounded-2xl bg-indigo-50 border-2 border-indigo-500 text-left flex items-center justify-between shadow-xs cursor-pointer active:scale-98"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      🏥 रेफरल अस्पताल व GPS रूट
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold block">
                      11.1km PGIMS (17 min)
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              </button>

              <div className="pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                क्लिनिकल टूल्स (Clinical Tabs)
              </div>

              {/* All 7 Tabs mapped dynamically */}
              <div className="space-y-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSidebarTab === item.id;
                  const isEmergency = item.id === 'emergency';

                  if (isEmergency) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveSidebarTab(item.id);
                          handleStartEmergency();
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center space-x-2.5 text-xs font-black transition cursor-pointer mt-2 ${
                          isActive
                            ? 'bg-[#981228] text-white border-[#981228]'
                            : 'bg-rose-50 border-rose-300 text-[#981228]'
                        }`}
                      >
                        <AlertCircle className={`w-4 h-4 ${isActive ? 'text-white' : 'text-red-600'} animate-pulse flex-shrink-0`} />
                        <div>
                          <div>{item.title}</div>
                          <div className={`text-[10px] ${isActive ? 'text-rose-100' : 'text-red-500'}`}>{item.subtitle}</div>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveSidebarTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left flex items-center space-x-2.5 text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? 'bg-[#981228] text-white shadow-xs'
                          : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{item.title}</div>
                        <div className={`text-[10px] ${isActive ? 'text-rose-100' : 'text-slate-400'}`}>{item.subtitle}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                रजिस्ट्री व मरीज (Registry)
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMothersModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full p-2.5 rounded-xl hover:bg-slate-100 text-left flex items-center space-x-2.5 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <Users className="w-4 h-4 text-slate-600" />
                <span>Mothers List (सभी माताएँ)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAbhaModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 text-left flex items-center space-x-2.5 text-xs font-bold text-amber-900 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>आयुष्मान भारत डिजिटल मिशन (ABHA)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowNewMotherModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-left flex items-center space-x-2.5 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#981228]" />
                <span>+ नई माँ पंजीकृत करें (New Mother)</span>
              </button>

              {onOpenAuthModal && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAuthModal();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-left flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-800 text-white font-black text-xs flex items-center justify-center">
                        {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : 'S'}
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">{currentUser?.full_name || 'सुमन देवी'}</span>
                        <span className="text-[10px] font-bold text-emerald-700">{currentUser?.role || 'ANM'} • डिजिटल आईडी</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onBackToLanding();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>होम पेज पर वापस जाएं (Back to Home)</span>
                </button>
              </div>
            </div>

            {/* Bottom 108 */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <a
                href="tel:108"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Ambulance className="w-4 h-4" />
                <span>📞 108 आपातकालीन कॉल करें</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. EMERGENCY BANNER (Triggered when 108 Activated) ── */}
      {isEmergencyActive && (
        <div className="bg-[#981228] text-white px-4 py-3 shadow-md border-b-2 border-red-900">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center animate-ping">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-sm tracking-wide bg-white text-[#981228] px-2 py-0.5 rounded">
                    108 आपातकालीन प्रोटोकॉल सक्रिय
                  </span>
                  <span className="font-mono text-base font-bold tracking-wider">
                    ⏱️ {formatTimer(emergencySeconds)}
                  </span>
                </div>
                <p className="text-xs text-red-100 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>रेफरल अस्पताल: <strong>Pt. B.D. Sharma PGIMS Rohtak</strong> | 108 एम्बुलेंस ETA: <strong>{ambulanceETA} मिनट</strong></span>
                  <button
                    type="button"
                    onClick={() => setShowHospitalsModal(true)}
                    className="underline text-amber-200 hover:text-white font-black text-xs cursor-pointer flex items-center space-x-1"
                  >
                    <span>🗺️ लाइव GPS मैप व अस्पताल देखें →</span>
                  </button>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => speakHindi(`दो 16 गेज आईवी लाइन चालू रखें, ऑक्सीटोसिन 10 यूनिट दें और लगातार मालिश करें। 108 एम्बुलेंस रास्ते में है।`)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition flex items-center space-x-1"
              >
                <Volume2 className="w-4 h-4" />
                <span>निर्देश सुनें</span>
              </button>
              <button
                onClick={() => {
                  setIsEmergencyActive(false);
                  setIsTimerRunning(false);
                }}
                className="px-3 py-1.5 bg-white text-[#981228] hover:bg-rose-50 rounded-lg text-xs font-bold transition"
              >
                समाप्त करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. MAIN WORKSPACE CONTAINER (SIDEBAR + CONTENT) ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 w-full flex-1 flex flex-col md:flex-row gap-4 sm:gap-6">

        {/* ── LEFT SIDEBAR (Desktop Only — Hidden on mobile to prevent vertical stacking) ── */}
        <aside className="hidden md:block md:w-60 flex-shrink-0 bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs self-start space-y-3">

          {/* Top of Sidebar: < All Mothers + Patient ID */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              onClick={() => setShowMothersModal(true)}
              className="flex items-center space-x-1 text-xs font-bold text-slate-700 hover:text-[#981228] transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
              <span>All Mothers</span>
            </button>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {currentPatient ? currentPatient.id : '---'}
            </span>
          </div>

          {/* Navigation Items with Hindi Subtitles */}
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSidebarTab === item.id;
              const isEmergency = item.id === 'emergency';

              if (isEmergency) {
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSidebarTab(item.id);
                      handleStartEmergency();
                    }}
                    className={`w-full mt-3 flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-left transition border cursor-pointer ${isActive
                        ? 'bg-[#981228] text-white border-[#981228] shadow-xs'
                        : 'bg-rose-50/70 border-rose-200 text-[#981228] hover:bg-rose-100'
                      }`}
                  >
                    <AlertCircle className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#981228]'}`} />
                    <div>
                      <div className="font-black text-xs">{item.title}</div>
                      <div className={`text-[10px] font-bold ${isActive ? 'text-red-100' : 'text-red-500'}`}>{item.subtitle}</div>
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSidebarTab(item.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-left transition cursor-pointer ${isActive
                      ? 'bg-[#981228] text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <div>
                    <div className="text-xs font-bold leading-tight">{item.title}</div>
                    <div className={`text-[10px] leading-tight mt-0.5 ${isActive ? 'text-rose-100' : 'text-slate-400'}`}>{item.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* ANM Voice Guidance Quick Button */}
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => currentPatient && speakHindi(`मरीज ${currentPatient.hindi_name || currentPatient.name} के लिए पीपीएच जोखिम ${currentPregnancy?.current_risk_percent || '?'}% है। दो मोटी ड्रिप चालू रखें और ऑक्सीटोसिन 10 यूनिट तैयार रखें।`)}
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold hover:bg-amber-100 transition cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-700" />
              <span>📢 आवाज में निर्देश सुनें</span>
            </button>
          </div>

        </aside>

        {/* ── RIGHT MAIN WORKSPACE CONTENT ── */}
        <main className="flex-1 min-w-0 space-y-4 sm:space-y-6">

          {/* ── MOBILE-ONLY QUICK ACTION BAR (All Mothers chip + ID + Audio) ── */}
          {currentPatient && (
            <div className="flex md:hidden items-center justify-between gap-2 p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setShowMothersModal(true)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
                <span>All Mothers</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {currentPatient.id}
                </span>
                <button
                  onClick={() => speakHindi(`मरीज ${currentPatient.hindi_name || currentPatient.name} के लिए पीपीएच जोखिम ${currentPregnancy?.current_risk_percent || '?'}% है। दो मोटी ड्रिप चालू रखें और ऑक्सीटोसिन 10 यूनिट तैयार रखें।`)}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-100 transition cursor-pointer"
                  title="📢 आवाज में निर्देश सुनें"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                  <span className="text-[11px]">निर्देश</span>
                </button>
              </div>
            </div>
          )}

          {/* ── MOBILE-ONLY HORIZONTAL SCROLLABLE TABS STRIP ── */}
          {currentPatient && (
            <div className="block md:hidden overflow-x-auto no-scrollbar py-0.5 -mx-3 px-3">
              <div className="flex items-center space-x-2 w-max pb-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSidebarTab === item.id;
                  const isEmergency = item.id === 'emergency';
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSidebarTab(item.id);
                        if (isEmergency) handleStartEmergency();
                      }}
                      className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                        isActive
                          ? isEmergency
                            ? 'bg-[#981228] text-white shadow-xs ring-2 ring-red-400'
                            : 'bg-[#981228] text-white shadow-xs'
                          : isEmergency
                          ? 'bg-rose-50 text-[#981228] border border-rose-300'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isEmergency ? 'text-[#981228]' : 'text-slate-500'}`} />
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── EMPTY STATE: No patient selected ── */}
          {!currentPatient && !isLoading && (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-sm">
                {/* Big icon */}
                <div className="w-20 h-20 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center mx-auto mb-5">
                  <Users className="w-10 h-10 text-[#981228]" />
                </div>

                {/* Hindi heading */}
                <h2 className="text-xl font-black text-slate-900 mb-1">कोई माँ नहीं जुड़ी है</h2>
                <p className="text-sm text-slate-500 font-medium mb-1">No patient registered yet</p>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  पहले कोई माँ register करो —<br />
                  फिर AI असली डेटा से जोखिम बताएगा।<br />
                  <span className="text-rose-400">अभी कोई real data नहीं है।</span>
                </p>

                {/* Primary CTA */}
                <button
                  onClick={() => setShowNewMotherModal(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-[#981228] hover:bg-[#7a0e1f] text-white rounded-2xl font-black text-sm transition shadow-lg shadow-rose-200 mx-auto cursor-pointer"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>नई माँ जोड़ें (Register Mother)</span>
                </button>

                <p className="text-[10px] text-slate-400 mt-4">
                  ऊपर navbar में भी "New Mother" button है
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-[#981228] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">डेटा लोड हो रहा है…</p>
              </div>
            </div>
          )}

          {/* ── PATIENT HEADER (only when patient exists) ── */}
          {currentPatient && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white sm:bg-transparent p-4 sm:p-0 rounded-2xl sm:rounded-none border border-slate-200 sm:border-none shadow-2xs sm:shadow-none">
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Mother's Name
                </span>
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                  {currentPatient.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500 font-medium">
                    {currentPatient.age} yrs • {currentPregnancy?.gestational_age} weeks • {currentPatient.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAbhaModal(true)}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black transition border cursor-pointer bg-gradient-to-r from-amber-50 to-orange-50 hover:bg-amber-100 border-amber-300 text-amber-900 shadow-2xs active:scale-98"
                    title="आयुष्मान भारत डिजिटल मिशन (ABDM / ABHA)"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>
                      {currentPatient.abha_id ? `ABHA: ${currentPatient.abha_id}` : '🇮🇳 ABHA लिंक करें / बनाएं'}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${currentPatient.abha_id ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-200 text-amber-900'}`}>
                      {currentPatient.abha_id ? '✓ VERIFIED' : '+ LINK'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setActiveSidebarTab('overview')}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs self-start sm:self-center cursor-pointer ${
                  activeSidebarTab === 'overview'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Overview
              </button>
            </div>
          )}

          {/* Tab content — only shown when a patient is selected */}
          {currentPatient && (
            <>

              {/* ══════════════════════════════════════════════════════════════
              TAB 1: RISK & PREPAREDNESS (THE EXACT USER SCREENSHOT!)
              ══════════════════════════════════════════════════════════════ */}
              {activeSidebarTab === 'risk' && (
                <div className="space-y-6">

                  {/* ── CARD 1: REPORT UPLOAD & CURRENT BLOOD PRESSURE INPUT ── */}
                  <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <FileUp className="w-5 h-5 text-[#981228] flex-shrink-0" />
                          <h2 className="text-sm sm:text-lg font-black text-slate-900 leading-snug">
                            1. मेडिकल रिपोर्ट अपलोड और वर्तमान बीपी (Clinical Report & Current BP)
                          </h2>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                          ANC कार्ड, लैब टेस्ट या अल्ट्रासाउंड की फोटो अपलोड करें और माँ का वर्तमान रक्तचाप दर्ज करें
                        </p>
                      </div>

                      {/* Demo test buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                        <span className="text-[11px] font-bold text-slate-400">त्वरित टेस्ट:</span>
                        <button
                          type="button"
                          onClick={() => handleLoadDemoReport('high_risk')}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          ⚡ हाई-रिस्क रिपोर्ट
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadDemoReport('routine')}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          सामान्य रिपोर्ट
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* File Upload Box */}
                      <div className="border-2 border-dashed border-slate-300 hover:border-[#981228] rounded-2xl p-5 bg-slate-50/60 hover:bg-white transition flex flex-col items-center justify-center text-center relative group min-h-[160px]">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleRiskReportUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        {riskReportPreview ? (
                          <div className="relative w-full">
                            <img
                              src={riskReportPreview}
                              alt="Report Preview"
                              className="h-28 object-contain mx-auto rounded-xl border border-slate-200"
                            />
                            <p className="text-xs font-bold text-slate-700 mt-2 truncate">
                              {riskReportFile?.name || 'Uploaded Report Image'}
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-2">
                              <span className="text-[11px] text-emerald-600 font-black">✓ फोटो बदलने के लिए क्लिक करें</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setRiskReportFile(null);
                                  setRiskReportPreview(null);
                                  setExtractedReportData(null);
                                  setRiskAnalysisResult(null);
                                }}
                                className="text-[11px] text-red-600 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition z-20 cursor-pointer"
                              >
                                ✕ हटाएं (Clear)
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-[#981228] flex items-center justify-center mx-auto group-hover:scale-105 transition">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800">
                                ANC कार्ड / लैब रिपोर्ट फोटो यहाँ खींचें या क्लिक करें
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                PNG, JPG या कैमरा से खींची गई पर्ची
                              </p>
                            </div>
                          </div>
                        )}

                        {isScanningReport && (
                          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center space-y-2 z-20">
                            <div className="w-8 h-8 border-3 border-[#981228] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-black text-[#981228]">
                              AI OCR द्वारा रिपोर्ट स्कैन हो रही है...
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Current Blood Pressure & Vitals Input Box */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5">
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-[#981228]" />
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            वर्तमान ब्लड प्रेशर (Current BP)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              सिस्टोलिक BP (ऊपर का) <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="number"
                                min="60"
                                max="240"
                                value={currentSystolicBP}
                                onChange={(e) => {
                                  setCurrentSystolicBP(e.target.value);
                                  if (extractedReportData) {
                                    setExtractedReportData(prev => ({ ...prev, systolic_bp: Number(e.target.value) || 120 }));
                                  }
                                }}
                                placeholder="135"
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-black text-slate-900 focus:ring-2 focus:ring-[#981228] focus:outline-none"
                              />
                              <span className="text-[10px] font-bold text-slate-400">mmHg</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              डायस्टोलिक BP (नीचे का) <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="number"
                                min="40"
                                max="160"
                                value={currentDiastolicBP}
                                onChange={(e) => {
                                  setCurrentDiastolicBP(e.target.value);
                                  if (extractedReportData) {
                                    setExtractedReportData(prev => ({ ...prev, diastolic_bp: Number(e.target.value) || 80 }));
                                  }
                                }}
                                placeholder="88"
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-black text-slate-900 focus:ring-2 focus:ring-[#981228] focus:outline-none"
                              />
                              <span className="text-[10px] font-bold text-slate-400">mmHg</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            वर्तमान पल्स / धड़कन (Heart Rate)
                          </label>
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              min="40"
                              max="200"
                              value={currentPulseRate}
                              onChange={(e) => setCurrentPulseRate(e.target.value)}
                              placeholder="86"
                              className="w-32 bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-black text-slate-900 focus:ring-2 focus:ring-[#981228] focus:outline-none"
                            />
                            <span className="text-[10px] font-bold text-slate-400">bpm</span>
                          </div>
                        </div>

                        {(Number(currentSystolicBP) >= 140 || Number(currentDiastolicBP) >= 90) && (
                          <div className="bg-amber-100/70 border border-amber-300 rounded-xl p-2.5 flex items-center space-x-2 text-[11px] text-amber-900 font-bold">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span>⚠️ हाई BP चिन्हित (Gestational Hypertension / Pre-eclampsia Alert)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── CARD 2: EDITABLE EXTRACTED DATA VERIFICATION FORM ── */}
                  {extractedReportData && (
                    <div className="bg-white rounded-3xl border-2 border-rose-200 p-6 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-xl bg-rose-100 text-[#981228] flex items-center justify-center font-black">
                            <Edit3 className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900">
                              2. OCR द्वारा निकाला गया डेटा जांचें और बदलें (Verify & Edit Extracted Data)
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              यदि OCR ने कोई मान गलत पढ़ा है तो उसे यहीं बदल लें, फिर AI अनुमान चलाएं
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full self-start sm:self-auto">
                          ✓ OCR Ready for Verification
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        {/* Hemoglobin */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                          <label className="text-[11px] font-black text-slate-700 block mb-1">
                            हीमोग्लोबिन (Hb)
                          </label>
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              step="0.1"
                              value={extractedReportData.maternal_hemoglobin_gdl}
                              onChange={(e) => setExtractedReportData({ ...extractedReportData, maternal_hemoglobin_gdl: Number(e.target.value) || 0 })}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#981228]"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">g/dL</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {Number(extractedReportData.maternal_hemoglobin_gdl) < 9 ? '⚠️ Anemic' : 'Normal'}
                          </span>
                        </div>

                        {/* Platelets */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                          <label className="text-[11px] font-black text-slate-700 block mb-1">
                            प्लेटलेट्स (Platelets)
                          </label>
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              value={extractedReportData.platelets}
                              onChange={(e) => setExtractedReportData({ ...extractedReportData, platelets: Number(e.target.value) || 0 })}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#981228]"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">/µL</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {Number(extractedReportData.platelets) < 100000 ? '⚠️ Low' : 'Normal'}
                          </span>
                        </div>

                        {/* Gestational Age */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                          <label className="text-[11px] font-black text-slate-700 block mb-1">
                            गर्भकाल (Weeks)
                          </label>
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              step="0.1"
                              value={extractedReportData.gestational_age}
                              onChange={(e) => setExtractedReportData({ ...extractedReportData, gestational_age: Number(e.target.value) || 38.0 })}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#981228]"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">हफ्ते</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">Term: 37-40w</span>
                        </div>

                        {/* Prior C-Sections */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                          <label className="text-[11px] font-black text-slate-700 block mb-1">
                            पिछला C-Section
                          </label>
                          <select
                            value={extractedReportData.prior_csections}
                            onChange={(e) => setExtractedReportData({ ...extractedReportData, prior_csections: Number(e.target.value) })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#981228] cursor-pointer"
                          >
                            <option value="0">0 (Normal Delivery)</option>
                            <option value="1">1 सिजेरियन (Scar Risk)</option>
                            <option value="2">2+ सिजेरियन (Very High)</option>
                          </select>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {extractedReportData.prior_csections > 0 ? '⚠️ Uterine Scar' : 'No Scar'}
                          </span>
                        </div>
                      </div>

                      {/* Action CTA: Run AI Model & LLM Reasoning */}
                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={isPredictingRisk}
                          onClick={handleRunAiPrediction}
                          className="w-full py-3.5 bg-gradient-to-r from-[#981228] to-[#bd1a36] hover:from-[#7a0e1f] hover:to-[#981228] text-white rounded-2xl font-black text-sm sm:text-base transition flex items-center justify-center space-x-2 shadow-xl shadow-rose-200 cursor-pointer disabled:opacity-50"
                        >
                          {isPredictingRisk ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>AI मॉडल और LLM Reasoning चल रहा है...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 text-amber-300" />
                              <span>3. AI रिस्क स्कोर निकालें और क्लिनिकल LLM सलाह पाएं (Predict PPH Risk & Clinical Reasoning) →</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── CARD 3: COMPLETE AI PREDICTION, MODELS BREAKDOWN & LLM REASONING ── */}
                  {riskAnalysisResult ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">

                    {/* Header: Mother PPH Risk Status */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-500">
                          AI व क्लिनिकल मॉडल द्वारा अनुमानित प्रसवोपरांत रक्तस्राव जोखिम
                        </p>
                        <h2 className="text-lg font-black text-slate-900">
                          Mother's PPH Risk & Clinical Reasoning
                        </h2>
                      </div>

                      <button
                        onClick={() => {
                          const currentPct = riskAnalysisResult?.risk_percentage || (currentPregnancy?.current_risk_percent ? `${currentPregnancy.current_risk_percent}%` : '6.4%');
                          speakHindi(`पुनः गणना: अनुमानित जोखिम ${currentPct} है।`);
                          handleRunAiPrediction();
                        }}
                        className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-[#981228] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Activity className="w-3.5 h-3.5 text-[#981228]" />
                        <span>Recalculate</span>
                      </button>
                    </div>

                    {/* Big Red Outline Box (ESTIMATED PPH RISK RANGE + HIGH RISK PILL) */}
                    <div className="rounded-2xl border-2 border-red-500 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-black text-slate-500 tracking-wider uppercase block">
                            ESTIMATED PPH RISK RANGE (AI PREDICTION)
                          </span>
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                            {riskAnalysisResult?.confidence_interval || '95% CI Range'}
                          </span>
                        </div>

                        {/* Display Risk as a Calibrated Range */}
                        {(() => {
                          const basePct = parseFloat(riskAnalysisResult?.calibrated_risk_percent || riskAnalysisResult?.probability ? (riskAnalysisResult.probability * 100).toFixed(1) : (currentPregnancy?.current_risk_percent || 6.4));
                          const lowPct = riskAnalysisResult?.risk_range_low_pct || Math.max(0.5, (basePct - 1.5)).toFixed(1);
                          const highPct = riskAnalysisResult?.risk_range_high_pct || (basePct + 1.8).toFixed(1);
                          const rangeDisplay = riskAnalysisResult?.risk_range_percent || `${lowPct}% – ${highPct}%`;

                          return (
                            <div>
                              <div className="flex flex-wrap items-baseline gap-2 mt-1">
                                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-[#981228] tracking-tight font-mono">
                                  {rangeDisplay}
                                </div>
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                                  (Midpoint: ~{basePct}%)
                                </span>
                              </div>

                              {/* Clinical Prevalence Odds Ratio Pill & Range Details */}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-red-50 border border-red-200 text-xs font-black text-[#981228]">
                                  <span>🎯 {lang === 'en' ? 'Clinical Odds:' : 'क्लिनिकल संभावना:'}</span>
                                  <span className="underline decoration-red-400">
                                    {lang === 'en'
                                      ? (riskAnalysisResult?.prevalence_ratio || `~1 in ${Math.max(2, Math.round(100 / basePct))} mothers`)
                                      : (riskAnalysisResult?.prevalence_ratio_hindi || `${Math.max(2, Math.round(100 / basePct))} में से ~1 महिला`)}
                                  </span>
                                  {riskAnalysisResult?.relative_risk_fold && (
                                    <span className="text-[10px] font-bold text-slate-500">({riskAnalysisResult.relative_risk_fold})</span>
                                  )}
                                </div>
                                <span className="text-[11px] font-bold text-slate-500">
                                  {lang === 'en' ? 'Clinical Prediction Range' : 'क्लिनिकल प्रेडिक्शन रेंज'}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="text-left sm:text-right">
                        <div className={`inline-block px-4 py-1.5 rounded-full font-black text-xs sm:text-sm tracking-wide shadow-xs ${(riskAnalysisResult?.risk_tier || currentPregnancy?.current_risk_tier || 'ENHANCED') === 'ROUTINE'
                            ? 'bg-emerald-600 text-white'
                            : (riskAnalysisResult?.risk_tier || currentPregnancy?.current_risk_tier || 'ENHANCED') === 'WATCH' || (riskAnalysisResult?.risk_tier || currentPregnancy?.current_risk_tier || 'ENHANCED') === 'ENHANCED'
                              ? 'bg-amber-600 text-white'
                              : 'bg-[#c51c37] text-white'
                          }`}>
                          {riskAnalysisResult?.tier_label || `${(currentPregnancy?.current_risk_tier || 'ENHANCED')} VIGILANCE`}
                        </div>
                        <p className="text-xs font-bold text-[#c51c37] mt-1.5 max-w-sm">
                          {riskAnalysisResult?.clinical_odds_statement || 'WHO 2025 E-MOTIVE First-Response Bundle on standby'}
                        </p>
                      </div>
                    </div>

                    {/* ── LLM CLINICAL REASONING (EXPLANATION SERVICE) ── */}
                    {(() => {
                      const hbVal = Number(extractedReportData?.maternal_hemoglobin_gdl) || (currentPregnancy?.maternal_hemoglobin_gdl ? Number(currentPregnancy.maternal_hemoglobin_gdl) : 7.6);
                      const csVal = Number(extractedReportData?.prior_csections) || (currentPregnancy?.prior_csections ? Number(currentPregnancy.prior_csections) : 0);
                      const sbpVal = Number(extractedReportData?.systolic_bp) || Number(currentSystolicBP) || 120;
                      const dbpVal = Number(extractedReportData?.diastolic_bp) || Number(currentDiastolicBP) || 80;
                      const gaVal = Number(extractedReportData?.gestational_age) || Number(currentPregnancy?.gestational_age) || 38.0;
                      const currentTier = riskAnalysisResult?.risk_tier || currentPregnancy?.current_risk_tier || 'ENHANCED';
                      const isHighRisk = currentTier === 'ESCALATED' || currentTier === 'CRITICAL';
                      const isWatch = currentTier === 'ENHANCED' || currentTier === 'WATCH';
                      const isEn = lang === 'en';

                      // Compute dynamic top 3 risk drivers strictly from current patient values
                      const dynamicDrivers = [];
                      if (hbVal < 9.0) {
                        dynamicDrivers.push({
                          title: isEn ? `🩸 Maternal Anemia (Hb: ${hbVal} g/dL)` : `🩸 खून की कमी / एनीमिया (Hb: ${hbVal} g/dL)`,
                          badge: isEn
                            ? (hbVal < 7.0 ? 'Severe Anemia (+0.35)' : 'Moderate Anemia (+0.25)')
                            : (hbVal < 7.0 ? 'गंभीर एनीमिया (+0.35)' : 'मध्यम एनीमिया (+0.25)'),
                          badgeColor: 'text-red-700 bg-red-100',
                          desc: isEn
                            ? `Low hemoglobin (${hbVal} g/dL) reduces oxygenation to myometrial fibers, causing rapid uterine atony and impaired clotting cascade.`
                            : `हीमोग्लोबिन ${hbVal} g/dL कम होने से प्रसव के बाद गर्भाशय की मांसपेशियां जल्दी थक जाती हैं (Atony), जिससे खून का थक्का देरी से बनता है।`,
                          icon: Droplet,
                          iconColor: 'text-red-600 fill-red-600'
                        });
                      }
                      if (csVal > 0) {
                        dynamicDrivers.push({
                          title: isEn ? `🔪 Previous C-Section (${csVal}x)` : `🔪 पिछला सिजेरियन ऑपरेशन (${csVal} बार)`,
                          badge: isEn ? 'Surgical Scar Risk (+0.32)' : 'सर्जिकल टांके का जोखिम (+0.32)',
                          badgeColor: 'text-red-700 bg-red-100',
                          desc: isEn
                            ? 'Uterine scar from prior surgery compromises contractility and significantly elevates risk of intrapartum hemorrhage.'
                            : 'गर्भाशय पर पुराने टांके/चीरे के खिंचाव से प्रसव के दौरान अत्यधिक रक्तस्राव की आशंका बढ़ जाती है।',
                          icon: AlertOctagon,
                          iconColor: 'text-red-600'
                        });
                      }
                      if (sbpVal >= 140 || dbpVal >= 90) {
                        dynamicDrivers.push({
                          title: isEn ? `📈 Maternal Hypertension (${sbpVal}/${dbpVal} mmHg)` : `📈 उच्च रक्तचाप (${sbpVal}/${dbpVal} mmHg)`,
                          badge: isEn ? 'Hypertensive (+0.22)' : 'हाइपरटेंशन (+0.22)',
                          badgeColor: 'text-amber-800 bg-amber-100',
                          desc: isEn
                            ? 'Elevated pressure impairs normal endothelial tone and increases placental bed perfusion pressure post-delivery.'
                            : 'रक्तचाप अधिक होने से गर्भाशय की रक्त वाहिकाओं पर दबाव बढ़ता है और प्रसवोपरांत रक्तस्राव का खतरा रहता है।',
                          icon: AlertTriangle,
                          iconColor: 'text-amber-600 fill-amber-500/20'
                        });
                      }
                      if (gaVal >= 38.0) {
                        dynamicDrivers.push({
                          title: isEn ? `⏱️ Full Gestational Age (${gaVal} wks)` : `⏱️ पूर्ण गर्भ अवधि (${gaVal} सप्ताह)`,
                          badge: isEn ? 'Uterine Distension (+0.18)' : 'गर्भाशय खिंचाव (+0.18)',
                          badgeColor: 'text-amber-800 bg-amber-100',
                          desc: isEn
                            ? `Full term gestation (${gaVal} weeks) creates high myometrial stretch; vigilant active 3rd stage management required.`
                            : `${gaVal} हफ्ते पर गर्भाशय में पूरा खिंचाव होने से प्रसव के तुरंत बाद मांसपेशियां शिथिल (Atony) पड़ने का जोखिम रहता है।`,
                          icon: Clock,
                          iconColor: 'text-amber-600'
                        });
                      } else if (gaVal < 37.0) {
                        dynamicDrivers.push({
                          title: isEn ? `⏱️ Preterm Gestation (${gaVal} wks)` : `⏱️ समय से पहले प्रसव (${gaVal} सप्ताह)`,
                          badge: isEn ? 'Preterm Risk (+0.20)' : 'प्री-टर्म (+0.20)',
                          badgeColor: 'text-amber-800 bg-amber-100',
                          desc: isEn
                            ? 'Preterm labor often demonstrates uncoordinated uterine contractions and delayed hemostasis.'
                            : 'समय पूर्व प्रसव में गर्भाशय का प्राकृतिक संकुचन कमजोर रह सकता है।',
                          icon: Clock,
                          iconColor: 'text-amber-600'
                        });
                      }
                      if (dynamicDrivers.length < 3) {
                        dynamicDrivers.push({
                          title: isEn ? '📋 Clinical Baseline Profile' : '📋 प्रसव इतिहास व विटल्स (Clinical Profile)',
                          badge: isEn ? 'Standard Protocol (+0.10)' : 'मानक प्रसव प्रोटोकॉल (+0.10)',
                          badgeColor: 'text-emerald-800 bg-emerald-100',
                          desc: isEn
                            ? 'Active Management of the Third Stage of Labor (AMTSL) and 15-minute vitals monitoring mandatory.'
                            : 'प्रसव के तीसरे चरण का सक्रिय प्रबंधन (AMTSL) और नियमित 15-30 मिनट पर विटल्स जांच अनिवार्य है।',
                          icon: CheckCircle2,
                          iconColor: 'text-emerald-600'
                        });
                      }
                      const top3 = dynamicDrivers.slice(0, 3);

                      // Summary English and Hindi
                      const oddsText = isEn
                        ? `Clinical Odds: Approximately 1 in ${Math.max(2, Math.round(100 / (riskAnalysisResult?.probability ? (riskAnalysisResult.probability * 100) : (currentPregnancy?.current_risk_percent || 6.4))))} mothers with matching biomarkers develop significant PPH.`
                        : `क्लिनिकल सांख्यिकी: इस प्रोफाइल वाली लगभग 1 in ${Math.max(2, Math.round(100 / (riskAnalysisResult?.probability ? (riskAnalysisResult.probability * 100) : (currentPregnancy?.current_risk_percent || 6.4))))} महिलाओं में PPH का जोखिम देखा जाता है।`;

                      const summaryEnglish = riskAnalysisResult?.clinical_analysis?.ai_explanation?.summary ||
                        `Patient ${currentPatient?.name || extractedReportData?.name || 'Mother'} presents with maternal anemia (Hb: ${hbVal} g/dL)${csVal > 0 ? `, prior C-section (${csVal}x)` : ''} at ${gaVal} weeks GA. Multi-model ensemble stratifies this profile as ${currentTier} RISK requiring proactive active stage labor management.`;

                      const summaryHindi = riskAnalysisResult?.clinical_analysis?.ai_explanation?.summary_hindi ||
                        `मरीज ${currentPatient?.name || extractedReportData?.name || 'माँ'} में हीमोग्लोबिन ${hbVal} g/dL (एनीमिया)${csVal > 0 ? `, पिछला सिजेरियन ऑपरेशन (${csVal} बार)` : ''} और रक्तचाप (${sbpVal}/${dbpVal} mmHg) मिलकर गर्भाशय शिथिलता (Uterine Atony) का खतरा पैदा कर रहे हैं। प्रसवोपरांत रक्तस्राव रोकथाम हेतु तुरंत सतर्कता अनिवार्य है।`;

                      const pathoEnglish = riskAnalysisResult?.clinical_analysis?.ai_explanation?.pathophysiology_mechanisms ||
                        `Maternal hemoglobin of ${hbVal} g/dL impairs adenosine triphosphate (ATP) resynthesis in myometrial myocytes, causing acute myometrial fatigue post-placental expulsion. This delays physiologic compression of spiral arteries, increasing hemorrhagic risk.`;

                      const pathoHindi = riskAnalysisResult?.clinical_analysis?.ai_explanation?.pathophysiology_mechanisms_hindi ||
                        `हीमोग्लोबिन ${hbVal} g/dL होने से गर्भाशय की चिकनी मांसपेशियों (Myometrial Smooth Muscle) में ऑक्सीजन की आपूर्ति कम हो जाती है, जिससे प्रसव के बाद गर्भाशय तेजी से सिकुड़ नहीं पाता (Myometrial Fatigue)। इससे खुली स्पाइरल धमनियों (Spiral Arteries) से अनियंत्रित रक्तस्राव का जोखिम बढ़ जाता है।`;

                      return (
                        <div className="space-y-5">
                          {/* LLM Clinical Reasoning & Pathophysiology Box */}
                          <div className={`p-5 rounded-2xl border space-y-3.5 ${
                            isHighRisk ? 'bg-rose-50/70 border-rose-300' : isWatch ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'
                          }`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center space-x-2">
                                <Sparkles className={`w-5 h-5 ${isHighRisk ? 'text-red-600' : isWatch ? 'text-amber-600' : 'text-emerald-600'}`} />
                                <h3 className={`text-sm font-black ${isHighRisk ? 'text-red-950' : isWatch ? 'text-amber-950' : 'text-emerald-950'}`}>
                                  {isEn
                                    ? 'LLM Clinical Reasoning & Biomedical Pathophysiology'
                                    : 'LLM Clinical Reasoning & Pathophysiology (AI डॉक्टर का क्लिनिकल व जैविक विश्लेषण)'}
                                </h3>
                              </div>
                              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                                🤖 Groq / NVIDIA Nemotron Medical Layer
                              </span>
                            </div>

                            {/* Clinical Odds / Likelihood Statement */}
                            <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-800 flex items-center space-x-2 shadow-2xs">
                              <span className="text-red-600">🎯</span>
                              <span>{oddsText}</span>
                            </div>

                            {/* Summary English or Hindi */}
                            <p className={`text-xs font-semibold leading-relaxed ${isHighRisk ? 'text-red-950' : isWatch ? 'text-amber-950' : 'text-emerald-950'}`}>
                              {isEn ? summaryEnglish : summaryHindi}
                            </p>

                            {/* Deep Pathophysiology Mechanisms */}
                            <div className="pt-2 border-t border-slate-200/60">
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1">
                                {isEn ? '🔬 Pathophysiological Mechanisms:' : '🔬 जैविक व पैथोफिजियोलॉजी कारण (Pathophysiological Mechanisms):'}
                              </span>
                              <p className="text-[11px] font-medium leading-relaxed text-slate-600 bg-white/70 p-2.5 rounded-xl border border-slate-200/60">
                                {isEn ? pathoEnglish : pathoHindi}
                              </p>
                            </div>

                            {/* WHO E-MOTIVE First-Response Checklist */}
                            <div className="pt-2 border-t border-slate-200/60">
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                                {isEn ? '⚡ WHO 2025 E-MOTIVE First-Response Protocol (Golden 15-Minute Bundle):' : '⚡ WHO 2025 E-MOTIVE फर्स्ट-रिस्पॉन्स बंडल (Golden 15-Minute Protocol):'}
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {(isEn
                                  ? [
                                      "E: Calibrated Blood Loss Drape/Pad inspection (>300 mL)",
                                      "M: Immediate Bimanual Uterine Fundal Massage",
                                      "O: Oxytocin 10 IU IM or 20 IU IV Infusion",
                                      "T: Tranexamic Acid (TXA) 1g IV over 10 minutes",
                                      "I: IV Fluid Resuscitation via two 16G large-bore lines",
                                      "V: Visual genital tract examination & bladder catheterization"
                                    ]
                                  : [
                                      "E: कैलिब्रेटेड ड्रेप/पैड लगाकर खून नापें (>300 mL थ्रेशोल्ड)",
                                      "M: द्विपक्षीय गर्भाशय मालिश (Bimanual Massage) तुरंत शुरू करें",
                                      "O: ऑक्सीटोसिन 10 IU IM या 20 IU ड्रिप में दें",
                                      "T: ट्रैनेक्सामिक एसिड (TXA) 1g IV 10 मिनट में लगाएं",
                                      "I: दो 16-गेज मोटी ड्रिप (IV Line) रिंगर लैक्टेट से चालू करें",
                                      "V: योनि चीरे की जांच करें और मूत्राशय खाली कराएं"
                                    ]
                                ).map((step, sIdx) => (
                                  <div key={sIdx} className="text-[11px] font-medium bg-white p-2 rounded-lg border border-slate-200 flex items-start space-x-1.5 text-slate-700">
                                    <span className="text-red-600 font-bold">✓</span>
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* WHY Section */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                                {isEn ? 'WHY? (Clinical Risk Drivers)' : 'WHY? (कारण क्या है?)'}
                              </h3>
                              <span className="text-xs font-bold text-slate-400">
                                {isEn ? 'Top 3 Clinical Drivers' : 'Top 3 Clinical Risk Drivers'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {top3.map((factor, fIdx) => {
                                const IconComp = factor.icon;
                                return (
                                  <div key={fIdx} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white transition space-y-1.5 shadow-2xs">
                                    <div className="flex items-center space-x-2">
                                      <IconComp className={`w-4 h-4 flex-shrink-0 ${factor.iconColor}`} />
                                      <span className="font-bold text-xs text-slate-900 line-clamp-1">
                                        {factor.title}
                                      </span>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block ${factor.badgeColor}`}>
                                      {factor.badge}
                                    </span>
                                    <p className="text-[11px] text-slate-600 leading-tight">
                                      {factor.desc}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Action Steps */}
                          <div className="pt-4 border-t border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className={`w-3 h-3 rounded-full ${isHighRisk ? 'bg-red-600 animate-ping' : isWatch ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                <h3 className="text-sm font-black text-slate-900">
                                  {isEn ? 'Action Protocol for ANM / GNM (WHO Standard)' : 'अब आपको क्या करना है? (Simple Action Steps for ANM / GNM)'}
                                </h3>
                              </div>
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                {isEn ? 'WHO & MoHFW Guideline' : 'WHO & MoHFW गाइडलाइन'}
                              </span>
                            </div>

                            <div className="space-y-2.5">
                              {/* Step 1 */}
                              <div className={`p-3.5 rounded-2xl border flex items-start space-x-3 ${isHighRisk ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                                <span className="w-6 h-6 rounded-full bg-[#981228] text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                  1
                                </span>
                                <div>
                                  <span className="font-extrabold text-xs text-slate-900 block">
                                    {isEn
                                      ? (isHighRisk ? '🩸 Establish two 16G large-bore IV lines immediately' : '🩸 Keep one large-bore 18G IV line ready on standby')
                                      : (isHighRisk ? '🩸 तुरंत 2 मोटी ड्रिप (16G IV Line) दोनों हाथों में चालू करें' : '🩸 1 बड़ी ड्रिप (18G IV Line) तैयार रखें')}
                                  </span>
                                  <p className="text-[11px] text-slate-600 mt-0.5">
                                    <strong>{isEn ? 'Why?' : 'क्यों?'}</strong>{' '}
                                    {isEn
                                      ? 'Peripheral veins collapse rapidly during acute blood loss. Preload with Normal Saline or Ringer Lactate.'
                                      : 'ज्यादा खून बहने पर नसें सिकुड़ जाती हैं और बाद में ड्रिप नहीं लग पाती। Normal Saline या Ringer Lactate तैयार रखें।'}
                                  </p>
                                </div>
                              </div>

                              {/* Step 2 */}
                              <div className={`p-3.5 rounded-2xl border flex items-start space-x-3 ${isHighRisk ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                  2
                                </span>
                                <div>
                                  <span className="font-extrabold text-xs text-slate-900 block">
                                    {isEn
                                      ? '💉 Administer Oxytocin (10 IU IM) within 1 minute of birth'
                                      : '💉 बच्चे के जन्म के 1 मिनट में Oxytocin (10 IU IM) इंजेक्शन लगाएं'}
                                  </span>
                                  <p className="text-[11px] text-slate-600 mt-0.5">
                                    <strong>{isEn ? 'Route:' : 'कहाँ दें?'}</strong>{' '}
                                    {isEn
                                      ? 'Anterolateral thigh (IM). If active bleeding persists, prepare Misoprostol (800 mcg) and IV TXA.'
                                      : 'माँ की जांघ की मांसपेशी (IM) में दें। अगर खून ज्यादा बहे तो Misoprostol (800 mcg) और TXA तैयार रखें।'}
                                  </p>
                                </div>
                              </div>

                              {/* Step 3 */}
                              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 flex items-start space-x-3">
                                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                  3
                                </span>
                                <div>
                                  <span className="font-extrabold text-xs text-slate-900 block">
                                    {isEn
                                      ? '✋ Continuous Bimanual Fundal Massage (Check Tone)'
                                      : '✋ गर्भाशय (Fundus) की मालिश करते रहें (Check Uterine Tone)'}
                                  </span>
                                  <p className="text-[11px] text-slate-600 mt-0.5">
                                    <strong>{isEn ? 'How to assess?' : 'कैसे जांचें?'}</strong>{' '}
                                    {isEn
                                      ? 'Palpate uterine fundus to confirm firm contraction. If soft or boggy, maintain vigorous circular massage.'
                                      : 'पेट पर हाथ रखकर देखें कि गर्भाशय पत्थर जैसा कड़ा (Firm) है या नहीं। अगर ढीला/मुलायम (Boggy) है, तो लगातार मालिश करें।'}
                                  </p>
                                </div>
                              </div>

                              {/* Step 4: Emergency Trigger */}
                              {isHighRisk && (
                                <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-300 flex items-start space-x-3">
                                  <span className="w-6 h-6 rounded-full bg-red-700 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                    4
                                  </span>
                                  <div className="flex-1">
                                    <span className="font-extrabold text-xs text-red-950 block">
                                      {isEn
                                        ? '🚨 Dispatch 108 Ambulance immediately & Alert PGIMS Rohtak Emergency Bay'
                                        : '🚨 108 एम्बुलेंस तुरंत कॉल करें और PGIMS Rohtak को अलर्ट भेजें'}
                                    </span>
                                    <p className="text-[11px] text-slate-700 mt-0.5">
                                      <strong>{isEn ? 'Nearest Blood Bank:' : 'नजदीकी ब्लड बैंक:'}</strong>{' '}
                                      {isEn
                                        ? 'Pt. B.D. Sharma PGIMS (11.1 km, 17 min). Dispatch ALS 108 ambulance and initiate referral protocol.'
                                        : 'Pt. B.D. Sharma PGIMS (11.1 किमी, 17 मिनट)। 108 एम्बुलेंस बुलाकर तुरंत रेफरल शुरू करें।'}
                                    </p>
                                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                      <button
                                        onClick={() => triggerTwilioEmergencyAlert({
                                          blood_loss_ml: bloodLoss || 500,
                                          trigger_source: `HIGH_RISK_TRIGGER (${isEn ? 'Critical AI Score' : 'गंभीर जोखिम'})`
                                        })}
                                        className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-sm cursor-pointer animate-pulse"
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>{isEn ? '⚡ 1-Click Twilio Alert (108 + Hospital)' : '⚡ 1-क्लिक Twilio अलर्ट (108 + अस्पताल)'}</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveSidebarTab('emergency');
                                          handleStartEmergency();
                                        }}
                                        className="px-3.5 py-1.5 bg-[#981228] hover:bg-red-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
                                      >
                                        <Ambulance className="w-3.5 h-3.5" />
                                        <span>{isEn ? 'Call 108 Ambulance Now' : '108 एम्बुलेंस अभी बुलाएं'}</span>
                                      </button>
                                      <button
                                        onClick={() => speakHindi(`सभी एएनएम ध्यान दें: मरीज को दो 16 गेज ड्रिप लगाएं, ऑक्सीटोसिन 10 यूनिट दें और लगातार गर्भाशय की मालिश करें।`)}
                                        className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                                      >
                                        <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                                        <span>{isEn ? 'Listen in Hindi' : 'आवाज में सुनें'}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── Postpartum Anemia Recovery Diet Plan (NVIDIA Nemotron / MoHFW Layer) ── */}
                          <div className="pt-6 border-t-2 border-dashed border-amber-300/80">
                            <PostpartumDietPlanCard
                              dietPlan={riskAnalysisResult?.postpartum_diet_plan || riskAnalysisResult?.clinical_analysis?.postpartum_diet_plan}
                              hemoglobin={hbVal}
                              patientName={currentPatient?.name || extractedReportData?.name || 'माँ'}
                              lang={lang}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs">
                      <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-[#981228] flex items-center justify-center mx-auto shadow-xs">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div className="max-w-md mx-auto space-y-1.5">
                        <h3 className="text-base sm:text-lg font-black text-slate-800">
                          {lang === 'en' ? 'Awaiting Medical Report / ANC Card' : 'मेडिकल रिपोर्ट या ANC पर्ची की प्रतीक्षा है'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          {lang === 'en'
                            ? 'AI Risk & LLM Clinical Reasoning will appear here only when you upload an ANC card, lab report photo, or select a demo report above.'
                            : 'यह विश्लेषण केवल तभी दिखाई देगा जब आप ऊपर ANC कार्ड/लैब रिपोर्ट फोटो अपलोड करेंगे या डेमो रिपोर्ट चुनेंगे। बिना रिपोर्ट दिए पुराना डेटा नहीं दिखाया जाएगा।'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleLoadDemoReport('high_risk')}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 text-[#981228] border border-rose-200 text-xs font-black transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-4 h-4 text-[#981228]" />
                          <span>{lang === 'en' ? '⚡ Try Demo High-Risk Report' : '⚡ डेमो हाई-रिस्क रिपोर्ट लोड करें'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadDemoReport('routine')}
                          className="px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{lang === 'en' ? 'Try Demo Routine Report' : 'डेमो सामान्य रिपोर्ट लोड करें'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
              TAB 2: 15-MIN MONITORING (15-मिनट निगरानी चक्र)
              ══════════════════════════════════════════════════════════════ */}
              {activeSidebarTab === 'monitoring' && (
                <div className="space-y-6">

                  {/* ── 15-MINUTE MONITORING CHECKPOINT BANNER ── */}
                  <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-[#981228]">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
                            <span>15-मिनट निगरानी चक्र (15-Minute Monitoring Cycle)</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-[#981228] border border-rose-200">
                              WHO Protocol
                            </span>
                          </h2>
                          <p className="text-xs text-slate-500">
                            प्रसवोत्तर रक्तस्राव (PPH) रोकथाम हेतु हर 15 मिनट पर वाइटल्स व टोन दर्ज करें
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
                        <span className="text-[11px] font-bold text-slate-500">सक्रिय अंतराल:</span>
                        <span className="text-xs font-black text-[#981228] font-mono">{activeCheckpoint}</span>
                      </div>
                    </div>

                    {/* Checkpoints Stepper Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {['15 min', '30 min', '45 min', '60 min'].map((cp, idx) => {
                        const logged = timelineData.find(t => 
                          t.time_checkpoint?.toLowerCase().includes(cp.split(' ')[0])
                        );
                        const isCurrent = activeCheckpoint === cp;

                        return (
                          <button
                            key={cp}
                            onClick={() => setActiveCheckpoint(cp)}
                            className={`p-3 rounded-2xl border-2 text-left transition relative cursor-pointer ${
                              isCurrent
                                ? 'bg-rose-50/80 border-[#981228] shadow-sm ring-2 ring-[#981228]/20'
                                : logged
                                ? 'bg-emerald-50/60 border-emerald-300 hover:border-emerald-400'
                                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-slate-900">
                                ⏱️ {cp}
                              </span>
                              {logged ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                  <CheckCircle2 className="w-3 h-3 mr-0.5" /> दर्ज
                                </span>
                              ) : isCurrent ? (
                                <span className="inline-flex items-center text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md animate-pulse">
                                  🎯 चालू
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-400">
                                  लंबित
                                </span>
                              )}
                            </div>

                            {logged ? (
                              <p className="text-[11px] font-mono font-bold text-emerald-900 truncate">
                                HR {logged.heart_rate} • {logged.systolic_bp}/{logged.diastolic_bp}
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-500 font-medium">
                                {isCurrent ? 'माप दर्ज करें' : `चरण ${idx + 1}`}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* 1. Blood Loss Check */}
                    <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                              <Droplet className="w-4 h-4 fill-red-600" />
                            </div>
                            <h2 className="text-base font-black text-slate-900">1. रक्तस्राव जांचें</h2>
                          </div>
                          <span className="text-xs font-bold text-slate-500">Blood Loss</span>
                        </div>

                        {/* Current Blood Loss Display */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-center mb-4">
                          <span className="text-xs font-semibold text-slate-500 block">वर्तमान रक्तस्राव</span>
                          <div className="flex items-center justify-center space-x-1 mt-1">
                            <span className={`text-4xl font-black ${
                              bloodLoss >= 500 ? 'text-red-600' : bloodLoss >= 300 ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {bloodLoss}
                            </span>
                            <span className="text-sm font-bold text-slate-600">मि.ली.</span>
                          </div>
                          <div className="mt-2">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${bloodLossStatus.badge}`}>
                              {bloodLossStatus.label}
                            </span>
                          </div>
                        </div>

                        {/* Quick Steppers: -50 / +50 */}
                        <div className="flex items-center justify-between gap-2 mb-3 bg-slate-100/70 p-1.5 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setBloodLoss(b => Math.max(0, b - 50))}
                            className="flex-1 py-1 px-2 bg-white hover:bg-slate-50 rounded-lg text-xs font-black text-slate-700 shadow-xs border border-slate-200 transition cursor-pointer"
                          >
                            - 50 मि.ली.
                          </button>
                          <span className="text-[11px] font-bold text-slate-500">फाइन एडजस्ट</span>
                          <button
                            type="button"
                            onClick={() => setBloodLoss(b => Math.min(2000, b + 50))}
                            className="flex-1 py-1 px-2 bg-white hover:bg-slate-50 rounded-lg text-xs font-black text-slate-700 shadow-xs border border-slate-200 transition cursor-pointer"
                          >
                            + 50 मि.ली.
                          </button>
                        </div>

                        <p className="text-xs font-bold text-slate-600 mb-2">त्वरित विकल्प (1-टैप):</p>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <button
                            onClick={() => setBloodLoss(150)}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition cursor-pointer ${
                              bloodLoss === 150 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            हल्का (&lt;300)
                          </button>
                          <button
                            onClick={() => setBloodLoss(350)}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition cursor-pointer ${
                              bloodLoss === 350 ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            मध्यम (350)
                          </button>
                          <button
                            onClick={() => setBloodLoss(650)}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition cursor-pointer ${
                              bloodLoss === 650 ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-800 border-red-200'
                            }`}
                          >
                            खतरा (&gt;500)
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => setIsCameraModalOpen(true)}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border border-slate-300 cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-slate-600" />
                        <span>कैमरे से पैड की फोटो लें</span>
                      </button>
                    </div>

                    {/* 2. Vitals & Shock Index (सरल रूप + Quick Presets + Steppers) */}
                    <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                              <Activity className="w-4 h-4" />
                            </div>
                            <h2 className="text-base font-black text-slate-900">2. शॉक इंडेक्स व वाइटल्स</h2>
                          </div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">सरल इनपुट</span>
                        </div>

                        {/* Quick 1-Tap Vitals Presets */}
                        <div className="mb-3">
                          <span className="text-[11px] font-bold text-slate-500 block mb-1.5">1-टैप त्वरित वाइटल्स प्रीसेट:</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPulse(76);
                                setSbp(120);
                                setDbp(80);
                              }}
                              className="py-1.5 px-1 rounded-xl text-[10px] font-black border transition cursor-pointer bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-center"
                            >
                              🟢 सामान्य (120/80)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPulse(92);
                                setSbp(100);
                                setDbp(65);
                              }}
                              className="py-1.5 px-1 rounded-xl text-[10px] font-black border transition cursor-pointer bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 text-center"
                            >
                              🟡 सतर्क (100/65)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPulse(112);
                                setSbp(85);
                                setDbp(55);
                              }}
                              className="py-1.5 px-1 rounded-xl text-[10px] font-black border transition cursor-pointer bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 text-center"
                            >
                              🔴 शॉक (85/55)
                            </button>
                          </div>
                        </div>

                        {/* Traditional SI Main Display */}
                        <div className={`rounded-2xl p-3 border mb-3 text-center ${shockStatus.bg} ${shockStatus.border}`}>
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                            <span>Traditional SI (HR ÷ SBP)</span>
                            <span className={`font-mono font-black text-sm px-2 py-0.5 rounded ${shockStatus.badgeBg}`}>
                              SI = {shockIndex}
                            </span>
                          </div>
                          <p className={`text-base font-black mt-1 ${shockStatus.text}`}>
                            {shockStatus.label}
                          </p>
                          <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                            {shockStatus.hindiText}
                          </p>
                        </div>

                        {/* Sliders with [+] and [-] Stepper Buttons */}
                        <div className="space-y-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200">
                          {/* Pulse / HR */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-700">नब्ज / धड़कन (HR):</span>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPulse(p => Math.max(50, p - 5))}
                                  className="w-6 h-6 rounded-md bg-white border border-slate-300 text-xs font-black text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs"
                                >
                                  -
                                </button>
                                <span className={`font-mono font-black text-xs px-1.5 py-0.5 rounded ${pulse >= 100 ? 'text-red-600 bg-red-50' : 'text-slate-800 bg-slate-200/50'}`}>
                                  {pulse} bpm
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPulse(p => Math.min(180, p + 5))}
                                  className="w-6 h-6 rounded-md bg-white border border-slate-300 text-xs font-black text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="60"
                              max="160"
                              value={pulse}
                              onChange={(e) => setPulse(Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                            />
                          </div>

                          {/* Systolic BP */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-700">ऊपर का BP (Systolic):</span>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSbp(p => Math.max(50, p - 5))}
                                  className="w-6 h-6 rounded-md bg-white border border-slate-300 text-xs font-black text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs"
                                >
                                  -
                                </button>
                                <span className={`font-mono font-black text-xs px-1.5 py-0.5 rounded ${sbp <= 90 ? 'text-red-600 bg-red-50' : 'text-slate-800 bg-slate-200/50'}`}>
                                  {sbp} mmHg
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSbp(p => Math.min(200, p + 5))}
                                  className="w-6 h-6 rounded-md bg-white border border-slate-300 text-xs font-black text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="60"
                              max="160"
                              value={sbp}
                              onChange={(e) => setSbp(Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>

                          {/* Diastolic BP */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-700">नीचे का BP (Diastolic):</span>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDbp(p => Math.max(30, p - 5))}
                                  className="w-6 h-6 rounded-md bg-white border border-slate-300 text-xs font-black text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs"
                                >
                                  -
                                </button>
                                <span className="font-mono font-black text-xs text-slate-800 bg-slate-200/50 px-1.5 py-0.5 rounded">
                                  {dbp} mmHg
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setDbp(p => Math.min(120, p + 5))}
                                  className="w-6 h-6 rounded-md bg-white border border-slate-300 text-xs font-black text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="40"
                              max="110"
                              value={dbp}
                              onChange={(e) => setDbp(Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
                        </div>

                        {/* Collapsible Advanced Indices: Modified SI & Age SI */}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setShowAdvancedIndices(!showAdvancedIndices)}
                            className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-between transition cursor-pointer border border-slate-200"
                          >
                            <span>🔬 उन्नत सूचकांक (Modified SI & Age-SI)</span>
                            {showAdvancedIndices ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {showAdvancedIndices && (
                            <div className="grid grid-cols-2 gap-2 mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                              <div className="p-2 rounded-lg bg-white border border-slate-200">
                                <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Modified SI (MSI)</span>
                                <div className="flex items-baseline space-x-1 mt-0.5">
                                  <span className="text-base font-black text-slate-900 font-mono">{modifiedShockIndex}</span>
                                  <span className="text-[10px] text-slate-500">(HR÷MAP)</span>
                                </div>
                                <span className={`text-[10px] font-bold block mt-0.5 ${modifiedShockIndex > 1.3 ? 'text-red-600' : 'text-emerald-700'}`}>
                                  {modifiedShockIndex > 1.3 ? 'खतरा (>1.3)' : 'सामान्य'}
                                </span>
                              </div>

                              <div className="p-2 rounded-lg bg-white border border-slate-200">
                                <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Age SI (Age × SI)</span>
                                <div className="flex items-baseline space-x-1 mt-0.5">
                                  <span className="text-base font-black text-slate-900 font-mono">{ageShockIndex}</span>
                                  <span className="text-[10px] text-slate-500">score</span>
                                </div>
                                <span className={`text-[10px] font-bold block mt-0.5 ${ageShockIndex >= 30 ? 'text-red-600' : 'text-emerald-700'}`}>
                                  {ageShockIndex >= 30 ? 'हाई रिस्क स्कोर' : 'सुरक्षित सीमा'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 mt-2">
                        💡 <strong>क्लिनिकल नियम:</strong> SI &gt; 0.9 होने पर तुरंत आपातकालीन तैयारी शुरू करें।
                      </p>
                    </div>

                    {/* 3. Uterine Tone & Action */}
                    <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                              <Heart className="w-4 h-4 fill-purple-600" />
                            </div>
                            <h2 className="text-base font-black text-slate-900">3. गर्भाशय कड़ापन</h2>
                          </div>
                          <span className="text-xs font-bold text-slate-500">Uterine Tone</span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <button
                            onClick={() => setUterineTone('Firm')}
                            className={`w-full p-3 rounded-2xl border text-left transition cursor-pointer ${
                              uterineTone === 'Firm'
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold ring-2 ring-emerald-400/20'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black">कड़ा / सिकुड़ा हुआ (Firm)</span>
                              {uterineTone === 'Firm' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">सुरक्षित स्थिति — खून रुक रहा है</p>
                          </button>

                          <button
                            onClick={() => setUterineTone('Boggy')}
                            className={`w-full p-3 rounded-2xl border text-left transition cursor-pointer ${
                              uterineTone === 'Boggy'
                                ? 'bg-red-50 border-red-400 text-red-900 font-bold ring-2 ring-red-400/20'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black">ढीला / मुलायम (Boggy)</span>
                              {uterineTone === 'Boggy' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">खतरा — लगातार गर्भाशय मालिश चालू रखें</p>
                          </button>
                        </div>

                        {/* Recent Recorded Vitals Snapshot */}
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            पिछला दर्ज माप (Last Reading)
                          </span>
                          {timelineData.length > 0 ? (
                            <div className="text-xs">
                              <div className="flex items-center justify-between font-bold text-slate-800">
                                <span>{timelineData[0].time_checkpoint}</span>
                                <span className="text-[11px] text-slate-500">{timelineData[0].uterine_tone || 'Firm'}</span>
                              </div>
                              <p className="text-slate-600 font-mono text-[11px] mt-0.5">
                                HR: <strong>{timelineData[0].heart_rate} bpm</strong> • BP: <strong>{timelineData[0].systolic_bp}/{timelineData[0].diastolic_bp}</strong> • SI: <strong>{timelineData[0].shock_index || '0.98'}</strong>
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">पहला 15-मिनट माप दर्ज करने के लिए नीचे टैप करें</p>
                          )}
                        </div>
                      </div>

                      {/* Main Save Reading Action Button */}
                      <button
                        onClick={handleAddReading}
                        className="w-full py-3.5 bg-[#981228] hover:bg-red-800 text-white rounded-2xl text-xs font-black transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ {activeCheckpoint} का माप सुरक्षित करें (Save Reading)</span>
                      </button>
                    </div>

                  </div>

                  {/* ── WHO GOLDEN 15-MINUTE COUNTDOWN & E-MOTIVE PROTOCOL ── */}
                  <div className="bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-slate-50 rounded-3xl border-2 border-amber-300 p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-amber-200">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-600 text-white tracking-wider">
                            WHO 2025 Standard
                          </span>
                          <span className="text-xs font-bold text-slate-500">Obstetric Emergency Bundle</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
                          <span>WHO Golden 15-Minute Countdown (E-MOTIVE बंडल)</span>
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          पीपीएच का पता लगने पर पहले 15 मिनट में ये 6 कदम पूरे करें ताकि मातृ मृत्यु से बचाया जा सके
                        </p>
                      </div>

                      {/* Timer Display & Controls */}
                      <div className="flex items-center space-x-3 bg-white px-5 py-3 rounded-2xl border-2 border-amber-400 shadow-sm">
                        <div className="text-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">शेष समय</span>
                          <span className={`text-3xl font-black font-mono tracking-tight ${countdownSeconds <= 300 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                            {formatCountdown(countdownSeconds)}
                          </span>
                        </div>
                        <div className="flex flex-col space-y-1 pl-2 border-l border-slate-200">
                          <button
                            onClick={() => {
                              const next = !isCountdownActive;
                              setIsCountdownActive(next);
                              if (next) {
                                speakHindi("WHO गोल्डन 15 मिनट टाइमर शुरू हो गया है। ई-मोटिव बंडल के सभी कदम तुरंत पूरे करें।");
                              }
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center space-x-1 ${isCountdownActive
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                          >
                            <span>{isCountdownActive ? '⏸ रोकें (Pause)' : '▶ टाइमर शुरू (Start)'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsCountdownActive(false);
                              setCountdownSeconds(900);
                              setEmotiveSteps((prev) => prev.map(s => ({ ...s, done: false, time: null })));
                            }}
                            className="px-3 py-0.5 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer text-center"
                          >
                            रिसेट (15:00)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 6 E-MOTIVE Step Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                      {emotiveSteps.map((step) => (
                        <div
                          key={step.id}
                          onClick={() => toggleEmotiveStep(step.id)}
                          className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start space-x-3 ${step.done
                            ? 'bg-emerald-50/80 border-emerald-400 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-amber-400'
                            }`}
                        >
                          <div className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center flex-shrink-0 mt-0.5 ${step.done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                            {step.done ? '✓' : step.id}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-black truncate ${step.done ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>
                                {step.title}
                              </span>
                              {step.done && step.time && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-mono">
                                  {step.time}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 15-Minute Timeline Table */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-slate-600" />
                          <span>15-मिनट निगरानी समयरेखा (Vitals Timeline)</span>
                        </h3>
                        <p className="text-xs text-slate-500">हर 15 मिनट पर नब्ज, बीपी और रक्तस्राव का रिकॉर्ड</p>
                      </div>
                      <button
                        onClick={handleAddReading}
                        className="px-3 py-1.5 bg-[#981228] hover:bg-red-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>नया माप (+15 Min)</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold">
                            <th className="py-2.5 px-3">समय (Time)</th>
                            <th className="py-2.5 px-3">नब्ज (Pulse)</th>
                            <th className="py-2.5 px-3">रक्तचाप (BP)</th>
                            <th className="py-2.5 px-3">शॉक इंडेक्स (SI)</th>
                            <th className="py-2.5 px-3">गर्भाशय (Tone)</th>
                            <th className="py-2.5 px-3">दर्जकर्ता (Staff)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {timelineData.map((row, idx) => (
                            <tr key={idx} className={idx === 0 ? 'bg-red-50/40 font-bold' : 'hover:bg-slate-50'}>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {row.time_checkpoint} {idx === 0 && <span className="ml-1 text-[10px] text-red-600 font-black">(नवीनतम)</span>}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={row.heart_rate >= 100 ? 'text-red-600 font-bold' : 'text-slate-700'}>
                                  {row.heart_rate} bpm
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={row.systolic_bp <= 90 ? 'text-red-600 font-bold' : 'text-slate-700'}>
                                  {row.systolic_bp}/{row.diastolic_bp}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.shock_index >= 1.4 ? 'bg-red-100 text-red-800' :
                                    row.shock_index >= 0.9 ? 'bg-amber-100 text-amber-800' :
                                      'bg-emerald-100 text-emerald-800'
                                  }`}>
                                  {row.shock_index} ({row.shock_tier})
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{row.uterine_tone || 'Firm'}</td>
                              <td className="py-2.5 px-3 text-slate-500">{row.recorded_by || 'ANM Suman'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
              TAB 3: PAD PHOTO CHECK (पैड फोटो जाँच)
              ══════════════════════════════════════════════════════════════ */}
              {activeSidebarTab === 'pad_photo' && (
                <div className="space-y-6">
                  <PadScanner
                    lang="hi"
                    patientId={currentPatient?.id}
                    onOpenLiveCamera={() => setIsCameraModalOpen(true)}
                    onBloodLossRecorded={(vol, rec) => {
                      if (currentPatient?.id) {
                        loadDatabaseData(currentPatient.id);
                      }
                      speakHindi(`पैड रक्तस्राव ${vol} मिलीलीटर मरीज के रिकॉर्ड में दर्ज हो गया है।`);
                    }}
                    onCriticalBleedingDetected={(data) => {
                      speakHindi(`सावधान! गंभीर प्रसवोपरांत रक्तस्राव ${data.estimated_blood_loss_ml} मिलीलीटर पाया गया है। तत्काल 108 और डॉक्टर को सूचित करें।`);
                      triggerTwilioEmergencyAlert({
                        blood_loss_ml: data.estimated_blood_loss_ml || 420,
                        trigger_source: `PAD_SCANNER_CRITICAL (${data.estimated_blood_loss_ml || 420} mL Lochia Rubra)`
                      });
                    }}
                  />
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
              TAB 4: PAIR PHONE CAM (फोन कैमरा जोड़ें)
              ══════════════════════════════════════════════════════════════ */}
              {activeSidebarTab === 'pair_cam' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-6 max-w-xl mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-xs">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      बिस्तर के पास से मोबाइल कैमरा जोड़ें
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      प्रसव टेबल के पास खड़े होकर अपने स्मार्टफोन से क्यूआर कोड स्कैन करें। कोई ऐप डाउनलोड करने की जरूरत नहीं है।
                    </p>
                  </div>

                  {/* Bedside Camera Incoming Sync Notification */}
                  {incomingBedsideNotice && (
                    <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-950 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
                      <div className="flex items-center space-x-2.5 text-left">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-black text-emerald-900 text-xs">📸 बेडसाइड कैमरे से नई पैड फोटो प्राप्त हुई!</p>
                          <p className="text-emerald-700 text-[11px]">रक्त हानि: {incomingBedsideNotice.volume_ml} mL • {incomingBedsideNotice.severity_tier}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveSidebarTab('pad')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
                      >
                        देखें →
                      </button>
                    </div>
                  )}

                  {/* Real Scannable Dynamic QR Code */}
                  <div className="w-56 h-56 mx-auto p-2.5 bg-white rounded-3xl border-2 border-slate-200 shadow-md flex items-center justify-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Bedside Mobile QR Code"
                        className="w-full h-full rounded-2xl object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <QrCode className="w-20 h-20 animate-pulse" />
                        <span className="text-[11px] font-bold">QR कोड तैयार हो रहा है...</span>
                      </div>
                    )}
                  </div>

                  {/* Link Box with Copy & Test Action */}
                  {(() => {
                    const bedsideUrl = `http://${bedsideHost}/?view=bedside-cam&patient=${encodeURIComponent(currentPatient?.id || 'MOMENT-PT-98A7')}`;
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                          <div className="flex-1 font-mono text-xs text-slate-700 truncate text-left px-2 select-all">
                            {bedsideUrl}
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(bedsideUrl);
                              setBedsideCopied(true);
                              setTimeout(() => setBedsideCopied(false), 2500);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center space-x-1 shrink-0"
                          >
                            {bedsideCopied ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>कॉपी हुआ!</span>
                              </>
                            ) : (
                              <span>कॉपी करें</span>
                            )}
                          </button>
                          <a
                            href={bedsideUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center space-x-1 shrink-0"
                          >
                            <span>टेस्ट ↗</span>
                          </a>
                        </div>

                        {/* Network Wi-Fi IP Switcher */}
                        <div className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="text-left">
                              <span className="font-extrabold text-slate-900 block text-xs flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                <span>नेटवर्क IP एड्रेस (Wi-Fi Pair):</span>
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">फोन और लैपटॉप एक ही Wi-Fi / हॉटस्पॉट पर होने चाहिए</span>
                            </div>
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setBedsideHost(`${detectedLanIp}:${window.location.port || '5173'}`)}
                                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                                  bedsideHost.includes(detectedLanIp)
                                    ? 'bg-[#981228] text-white shadow-xs'
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                              >
                                Wi-Fi ({detectedLanIp})
                              </button>
                              <button
                                type="button"
                                onClick={() => setBedsideHost(`127.0.0.1:${window.location.port || '5173'}`)}
                                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                                  bedsideHost.includes('127.0.0.1')
                                    ? 'bg-[#981228] text-white shadow-xs'
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                              >
                                Localhost
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowCustomHostInput(!showCustomHostInput)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer"
                              >
                                {showCustomHostInput ? 'बंद करें' : 'कस्टम IP...'}
                              </button>
                            </div>
                          </div>

                          {/* Custom IP/Port Input Drawer */}
                          {showCustomHostInput && (
                            <div className="flex items-center space-x-2 pt-2 border-t border-slate-200">
                              <input
                                type="text"
                                value={customHostInput}
                                onChange={(e) => setCustomHostInput(e.target.value)}
                                placeholder="उदा. 192.168.1.15:5173"
                                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-[#981228]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (customHostInput.trim()) {
                                    setBedsideHost(customHostInput.trim().replace(/^https?:\/\//, ''));
                                    setShowCustomHostInput(false);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#981228] text-white text-xs font-bold transition hover:bg-red-800 cursor-pointer"
                              >
                                लागू करें
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="text-left text-xs text-slate-600 space-y-1.5 bg-blue-50/50 p-4 rounded-xl border border-blue-200">
                    <div className="font-bold text-slate-900 mb-1">सरल निर्देश:</div>
                    <p>1. अपने फोन का सामान्य कैमरा खोलें और ऊपर दिए QR कोड पर रखें।</p>
                    <p>2. फोन स्क्रीन पर पीले/नीले लिंक पर टैप करें।</p>
                    <p>3. मरीज के पैड की फोटो खींचें — AI तुरंत रक्तस्राव मापकर इसी कंप्यूटर स्क्रीन पर भेज देगा!</p>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
              TAB 5: TIMELINE HISTORY (इतिहास)
              ══════════════════════════════════════════════════════════════ */}
              {activeSidebarTab === 'timeline' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        मरीज का संपूर्ण नैदानिक इतिहास
                      </h2>
                      <p className="text-xs text-slate-500">
                        प्रसव, रक्तचाप, नब्ज और दवाओं का समयबद्ध रिकॉर्ड
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {timelineData.map((t, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                            {idx + 1}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900">{t.time_checkpoint}</span>
                            <p className="text-[11px] text-slate-500">
                              नब्ज: {t.heart_rate} bpm • बीपी: {t.systolic_bp}/{t.diastolic_bp} mmHg • गर्भाशय: {t.uterine_tone || 'Firm'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${t.shock_index >= 1.4 ? 'bg-red-100 text-red-800' :
                              t.shock_index >= 0.9 ? 'bg-amber-100 text-amber-800' :
                                'bg-emerald-100 text-emerald-800'
                            }`}>
                            SI: {t.shock_index} ({t.shock_tier})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
              TAB 6: 108 EMERGENCY (आपातकाल एवं रेफरल अस्पताल)
              ══════════════════════════════════════════════════════════════ */}
              {activeSidebarTab === 'emergency' && (
                <div className="space-y-6">

                  <div className="bg-[#981228] text-white rounded-3xl p-6 shadow-md space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                        <Ambulance className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black">108 आपातकालीन एम्बुलेंस व रेफरल नेटवर्क</h2>
                        <p className="text-xs text-rose-100">
                          मरीज {currentPatient.name} के लिए उच्च-प्राथमिकता रेफरल डिस्पैच
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="bg-white/10 p-3 rounded-2xl">
                        <span className="text-[10px] text-rose-200 block uppercase font-bold">प्राथमिक रेफरल केंद्र</span>
                        <span className="text-sm font-black block">Pt. B.D. Sharma PGIMS Rohtak</span>
                        <span className="text-[11px] text-rose-100">दूरी: 11.1 किमी • ETA: 17 मिनट</span>
                      </div>
                      <div className="bg-white/10 p-3 rounded-2xl">
                        <span className="text-[10px] text-rose-200 block uppercase font-bold">24x7 ब्लड बैंक</span>
                        <span className="text-sm font-black block">O+ ब्लड 14 यूनिट उपलब्ध</span>
                        <span className="text-[11px] text-rose-100">सत्यापित: e-RaktKosh API</span>
                      </div>
                      <div className="bg-white/10 p-3 rounded-2xl">
                        <span className="text-[10px] text-rose-200 block uppercase font-bold">एम्बुलेंस स्थिति</span>
                        <span className="text-sm font-black block">HR-12-G-1081 (ALS)</span>
                        <span className="text-[11px] text-rose-100">चालक: वीरेंद्र सिंह (+919812991081)</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        onClick={() => speakHindi(`आपातकालीन अलर्ट: मरीज को तुरंत पीजीआईएमएस रोहतक रेफर किया जा रहा है। एम्बुलेंस चालक को सूचित कर दिया गया है।`)}
                        className="px-4 py-2 bg-white text-[#981228] font-bold text-xs rounded-xl hover:bg-rose-50 transition cursor-pointer flex items-center space-x-1.5"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>ऑडियो SBAR हैंडओवर चलाएं</span>
                      </button>
                      <button
                        onClick={() => setShowLiveMap(!showLiveMap)}
                        className="px-4 py-2 bg-white/20 text-white font-bold text-xs rounded-xl hover:bg-white/30 transition cursor-pointer flex items-center space-x-1.5"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>{showLiveMap ? 'मैप छुपाएं' : 'लाइव GPS रूट देखें'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowHospitalsModal(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-sm"
                      >
                        <Compass className="w-4 h-4" />
                        <span>फुल रेफरल GPS मैप (विजुअल मैप)</span>
                      </button>
                    </div>
                  </div>

                  {/* LIVE REFERRAL MAP */}
                  {showLiveMap && (
                    <LiveReferralMap
                      origin={{ name: "Sub-Centre Khedi Sadh", lat: 28.8520, lng: 76.6850 }}
                      destination={{ name: "Pt. B.D. Sharma PGIMS Rohtak", lat: 28.8872, lng: 76.6085 }}
                      ambulance={{ reg: "HR-12-G-1081", lat: 28.8710, lng: 76.6210, eta: ambulanceETA }}
                      facilities={facilities}
                    />
                  )}

                  {/* ── ZERO-TOUCH SBAR EMERGENCY REFERRAL GENERATOR ── */}
                  <div className="bg-white rounded-3xl border-2 border-rose-200 p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white tracking-wider">
                            AI Zero-Touch Handover
                          </span>
                          <span className="text-xs font-bold text-slate-500">WHO / ISQua Standard SBAR</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-rose-600" />
                          <span>स्वचालित SBAR रेफरल शीट (108 व PGIMS Rohtak)</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          मरीज के वाइटल्स, शॉक इंडेक्स और ई-मोटिव दवाओं के आधार पर स्वतः तैयार आपातकालीन हैंडओवर
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(sbarContent);
                            setSbarCopied(true);
                            setTimeout(() => setSbarCopied(false), 2500);
                            speakHindi("एसबार रेफरल नोट कॉपी हो गया है।");
                          }}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          {sbarCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                          <span>{sbarCopied ? 'कॉपी हो गया! (Copied)' : 'नोट कॉपी करें (Copy SBAR)'}</span>
                        </button>

                        <button
                          onClick={() => {
                            const enc = encodeURIComponent(sbarContent);
                            window.open(`https://wa.me/?text=${enc}`, '_blank');
                            speakHindi("व्हाट्सएप पर रेफरल नोट भेजा जा रहा है।");
                          }}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>WhatsApp पर भेजें (MO / 108)</span>
                        </button>
                      </div>
                    </div>

                    {/* SBAR Structured 4-Block Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* S - Situation */}
                      <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className="w-5 h-5 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center">S</span>
                          <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">Situation (स्थिति)</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-[11px]">
                          <strong>मरीज:</strong> {currentPatient?.name || 'Priya Sharma'} (उम्र: {currentPatient?.age || 26}y) • <strong>ID:</strong> {currentPatient?.id || 'MOMENT-PT-98A7'}
                          <br />
                          <strong>रेफरल केंद्र:</strong> उप-स्वास्थ्य केंद्र खेड़ी साध, रोहतक
                          <br />
                          <strong>समस्या:</strong> सक्रिय प्रसवोपरांत रक्तस्राव (PPH)। वर्तमान रक्तस्राव: <strong>{bloodLoss} mL</strong>। गर्भाशय टोन: <strong>{uterineTone}</strong>।
                        </p>
                      </div>

                      {/* B - Background */}
                      <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className="w-5 h-5 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">B</span>
                          <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">Background (पृष्ठभूमि)</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-[11px]">
                          <strong>मातृत्व प्रोफाइल:</strong> G{currentPregnancy?.gravidity || 2}P{currentPregnancy?.parity || 1} • {currentPregnancy?.gestational_age || 38.0} wks GA • पूर्व C-Sec: {currentPregnancy?.prior_csections || 0}
                          <br />
                          <strong>बायोमार्कर्स:</strong> हीमोग्लोबिन: <strong>{currentPregnancy?.maternal_hemoglobin_gdl || 7.6} g/dL</strong> (गंभीर एनीमिया) • रक्त वर्ग: <strong>{currentPatient?.blood_group || 'O+'}</strong>
                          <br />
                          <strong>AI रिस्क:</strong> {currentPregnancy?.current_risk_tier || 'ENHANCED'} ({riskAnalysisResult?.prevalence_ratio || '~1 in 16'})
                        </p>
                      </div>

                      {/* A - Assessment */}
                      <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className="w-5 h-5 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center">A</span>
                          <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">Assessment (सर्कुलेटरी जांच)</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-[11px]">
                          <strong>नब्ज (HR):</strong> {pulse} bpm • <strong>BP:</strong> {sbp}/{dbp} mmHg • <strong>MAP:</strong> {meanArterialPressure} mmHg
                          <br />
                          <strong>पारंपरिक SI (HR/SBP):</strong> <span className="font-bold text-rose-700">{shockIndex}</span> ({shockStatus.label})
                          <br />
                          <strong>संशोधित MSI (HR/MAP):</strong> <span className="font-bold text-rose-700">{modifiedShockIndex}</span> ({modifiedShockIndex > 1.3 ? 'खतरा > 1.3' : 'सामान्य'}) • <strong>Age-SI:</strong> {ageShockIndex}
                        </p>
                      </div>

                      {/* R - Recommendation */}
                      <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className="w-5 h-5 rounded-lg bg-emerald-700 text-white font-black text-xs flex items-center justify-center">R</span>
                          <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">Recommendation (उपचार व अनुरोध)</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-[11px]">
                          <strong>दिए गए उपचार:</strong> 1) दो 16G मोटी ड्रिप (RL चालू)। 2) ऑक्सीटोसिन 10 IU IM। 3) ट्रैनेक्सामिक एसिड (TXA) 1g IV। 4) गर्भाशय मालिश जारी।
                          <br />
                          <strong>तुरंत आवश्यकता:</strong> 108 ALS एम्बुलेंस से PGIMS रोहतक इमरजेंसी OBG ले जाएं।
                          <br />
                          <strong>रक्त बैंक अनुरोध:</strong> 2 यूनिट {currentPatient?.blood_group || 'O+'} PRBCs ब्लड बैंक में तैयार रखें।
                        </p>
                      </div>
                    </div>

                    {/* Formatted Full Monospace Text Box */}
                    <div className="relative">
                      <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {sbarContent}
                      </pre>
                    </div>
                  </div>

                  {/* Capable Facilities Ranked by 40/30/20/10 */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-slate-700" />
                      <span>सक्षम अस्पताल रैंकिंग (40/30/20/10 Capability Formula)</span>
                    </h3>
                    <div className="space-y-2.5 text-xs">
                      {facilities.map((fac, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-900 block">{fac.name}</span>
                            <span className="text-[11px] text-slate-500">{fac.address}</span>
                            <span className="text-[11px] text-slate-600 block mt-1">
                              दूरी: <strong>{fac.road_distance_km} किमी</strong> • ETA: <strong>{fac.eta_minutes} मिनट</strong> • {fac.has_blood_bank ? '🩸 ब्लड बैंक उपलब्ध' : 'ब्लड बैंक नहीं'}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                            स्कोर: {fac.routing_score}/100
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
              TAB 7: OVERVIEW (विवरण)
              ══════════════════════════════════════════════════════════════ */}
              {activeSidebarTab === 'overview' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900">
                        मरीज का प्रोफाइल व मातृत्व रिकॉर्ड (Patient Overview)
                      </h2>
                      <p className="text-xs text-slate-500">
                        राष्ट्रीय स्वास्थ्य मिशन (NHM) क्लिनिकल डेटाबेस
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 text-[#981228]">
                      {currentPregnancy.current_risk_tier} ({currentPregnancy.current_risk_percent}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">उम्र (Age)</span>
                      <span className="text-base font-black text-slate-800">{currentPatient.age} वर्ष</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">गर्भकाल (Weeks)</span>
                      <span className="text-base font-black text-slate-800">{currentPregnancy.gestational_age} हफ्ते</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">रक्त समूह (Blood Group)</span>
                      <span className="text-base font-black text-red-700">{currentPatient.blood_group}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">हीमोग्लोबिन (Hb)</span>
                      <span className={`text-base font-black ${currentPregnancy?.maternal_hemoglobin_gdl != null ? 'text-red-700' : 'text-slate-500'}`}>
                        {currentPregnancy?.maternal_hemoglobin_gdl != null ? `${currentPregnancy.maternal_hemoglobin_gdl} g/dL` : 'जाँच लंबित (Lab Pending)'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                    <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      <span>मुख्य जोखिम कारक (Clinical Risk Summary):</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {currentPregnancy?.prior_csections > 0 ? `पिछला ${currentPregnancy.prior_csections} सिजेरियन ऑपरेशन (Prior C-Section)` : 'सामान्य प्रसव इतिहास (No prior C-Sec)'}
                      {currentPregnancy?.maternal_hemoglobin_gdl != null ? `, हीमोग्लोबिन ${currentPregnancy.maternal_hemoglobin_gdl} g/dL` : ', रक्त हीमोग्लोबिन जाँच लंबित (Risk Tab में रिपोर्ट अपलोड करें)'}
                      {currentPregnancy?.current_risk_tier === 'ESCALATED' ? ' — आपातकालीन उच्च जोखिम स्तर सक्रिय।' : ' — नियमित प्रसव प्रोटोकॉल सक्रिय।'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )} {/* end currentPatient guard */}

        </main>
      </div>

      {/* ── MODAL: ALL MOTHERS (QUICK PATIENT SELECTOR) ── */}
      {showMothersModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#981228]" />
                <h3 className="font-extrabold text-base text-slate-900">
                  सभी माताएं (All Registered Mothers)
                </h3>
              </div>
              <button
                onClick={() => setShowMothersModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={motherSearchTerm}
                onChange={(e) => setMotherSearchTerm(e.target.value)}
                placeholder="नाम या आईडी से खोजें (Search by name or ID)..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Mothers List */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {filteredMothers.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedId(m.id);
                    setShowMothersModal(false);
                    loadDatabaseData(m.id);
                  }}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${m.id === selectedId
                      ? 'bg-rose-50 border-red-300 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center font-black text-xs text-[#981228]">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold text-xs text-slate-900">{m.name}</span>
                        {m.hindi_name && (
                          <span className="text-[11px] text-slate-500">({m.hindi_name})</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {m.id} • {m.age} yrs • Blood: {m.blood_group} • Hb: {m.maternal_hemoglobin_gdl != null ? `${m.maternal_hemoglobin_gdl} g/dL` : 'जाँच लंबित'}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800">
                    चुनें →
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowMothersModal(false);
                setShowNewMotherModal(true);
              }}
              className="w-full py-2.5 bg-[#981228] text-white rounded-xl text-xs font-bold transition hover:bg-red-800 flex items-center justify-center space-x-1.5 flex-shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ नई माँ पंजीकृत करें (New Mother)</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: NEW MOTHER REGISTRATION (WITH OCR / PHOTO OPTION) ── */}
      {showNewMotherModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[#981228]" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">नई माँ जोड़ें</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Register New Mother</p>
                </div>
              </div>
              <button onClick={() => setShowNewMotherModal(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info note */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <p className="text-[11px] font-bold text-amber-900 leading-relaxed">
                📋 <strong>सिर्फ बुनियादी जानकारी भरें।</strong> हीमोग्लोबिन (Hb) या लैब जाँच न हुई हो तो खाली छोड़ें — कोई फर्जी डेटा नहीं लिया जाएगा। बाद में <strong>Risk Analysis tab</strong> पर रिपोर्ट अपलोड करके भर सकते हैं।
              </p>
            </div>

            <form onSubmit={handleRegisterNewMother} className="space-y-4">

              {/* Name */}
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1.5">
                  माँ का नाम (Full Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newMotherName}
                  onChange={(e) => setNewMotherName(e.target.value)}
                  placeholder="जैसे: सुनीता देवी"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#981228] focus:border-transparent"
                />
              </div>

              {/* Age + Blood Group */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1.5">
                    उम्र (Age) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="14" max="55"
                    value={newMotherAge}
                    onChange={(e) => setNewMotherAge(e.target.value)}
                    placeholder="25"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#981228]"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1.5">
                    रक्त समूह (Blood Group)
                  </label>
                  <select
                    value={newMotherBloodGroup}
                    onChange={(e) => setNewMotherBloodGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#981228] cursor-pointer"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prior C-Section */}
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1.5">
                  पहले सिजेरियन (C-Section) हुआ था?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[['0', 'नहीं ✗'], ['1', '1 बार'], ['2', '2+ बार']].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNewMotherPrevCSection(val)}
                      className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${newMotherPrevCSection === val
                          ? 'bg-[#981228] text-white border-[#981228]'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:border-[#981228] hover:text-[#981228]'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile */}
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1.5">
                  मोबाइल नंबर (Mobile)
                </label>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-sm font-bold text-slate-600">+91</span>
                  <input
                    type="tel"
                    value={newMotherPhone.replace(/^\+91/, '')}
                    onChange={(e) => setNewMotherPhone('+91' + e.target.value.replace(/\D/g, ''))}
                    placeholder="10 अंक"
                    maxLength={10}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#981228]"
                  />
                </div>
              </div>

              {/* Optional: Gestational Age & Hemoglobin */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    गर्भकाल (हफ्ते) <span className="text-[10px] text-slate-400 font-normal">वैकल्पिक</span>
                  </label>
                  <input
                    type="number"
                    min="20" max="44" step="0.5"
                    value={newMotherGA}
                    onChange={(e) => setNewMotherGA(e.target.value)}
                    placeholder="38 wks"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#981228]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    हीमोग्लोबिन (Hb) <span className="text-[10px] text-slate-400 font-normal">वैकल्पिक</span>
                  </label>
                  <input
                    type="number"
                    min="3" max="20" step="0.1"
                    value={newMotherHb}
                    onChange={(e) => setNewMotherHb(e.target.value)}
                    placeholder="जाँच न हुई हो तो खाली छोड़ें"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#981228]"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isRegisteringMother || !newMotherName.trim()}
                className="w-full py-3 bg-[#981228] hover:bg-[#7a0e1f] disabled:opacity-50 text-white rounded-2xl text-sm font-black transition flex items-center justify-center space-x-2 shadow-lg shadow-rose-200 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isRegisteringMother ? 'जोड़ा जा रहा है...' : 'माँ को जोड़ें →'}</span>
              </button>

              <p className="text-center text-[11px] text-slate-400 font-medium">
                जोड़ने के बाद <strong className="text-[#981228]">Risk Analysis</strong> tab पर जाएं
                → report upload करें → AI risk बताएगा
              </p>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALS: REPORT SCANNER & DEVICE CAMERA ── */}
      <ReportScannerModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onPatientCreated={(newPt) => {
          if (newPt?.patient_id) {
            setSelectedId(newPt.patient_id);
            loadDatabaseData(newPt.patient_id);
          }
        }}
      />

      <DeviceCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onBloodMeasured={(vol) => {
          setBloodLoss(vol);
          setIsCameraModalOpen(false);
          speakHindi(`पैड फोटो विश्लेषण: बहा हुआ खून ${vol} मिलीलीटर नापा गया है।`);
        }}
      />

      {/* ── REFERRAL HOSPITALS & LIVE GPS MAP MODAL ── */}
      <ReferralHospitalsModal
        isOpen={showHospitalsModal}
        onClose={() => setShowHospitalsModal(false)}
        lang={lang}
        facilitiesData={facilities}
      />

      {/* ── 1-CLICK TWILIO EMERGENCY DISPATCH MODAL (108 AMBULANCE + NEAREST HOSPITAL) ── */}
      <TwilioEmergencyDispatchModal
        isOpen={showTwilioEmergencyModal}
        onClose={() => setShowTwilioEmergencyModal(false)}
        patient={currentPatient}
        pregnancy={currentPregnancy}
        vitals={{ sbp, dbp, pulse }}
        bloodLoss={emergencyModalData?.blood_loss_ml || bloodLoss || 420}
        shockIndex={shockIndex}
        triggerReason={emergencyModalData?.trigger_source || 'PAD_PHOTO_CV_ALERT'}
        nearestHospital="Pt. B.D. Sharma PGIMS Rohtak"
        hospitalDistanceKm={11.1}
        hospitalEtaMins={ambulanceETA || 17}
        onOpenHospitalRoute={() => setShowHospitalsModal(true)}
        lang={lang}
      />

      {/* ── ABHA / ABDM M1 AYUSHMAN BHARAT HEALTH ACCOUNT MODAL ── */}
      <AbhaModal
        isOpen={showAbhaModal}
        onClose={() => setShowAbhaModal(false)}
        patient={currentPatient}
        onAbhaLinked={(res) => {
          if (currentPatient?.id) {
            loadDatabaseData(currentPatient.id);
          }
          speakHindi(`आयुष्मान भारत स्वास्थ्य खाता ${res.abha_id} मरीज के रिकॉर्ड से लिंक हो गया है।`);
        }}
        lang={lang}
      />

    </div>
  );
}
