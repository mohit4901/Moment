import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ClinicalDashboard from './components/ClinicalDashboard';
import MaternalRegistryView from './components/MaternalRegistryView';
import AuthModal from './components/AuthModal';
import AlertCenterModal from './components/AlertCenterModal';
import AuditLogModal from './components/AuditLogModal';
import AnimatedWaveFooter from './components/AnimatedWaveFooter';
import BedsideCamView from './components/BedsideCamView';
import { fetchHealth, fetchAlerts, getAuthUser, logoutStaff } from './api/client';
import { AlertOctagon, ArrowRight, HeartPulse, Bell, Users, ShieldAlert } from 'lucide-react';
import i18n from './i18n/i18n';

export default function App() {
  const isBedsideCam = window.location.pathname.includes('bedside-cam') ||
                       window.location.search.includes('bedside-cam') ||
                       window.location.search.includes('view=bedside-cam');

  if (isBedsideCam) {
    return <BedsideCamView />;
  }

  const [currentView, setCurrentViewState] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      if (viewParam && ['landing', 'registry', 'clinical'].includes(viewParam)) {
        return viewParam;
      }
      const savedView = localStorage.getItem('moment_current_view');
      if (savedView && ['landing', 'registry', 'clinical'].includes(savedView)) {
        return savedView;
      }
      // If staff user is logged in, default directly to clinical dashboard!
      const user = getAuthUser();
      if (user) {
        return 'clinical';
      }
    }
    return 'landing';
  });

  const setCurrentView = (newView) => {
    setCurrentViewState(newView);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('moment_current_view', newView);
        const url = new URL(window.location.href);
        url.searchParams.set('view', newView);
        window.history.replaceState(null, '', url.toString());
      } catch (e) {
        console.warn('Could not persist view state:', e);
      }
    }
  };

  const [userRole, setUserRoleState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moment_user_role');
      if (saved) return saved;
      const user = getAuthUser();
      if (user?.role) {
        const lower = user.role.toLowerCase();
        return lower === 'anm' ? 'anm' : lower === 'gnm' ? 'nurse' : lower === 'doctor' ? 'doctor' : 'anm';
      }
    }
    return 'anm';
  });

  const setUserRole = (newRole) => {
    setUserRoleState(newRole);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('moment_user_role', newRole);
      } catch (e) {}
    }
  };

  const [currentUser, setCurrentUser] = useState(() => getAuthUser());

  const [selectedPatientId, setSelectedPatientIdState] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pParam = urlParams.get('patient');
      if (pParam) return pParam;
      const saved = localStorage.getItem('moment_selected_patient_id');
      if (saved && saved !== '[object Object]') return saved;
    }
    return 'MOMENT-PT-2916';
  });

  const setSelectedPatientId = (newId) => {
    const cleanId = (typeof newId === 'string' && newId.trim() && newId !== '[object Object]')
      ? newId
      : 'MOMENT-PT-2916';
    setSelectedPatientIdState(cleanId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('moment_selected_patient_id', cleanId);
        const url = new URL(window.location.href);
        url.searchParams.set('patient', cleanId);
        window.history.replaceState(null, '', url.toString());
      } catch (e) {
        console.warn('Could not persist patient id:', e);
      }
    }
  };

  const [lang, setLangState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('moment_lang') || 'hi';
    }
    return 'hi';
  });

  const setLang = (newLang) => {
    setLangState(newLang);
    try {
      localStorage.setItem('moment_lang', newLang);
      i18n.changeLanguage(newLang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLang;
      }
    } catch (e) {
      console.warn('Could not persist language to localStorage', e);
    }
  };

  useEffect(() => {
    if (lang) {
      i18n.changeLanguage(lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
    }
  }, [lang]);
  const [backendStatus, setBackendStatus] = useState('healthy');
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  // Modals — Show Auth Modal immediately if user is not logged in!
  const [showAuthModal, setShowAuthModal] = useState(() => !getAuthUser());
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Poll backend health & alerts
  useEffect(() => {
    const check = async () => {
      try {
        const health = await fetchHealth();
        if (health.status === 'healthy') {
          setBackendStatus('healthy');
        } else {
          setBackendStatus('degraded');
        }
      } catch (err) {
        setBackendStatus('offline');
      }

      try {
        const active = await fetchAlerts(true);
        if (Array.isArray(active)) {
          setActiveAlertsCount(active.length);
        }
      } catch (err) {
        // quiet fallback
      }
    };
    check();
    const interval = setInterval(check, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenDashboard = (patientId = 'MOMENT-PT-2916', role = null) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    const cleanId = (typeof patientId === 'string' && patientId.trim() && patientId !== '[object Object]')
      ? patientId
      : 'MOMENT-PT-2916';
    setSelectedPatientId(cleanId);
    if (typeof role === 'string') setUserRole(role);
    setCurrentView('clinical');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartAssessment = (role = 'anm') => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setSelectedPatientId('MOMENT-PT-2916');
    setUserRole(role);
    setCurrentView('clinical');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenRegistry = () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setCurrentView('registry');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.role) {
      const lower = user.role.toLowerCase();
      setUserRole(lower === 'anm' ? 'anm' : lower === 'gnm' ? 'nurse' : lower === 'doctor' ? 'doctor' : 'anm');
    }
    setShowAuthModal(false);
    // After login, automatically open clinical dashboard
    setCurrentView('clinical');
  };

  const handleLogout = () => {
    logoutStaff();
    setCurrentUser(null);
    setCurrentView('landing');
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-900">
      {/* Emergency Active Global Alert (if triggered) */}
      {emergencyAlert && (
        <div className="bg-red-700 text-white px-4 py-3 flex items-center justify-between shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <AlertOctagon className="w-5 h-5 animate-pulse text-white flex-shrink-0" />
              <div>
                <span className="font-black text-sm tracking-wide">{emergencyAlert.title}: </span>
                <span className="text-xs text-rose-100">{emergencyAlert.message}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setCurrentView('clinical');
                  setEmergencyAlert(null);
                }}
                className="px-3 py-1 bg-white text-red-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
              >
                <span>Open Emergency Protocol</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEmergencyAlert(null)}
                className="text-xs text-rose-200 hover:text-white px-2 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main View Router */}
      {currentView === 'landing' ? (
        <LandingPage
          onOpenDashboard={handleOpenDashboard}
          onStartAssessment={handleStartAssessment}
          onOpenRegistry={handleOpenRegistry}
          onOpenAuthModal={() => setShowAuthModal(true)}
          onOpenAlertsModal={() => setShowAlertsModal(true)}
          currentUser={currentUser}
          userRole={userRole}
          setUserRole={setUserRole}
          lang={lang}
          setLang={setLang}
          backendStatus={backendStatus}
        />
      ) : currentView === 'registry' ? (
        <div className="flex-1 bg-slate-50/50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <MaternalRegistryView
              currentUser={currentUser}
              onSelectPatient={handleOpenDashboard}
              onOpenNewAssessment={handleOpenDashboard}
              onBackToLanding={handleBackToLanding}
              onOpenDashboard={() => handleOpenDashboard()}
              lang={lang}
            />
          </div>
        </div>
      ) : (
        <ClinicalDashboard
          onBackToLanding={handleBackToLanding}
          initialPatientId={selectedPatientId}
          activeRole={userRole}
          setActiveRole={setUserRole}
          lang={lang}
          setLang={setLang}
          backendStatus={backendStatus}
          currentUser={currentUser}
          onOpenAuthModal={() => setShowAuthModal(true)}
        />
      )}

      {/* ── Rich Animated Wave Footer ── */}
      {currentView !== 'clinical' && (
        <AnimatedWaveFooter
          onOpenDashboard={() => handleOpenDashboard()}
          onOpenRegistry={handleOpenRegistry}
          onOpenAuditModal={() => setShowAuditModal(true)}
          lang={lang}
        />
      )}

      {/* ── Global Clinical Modals ── */}
      <AuthModal
        isOpen={showAuthModal || !currentUser}
        isMandatory={!currentUser}
        currentUser={currentUser}
        onLogout={handleLogout}
        onClose={() => {
          if (currentUser) setShowAuthModal(false);
        }}
        onLoginSuccess={handleLoginSuccess}
        lang={lang}
      />

      <AlertCenterModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        currentUser={currentUser}
        onSelectPatient={(pId) => {
          setShowAlertsModal(false);
          handleOpenDashboard(pId);
        }}
      />

      <AuditLogModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </div>
  );
}
