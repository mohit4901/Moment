import React, { useState } from 'react';
import {
  Utensils,
  Droplet,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Printer,
  ChevronDown,
  ChevronUp,
  Apple,
  Flame,
  ShieldCheck,
  Heart,
  Info
} from 'lucide-react';
import { speakLocalized } from '../i18n/languages';

export default function PostpartumDietPlanCard({
  dietPlan,
  hemoglobin = 7.6,
  patientName = 'माँ',
  lang = 'hi'
}) {
  const [activeMealTab, setActiveMealTab] = useState('all');
  const [isExpanded, setIsExpanded] = useState(true);

  const plan = dietPlan || {};
  const hbVal = Number(plan.hemoglobin_level || hemoglobin || 7.6);
  const targets = plan.daily_targets || {
    calories: '2,400 – 2,500 kcal/दिन',
    iron: hbVal < 8.0 ? '35 – 40 mg/दिन' : '30 – 35 mg/दिन',
    hydration: '3.5 – 4.0 लीटर',
    calcium: '1,200 mg/दिन',
    protein: '70 – 75 ग्राम/दिन'
  };

  const defaultMeals = [
    {
      time: '06:30 AM',
      period: 'प्रातःकाल (Dawn Awakening)',
      title: 'गर्भाशय रिकवरी व आयरन टॉनिक (Uterine Involutive Tonic)',
      items: [
        '1 गिलास गुनगुना जीरा-अजवाइन का पानी (गर्भाशय संकुचन व गैस निवारण)',
        '5 भीगे बादाम + 5 काली मुनक्का (आयरन व कॉपर का प्राकृतिक स्रोत)',
        '1 छोटा पारंपरिक मेथी या सोंठ-गोंद का लड्डू (कमर दर्द व कमजोरी में अचूक)'
      ],
      nutrients: 'आयरन, एंटीऑक्सीडेंट व गर्भाशय संकुचन हर्ब्स'
    },
    {
      time: '08:30 AM',
      period: 'नाश्ता (Breakfast)',
      title: 'आयरन व प्रोटीन पावर ब्रेकफास्ट (Power Breakfast)',
      items: [
        'रागी का मीठा/नमकीन दलिया या पालक-मेथी से भरी 2 मल्टीग्रेन रोटी',
        '1 कटोरी ताजा दही या 1 उबला अंडा (प्रोटीन व बी-12)',
        'अंकुरित मूंग दाल का चीला पुदीना चटनी के साथ',
        'आधा नींबू निचोड़ें या 1 आंवला खाएं (विटामिन सी से आयरन 3x अवशोषित होता है)'
      ],
      nutrients: 'हीमोग्लोबिन संवर्धन, कैल्शियम व सुपाच्य प्रोटीन'
    },
    {
      time: '11:00 AM',
      period: 'दोपहर पूर्व (Mid-Morning)',
      title: 'हीमोग्लोबिन बूस्टर ड्रिंक (Hemoglobin Booster Drink)',
      items: [
        '1 कटोरी ताजा चुकंदर (Beetroot) + गाजर + टमाटर का गुनगुना सूप',
        'या 1 गिलास ताजा अनार / मौसमी का रस',
        '1 टुकड़ा जैविक देसी गुड़ (Gur) भुने चने के साथ'
      ],
      nutrients: 'फॉलिक एसिड, विटामिन सी व प्लांट-बेस्ड आयरन'
    },
    {
      time: '01:30 PM',
      period: 'दोपहर भोजन (Postpartum Lunch)',
      title: 'संपूर्ण मातृत्व पौष्टिक थाली (Nutrient-Dense Lunch)',
      items: [
        '1 बड़ा कटोरा लोहे की कड़ाही में बनी मसूर या अरहर दाल (लहसुन तड़का)',
        'सहजन की पत्तियां (Moringa) या मेथी-पालक की हरी सब्जी',
        '2 नरम फुलके (देसी गाय के घी से चुपड़े) या उबले चावल',
        'अनिवार्य नियम: दाल पर आधा ताजा नींबू निचोड़ें (नॉन-हीम आयरन 300% सक्रिय होता है)'
      ],
      nutrients: 'उच्च अवशोषण आयरन, कॉम्प्लेक्स कार्ब्स व जिंक'
    },
    {
      time: '05:00 PM',
      period: 'शाम का नाश्ता (Evening Fuel)',
      title: 'हड्डी व स्तनपान शक्ति स्नैक (Lactation Fuel)',
      items: [
        'भुने हुए मखाने + काले तिल (काले तिल में दूध से 6 गुना अधिक कैल्शियम व आयरन)',
        'मुट्ठी भर भुने चने व गुड़',
        '1 कप गुनगुना हल्दी-सौंफ वाला दूध'
      ],
      nutrients: 'कैल्शियम, मैग्नीशियम व प्रोलैक्टिन सपोर्ट'
    },
    {
      time: '08:00 PM',
      period: 'रात्रि भोजन (Healing Dinner)',
      title: 'हल्का व सुपाच्य हीलिंग डिनर (Digestible Dinner)',
      items: [
        'गाय के शुद्ध घी से बनी गर्म मूंग दाल की खिचड़ी',
        'उबली हुई लौकी या तोरी की हल्की सब्जी (पेट पर सुपाच्य)',
        'पालक या सहजन का पतला गर्म सूप'
      ],
      nutrients: 'त्वरित ऊर्जा, आंतों की रिकवरी व निर्जलीकरण से बचाव'
    },
    {
      time: '09:30 PM',
      period: 'सोते समय (Bedtime Protocol)',
      title: 'स्तनपान वर्धक कप व IFA दवा नियम (Nighttime Routine)',
      items: [
        '1 कप गुनगुना दूध जायफल या शतावरी चूर्ण के साथ (दूध प्रवाह हेतु)',
        'विशेष निर्देश: आयरन की लाल गोली (IFA Tablet) दूध के 1.5 घंटे बाद या पानी/नींबू पानी के साथ रात को लें।'
      ],
      nutrients: 'गहरी नींद, गर्भाशय रिकवरी व 100% आयरन एब्जॉर्प्शन'
    }
  ];

  const defaultRules = [
    '✓ स्वर्ण नियम 1 (विटामिन सी पेयरिंग): हर भोजन पर नींबू का रस या आंवला अवश्य लें — विटामिन सी पौधों वाले आयरन का अवशोषण 300% बढ़ा देता है।',
    '✓ स्वर्ण नियम 2 (लोहे की कड़ाही): सब्जी व दाल हमेशा लोहे की कड़ाही में पकाएं — इससे प्रतिदिन 2-4 mg अतिरिक्त जैविक आयरन स्वतः मिलता है।',
    '✗ सख्त निषेध 1 (चाय-कॉफी पर रोक): भोजन व आयरन गोली के 2 घंटे आगे-पीछे चाय, कॉफी या दूध बिल्कुल न पिएं (इनके टैनिन आयरन को 60% ब्लॉक कर देते हैं)।',
    '✗ सख्त निषेध 2: बासी, तला-भुना या बहुत मिर्च-मसालेदार भोजन न खाएं जिससे नवजात शिशु में पेट दर्द (Colic) की समस्या न हो।'
  ];

  const defaultSuperfoods = [
    { name: 'सहजन (Moringa)', role: 'पालक से 3x आयरन व प्रचुर कैल्शियम', icon: '🌿' },
    { name: 'काली मुनक्का (Munakka)', role: 'रक्त कोशिकाओं का तीव्र निर्माण', icon: '🍇' },
    { name: 'रागी (Finger Millet)', role: 'स्तनपान दूध गुणवत्ता व आयरन संतुलन', icon: '🌾' },
    { name: 'देसी गुड़ (Organic Gur)', role: 'आयरन व पाचन शक्ति संवर्धन', icon: '🍯' },
    { name: 'काले तिल (Black Sesame)', role: 'हड्डी मजबूती व मांसपेशी रिकवरी', icon: '✨' },
    { name: 'अंकुरित मूंग (Sprouts)', role: 'सुपाच्य शुद्ध वनस्पति प्रोटीन', icon: '🌱' }
  ];

  const meals = plan.meal_schedule?.length ? plan.meal_schedule : defaultMeals;
  const rules = plan.iron_absorption_rules?.length ? plan.iron_absorption_rules : defaultRules;
  const superfoods = plan.superfoods?.length ? plan.superfoods : defaultSuperfoods;

  const isSevere = hbVal < 8.0;
  const isModerate = hbVal >= 8.0 && hbVal < 11.0;

  const handleAudioSpeech = () => {
    const textToSpeak = lang === 'en'
      ? `Postpartum anemia recovery diet plan for ${patientName}. Maternal hemoglobin is ${hbVal} grams per deciliter. Key instruction: Always squeeze fresh lemon on iron meals to triple absorption. Strictly avoid tea or milk within two hours of meals and take your iron tablet at bedtime.`
      : `मरीज ${patientName} के लिए प्रसवोपरांत एनीमिया रिकवरी डाइट चार्ट। हीमोग्लोबिन स्तर ${hbVal} ग्राम है। मुख्य सलाह: दाल और हरी सब्जी पर नींबू जरूर निचोड़ें जिससे आयरन तीन गुना ज्यादा अवशोषित हो। खाने के दो घंटे तक चाय या दूध न पिएं और रात को सोते समय आयरन की लाल गोली लें।`;
    speakLocalized(textToSpeak, lang || 'hi');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/70 via-white to-rose-50/40 p-5 sm:p-7 shadow-lg space-y-6 animate-in fade-in duration-300">
      {/* ── Header Ribbon ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>NVIDIA Nemotron Maternal AI • MoHFW Anemia Mukt Bharat</span>
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${
              isSevere
                ? 'bg-rose-100 text-red-900 border-rose-300'
                : isModerate
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
            }`}>
              {isSevere ? '🩸 गंभीर एनीमिया (Severe Anemia)' : isModerate ? '⚠️ मध्यम एनीमिया (Moderate Anemia)' : '✅ सुरक्षित हीमोग्लोबिन'} (Hb: {hbVal.toFixed(1)} g/dL)
            </span>
          </div>

          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Utensils className="w-6 h-6 text-[#981228]" />
            <span>
              {lang === 'en'
                ? `Postpartum Recovery & High-Iron Diet Plan (${patientName})`
                : `प्रसवोपरांत मातृत्व स्वास्थ्य व एनीमिया रिकवरी डाइट चार्ट (${patientName})`}
            </span>
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-600">
            {lang === 'en'
              ? 'Scientifically calibrated for rapid hemoglobin replenishment, uterine involution, and optimal breastmilk production.'
              : 'हीमोग्लोबिन को तेजी से बढ़ाने, गर्भाशय रिकवरी और प्रचुर स्तनपान हेतु विशेष रूप से तैयार पोषण योजना।'}
          </p>
        </div>

        {/* Action Buttons: Audio & Print */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleAudioSpeech}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            title="आवाज में सुनें / Listen Diet Advice"
          >
            <Volume2 className="w-4 h-4" />
            <span>{lang === 'en' ? 'Listen' : 'आवाज में सुनें'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs sm:text-sm border border-slate-300 shadow-2xs transition-all cursor-pointer"
            title="प्रिंट करें / Print Diet Chart"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>{lang === 'en' ? 'Print Slip' : 'डाइट पर्ची प्रिंट'}</span>
          </button>
        </div>
      </div>

      {/* ── Daily Nutrient Targets Grid (5 Pillar Metrics) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-rose-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-black text-rose-800 uppercase">
            <span>आयरन (Iron Target)</span>
            <Droplet className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-xl font-black text-rose-950 block">{targets.iron}</span>
            <span className="text-[11px] font-semibold text-rose-700">RBC व हीमोग्लोबिन वृद्धि</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-amber-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-black text-amber-800 uppercase">
            <span>कैलोरी (Calories)</span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-xl font-black text-amber-950 block">{targets.calories}</span>
            <span className="text-[11px] font-semibold text-amber-700">स्तनपान व शारीरिक ऊर्जा</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-blue-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-black text-blue-800 uppercase">
            <span>हाइड्रेशन (Fluids)</span>
            <Droplet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-xl font-black text-blue-950 block">{targets.hydration}</span>
            <span className="text-[11px] font-semibold text-blue-700">जीरा पानी, सूप व दूध</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-black text-emerald-800 uppercase">
            <span>कैल्शियम (Calcium)</span>
            <Heart className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-xl font-black text-emerald-950 block">{targets.calcium}</span>
            <span className="text-[11px] font-semibold text-emerald-700">हड्डी व स्तनपान गुणवत्ता</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-purple-200 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-black text-purple-800 uppercase">
            <span>प्रोटीन (Protein)</span>
            <Apple className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-xl font-black text-purple-950 block">{targets.protein}</span>
            <span className="text-[11px] font-semibold text-purple-700">गर्भाशय ऊतक मरम्मत</span>
          </div>
        </div>
      </div>

      {/* ── Timed Meal-by-Meal Schedule (6 Scheduled Meals) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-[#981228]" />
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              {lang === 'en' ? 'Daily 6-Meal Time Schedule' : 'दैनिक 6 समय की भोजन समय-सारणी (Meal Schedule)'}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {lang === 'en' ? 'Strict 40-Day Postpartum Regimen' : 'प्रसवोपरांत प्रथम 40 दिनों की विशेष खुराक'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {meals.map((meal, mIdx) => (
            <div
              key={mIdx}
              className="p-4 rounded-2xl bg-white border-2 border-slate-200/90 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-900 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>{meal.time}</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {meal.period}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 leading-snug">
                  {meal.title}
                </h4>
              </div>

              {/* Items List */}
              <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                {meal.items?.map((item, iIdx) => (
                  <li key={iIdx} className="flex items-start space-x-1.5">
                    <span className="text-[#981228] font-black text-xs leading-tight flex-shrink-0 mt-0.5">▸</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Nutrition Highlight */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-500">लाभ:</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {meal.nutrients}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Critical Iron Absorption Rules (Dos and Don'ts) ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-100/60 border-2 border-amber-300 space-y-3">
        <div className="flex items-center space-x-2 text-amber-950 font-black text-sm sm:text-base">
          <AlertTriangle className="w-5 h-5 text-amber-800 flex-shrink-0" />
          <span>
            {lang === 'en'
              ? '⚡ Golden Rules for 300% Maximum Iron Absorption'
              : '⚡ आयरन को 300% तेजी से सोखने के अनिवार्य नियम (Dos & Don\'ts)'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {rules.map((rule, rIdx) => {
            const isNegative = rule.includes('निषेध') || rule.includes('DON\'T') || rule.includes('रोक');
            return (
              <div
                key={rIdx}
                className={`p-3 rounded-xl border flex items-start space-x-2 text-xs font-bold leading-relaxed ${
                  isNegative
                    ? 'bg-rose-50/90 border-rose-200 text-red-950'
                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                }`}
              >
                <span>{rule}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Traditional Indian Superfoods Badges ── */}
      <div className="space-y-2.5">
        <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
          <span>🌿</span>
          <span>
            {lang === 'en'
              ? 'Essential Traditional Postpartum Superfoods'
              : 'पारंपरिक भारतीय मातृत्व सुपरफूड्स (High-Iron Superfoods)'}
          </span>
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {superfoods.map((food, fIdx) => (
            <div
              key={fIdx}
              className="p-3 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-2xs hover:scale-102 transition-transform"
            >
              <div className="text-2xl">{food.icon}</div>
              <span className="text-xs font-black text-slate-900 block leading-tight">{food.name}</span>
              <span className="text-[10px] font-semibold text-slate-500 block leading-tight">{food.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Caring Advice Banner ── */}
      {dietPlan.clinical_advice_localized && (
        <div className="p-4 rounded-2xl bg-white border-2 border-[#981228]/20 flex items-start space-x-3 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-[#981228] flex-shrink-0 font-bold">
            ❤️
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#981228] block">
              {lang === 'en' ? 'ANM & Obstetrician Guidance' : 'एएनएम व डॉक्टर की व्यक्तिगत सलाह:'}
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed mt-0.5">
              {dietPlan.clinical_advice_localized}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
