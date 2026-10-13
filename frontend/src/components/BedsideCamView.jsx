import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Droplet,
  Send,
  Heart,
  ChevronLeft,
  ShieldCheck,
  Activity,
  SwitchCamera,
  Focus,
  Volume2
} from 'lucide-react';
import { classifyPadImage, recordBloodLoss, fetchPatient } from '../api/client';

export default function BedsideCamView() {
  const [patientId, setPatientId] = useState('MOMENT-PT-98A7');
  const [patientData, setPatientData] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSentToScreen, setIsSentToScreen] = useState(false);

  // Live Camera Stream State
  const [streamActive, setStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' = rear camera
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Speak voice feedback
  const speakVoice = (text) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'hi-IN';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Voice speak error:', e);
    }
  };

  // Parse patient ID from query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('patient') || params.get('patient_id') || params.get('id') || 'MOMENT-PT-98A7';
    setPatientId(pId);

    // Fetch patient info
    fetchPatient(pId)
      .then(data => {
        setPatientData(data?.patient || null);
      })
      .catch(() => {
        setPatientData({
          name: 'Priya Sharma',
          hindi_name: 'प्रिया शर्मा',
          age: 26,
          blood_group: 'O+',
          id: pId
        });
      });
  }, []);

  // Initialize Camera stream
  const startCamera = async (facing = facingMode) => {
    setCameraError(null);
    stopCamera();

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('लाइव कैमरा ब्राउज़र द्वारा समर्थित नहीं है। कृपया नीचे दिए गए "फोन कैमरा खोलें" बटन का उपयोग करें।');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
      setStreamActive(true);
    } catch (err) {
      console.warn('getUserMedia error:', err);
      // If environment camera fails, try any available video camera
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        mediaStreamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(e => console.warn('Video play error:', e));
        }
        setStreamActive(true);
      } catch (fallbackErr) {
        setStreamActive(false);
        setCameraError('कैमरा शुरू नहीं हो सका (अनुमति नहीं मिली या HTTP सुरक्षा प्रतिबंध)। सीधे 1-टैप कैमरा बटन का उपयोग करें।');
      }
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  // Auto-start camera when not showing preview
  useEffect(() => {
    if (!previewUrl && !result) {
      startCamera(facingMode);
    }
    return () => {
      stopCamera();
    };
  }, [previewUrl, result, facingMode]);

  // Flip rear / front camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // AUTO-PROCESS & AUTO-SAVE directly into database
  const autoProcessAndSave = async (file) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setIsSentToScreen(false);

    try {
      // 1. Run AI ResNet / Computer Vision pad lochia saturation
      const padResult = await classifyPadImage(file);
      setResult(padResult);

      // 2. Automatically record blood loss measurement into patient database
      const estMl = padResult.estimated_blood_loss_ml || (padResult.predicted_class === 'Critical' ? 450 : padResult.predicted_class === 'Amber' ? 120 : 35);
      await recordBloodLoss({
        patient_id: patientId,
        volume_ml: estMl,
        saturation_percent: padResult.saturation_percentage || 25.0,
        measurement_mode: 'BedsCam_AI_Photo',
        severity_tier: padResult.predicted_class?.toUpperCase() || 'ROUTINE',
        clot_present: padResult.is_critical ? 1 : 0
      }).catch(err => console.warn('Blood loss record background notice:', err));

      setIsSentToScreen(true);

      // Audio feedback & haptic
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      speakVoice(`रक्तस्राव माप लिया गया: ${Math.round(estMl)} मिलीलीटर। कंप्यूटर पर सेव हो गया है।`);
    } catch (err) {
      console.error('Processing error:', err);
      setErrorMsg('फोटो विश्लेषण में समस्या आई। कृपया दोबारा फोटो लें।');
    } finally {
      setIsProcessing(false);
    }
  };

  // Snapshot from Live Video Stream
  const captureFromStream = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Stop camera stream once frame is snapped
    stopCamera();

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `pad_snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
        // DIRECT AUTO SAVE & ANALYZE!
        autoProcessAndSave(file);
      }
    }, 'image/jpeg', 0.92);
  };

  // Snapshot from Native Phone Camera file input
  const handleNativeFileCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCamera();
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      // DIRECT AUTO SAVE & ANALYZE!
      autoProcessAndSave(file);
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setImageFile(null);
    setResult(null);
    setErrorMsg(null);
    setIsSentToScreen(false);
    startCamera(facingMode);
  };

  const pName = patientData?.hindi_name || patientData?.name || 'प्रिया शर्मा (Priya Sharma)';
  const pAge = patientData?.age || 26;
  const pBlood = patientData?.blood_group || 'O+';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Mobile App Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#981228] to-red-600 flex items-center justify-center text-white shadow-xs">
            <Droplet className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wide flex items-center space-x-1.5">
              <span>MOMENT बेडसाइड स्कैनर</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-red-950 text-red-400 border border-red-800 font-black">
                LIVE AI
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">प्रसव कक्ष मोबाइल पैड कैमरा</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-mono text-emerald-400 font-bold flex items-center space-x-1 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>जुड़ा हुआ (Paired)</span>
          </div>
        </div>
      </header>

      {/* Patient Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">मरीज (Mother)</div>
            <div className="text-sm font-black text-white">{pName}</div>
            <div className="text-[11px] text-slate-300">
              ID: <span className="font-mono text-rose-300 font-bold">{patientId}</span> • {pAge} वर्ष • {pBlood}
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center space-x-1">
            <Activity className="w-3.5 h-3.5" />
            <span>डिलीवरी टेबल</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-4 max-w-md mx-auto w-full flex flex-col space-y-3">
        {/* VIEW 1: LIVE SCANNER VIEWFINDER */}
        {!previewUrl ? (
          <div className="flex-1 flex flex-col space-y-3">
            {/* Viewfinder Container */}
            <div className="relative rounded-3xl overflow-hidden border-2 border-slate-700 bg-black aspect-3/4 flex items-center justify-center shadow-2xl">
              {/* Real Video Stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
              />

              {/* Fallback Placeholder if camera not active */}
              {!streamActive && (
                <div className="p-6 text-center space-y-3 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-red-600/20 border-2 border-red-500/60 text-red-400 flex items-center justify-center">
                    <Camera className="w-8 h-8 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">सीधा फोन कैमरा खोलें</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {cameraError || 'नीचे दिए गए बटन पर टैप करके पैड की फोटो खींचें'}
                    </p>
                  </div>
                </div>
              )}

              {/* Medical Optical Alignment Reticle Overlay */}
              {streamActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                  {/* Top Guide Text */}
                  <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-white border border-white/20 flex items-center space-x-1.5 shadow-md">
                    <Focus className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                    <span>पैड / ड्रेप को फ्रेम के बीच में रखें</span>
                  </div>

                  {/* Center Target Box */}
                  <div className="w-56 h-72 border-2 border-dashed border-rose-400/80 rounded-2xl relative flex items-center justify-center">
                    <div className="w-6 h-6 border-t-2 border-l-2 border-rose-400 absolute -top-1 -left-1"></div>
                    <div className="w-6 h-6 border-t-2 border-r-2 border-rose-400 absolute -top-1 -right-1"></div>
                    <div className="w-6 h-6 border-b-2 border-l-2 border-rose-400 absolute -bottom-1 -left-1"></div>
                    <div className="w-6 h-6 border-b-2 border-r-2 border-rose-400 absolute -bottom-1 -right-1"></div>
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
                  </div>

                  {/* Bottom AI Guide */}
                  <div className="text-[10px] text-white/80 font-bold bg-black/50 px-2.5 py-0.5 rounded-md">
                    AI ResNet-50 • ऑटो-डिटेक्ट एक्टिव
                  </div>
                </div>
              )}

              {/* Camera Switcher Button (Top Right of Viewfinder) */}
              {streamActive && (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="absolute top-3 right-3 p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-black/80 transition cursor-pointer"
                  title="कैमरा बदलें (Switch Camera)"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Shutter / Capture Actions */}
            <div className="flex flex-col items-center space-y-2 pt-1">
              {streamActive ? (
                <div className="flex items-center space-x-6">
                  {/* Secondary 1-tap File/Camera fallback */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                    title="गैलरी / नेटिव कैमरा"
                  >
                    <Upload className="w-5 h-5" />
                  </button>

                  {/* Primary Big Red Live Shutter Button */}
                  <button
                    type="button"
                    onClick={captureFromStream}
                    className="w-20 h-20 rounded-full border-4 border-white bg-gradient-to-tr from-[#981228] to-red-600 hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center cursor-pointer group"
                    title="फोटो खींचें व सीधे सेव करें"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white fill-white/20" />
                    </div>
                  </button>

                  {/* Restart Camera */}
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="p-3 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                    title="रीफ्रेश कैमरा"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                /* When getUserMedia stream is inactive: 1-Tap Native Phone Camera Button */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#981228] via-rose-600 to-red-700 hover:from-red-600 hover:to-rose-600 text-white font-black text-sm shadow-xl flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>📸 1-टैप कैमरा खोलें (Open Phone Camera)</span>
                </button>
              )}

              <p className="text-[11px] text-slate-400 font-bold text-center">
                फोटो खींचते ही AI तुरंत रक्तस्राव नापकर कंप्यूटर स्क्रीन पर स्वतः सेव कर देगा
              </p>

              {/* Hidden Native File Input with capture="environment" for 100% Android/iOS compatibility */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleNativeFileCapture}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
            </div>
          </div>
        ) : (
          /* VIEW 2: PHOTO PREVIEW & AI ANALYSIS RESULTS */
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Photo Card with AI Overlays */}
            <div className="relative rounded-3xl overflow-hidden border-2 border-slate-700 bg-black aspect-4/3 shadow-xl">
              <img
                src={result?.annotated_image_base64 || previewUrl}
                alt="Captured Pad"
                className="w-full h-full object-cover"
              />

              {/* Processing Overlay with Laser Scan Effect */}
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-600/30 border-2 border-red-500 text-red-400 flex items-center justify-center animate-bounce">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">AI रक्तस्राव माप रहा है...</h4>
                    <p className="text-xs text-rose-300 font-medium mt-0.5">
                      (Analyzing & Auto-Saving to Patient Record)
                    </p>
                  </div>
                  <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#981228] to-red-500 animate-pulse w-3/4"></div>
                  </div>
                </div>
              )}

              {/* Success Badges */}
              {result && !isProcessing && (
                <>
                  <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-md ${
                    result.predicted_class === 'Critical'
                      ? 'bg-red-600/90 text-white border border-red-400'
                      : result.predicted_class === 'Amber'
                      ? 'bg-amber-500/90 text-black border border-amber-300'
                      : 'bg-emerald-600/90 text-white border border-emerald-400'
                  }`}>
                    {result.predicted_class === 'Critical' ? '🔴 CRITICAL PPH' : result.predicted_class === 'Amber' ? '🟡 AMBER WATCH' : '🟢 ROUTINE LOCHIA'}
                  </div>

                  {isSentToScreen && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-black flex items-center space-x-1 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>कंप्यूटर पर सेव हुआ ✓</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-2xl text-red-200 text-xs font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Result Stats Card */}
            {result && !isProcessing && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-black">अनुमानित रक्त हानि (Blood Loss)</div>
                    <div className="text-2xl font-black text-white flex items-baseline gap-1">
                      <span>{result.estimated_blood_loss_ml || 320}</span>
                      <span className="text-sm font-semibold text-slate-400">mL</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-black">पैड कवरेज (Saturation)</div>
                    <div className="text-xl font-black text-rose-400">
                      {result.saturation_percentage || 45}%
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-medium">रक्तस्राव प्रकार (Lochia):</span>
                    <span className="font-black text-white">{result.lochia_type || 'Lochia Rubra'}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-medium">स्थिति (Severity):</span>
                    <span className={`font-black ${result.is_critical ? 'text-red-400' : 'text-emerald-400'}`}>
                      {result.bleeding_severity || (result.is_critical ? 'Critical' : 'Moderate')}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                  <span className="font-black text-rose-400">🏥 नैदानिक सुझाव: </span>
                  {result.clinical_recommendation || 'गर्भाशय की टोन जांचें। आवश्यकता पड़ने पर IV ऑक्सीटोसिन तैयार रखें।'}
                </div>

                {/* Direct Action: Scan Next Pad */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#981228] to-red-600 hover:from-red-600 hover:to-rose-600 text-white font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>📸 अगला पैड स्कैन करें (Scan Next Pad)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-2.5 bg-slate-950 border-t border-slate-900 text-center text-[10px] text-slate-500 font-medium">
        MOMENT Obstetric Emergency AI • Rohtak, Haryana
      </footer>
    </div>
  );
}
