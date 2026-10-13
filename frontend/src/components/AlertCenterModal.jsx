import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Clock,
  ShieldCheck,
  RefreshCw,
  Send,
  X,
  User,
  HeartPulse
} from 'lucide-react';
import { fetchAlerts, acknowledgeAlert, resolveAlert, testTwilioAlert } from '../api/client';

export default function AlertCenterModal({ isOpen, onClose, currentUser, onSelectPatient }) {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'resolved' | 'test_twilio'
  const [actionInProgress, setActionInProgress] = useState({});
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolvingAlertId, setResolvingAlertId] = useState(null);

  // Twilio Test state
  const [testPhone, setTestPhone] = useState('+918168884901');
  const [testMode, setTestMode] = useState('whatsapp'); // 'whatsapp' | 'sms' | 'call'
  const [testResult, setTestResult] = useState(null);
  const [isTestingTwilio, setIsTestingTwilio] = useState(false);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAlerts(null, activeTab === 'active');
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleAcknowledge = async (alertId) => {
    setActionInProgress(prev => ({ ...prev, [alertId]: true }));
    try {
      const clinician = currentUser?.full_name || 'Attending Clinician';
      await acknowledgeAlert(alertId, clinician);
      await loadAlerts();
    } catch (err) {
      alert('Acknowledgement failed: ' + err.message);
    } finally {
      setActionInProgress(prev => ({ ...prev, [alertId]: false }));
    }
  };

  const handleResolve = async (alertId) => {
    setActionInProgress(prev => ({ ...prev, [alertId]: true }));
    try {
      const clinician = currentUser?.full_name || 'Attending Clinician';
      await resolveAlert(alertId, clinician, resolveNotes || 'Clinical intervention completed.');
      setResolvingAlertId(null);
      setResolveNotes('');
      await loadAlerts();
    } catch (err) {
      alert('Resolution failed: ' + err.message);
    } finally {
      setActionInProgress(prev => ({ ...prev, [alertId]: false }));
    }
  };

  const handleTestTwilio = async () => {
    setIsTestingTwilio(true);
    setTestResult(null);
    try {
      const staffName = currentUser?.full_name || 'पूजा वर्मा (GNM)';
      const facilityName = currentUser?.facility_name || 'उप-स्वास्थ्य केंद्र खेड़ी साध';
      const res = await testTwilioAlert(testPhone, testMode, staffName, facilityName);
      setTestResult(res);
    } catch (err) {
      setTestResult({ error: err.message });
    } finally {
      setIsTestingTwilio(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 text-slate-900 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
              <AlertOctagon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                आपातकालीन अलर्ट व एस्केलेशन केंद्र (Emergency Alert Center)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                PPH और हेमोडायनामिक शॉक अलर्ट, Twilio SMS व स्वचालित वॉयस कॉल प्रबंधन
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 mb-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'active' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            सक्रिय अलर्ट (Active Emergencies)
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'resolved' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            निपटारे हुए अलर्ट (Resolved History)
          </button>
          <button
            onClick={() => setActiveTab('test_twilio')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'test_twilio' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Twilio डिस्पैच टेस्ट (Test SMS & Call)
          </button>
        </div>

        {/* ── Active & Resolved Alerts List ── */}
        {(activeTab === 'active' || activeTab === 'resolved') && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="p-10 text-center text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-600" />
                <span className="text-xs font-bold">अलर्ट लोड हो रहे हैं...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-10 text-center border rounded-2xl border-slate-200 bg-slate-50">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span className="text-xs font-bold text-slate-700">कोई सक्रिय अलर्ट नहीं है (All Stable)</span>
              </div>
            ) : (
              alerts.map((alt) => {
                const isCritical = alt.severity === 'CRITICAL';
                const isHigh = alt.severity === 'HIGH';

                return (
                  <div
                    key={alt.id}
                    className={`p-4 rounded-2xl border transition ${
                      isCritical
                        ? 'border-red-300 bg-red-50/30'
                        : isHigh
                        ? 'border-rose-200 bg-rose-50/20'
                        : 'border-amber-200 bg-amber-50/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isCritical
                              ? 'bg-red-600 text-white animate-pulse'
                              : isHigh
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {alt.severity}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{alt.event_type}</span>
                        <span className="text-[11px] text-slate-500 font-mono">({alt.trigger_rule})</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-semibold">{alt.created_at.split('T')[1]?.slice(0, 8)}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-700 bg-white rounded-xl p-2.5 border border-slate-200/80 mb-3 gap-2">
                      <div>
                        मरीज: <strong className="text-slate-900">{alt.mother_name}</strong> ({alt.mother_age} वर्ष, {alt.blood_group})
                        <span className="text-slate-400 ml-2">ID: {alt.mother_id}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <span>SMS: {alt.delivery_status}</span>
                      </div>
                    </div>

                    {/* Acknowledgement and Resolution status */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                      <div>
                        {alt.is_acknowledged ? (
                          <span className="text-emerald-700 font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>पुष्टीकृत (Ack): {alt.acknowledged_by} ({alt.acknowledged_at?.split('T')[1]?.slice(0, 5)})</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>पुष्टि लंबित (Unacknowledged)</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {!alt.is_acknowledged && (
                          <button
                            onClick={() => handleAcknowledge(alt.id)}
                            disabled={actionInProgress[alt.id]}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 hover:bg-black text-white transition disabled:opacity-50"
                          >
                            पुष्टि करें (Acknowledge)
                          </button>
                        )}

                        {!alt.is_resolved && (
                          <button
                            onClick={() => setResolvingAlertId(alt.id)}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition"
                          >
                            समाधान दर्ज करें (Resolve)
                          </button>
                        )}

                        {onSelectPatient && (
                          <button
                            onClick={() => {
                              onSelectPatient(alt.mother_id);
                              onClose();
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-red-100 hover:bg-red-200 text-red-800 transition"
                          >
                            मरीज खोलें
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Resolve Form */}
                    {resolvingAlertId === alt.id && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-200 space-y-2">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          चिकित्सकीय कार्रवाई व समाधान विवरण (Clinical Action Notes):
                        </label>
                        <input
                          type="text"
                          value={resolveNotes}
                          onChange={(e) => setResolveNotes(e.target.value)}
                          placeholder="e.g. Uterine massage performed, Oxytocin administered, vitals stabilized."
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setResolvingAlertId(null)}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                          >
                            रद्द करें
                          </button>
                          <button
                            onClick={() => handleResolve(alt.id)}
                            disabled={actionInProgress[alt.id]}
                            className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
                          >
                            अलर्ट बंद करें (Confirm Resolution)
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Twilio Dispatch Test Tab ── */}
        {activeTab === 'test_twilio' && (
          <div className="space-y-4 max-w-lg mx-auto py-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Twilio लाइव / सेफ डेवलपमेंट टेस्टिंग
              </span>
              <p className="text-[11px] text-slate-500">
                जब <code>NOTIFICATION_MODE=development</code> होता है, तो Twilio कॉल व SMS स्थानीय डेटाबेस में सुरक्षित रूप से रिकॉर्ड होते हैं। प्रोडक्शन मोड में यह वास्तविक फोन पर आपातकालीन अलर्ट भेजता है।
              </p>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">परीक्षण मोबाइल नंबर (Phone Number):</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">चैनल चुनें (Channel):</label>
                <div className="flex flex-wrap gap-3 text-xs">
                  <label className="flex items-center space-x-1.5 cursor-pointer font-semibold text-emerald-700">
                    <input
                      type="radio"
                      checked={testMode === 'whatsapp'}
                      onChange={() => setTestMode('whatsapp')}
                    />
                    <span>Twilio WhatsApp (व्हाट्सएप)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="radio"
                      checked={testMode === 'sms'}
                      onChange={() => setTestMode('sms')}
                    />
                    <span>Twilio SMS (संदेश)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="radio"
                      checked={testMode === 'call'}
                      onChange={() => setTestMode('call')}
                    />
                    <span>Twilio Voice Call (वॉयस कॉल)</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleTestTwilio}
                disabled={isTestingTwilio}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isTestingTwilio ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isTestingTwilio ? 'अलर्ट भेजा जा रहा है...' : 'टेस्ट अलर्ट डिस्पैच करें (Dispatch Test Alert)'}</span>
              </button>
            </div>

            {testResult && (
              <div className="p-3 bg-slate-900 text-emerald-400 rounded-2xl text-xs font-mono overflow-x-auto">
                <pre>{JSON.stringify(testResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
