import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, Volume2, Search, SlidersHorizontal } from 'lucide-react';
import { INDIAN_LANGUAGES, speakLocalized } from '../i18n/languages';
import i18n from '../i18n/i18n';
import LanguageSelectorModal from './LanguageSelectorModal';

export default function LanguagePickerTrigger({ lang = 'hi', setLang }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  const currentLangObj = INDIAN_LANGUAGES.find(l => l.code === lang) || INDIAN_LANGUAGES[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (code) => {
    if (setLang) setLang(code);
    try {
      i18n.changeLanguage(code);
    } catch (e) {
      console.warn('i18n error:', e);
    }
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('moment_lang', code);
        const cookieVal = `/en/${code}`;
        document.cookie = `googtrans=${cookieVal}; path=/;`;
        document.cookie = `googtrans=${cookieVal}; domain=${window.location.hostname}; path=/;`;
        const select = document.querySelector('.goog-te-combo');
        if (select) {
          select.value = code;
          select.dispatchEvent(new Event('change'));
        }
      } catch (e) {}
    }
    const selected = INDIAN_LANGUAGES.find(l => l.code === code);
    if (selected?.sampleGreeting) {
      speakLocalized(selected.sampleGreeting, code);
    }
    setDropdownOpen(false);
  };

  const filteredLanguages = INDIAN_LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
    l.region.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left notranslate flex-shrink-0" ref={dropdownRef} translate="no">
      {/* ── Sleek, Compact, Non-wrapping Language Trigger Button ── */}
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center space-x-1.5 h-9 px-2.5 sm:px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm border border-slate-300 hover:border-[#981228] transition-all cursor-pointer whitespace-nowrap flex-shrink-0 shadow-2xs select-none"
        title="भाषा चुनें (Select Regional Indian Language)"
        id="language-dropdown-button"
      >
        <div className="w-5 h-5 rounded-full bg-rose-50 flex items-center justify-center text-[#981228] flex-shrink-0">
          <Globe className="w-3.5 h-3.5" />
        </div>
        <span className="font-extrabold text-slate-900 tracking-tight">
          {currentLangObj.nativeName}
        </span>
        <span className="text-[10px] text-slate-500 font-mono uppercase font-bold hidden sm:inline">
          ({currentLangObj.code})
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${dropdownOpen ? 'rotate-180 text-[#981228]' : ''}`} />
      </button>

      {/* ── Rich Anchored Dropdown Menu (22+ Languages List) ── */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-3xl bg-white border-2 border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Dropdown Header */}
          <div className="p-3 bg-gradient-to-r from-rose-50 via-white to-amber-50 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-[#981228]" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  22+ भारतीय भाषाएं (Indian Languages)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setModalOpen(true);
                }}
                className="text-[11px] font-bold text-[#981228] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Full Search</span>
              </button>
            </div>

            {/* In-Dropdown Live Filter Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search language or state..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#981228]/20 focus:border-[#981228]"
                autoFocus
              />
            </div>
          </div>

          {/* Scrollable Language Options List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1.5">
            {filteredLanguages.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 font-medium">
                No matching language found
              </div>
            ) : (
              filteredLanguages.map((l) => {
                const isSelected = l.code === lang;
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => handleSelectLanguage(l.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 text-[#981228] font-black'
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-[#981228] text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {l.code.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-black tracking-tight">
                            {l.nativeName}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            ({l.name})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">
                          {l.region}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {/* Audio audition button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakLocalized(l.sampleGreeting, l.code);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-white transition cursor-pointer"
                        title="Listen Voice Greeting"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#981228] text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick select bottom bar */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-600">
              🇮🇳 Official 22 Eighth Schedule Indian Languages + English
            </span>
          </div>
        </div>
      )}

      {/* Full Modal Search Dialog as Option */}
      <LanguageSelectorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentLang={lang}
        onSelectLanguage={handleSelectLanguage}
      />
    </div>
  );
}
