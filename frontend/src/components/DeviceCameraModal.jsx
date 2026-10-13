import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, CheckCircle2, AlertTriangle, Droplet, Upload } from 'lucide-react';
import { classifyPadImage, recordBloodLoss } from '../api/client';

export default function DeviceCameraModal({ isOpen, onClose, patientId, onBloodLossRecorded }) {
  const [stream, setStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cvResult, setCvResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [calibratedMlInput, setCalibratedMlInput] = useState(350);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileFallbackRef = useRef(null);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      resetState();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsCameraActive(true);
      } else {
        setIsCameraActive(false);
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setIsCameraActive(false);
      setErrorMsg('कैमरा चालू नहीं हो सका। कृपया फोटो अपलोड करें या नीचे नापकर दर्ज करें।');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const resetState = () => {
    setCapturedBlob(null);
    setCapturedPreview(null);
    setCvResult(null);
    setErrorMsg(null);
  };

  const handleCaptureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Max 1024px for low-end device performance
    const maxDim = 1024;
    let w = video.videoWidth || 640;
    let h = video.videoHeight || 480;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        setCapturedPreview(canvas.toDataURL('image/jpeg', 0.85));
        stopCamera();
        runInference(blob);
      }
    }, 'image/jpeg', 0.85);
  };

  const handleFileFallback = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCapturedBlob(file);
      setCapturedPreview(URL.createObjectURL(file));
      stopCamera();
      runInference(file);
    }
  };

  const runInference = async (blob) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await classifyPadImage(blob);
      setCvResult(res);
    } catch (err) {
      setErrorMsg('इमेज प्रोसेसिंग में समस्या आई। नीचे हाथ से या ड्रेप नाप दर्ज करें।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAndSave = async (volMl, mode = 'CAMERA_RESNET') => {
    setIsLoading(true);
    try {
      const recordRes = await recordBloodLoss({
        patient_id: patientId || 'MOMENT-PT-2916',
        volume_ml: volMl,
        measurement_mode: mode,
        recorded_by: 'ANM Suman Devi'
      });
      onBloodLossRecorded(volMl, recordRes);
      onClose();
    } catch (err) {
      setErrorMsg('रक्तस्राव माप डेटाबेस में सेव नहीं हो सका: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-6 text-slate-900 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                रक्तस्राव नापें / पैड फोटो (Measure Blood Loss)
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                डिलीवरी पैड या ब्रासियर वी-ड्रेप की वास्तविक फोटो जांच
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder or Preview */}
        {!capturedPreview ? (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 flex items-center justify-center border-2 border-slate-300">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Alignment target box */}
                  <div className="absolute inset-8 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-white/80 text-[11px] font-bold bg-black/40 px-2 py-0.5 rounded">
                      पैड को इस फ्रेम के अंदर रखें
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">कैमरा सक्रिय नहीं है (Camera Inactive)</p>
                  <p className="text-[11px] text-slate-400 mt-1">ब्राउज़र में कैमरा अनुमति दें या फ़ाइल चुनें</p>
                  <button
                    onClick={() => fileFallbackRef.current?.click()}
                    className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-[#981228] text-white shadow-xs flex items-center space-x-1.5 mx-auto cursor-pointer hover:bg-red-800 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>📁 फ़ोटो फ़ाइल चुनें (Upload Pad Photo)</span>
                  </button>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />
            <input type="file" ref={fileFallbackRef} onChange={handleFileFallback} accept="image/*" className="hidden" />

            {/* Shutter Button & Upload Options */}
            <div className="flex flex-col items-center justify-center space-y-3 pt-1">
              {isCameraActive && (
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={handleCaptureFrame}
                    className="w-16 h-16 rounded-full border-4 border-red-600 bg-white hover:bg-red-50 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
                    title="फोटो खींचें"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-600"></div>
                  </button>
                </div>
              )}

              {/* Always-Visible Photo Upload and Camera Retry Buttons */}
              <div className="flex items-center justify-center space-x-2 w-full">
                <button
                  type="button"
                  onClick={() => fileFallbackRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-center space-x-1.5 cursor-pointer transition shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#981228]" />
                  <span>📁 फ़ाइल या गैलरी से फ़ोटो चुनें</span>
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className="py-2 px-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 flex items-center space-x-1 cursor-pointer transition shadow-2xs"
                  title="कैमरा पुनः शुरू करें"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>पुनः शुरू</span>
                </button>
              </div>

              {/* Instant Test Samples for Evaluators / Demonstrations */}
              <div className="w-full bg-slate-50 rounded-2xl p-2.5 border border-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5 text-center">
                  🧪 तुरंत टेस्ट करें (1-Tap Simulation):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Generate simulated mild pad canvas blob
                      const c = document.createElement('canvas');
                      c.width = 400; c.height = 300;
                      const ctx = c.getContext('2d');
                      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0,0,400,300);
                      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(200,150,60,0,Math.PI*2); ctx.fill();
                      c.toBlob(b => {
                        setCapturedBlob(b);
                        setCapturedPreview(c.toDataURL());
                        stopCamera();
                        runInference(b);
                      }, 'image/jpeg');
                    }}
                    className="py-1.5 px-2 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 rounded-xl text-[10px] font-bold text-center cursor-pointer transition"
                  >
                    🟢 हल्का (~180mL)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const c = document.createElement('canvas');
                      c.width = 400; c.height = 300;
                      const ctx = c.getContext('2d');
                      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0,0,400,300);
                      ctx.fillStyle = '#991b1b'; ctx.beginPath(); ctx.arc(200,150,110,0,Math.PI*2); ctx.fill();
                      c.toBlob(b => {
                        setCapturedBlob(b);
                        setCapturedPreview(c.toDataURL());
                        stopCamera();
                        runInference(b);
                      }, 'image/jpeg');
                    }}
                    className="py-1.5 px-2 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 rounded-xl text-[10px] font-bold text-center cursor-pointer transition"
                  >
                    🟡 मध्यम (~450mL)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const c = document.createElement('canvas');
                      c.width = 400; c.height = 300;
                      const ctx = c.getContext('2d');
                      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(0,0,400,300);
                      c.toBlob(b => {
                        setCapturedBlob(b);
                        setCapturedPreview(c.toDataURL());
                        stopCamera();
                        runInference(b);
                      }, 'image/jpeg');
                    }}
                    className="py-1.5 px-2 bg-white border border-rose-400 hover:bg-rose-50 text-rose-800 rounded-xl text-[10px] font-bold text-center cursor-pointer transition"
                  >
                    🔴 गंभीर PPH (~850mL)
                  </button>
                </div>
              </div>
            </div>

            {/* Fallback Calibrated Drape Direct Input */}
            <div className="border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-700 block mb-1">
                या वी-ड्रेप / स्केल से नापकर दर्ज करें (Calibrated Drape Fallback):
              </span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={calibratedMlInput}
                  onChange={(e) => setCalibratedMlInput(Number(e.target.value))}
                  className="w-28 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900"
                />
                <span className="text-xs font-bold text-slate-600">मि.ली. (mL)</span>
                <button
                  onClick={() => handleConfirmAndSave(calibratedMlInput, 'CALIBRATED_DRAPE')}
                  className="ml-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  दर्ज करें
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Analysis Result Screen */
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden aspect-16/9 bg-slate-100 border border-slate-200">
              <img src={capturedPreview} alt="Captured Pad" className="w-full h-full object-cover" />
            </div>

            {isLoading && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                <span className="text-xs font-bold text-slate-700">ResNet-50 कंप्यूटर विजन जांच जारी है...</span>
              </div>
            )}

            {cvResult && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">AI पहचान (Detection Result):</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    ((cvResult.predicted_class || cvResult.classification) === 'Critical' || cvResult.is_critical) ? 'bg-red-600 text-white animate-pulse' :
                    (cvResult.predicted_class || cvResult.classification) === 'Amber' ? 'bg-amber-500 text-white' :
                    'bg-emerald-600 text-white'
                  }`}>
                    {(cvResult.predicted_class || cvResult.classification) === 'Critical' ? '🔴 गंभीर PPH (Critical)' :
                     (cvResult.predicted_class || cvResult.classification) === 'Amber' ? '🟡 मध्यम बहाव (Amber Watch)' :
                     '🟢 सामान्य (Routine Lochia)'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between bg-white p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-3xl font-black text-slate-900">{cvResult.estimated_blood_loss_ml || 0}</span>
                    <span className="text-xs font-bold text-slate-500 ml-1">मि.ली. (mL)</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      रक्तस्राव फैलाव: {cvResult.blood_loss_range || `${cvResult.estimated_blood_loss_ml} mL`}
                    </span>
                  </div>
                  {cvResult.saturation_percentage !== undefined && (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">पैड सैचुरेशन</span>
                      <span className="text-lg font-black text-slate-800">{cvResult.saturation_percentage}%</span>
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs font-medium text-amber-950">
                  <strong>क्लिनिकल सलाह:</strong> {cvResult.clinical_recommendation || cvResult.clinical_action || 'गर्भाशय संकुचन (Uterine Tone) की जांच करें और विटल्स दर्ज करें।'}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  resetState();
                  startCamera();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>दोबारा फोटो लें</span>
              </button>

              <button
                disabled={!cvResult || isLoading}
                onClick={() => handleConfirmAndSave(cvResult.estimated_blood_loss_ml, 'CAMERA_RESNET')}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-md transition disabled:opacity-50"
              >
                सेव करें और मरीज डेटा अपडेट करें
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
