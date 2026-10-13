import React, { useState, useMemo } from 'react';
import { Globe, Search, Check, Volume2, X, Sparkles } from 'lucide-react';
import { INDIAN_LANGUAGES, TOP_REGIONAL_LANGUAGES, speakLocalized } from '../i18n/languages';
import i18n from '../i18n/i18n';

export default function LanguageSelectorModal({
  currentLang = 'hi',
  onSelectLanguage,
  isOpen,
  onClose
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const currentLangObj = useMemo(() => {
    return INDIAN_LANGUAGES.find(l => l.code === currentLang) || INDIAN_LANGUAGES[0];
  }, [currentLang]);

  const filteredLanguages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return INDIAN_LANGUAGES;
    return INDIAN_LANGUAGES.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.region.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelect = (code) => {
    if (onSelectLanguage) {
      onSelectLanguage(code);
    }
    // Change language in i18next runtime
    try {
      i18n.changeLanguage(code);
    } catch (e) {
      console.warn('i18next changeLanguage error:', e);
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('moment_lang', code);
    }
    // Speak a brief greeting in the newly selected language
    const langObj = INDIAN_LANGUAGES.find(l => l.code === code);
    if (langObj?.sampleGreeting) {
      speakLocalized(langObj.sampleGreeting, code);
    }
    if (onClose) onClose();
  };

  const handlePreviewVoice = (e, langObj) => {
    e.stopPropagation();
    speakLocalized(langObj.sampleGreeting, langObj.code);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/50 via-white to-amber-50/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-[#981228] flex items-center justify-center shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  भाषा चुनें / Select Regional Language
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#981228] text-white">
                  22+ Indian Languages
                </span>
              </div>
              <p className="text-xs text-slate-500">
                भारत के संविधान की 8वीं अनुसूची की सभी 22 आधिकारिक भाषाएं समर्थित हैं
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="भाषा या राज्य खोजें (e.g. বাংলা, Tamil, Telugu, Maharashtra, Kerala)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#981228]/20 focus:border-[#981228]"
            />
          </div>

          {/* Top Quick-Select Pills */}
          {!searchQuery && (
            <div className="mt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                लोकप्रिय क्षेत्रीय भाषाएं (Popular Regional Languages):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TOP_REGIONAL_LANGUAGES.map(code => {
                  const lang = INDIAN_LANGUAGES.find(l => l.code === code);
                  if (!lang) return null;
                  const isCurrent = currentLang === code;
                  return (
                    <button
                      key={code}
                      onClick={() => handleSelect(code)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer border ${
                        isCurrent
                          ? 'bg-[#981228] text-white border-[#981228] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span>{lang.nativeName}</span>
                      <span className={`text-[10px] ${isCurrent ? 'text-rose-200' : 'text-slate-400'}`}>
                        ({lang.name})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Languages Scrollable Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredLanguages.map(lang => {
              const isCurrent = currentLang === lang.code;
              return (
                <div
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between text-left group ${
                    isCurrent
                      ? 'bg-rose-50/90 border-[#981228] shadow-sm ring-2 ring-[#981228]/10'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-slate-900 group-hover:text-[#981228] transition">
                        {lang.nativeName}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        • {lang.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {lang.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {lang.region}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    {/* Speaker Preview Button */}
                    <button
                      type="button"
                      onClick={e => handlePreviewVoice(e, lang)}
                      title={`आवाज़ सुनें / Listen preview in ${lang.name}`}
                      className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-[#981228] flex items-center justify-center transition cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Active Checkmark */}
                    {isCurrent ? (
                      <div className="w-6 h-6 rounded-full bg-[#981228] text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-slate-200 group-hover:border-slate-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredLanguages.length === 0 && (
            <div className="text-center py-10">
              <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">
                "{searchQuery}" नाम की कोई भाषा नहीं मिली
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">वर्तमान भाषा:</span>
            <span className="font-black text-slate-800 font-mono">
              {currentLangObj.nativeName} ({currentLangObj.name})
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#981228] hover:bg-red-800 text-white rounded-xl font-bold transition cursor-pointer shadow-xs"
          >
            लागू करें (Done)
          </button>
        </div>
      </div>
    </div>
  );
}
