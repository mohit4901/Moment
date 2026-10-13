import React from 'react';
import { Camera, Activity, HeartPulse, ClipboardCheck, BarChart3, ShieldAlert, Cpu } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, backendStatus }) {
  const tabs = [
    { id: 'scanner', label: 'Pad Scanner (OpenCV)', icon: Camera, badge: 'Live CV' },
    { id: 'triage', label: 'Patient Risk Triage', icon: Activity, badge: 'Ensemble' },
    { id: 'shock', label: 'Shock Index Monitor', icon: HeartPulse, badge: 'Vitals' },
    { id: 'protocol', label: 'Emergency Checklist', icon: ClipboardCheck, badge: 'WHO/FIGO' },
    { id: 'metrics', label: 'AI Model Benchmarks', icon: BarChart3, badge: 'ROC 0.94' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-900/30 ring-1 ring-rose-400/30">
              <HeartPulse className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white">MOMENT</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  OBSTETRIC AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Multimodal Postpartum Hemorrhage Early Warning System
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-900/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* System Status Pill */}
          <div className="flex items-center space-x-3">
            <div
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono border ${
                backendStatus === 'healthy'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === 'healthy' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              <span className="hidden sm:inline">
                {backendStatus === 'healthy' ? 'Engines Online (4 AI + CV)' : 'Connecting...'}
              </span>
              <span className="sm:hidden">{backendStatus === 'healthy' ? 'Online' : 'Sync'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-800/60 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition-all ${
                  isActive
                    ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
