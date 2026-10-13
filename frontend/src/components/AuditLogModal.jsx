import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, X, FileText, User, Clock } from 'lucide-react';
import { fetchAuditLogs } from '../api/client';

export default function AuditLogModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAuditLogs(60);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 text-slate-900 my-8">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                क्लिनिकल ऑडिट ट्रेल (Production Audit Trail)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                अपरिवर्तनीय लॉग: मरीज पंजीकरण, AI मूल्यांकन, वाइटल्स व Twilio डिस्पैच रिकॉर्ड
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-600" />
            <span className="text-xs font-bold">ऑडिट लॉग लोड हो रहे हैं...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">कोई ऑडिट रिकॉर्ड नहीं मिला।</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-[10px] uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="font-bold text-slate-900">Resource: {log.resource_type} ({log.resource_id})</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    User: <strong>{log.user_id}</strong>
                    {log.details_json && <span className="ml-2 font-mono text-slate-600">{log.details_json.slice(0, 80)}</span>}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-1 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{log.timestamp?.replace('T', ' ').slice(0, 19)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
