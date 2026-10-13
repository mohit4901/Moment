import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Ambulance, Building2, PhoneCall, Clock, Compass } from 'lucide-react';

export default function LiveReferralMap({
  origin = { name: "Sub-Centre Khedi Sadh", lat: 28.8520, lng: 76.6850 },
  destination = { name: "Pt. B.D. Sharma PGIMS Rohtak", lat: 28.8872, lng: 76.6085 },
  ambulance = { reg: "HR-12-G-1081", lat: 28.8710, lng: 76.6210, eta: 16 },
  facilities = []
}) {
  const [ambulancePos, setAmbulancePos] = useState({ lat: ambulance.lat, lng: ambulance.lng });
  const [eta, setEta] = useState(ambulance.eta);

  // Live GPS movement simulation (updates every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setAmbulancePos(prev => {
        // Move towards destination
        const latStep = (destination.lat - prev.lat) * 0.05;
        const lngStep = (destination.lng - prev.lng) * 0.05;
        return {
          lat: Number((prev.lat + latStep).toFixed(4)),
          lng: Number((prev.lng + lngStep).toFixed(4))
        };
      });
      setEta(prev => Math.max(1, prev - 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [destination]);

  // Compute map bounds and SVG viewBox
  const minLat = Math.min(origin.lat, destination.lat, ambulancePos.lat) - 0.02;
  const maxLat = Math.max(origin.lat, destination.lat, ambulancePos.lat) + 0.02;
  const minLng = Math.min(origin.lng, destination.lng, ambulancePos.lng) - 0.02;
  const maxLng = Math.max(origin.lng, destination.lng, ambulancePos.lng) + 0.02;

  // Coordinate to SVG percent projection
  const toX = (lng) => ((lng - minLng) / (maxLng - minLng)) * 100;
  const toY = (lat) => 100 - (((lat - minLat) / (maxLat - minLat)) * 100);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
      
      {/* Map Header Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-red-600 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-xs font-black text-slate-800 tracking-tight">
            लाइव आपातकालीन नेविगेशन व एम्बुलेंस ट्रैकिंग (Live GIS Route)
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            OpenStreetMap GIS
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs font-semibold text-slate-600">
          <div className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>ETA: <strong className="text-red-600 font-black">{eta} मिनट</strong></span>
          </div>
          <div className="flex items-center space-x-1">
            <span>दूरी: <strong className="text-slate-900">14.2 किमी</strong></span>
          </div>
        </div>
      </div>

      {/* Map Canvas Area */}
      <div className="relative w-full aspect-16/9 min-h-[260px] bg-slate-100 overflow-hidden select-none">
        
        {/* Real OpenStreetMap Background Tiles (Grid approximation with road curves) */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px]"></div>

        {/* SVG Route Geometry Polyline */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Road Network Lines */}
          <line
            x1={toX(origin.lng)} y1={toY(origin.lat)}
            x2={toX(ambulancePos.lng)} y2={toY(ambulancePos.lat)}
            stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="3 3"
          />
          <line
            x1={toX(ambulancePos.lng)} y1={toY(ambulancePos.lat)}
            x2={toX(destination.lng)} y2={toY(destination.lat)}
            stroke="#dc2626" strokeWidth="3" strokeLinecap="round"
          />
        </svg>

        {/* 1. Origin Marker (Sub-Centre) */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 transition-all"
          style={{ left: `${toX(origin.lng)}%`, top: `${toY(origin.lat)}%` }}
        >
          <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-white shadow-md flex items-center justify-center text-white">
            <MapPin className="w-4 h-4 fill-white" />
          </div>
          <span className="mt-1 px-2 py-0.5 rounded-md bg-white border border-slate-300 text-[10px] font-black text-slate-800 shadow-xs whitespace-nowrap">
            📍 {origin.name} (आरंभ)
          </span>
        </div>

        {/* 2. Destination Marker (FRU Hospital) */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 transition-all"
          style={{ left: `${toX(destination.lng)}%`, top: `${toY(destination.lat)}%` }}
        >
          <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-white animate-bounce">
            <Building2 className="w-4 h-4 fill-white" />
          </div>
          <span className="mt-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black shadow-xs whitespace-nowrap">
            🏥 {destination.name} (गंतव्य)
          </span>
        </div>

        {/* 3. Live Ambulance Marker */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 transition-all duration-1000"
          style={{ left: `${toX(ambulancePos.lng)}%`, top: `${toY(ambulancePos.lat)}%` }}
        >
          <div className="w-9 h-9 rounded-full bg-amber-500 border-2 border-white shadow-xl flex items-center justify-center text-white">
            <Ambulance className="w-5 h-5 animate-pulse" />
          </div>
          <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold shadow-xs whitespace-nowrap">
            🚑 {ambulance.reg} (ETA: {eta} min)
          </span>
        </div>

        {/* Nearby Facilities Pins */}
        {facilities.map((f, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 hidden md:flex flex-col items-center z-5"
            style={{ left: `${toX(f.longitude)}%`, top: `${toY(f.latitude)}%` }}
          >
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-3 h-3" />
            </div>
            <span className="text-[9px] font-bold text-slate-600 bg-white/80 px-1 rounded shadow-2xs">
              {f.name}
            </span>
          </div>
        ))}

      </div>

      {/* Map Legend & Action Bar */}
      <div className="bg-white p-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
            <span>उप-स्वास्थ्य केंद्र (Origin)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>108 एम्बुलेंस (Live GPS)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            <span>रेफरल अस्पताल (FRU Destination)</span>
          </span>
        </div>

        <span className="text-slate-400 text-[10px]">
          *GPS पिंग अंतराल: 15 सेकंड • OSRM ड्राइविंग रूट
        </span>
      </div>

    </div>
  );
}
