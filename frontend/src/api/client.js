const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : ((typeof window !== 'undefined' && window.location.port === '8080')
      ? `http://${window.location.hostname}:8000/api`
      : '/api');

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchClinicalConfig() {
  const res = await fetch(`${API_BASE}/config/clinical`);
  if (!res.ok) throw new Error('Failed to load clinical configuration');
  return res.json();
}

// ── Patient CRUD ──
export async function fetchPatients(search = '') {
  const url = search ? `${API_BASE}/patients?search=${encodeURIComponent(search)}` : `${API_BASE}/patients`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch patients list');
  return res.json();
}

export async function fetchPatient(patientId) {
  if (!patientId || typeof patientId !== 'string' || patientId === '[object Object]') {
    throw new Error(`Invalid patient ID: ${patientId}`);
  }
  const res = await fetch(`${API_BASE}/patients/${encodeURIComponent(patientId)}`);
  if (!res.ok) throw new Error(`Failed to fetch patient ${patientId}`);
  return res.json();
}

export async function createPatient(patientData) {
  const res = await fetch(`${API_BASE}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  if (!res.ok) throw new Error('Failed to register patient');
  return res.json();
}

// ── Vitals & Monitoring Timeline ──
export async function fetchPatientTimeline(patientId) {
  if (!patientId || typeof patientId !== 'string' || patientId === '[object Object]') {
    return { vitals_timeline: [] };
  }
  const res = await fetch(`${API_BASE}/patients/${encodeURIComponent(patientId)}/timeline`);
  if (!res.ok) throw new Error('Failed to fetch patient timeline');
  return res.json();
}

export async function recordVitals(vitalData) {
  const res = await fetch(`${API_BASE}/vitals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vitalData),
  });
  if (!res.ok) throw new Error('Failed to record vitals');
  return res.json();
}

export async function recordBloodLoss(bloodData) {
  const res = await fetch(`${API_BASE}/blood-loss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bloodData),
  });
  if (!res.ok) throw new Error('Failed to record blood loss');
  return res.json();
}

// ── Geospatial & Blood Discovery ──
export async function fetchNearbyFacilities(lat = 28.8520, lng = 76.6850, radius = 50.0) {
  const res = await fetch(`${API_BASE}/facilities/nearby?lat=${lat}&lng=${lng}&radius_km=${radius}`);
  if (!res.ok) throw new Error('Failed to query nearby facilities');
  return res.json();
}

export async function fetchBloodAvailability(facilityId = null) {
  const url = facilityId ? `${API_BASE}/blood/availability?facility_id=${encodeURIComponent(facilityId)}` : `${API_BASE}/blood/availability`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch blood availability');
  return res.json();
}

// ── Emergency & Referrals ──
export async function activateEmergency(payload) {
  const res = await fetch(`${API_BASE}/emergencies/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to activate emergency protocol');
  return res.json();
}

export async function fetchHospitalQueue(facilityId = 'FAC-PGIMS') {
  const res = await fetch(`${API_BASE}/hospital/incoming-queue?facility_id=${encodeURIComponent(facilityId)}`);
  if (!res.ok) throw new Error('Failed to load incoming emergency queue');
  return res.json();
}

export async function trackReferral(referralId) {
  const res = await fetch(`${API_BASE}/referrals/${encodeURIComponent(referralId)}/tracking`);
  if (!res.ok) throw new Error('Failed to track referral');
  return res.json();
}

// ── AI Prediction & Computer Vision ──
export async function predictPatient(patientData) {
  const res = await fetch(`${API_BASE}/predict/patient`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  if (!res.ok) throw new Error('AI Prediction failed');
  return res.json();
}

export async function classifyPadImage(fileOrBlob) {
  const formData = new FormData();
  formData.append('file', fileOrBlob, 'pad_capture.jpg');
  const res = await fetch(`${API_BASE}/vision/pad-classify`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Pad classification failed');
  return res.json();
}

export async function classifyPadSample(sampleKey) {
  const res = await fetch(`${API_BASE}/vision/sample/${encodeURIComponent(sampleKey)}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Pad sample classification failed');
  return res.json();
}

// ── Clinical Report Scanner (OCR) ──
export async function scanReportOcr(fileOrBlob) {
  const formData = new FormData();
  formData.append('file', fileOrBlob, 'clinical_report.jpg');
  const res = await fetch(`${API_BASE}/reports/ocr`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Report OCR extraction failed');
  return res.json();
}

// ── District Analytics & Notifications ──
export async function fetchDistrictAnalytics() {
  const res = await fetch(`${API_BASE}/dashboard/analytics`);
  if (!res.ok) throw new Error('Failed to fetch district analytics');
  return res.json();
}

export async function sendEmergencyNotification(payload) {
  const res = await fetch(`${API_BASE}/notifications/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to send notification');
  return res.json();
}

export async function dispatchTwilioEmergency(payload) {
  const res = await fetch(`${API_BASE}/emergency/dispatch-twilio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to dispatch 1-click Twilio emergency alert');
  return res.json();
}

// ── ABHA (Ayushman Bharat Digital Mission - ABDM M1) ──
export async function generateAbhaOtp(payload) {
  const res = await fetch(`${API_BASE}/abha/generate-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to initiate ABHA OTP verification');
  return res.json();
}

export async function verifyAbhaOtp(payload) {
  const res = await fetch(`${API_BASE}/abha/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to verify ABHA OTP');
  return res.json();
}

export async function scanAbhaQr(payload) {
  const res = await fetch(`${API_BASE}/abha/scan-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to process ABHA QR scan');
  return res.json();
}

export async function getAbhaCard(patientId) {
  const res = await fetch(`${API_BASE}/abha/card/${patientId}`);
  if (!res.ok) throw new Error('Failed to load ABHA Digital Card');
  return res.json();
}

export async function syncBatch(payload) {
  const res = await fetch(`${API_BASE}/sync/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Batch sync failed');
  return res.json();
}

export const syncOfflineBatch = syncBatch;

// ── Authentication & RBAC ──
export function getAuthToken() {
  return localStorage.getItem('moment_token');
}

export function setAuthSession(token, user) {
  if (token) localStorage.setItem('moment_token', token);
  if (user) localStorage.setItem('moment_user', JSON.stringify(user));
}

export function getAuthUser() {
  try {
    const raw = localStorage.getItem('moment_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem('moment_token');
  localStorage.removeItem('moment_user');
}

export const logoutStaff = clearAuthSession;

export async function loginStaff(credentials) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed. Please check credentials.');
  }
  const data = await res.json();
  setAuthSession(data.token, data.user);
  return data;
}

export async function registerStaff(workerData) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workerData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed.');
  }
  const data = await res.json();
  setAuthSession(data.token, data.user);
  return data;
}

export async function extractStaffIdCardOcr(imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile, 'staff_id_card.jpg');
  const res = await fetch(`${API_BASE}/auth/ocr-id-card`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'ID Card OCR auto-extraction failed.');
  }
  return res.json();
}

export async function verifyStaffIdCard(imageFile, profileData) {
  const formData = new FormData();
  formData.append('file', imageFile, 'staff_id_card.jpg');
  formData.append('full_name', profileData.full_name || '');
  formData.append('role', profileData.role || 'ANM');
  formData.append('facility_name', profileData.facility_name || '');
  formData.append('rural_area', profileData.rural_area || '');
  formData.append('registration_no', profileData.registration_no || '');
  formData.append('age', profileData.age || 30);

  const res = await fetch(`${API_BASE}/auth/verify-id-card`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'ID Card OCR verification failed.');
  }
  return res.json();
}

export async function fetchCurrentUser() {
  const user = getAuthUser();
  const userId = user?.id || 'USR-ANM';
  const res = await fetch(`${API_BASE}/auth/me?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to load user profile');
  return res.json();
}

// ── Alerts & Central Escalation ──
export async function fetchAlerts(motherId = null, unresolvedOnly = false) {
  let url = `${API_BASE}/alerts?unresolved_only=${unresolvedOnly}`;
  if (motherId) url += `&mother_id=${encodeURIComponent(motherId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load clinical alerts');
  return res.json();
}

export async function acknowledgeAlert(alertId, acknowledgedBy = 'Attending Clinician') {
  const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/acknowledge?acknowledged_by=${encodeURIComponent(acknowledgedBy)}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}

export async function resolveAlert(alertId, resolvedBy = 'Attending Clinician', notes = '') {
  const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/resolve?resolved_by=${encodeURIComponent(resolvedBy)}&notes=${encodeURIComponent(notes)}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to resolve alert');
  return res.json();
}

export async function updatePatient(patientId, payload) {
  const res = await fetch(`${API_BASE}/patients/${encodeURIComponent(patientId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update patient');
  return res.json();
}

export async function fetchAuditLogs(limit = 50) {
  const res = await fetch(`${API_BASE}/audit-logs?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function testTwilioAlert(phone = '+918168884901', mode = 'whatsapp', staffName = '', facilityName = '', patientName = '') {
  let url = `${API_BASE}/twilio/test?phone=${encodeURIComponent(phone)}&mode=${encodeURIComponent(mode)}`;
  if (staffName) url += `&staff_name=${encodeURIComponent(staffName)}`;
  if (facilityName) url += `&facility_name=${encodeURIComponent(facilityName)}`;
  if (patientName) url += `&patient_name=${encodeURIComponent(patientName)}`;
  const res = await fetch(url, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to trigger test alert');
  return res.json();
}

export async function fetchNetworkIp() {
  try {
    const res = await fetch(`${API_BASE}/network-ip`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Network IP fetch failed:', e);
  }
  return null;
}
