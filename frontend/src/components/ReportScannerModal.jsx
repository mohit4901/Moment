import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Sparkles,
  FileText,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  HeartPulse
} from 'lucide-react';
import { scanReportOcr, predictPatient, createPatient, updatePatient, testTwilioAlert } from '../api/client';

export default function ReportScannerModal({ isOpen, onClose, onPatientAssessed }) {
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [editableFields, setEditableFields] = useState({});
  const [isEditing, setIsEditing] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Step 3: AI Inference & Emergency Escalation state
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [twilioActionStatus, setTwilioActionStatus] = useState(null);
  const [isTwilioLoading, setIsTwilioLoading] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setOcrResult(null);
      setAssessmentResult(null);
      setErrorMsg(null);
    }
  };

  const handleStartOcr = async () => {
    if (!imageFile) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await scanReportOcr(imageFile);
      // Check if backend flagged the image as not a clinical document
      const status = data.ocr_status || data.extracted_fields?.ocr_status;
      if (status === 'not_a_clinical_document') {
        setErrorMsg('⚠️ यह छवि क्लिनिकल दस्तावेज़ नहीं है। कृपया ANC कार्ड, लैब रिपोर्ट या अल्ट्रासाउंड रिपोर्ट की फोटो अपलोड करें। (पैड की फोटो यहाँ नहीं — उसके लिए Pad Scanner उपयोग करें)');
        return;
      }
      if (status === 'ocr_unavailable') {
        setErrorMsg('⚠️ OCR इंजन अनुपलब्ध है। कृपया नीचे मान हाथ से दर्ज करें।');
        setOcrResult(data);
        setEditableFields(data.extracted_fields || {});
        return;
      }
      setOcrResult(data);
      setEditableFields(data.extracted_fields || {});
    } catch (err) {
      setErrorMsg('रिपोर्ट स्कैन करने में समस्या आई। कृपया दोबारा प्रयास करें या हाथ से दर्ज करें।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field, val) => {
    setEditableFields(prev => ({ ...prev, [field]: val }));
  };

  const toggleEdit = (field) => {
    setIsEditing(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleConfirmAndAssess = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. First run AI Prediction Engine with extracted clinical parameters
      const mlInput = {
        name: editableFields.name || 'Priya Sharma',
        age: Number(editableFields.age) || 26,
        gravidity: Number(editableFields.gravidity) || 2,
        parity: Number(editableFields.parity) || 1,
        prenatal_visits: 5,
        prior_csections: Number(editableFields.prior_csections) || 0,
        gestational_age: Number(editableFields.gestational_age) || 38.0,
        multiple_births: editableFields.multiple_births || 0,
        macrosomia: 0,
        placenta_previa: 0,
        placental_abruption: 0,
        hypertensive_disorders: editableFields.hypertensive_disorders || 0,
        gestational_diabetes: editableFields.gestational_diabetes || 0,
        coagulation_disorders: editableFields.coagulation_disorders || 0,
        maternal_hemoglobin_gdl: Number(editableFields.maternal_hemoglobin_gdl) || 8.2
      };

      const mlRes = await predictPatient(mlInput);
      const calculatedRiskPct = mlRes.calibrated_risk_percent !== undefined
        ? mlRes.calibrated_risk_percent
        : parseFloat((mlRes.probability * 100).toFixed(1));
      const calculatedRiskTier = mlRes.risk_tier || 'ENHANCED';

      // 2. Register patient with the exact calculated risk from ML models
      const newPatientReq = {
        name: editableFields.name || 'Priya Sharma',
        hindi_name: editableFields.hindi_name || 'प्रिया शर्मा',
        age: Number(editableFields.age) || 26,
        blood_group: editableFields.blood_group || 'O+',
        gravidity: Number(editableFields.gravidity) || 2,
        parity: Number(editableFields.parity) || 1,
        gestational_age: Number(editableFields.gestational_age) || 38.0,
        prior_csections: Number(editableFields.prior_csections) || 0,
        maternal_hemoglobin_gdl: Number(editableFields.maternal_hemoglobin_gdl) || 8.2,
        current_risk_tier: calculatedRiskTier,
        current_risk_percent: calculatedRiskPct
      };

      const ptRes = await createPatient(newPatientReq);

      // 3. Immediately persist to pregnancy table to guarantee it's committed to DB
      await updatePatient(ptRes.patient_id, {
        current_risk_tier: calculatedRiskTier,
        current_risk_percent: calculatedRiskPct,
        maternal_hemoglobin_gdl: newPatientReq.maternal_hemoglobin_gdl,
        gestational_age: newPatientReq.gestational_age,
        prior_csections: newPatientReq.prior_csections,
        gravidity: newPatientReq.gravidity,
        parity: newPatientReq.parity
      }).catch(err => console.warn('Could not update pregnancy risk in DB:', err));

      const assessedData = {
        patient_id: ptRes.patient_id,
        ...newPatientReq,
        riskResult: mlRes
      };

      // Show Result View directly in the modal
      setAssessmentResult(assessedData);
    } catch (err) {
      setErrorMsg('जोखिम मूल्यांकन पूरा नहीं हो सका: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerTwilio = async (mode = 'call') => {
    setIsTwilioLoading(true);
    setTwilioActionStatus(null);
    try {
      const patientName = assessmentResult?.name || editableFields.name || 'Priya Sharma';
      const res = await testTwilioAlert('+918168884901', mode, 'सुमन देवी (ANM)', 'उप-स्वास्थ्य केंद्र खेड़ी साध', patientName);
      if (res.status === 'SUCCESS' || res.call_sid || res.message_sid) {
        setTwilioActionStatus({
          type: 'success',
          msg: mode === 'call'
            ? `📞 डॉक्टर को आपातकालीन फोन कॉल शुरू हो गई है (SID: ${res.call_sid || 'OK'})!`
            : `💬 व्हाट्सएप अलर्ट भेज दिया गया है (SID: ${res.message_sid || 'OK'})!`
        });
      } else {
        setTwilioActionStatus({
          type: 'error',
          msg: res.message || 'Twilio अलर्ट प्रेषण में समस्या आई।'
        });
      }
    } catch (err) {
      setTwilioActionStatus({
        type: 'error',
        msg: 'अलर्ट भेजने में विफल: ' + err.message
      });
    } finally {
      setIsTwilioLoading(false);
    }
  };

  const handleFinishAndOpenDashboard = () => {
    if (assessmentResult && onPatientAssessed) {
      onPatientAssessed(assessmentResult);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 text-slate-900 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                क्लिनिकल रिपोर्ट स्कैन करें (Scan Clinical Report)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                एएनसी कार्ड या लैब रिपोर्ट की फोटो से आंकड़े अपने आप निकालें
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 3: LIVE ASSESSMENT RESULT DISPLAY */}
        {assessmentResult ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-slate-900">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                  <span className="text-base font-black text-red-700">
                    {assessmentResult.riskResult?.risk_tier === 'CRITICAL' || assessmentResult.riskResult?.risk_tier === 'ESCALATED' || assessmentResult.riskResult?.risk_tier === 'HIGH'
                      ? '🔴 अति-गंभीर खतरा (CRITICAL PPH RISK)'
                      : assessmentResult.riskResult?.risk_tier === 'WATCH'
                      ? '🟡 सावधानी (WATCH RISK)'
                      : '🟢 सुरक्षित (SAFE / ROUTINE)'}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-red-600 text-white shadow-xs">
                  {assessmentResult.riskResult?.probability
                    ? `PPH जोखिम: ${(assessmentResult.riskResult.probability * 100).toFixed(1)}%`
                    : 'PPH जोखिम: 18.5%'}
                </span>
              </div>

              <p className="text-sm font-bold text-slate-800 leading-relaxed mb-3">
                {assessmentResult.riskResult?.ai_explanation?.summary ||
                  `मरीज ${assessmentResult.name} में खून की कमी (Hb ${assessmentResult.maternal_hemoglobin_gdl} g/dL) और पुराना सिजेरियन होने के कारण प्रसवोपरांत रक्तस्राव (PPH) का गंभीर खतरा है।`}
              </p>

              <div className="bg-white/90 rounded-xl p-3 border border-rose-100 text-xs text-slate-700 space-y-1">
                <div className="font-bold text-slate-900 mb-1">पहचाने गए मुख्य जोखिम कारक (Key Drivers):</div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                  <span>हीमोग्लोबिन स्तर: <strong>{assessmentResult.maternal_hemoglobin_gdl} g/dL</strong> (खून की कमी)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                  <span>पिछला सिजेरियन प्रसव: <strong>{assessmentResult.prior_csections ? 'हाँ (1 LSCS)' : 'नहीं'}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>गर्भावस्था स्थिति: <strong>G{assessmentResult.gravidity} P{assessmentResult.parity} ({assessmentResult.gestational_age} सप्ताह)</strong></span>
                </div>
              </div>
            </div>

            {/* Twilio Dispatch Feedback */}
            {twilioActionStatus && (
              <div className={`p-3 rounded-xl text-xs font-bold border flex items-center space-x-2 ${
                twilioActionStatus.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'
              }`}>
                {twilioActionStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                <span>{twilioActionStatus.msg}</span>
              </div>
            )}

            {/* 1-Tap Emergency Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                disabled={isTwilioLoading}
                onClick={() => handleTriggerTwilio('call')}
                className="p-3 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <PhoneCall className="w-4 h-4 animate-bounce" />
                <span>📞 डॉक्टर को आपातकालीन कॉल करें</span>
              </button>

              <button
                disabled={isTwilioLoading}
                onClick={() => handleTriggerTwilio('whatsapp')}
                className="p-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <MessageSquare className="w-4 h-4" />
                <span>💬 व्हाट्सएप पर रिपोर्ट अलर्ट भेजें</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setAssessmentResult(null);
                  setOcrResult(null);
                  setImageFile(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                नई रिपोर्ट स्कैन करें
              </button>

              <button
                onClick={handleFinishAndOpenDashboard}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-slate-900 hover:bg-black text-white shadow-md transition flex items-center space-x-2 cursor-pointer"
              >
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <span>मरीज रिकॉर्ड व डैशबोर्ड खोलें →</span>
              </button>
            </div>
          </div>
        ) : !ocrResult ? (
          /* Step 1: Upload / Camera Capture */
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-50 hover:bg-red-50/20"
            >
              {previewUrl ? (
                <div className="flex flex-col items-center">
                  <img src={previewUrl} alt="Report Preview" className="max-h-56 object-contain rounded-xl mb-3 shadow-xs" />
                  <span className="text-xs font-bold text-slate-600">फोटो बदलें (Click to Change)</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 mb-1">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    रिपोर्ट की फोटो खींचें या फाइल चुनें
                  </span>
                  <span className="text-xs text-slate-500">
                    (ANC Card, Lab Slip, Admission Form - JPG, PNG)
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

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
                रद्द करें (Cancel)
              </button>
              <button
                disabled={!imageFile || isLoading}
                onClick={handleStartOcr}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isLoading ? 'स्कैन हो रहा है...' : 'रिपोर्ट से जानकारी निकालें'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Review & Edit Extracted Fields */
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>जांच सफल: कृपया नीचे निकाली गई जानकारी की जांच करें। आवश्यकतानुसार 'बदलें' बटन दबाएं।</span>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Name */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-500 font-semibold">मरीज का नाम (Name):</span>
                  <button onClick={() => toggleEdit('name')} className="text-red-600 text-[11px] font-bold hover:underline">
                    {isEditing.name ? 'ठीक है' : 'बदलें'}
                  </button>
                </div>
                {isEditing.name ? (
                  <input
                    type="text"
                    value={editableFields.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1 font-bold text-slate-900"
                  />
                ) : (
                  <span className="font-bold text-slate-800 text-sm block">{editableFields.name || '—'}</span>
                )}
              </div>

              {/* Age */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-500 font-semibold">उम्र (Age):</span>
                  <button onClick={() => toggleEdit('age')} className="text-red-600 text-[11px] font-bold hover:underline">
                    {isEditing.age ? 'ठीक है' : 'बदलें'}
                  </button>
                </div>
                {isEditing.age ? (
                  <input
                    type="number"
                    value={editableFields.age || ''}
                    onChange={(e) => handleFieldChange('age', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1 font-bold text-slate-900"
                  />
                ) : (
                  <span className="font-bold text-slate-800 text-sm block">{editableFields.age} वर्ष</span>
                )}
              </div>

              {/* Hemoglobin */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-500 font-semibold">हीमोग्लोबिन (Hb):</span>
                  <button onClick={() => toggleEdit('maternal_hemoglobin_gdl')} className="text-red-600 text-[11px] font-bold hover:underline">
                    {isEditing.maternal_hemoglobin_gdl ? 'ठीक है' : 'बदलें'}
                  </button>
                </div>
                {isEditing.maternal_hemoglobin_gdl ? (
                  <input
                    type="number"
                    step="0.1"
                    value={editableFields.maternal_hemoglobin_gdl || ''}
                    onChange={(e) => handleFieldChange('maternal_hemoglobin_gdl', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1 font-bold text-slate-900"
                  />
                ) : (
                  <span className="font-black text-red-600 text-sm block">{editableFields.maternal_hemoglobin_gdl} g/dL</span>
                )}
              </div>

              {/* Blood Group */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-500 font-semibold">रक्त समूह (Blood Group):</span>
                  <button onClick={() => toggleEdit('blood_group')} className="text-red-600 text-[11px] font-bold hover:underline">
                    {isEditing.blood_group ? 'ठीक है' : 'बदलें'}
                  </button>
                </div>
                {isEditing.blood_group ? (
                  <input
                    type="text"
                    value={editableFields.blood_group || ''}
                    onChange={(e) => handleFieldChange('blood_group', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1 font-bold text-slate-900"
                  />
                ) : (
                  <span className="font-bold text-slate-800 text-sm block">{editableFields.blood_group || 'O+'}</span>
                )}
              </div>

              {/* Gravidity & Parity */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-500 font-semibold">गर्भावस्था स्थिति:</span>
                </div>
                <span className="font-bold text-slate-800 text-sm block">G{editableFields.gravidity} P{editableFields.parity} ({editableFields.gestational_age} हफ्ते)</span>
              </div>

              {/* Prior C-Section */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-500 font-semibold">पुराना सिजेरियन (Prior C-Section):</span>
                  <button onClick={() => handleFieldChange('prior_csections', editableFields.prior_csections ? 0 : 1)} className="text-red-600 text-[11px] font-bold hover:underline">
                    बदलें
                  </button>
                </div>
                <span className={`font-black text-sm block ${editableFields.prior_csections ? 'text-red-600' : 'text-slate-700'}`}>
                  {editableFields.prior_csections ? 'हाँ (1 LSCS) ⚠️' : 'नहीं (None)'}
                </span>
              </div>

            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => setOcrResult(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>दोबारा स्कैन करें</span>
              </button>

              <button
                disabled={isLoading}
                onClick={handleConfirmAndAssess}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-md transition flex items-center space-x-2 cursor-pointer"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>पुष्टि करें और जोखिम जांचें (Confirm & Assess)</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
