import React, { useState, useEffect } from 'react';
import AssessmentForm from './components/AssessmentForm';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { calculateBigFiveScores, getRandom30Questions } from './scoreCalculator';
import { questionsData } from './questions.js';
import { generateUniqueCode } from './services/localCodeService';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://fas-a-reyalite-m.onrender.com';

export default function App() {
  const [lang, setLang] = useState('fr');
  const [accessCode, setAccessCode] = useState('');

 useEffect(() => {
  const existingSession = localStorage.getItem('fas_active_session');
  if (existingSession) {
    try {
      const parsed = JSON.parse(existingSession);
      if (parsed.code) {
        setAccessCode(parsed.code);
        return;
      }
    } catch (e) {
      console.error(e);
    }
  }
  // Remplacez generateUniqueCode() par ceci :
  const newCode = crypto.randomUUID().split('-')[0].toUpperCase();
  setAccessCode(newCode);
  localStorage.setItem('fas_active_session', JSON.stringify({ code: newCode }));
}, []);
  const [step, setStep] = useState('welcome'); // welcome, quiz, clinical_questions, paywall, loading, result, crisis
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [reportText, setReportText] = useState('');
  const [crisisData, setCrisisData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [calculatedScores, setCalculatedScores] = useState(null);
  const [userComment, setUserComment] = useState('');
  const [copied, setCopied] = useState(false);
  const [pinCode, setPinCode] = useState('');

  const [clinicalContext, setClinicalContext] = useState({
    duration: '1_to_6_months',
    impact: 'moderate',
    relational_status: 'in_couple',
    solitude_nature: 'chosen',
    solitude_impact: 'negative',
    employment_type: 'employed',
    work_satisfaction: 'stressful',
    social_network_quality: 'supportive',
    sleep: 'disturbed',
    energy: 'low',
    anhedonia: false,
    sources_of_satisfaction: '',
    sources_of_fatigue: '',
    unfulfilled_desires: '', // Sa l te anvi konble ki pa konble (oubyen konble)
    major_disappointments: '',
    recent_change: '',
    recent_change_detail: '',
    current_pressure: '',
    current_resources: '',
    current_vs_usual: ''
  });

  const startAssessment = () => {
    const questions30 = getRandom30Questions(questionsData);
    setActiveQuestions(questions30);
    setCurrentIndex(0);
    setUserAnswers({});
    setReportText('');
    setErrorMessage(null);
    setCrisisData(null);
    setStep('quiz');
  };

  const handleAnswer = (score) => {
    const currentQ = activeQuestions[currentIndex];
    setUserAnswers(prev => ({ ...prev, [currentQ.id]: score }));

    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setStep('clinical_questions');
    }
  };

// Fonksyon pou voye done epi verifye kòd la ak sèvè Flask la
  const sendResultsToBackend = async () => {
    // Netwaye epi prepare kòd ak PIN
    const safeAccessCode = (accessCode || '').trim();
    const safePinCode = (pinCode || '').trim();

    // 1. Validate anvan n voye
    if (!safeAccessCode) {
      alert(lang === 'fr' ? "Veuillez entrer le code d'accès." : "Tanpri antre kòd daksè a.");
      return;
    }

    setBackendLoading(true);
    setBackendError(null);

    try {
      // 2. Voye presizeman non kle Flask ap tann yo (input_code ak input_pin)
      const response = await fetch(`${BACKEND_URL}/api/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_code: safeAccessCode, // <-- Flask ap tann input_code!
          input_pin: safePinCode,   // <-- Flask ap tann input_pin!
          scores: scores,
          clinical_context: {
            ...clinicalContext,
            baseline_period: '2_to_3_years'
          },
          type: 'bfi_30',
          lang: lang
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Si gen yon erè nan kòd la oswa PIN nan, afiche mesaj erè sèvè a bay
        throw new Error(data.error || (lang === 'fr' ? "Code d'accès invalide." : "Kòd daksè a pa bon."));
      }

      // Si tout bagay OK, sove rapò a epi lage rezilta yo!
      setBackendReport(data.report || data);
      setIsUnlocked(true); // <--- Sa ap debloke rezilta a pou moun lan ka wè l
    } catch (err) {
      console.error("Erè backend:", err);
      setBackendError(err.message);
      alert(err.message);
    } finally {
      setBackendLoading(false);
    }
  };

  // Fonksyon pou bouton "Générer mon rapport" an
const handleVerifyAndGenerate = async () => {
  const safeAccessCode = (accessCode || '').trim();
  const safePinCode = (pinCode || '').trim();

  if (!safeAccessCode) {
    alert(lang === 'fr' ? "Veuillez entrer le code d'accès." : "Tanpri antre kòd daksè a.");
    return;
  }

  setErrorMessage(null);
  const scores = calculateBigFiveScores(activeQuestions, userAnswers);
  setCalculatedScores(scores);

  try {
    const response = await fetch(`${API_URL}/api/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_code: safeAccessCode, 
        input_pin: safePinCode,
        scores: scores,
        clinical_context: {
          ...clinicalContext,
          baseline_period: '2_to_3_years'
        },
        type: 'bfi_30',
        lang: lang
      })
    });

    if (response.status === 429) {
      setErrorMessage(
        lang === 'fr'
          ? "Limite quotidienne de tests atteinte (3/3). Réessayez demain."
          : "Ou rive nan limit tès ou pou jodi a (3/3)."
      );
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || (lang === 'fr' ? "Code d'accès invalide." : "Kòd daksè a pa bon."));
    }

    if (data.crisis) {
      setCrisisData(data);
      setStep('crisis');
      return;
    }

    if (data.report) {
      setReportText(data.report);
      localStorage.removeItem('fas_active_session');
      setStep('result');
    }

  } catch (error) {
    console.error("Backend error:", error);
    setErrorMessage(error.message || (lang === 'fr' ? "Erreur de connexion." : "Erè nan rekiperasyon rapò a."));
  }
};
  const handleCopyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

const handleReset = () => {
    // EFASE SESYON AN NAN LOCALSTORAGE POU YON NOUVO KÒD KA JENERE!
    localStorage.removeItem('fas_active_session');

    // Jenere yon nouvo kòd inik pou pwochen moun nan
   const newCode = crypto.randomUUID().split('-')[0].toUpperCase();
setAccessCode(newCode);

    if (typeof setPinCode === 'function') setPinCode('');
    setUserComment('');
    setErrorMessage(null);
    setCrisisData(null);
    setCalculatedScores(null);
    setActiveQuestions([]);
    setCurrentIndex(0);
    setUserAnswers({});
    setClinicalContext({
      duration: '1_to_6_months',
      impact: 'moderate',
      relational_status: 'in_couple',
      solitude_nature: 'chosen',
      solitude_impact: 'negative',
      employment_type: 'employed',
      work_satisfaction: 'stressful',
      social_network_quality: 'supportive',
      sleep: 'disturbed',
      energy: 'low',
      anhedonia: false,
      sources_of_satisfaction: '',
      sources_of_fatigue: '',
      unfulfilled_desires: '',
      major_disappointments: '',
      recent_change: '',
      recent_change_detail: '',
      current_pressure: '',
      current_resources: '',
      current_vs_usual: ''
    });
    setStep('welcome');
  };
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 flex gap-2 print:hidden">
        <button 
          onClick={() => setLang('fr')} 
          className={`px-3 py-1 rounded text-sm font-semibold transition ${lang === 'fr' ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
          Français
        </button>
        <button 
          onClick={() => setLang('ht')} 
          className={`px-3 py-1 rounded text-sm font-semibold transition ${lang === 'ht' ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
          Kreyòl
        </button>
      </div>

      <div className="max-w-3xl w-full bg-slate-800 p-8 rounded-2xl shadow-xl my-8 border border-slate-700">
        
        {/* Global Error Notice */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-900/40 border border-rose-500 rounded-xl text-rose-200 text-sm">
            <p className="font-semibold">{errorMessage}</p>
          </div>
        )}

        {/* 1. Welcome */}
        {step === 'welcome' && (
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-3 text-indigo-400">
              {lang === 'fr' ? "Évaluation Clinique & Profil Big Five" : "Evalyasyon Klinik ak Profil Big Five"}
            </h1>

            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              {lang === 'fr' 
                ? "Évaluez vos traits de personnalité et votre état émotionnel en 30 questions (~4 min) pour obtenir une synthèse fondée sur le DSM-5."
                : "Evalye karakteristik pèsonalite w ak jan w jere emosyon w nan 30 kesyon (~4 min) pou jwenn yon rapò baze sou DSM-5."}
            </p>

            <div className="mb-6 p-4 bg-slate-900/90 border border-slate-700 rounded-xl text-left space-y-3">
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                {lang === 'fr' ? "💡 Ce que vous allez évaluer :" : "💡 Sa ou pral evalye :"}
              </h3>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <p>
                    <strong className="text-white">
                      {lang === 'fr' ? "Traits de caractère (Personnalité) : " : "Karakteristik pèsonalite : "}
                    </strong>
                    {lang === 'fr'
                      ? "Vos tendances durables à penser, agir et interagir avec votre environnement."
                      : "Fason ou abitye panse, reponn ak agir nan lavi chak jou w."}
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <p>
                    <strong className="text-white">
                      {lang === 'fr' ? "États émotionnels : " : "Eta emosyonèl : "}
                    </strong>
                    {lang === 'fr'
                      ? "Votre gestion du stress, de l'anxiété et de l'humeur au quotidien."
                      : "Jan ou jere stres, enkyetid ak chanjman nan imè w nan moman sa a."}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-amber-300 flex items-start gap-2">
                <span>⚠️</span>
                <p>
                  <strong>{lang === 'fr' ? "Consigne importante : " : "Konsèy enpòtan : "}</strong>
                  {lang === 'fr'
                    ? "Répondez en fonction de ce que vous êtes en général ces 2 à 3 dernières années, et non en fonction de votre humeur ou émotion d'aujourd'hui."
                    : "Reponn dapre jan ou ye an jeneral nan 2 ak 3 dènijè ane sa yo, pa reponn sou emosyon oswa jan ou santi w jodi a sèlman."}
                </p>
              </div>
            </div>

            <button 
              onClick={startAssessment}
              className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3.5 rounded-xl font-bold transition w-full shadow-lg shadow-indigo-600/30">
              {lang === 'fr' ? "Commencer l'évaluation (30 questions)" : "Kòmanse tès la (30 kesyon)"}
            </button>
          </div>
        )}

        {/* 2. Quiz */}
        {step === 'quiz' && activeQuestions.length > 0 && (
          <div>
            <div className="flex justify-between text-sm text-indigo-400 font-medium mb-2">
              <span>{lang === 'fr' ? "Question" : "Kesyon"} {currentIndex + 1} / {activeQuestions.length}</span>
              <span>{lang === 'fr' ? "Évaluation psychométrique" : "Evalyasyon psikometrik"}</span>
            </div>
            
            <div className="w-full bg-slate-700 h-2 rounded-full mb-4">
              <div 
                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }}>
              </div>
            </div>

            <div className="mb-6 p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-lg text-xs text-amber-200">
              📌 <strong>{lang === 'fr' ? "Rappel :" : "Rapele w :"}</strong>{" "}
              {lang === 'fr'
                ? "Basez vos réponses sur votre comportement général ces 2 à 3 dernières années, pas sur votre état d'esprit du moment."
                : "Reponn dapre jan ou ye an jeneral nan 2 ak 3 dènijè ane sa yo, pa sou emosyon ou santi kounye a."}
            </div>

            <h2 className="text-xl font-semibold my-6 text-slate-100">
              {lang === 'fr' ? activeQuestions[currentIndex].text : activeQuestions[currentIndex].text_ht}
            </h2>

            <div className="flex flex-col gap-3">
              {LIKERT_OPTIONS.map((opt) => (
                <button 
                  key={opt.val} 
                  onClick={() => handleAnswer(opt.val)} 
                  className="bg-slate-700 hover:bg-indigo-600 p-3.5 rounded-xl text-left transition font-medium border border-slate-600 hover:border-indigo-400">
                  {lang === 'fr' ? opt.labelFr : opt.labelHt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Clinical Context - Dimensions Holistiques & DSM-5 */}
        {step === 'clinical_questions' && (
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            
            <div>
              <h2 className="text-xl font-bold text-indigo-400">
                {lang === 'fr' ? "Précisions sur votre situation globale" : "Pwofondi sou sitiyasyon w"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'fr' 
                  ? "Ces informations permettent d'adapter l'analyse à votre quotidien réel (DSM-5)." 
                  : "Enfòmasyon sa yo pèmèt nou jwenn yon analiz ki pi egzak sou lavi w."}
              </p>
            </div>

            {/* SECTION A : Durée & Impact Clinique */}
            <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/80">
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                {lang === 'fr' ? "1. Durée & Évaluation de l'impact" : "1. Dure ak Enpak sou lavi w"}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'fr' ? "Depuis combien de temps ?" : "Depi konbyen tan?"}
                  </label>
                  <select 
                    value={clinicalContext.duration}
                    onChange={(e) => setClinicalContext({...clinicalContext, duration: e.target.value})}
                    className="w-full bg-slate-800 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-indigo-500">
                    <option value="less_than_1_month">{lang === 'fr' ? "Moins d'un mois (Aigu)" : "Mwen pase yon mwa"}</option>
                    <option value="1_to_6_months">{lang === 'fr' ? "De 1 à 6 mois (Épisodique)" : "Ant 1 ak 6 mwa"}</option>
                    <option value="more_than_6_months">{lang === 'fr' ? "Plus de 6 mois (Persistant)" : "Plis pase 6 mwa (Chwonik)"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'fr' ? "Impact au quotidien ?" : "Ki enpak li genyen?"}
                  </label>
                  <select 
                    value={clinicalContext.impact}
                    onChange={(e) => setClinicalContext({...clinicalContext, impact: e.target.value})}
                    className="w-full bg-slate-800 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-indigo-500">
                    <option value="none">{lang === 'fr' ? "Aucun impact notable" : "Okenn enpak enpòtan"}</option>
                    <option value="mild">{lang === 'fr' ? "Léger (gêne mineure)" : "Lejè (ti anvi)"}</option>
                    <option value="moderate">{lang === 'fr' ? "Modéré (détresse / difficulté)" : "Modere (difikilte nan lavi a)"}</option>
                    <option value="severe">{lang === 'fr' ? "Sévère (altération forte)" : "Grav (anpil pwoblèm)"}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION B : Cadre Relationnel & Solitude */}
            <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/80">
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                {lang === 'fr' ? "2. Vie Relationnelle & Solitude" : "2. Lavi Relasyonèl ak Izolman"}
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'fr' ? "Situation relationnelle :" : "Sitiyasyon relasyonèl w :"}
                  </label>
                  <select 
                    value={clinicalContext.relational_status}
                    onChange={(e) => setClinicalContext({...clinicalContext, relational_status: e.target.value})}
                    className="w-full bg-slate-800 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-indigo-500">
                    <option value="in_couple">{lang === 'fr' ? "En couple / Marié(e)" : "An koup / Marye"}</option>
                    <option value="single_chosen">{lang === 'fr' ? "Célibataire (Choix personnel)" : "Selibatè (Chwa pa w)"}</option>
                    <option value="single_separated">{lang === 'fr' ? "Séparé(e) / En rupture récente" : "Separe / Nan yon separasyon sa pa gen lontan"}</option>
                    <option value="cohabiting">{lang === 'fr' ? "Vie commune / Famille proche" : "Ap viv ak fanmi oswa lòt moun"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {lang === 'fr' ? "Comment vivez-vous vos moments de solitude ?" : "Kijan ou viv moman lè ou pou kont ou?"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setClinicalContext({...clinicalContext, solitude_nature: 'chosen'})}
                      className={`p-2.5 rounded-xl border text-xs text-left transition ${
                        clinicalContext.solitude_nature === 'chosen' 
                          ? 'bg-indigo-600 border-indigo-400 text-white font-semibold' 
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}>
                      {lang === 'fr' ? "🌱 Choix ressourçant" : "🌱 Yon chwa (li fè m bien)"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setClinicalContext({...clinicalContext, solitude_nature: 'inflicted'})}
                      className={`p-2.5 rounded-xl border text-xs text-left transition ${
                        clinicalContext.solitude_nature === 'inflicted' 
                          ? 'bg-indigo-600 border-indigo-400 text-white font-semibold' 
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}>
                      {lang === 'fr' ? "😔 Subie / Isolement" : "😔 Sibi m sibi l (izolman)"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION C : Travail, Activité & Vitalité */}
            <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/80">
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                {lang === 'fr' ? "3. Activité, Énergie & Sommeil" : "3. Travay, Enèji ak Dòmi"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'fr' ? "Ressenti au travail / études :" : "Kijan w santi w nan travay / lekòl?"}
                  </label>
                  <select 
                    value={clinicalContext.work_satisfaction}
                    onChange={(e) => setClinicalContext({...clinicalContext, work_satisfaction: e.target.value})}
                    className="w-full bg-slate-800 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-indigo-500">
                    <option value="rewarding">{lang === 'fr' ? "Épanouissant / Satisfaisant" : "Mwen kontan nan sa m ap fè a"}</option>
                    <option value="stressful">{lang === 'fr' ? "Stressant / Exigeant" : "Li strese m / Li mande anpil fòs"}</option>
                    <option value="exhausting">{lang === 'fr' ? "Épuisant / Source d'anxiété" : "Li fatige m anpil / Li ban m tèt chaje"}</option>
                  </select>
                </div>
                 {/* SECTION D : Kontèks Resan & Desepsyon / Fristrasyon */}
<div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/80">
  <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
    {lang === 'fr' ? "4. Événements récents & Attentes" : "4. Evènman resan ak Sa w t ap tann"}
  </h3>

  <div>
    <label className="block text-xs font-semibold text-slate-300 mb-1">
      {lang === 'fr' 
        ? "Qu'est-ce qui vous intéressait récemment qui a été (ou n'a pas été) comblé ?" 
        : "Kisa ki te enterese w nan moman sa yo ke l te konble oubyen li pat konble?"}
    </label>
    <textarea
      rows={2}
      value={clinicalContext.unfulfilled_desires}
      onChange={(e) => setClinicalContext({...clinicalContext, unfulfilled_desires: e.target.value})}
      placeholder={lang === 'fr' ? "Ex: Attente d'une promotion, projet personnel..." : "Eg: M t ap tann yon opòtinite, yon pwojè ki pa mache..."}
      className="w-full bg-slate-800 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
    />
  </div>

  <div>
    <label className="block text-xs font-semibold text-slate-300 mb-1">
      {lang === 'fr' 
        ? "Quel événement ou situation récente vous a démotivé(e) ou marqué(e) négativement ?" 
        : "Ki pi gwo bagay ki te dekouraje w, demotive w oubyen atire atansyon w de fason negatif?"}
    </label>
    <textarea
      rows={2}
      value={clinicalContext.major_disappointments}
      onChange={(e) => setClinicalContext({...clinicalContext, major_disappointments: e.target.value})}
      placeholder={lang === 'fr' ? "Ex: Conflit, échec récent, perte de confiance..." : "Eg: Yon gwo desepsyon, yon moun ki desevwa m, yon echèk..."}
      className="w-full bg-slate-800 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
    />
  </div>
</div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'fr'
                        ? "Y a-t-il eu récemment un changement important dans votre vie ?"
                        : "Èske te gen yon chanjman enpòtan nan lavi w dènyèman?"}
                    </label>
                    <select
                      value={clinicalContext.recent_change}
                      onChange={(e) => setClinicalContext({...clinicalContext, recent_change: e.target.value})}
                      className="w-full bg-slate-800 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-indigo-500">
                      <option value="">{lang === 'fr' ? "Sélectionner..." : "Chwazi..."}</option>
                      <option value="no">{lang === 'fr' ? "Non" : "Non"}</option>
                      <option value="yes">{lang === 'fr' ? "Oui" : "Wi"}</option>
                      <option value="unsure">{lang === 'fr' ? "Je ne sais pas / Je préfère ne pas préciser" : "Mwen pa konnen / Mwen prefere pa presize"}</option>
                    </select>
                  </div>

                  {clinicalContext.recent_change === 'yes' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {lang === 'fr'
                          ? "Quel changement a le plus marqué cette période ?"
                          : "Ki chanjman ki te make peryòd sa a plis?"}
                      </label>
                      <textarea
                        rows={2}
                        value={clinicalContext.recent_change_detail}
                        onChange={(e) => setClinicalContext({...clinicalContext, recent_change_detail: e.target.value})}
                        placeholder={lang === 'fr' ? "Vous pouvez rester général(e)." : "Ou ka rete jeneral si ou vle."}
                        className="w-full bg-slate-800 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'fr'
                        ? "Qu'est-ce qui vous demande le plus d'énergie actuellement ?"
                        : "Kisa ki mande plis enèji nan men w kounye a?"}
                    </label>
                    <select
                      value={clinicalContext.current_pressure}
                      onChange={(e) => setClinicalContext({...clinicalContext, current_pressure: e.target.value})}
                      className="w-full bg-slate-800 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-indigo-500">
                      <option value="">{lang === 'fr' ? "Sélectionner..." : "Chwazi..."}</option>
                      <option value="work_studies">{lang === 'fr' ? "Travail / études" : "Travay / lekòl"}</option>
                      <option value="relationships">{lang === 'fr' ? "Relations" : "Relasyon"}</option>
                      <option value="family">{lang === 'fr' ? "Famille" : "Fanmi"}</option>
                      <option value="finances">{lang === 'fr' ? "Finances" : "Finans"}</option>
                      <option value="health_habits">{lang === 'fr' ? "Santé / habitudes de vie" : "Sante / abitid lavi"}</option>
                      <option value="future_uncertainty">{lang === 'fr' ? "Incertitude concernant l'avenir" : "Ensètitid sou lavni"}</option>
                      <option value="multiple">{lang === 'fr' ? "Plusieurs choses à la fois" : "Plizyè bagay an menm tan"}</option>
                      <option value="other">{lang === 'fr' ? "Autre" : "Lòt"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'fr'
                        ? "Qu'est-ce qui vous aide habituellement à traverser les périodes difficiles ?"
                        : "Kisa ki konn ede w pase nan peryòd difisil yo?"}
                    </label>
                    <select
                      value={clinicalContext.current_resources}
                      onChange={(e) => setClinicalContext({...clinicalContext, current_resources: e.target.value})}
                      className="w-full bg-slate-800 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-indigo-500">
                      <option value="">{lang === 'fr' ? "Sélectionner..." : "Chwazi..."}</option>
                      <option value="trusted_person">{lang === 'fr' ? "Une personne de confiance" : "Yon moun mwen fè konfyans"}</option>
                      <option value="activity_hobby">{lang === 'fr' ? "Une activité / un loisir" : "Yon aktivite / yon distraksyon"}</option>
                      <option value="work_project">{lang === 'fr' ? "Travail / projet" : "Travay / pwojè"}</option>
                      <option value="alone_time">{lang === 'fr' ? "Le temps seul" : "Tan mwen pase pou kont mwen"}</option>
                      <option value="family">{lang === 'fr' ? "Famille" : "Fanmi"}</option>
                      <option value="routine">{lang === 'fr' ? "Routine" : "Woutin"}</option>
                      <option value="nothing">{lang === 'fr' ? "Rien de particulier actuellement" : "Pa gen anyen an patikilye kounye a"}</option>
                      <option value="other">{lang === 'fr' ? "Autre" : "Lòt"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'fr'
                        ? "Par rapport à votre fonctionnement habituel, avez-vous l'impression d'être différent(e) actuellement ?"
                        : "Konpare ak jan ou abitye ye, èske ou santi ou diferan kounye a?"}
                    </label>
                    <select
                      value={clinicalContext.current_vs_usual}
                      onChange={(e) => setClinicalContext({...clinicalContext, current_vs_usual: e.target.value})}
                      className="w-full bg-slate-800 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-indigo-500">
                      <option value="">{lang === 'fr' ? "Sélectionner..." : "Chwazi..."}</option>
                      <option value="no">{lang === 'fr' ? "Non, je me reconnais assez bien" : "Non, mwen rekonèt tèt mwen byen"}</option>
                      <option value="a_little">{lang === 'fr' ? "Un peu différent(e)" : "Yon ti jan diferan"}</option>
                      <option value="clearly">{lang === 'fr' ? "Nettement différent(e)" : "Mwen santi m diferan anpil"}</option>
                      <option value="unsure">{lang === 'fr' ? "Je ne sais pas" : "Mwen pa konnen"}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {lang === 'fr' ? "Qualité du sommeil :" : "Kijan w dormi?"}
                  </label>
                  <select 
                    value={clinicalContext.sleep}
                    onChange={(e) => setClinicalContext({...clinicalContext, sleep: e.target.value})}
                    className="w-full bg-slate-800 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-indigo-500">
                    <option value="good">{lang === 'fr' ? "Bon / Réparateur" : "Mwen dormi byen"}</option>
                    <option value="disturbed">{lang === 'fr' ? "Perturbé / Réveils fréquents" : "Mwen reveye anpil nan lannwit"}</option>
                    <option value="insomnia">{lang === 'fr' ? "Insomnies / Difficultés à s'endormir" : "Mwen pa ka dormi menm"}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bouton pou pase nan paj peman an */}
            <button 
              type="button"
              onClick={() => setStep('paywall')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-3.5 rounded-xl font-bold transition text-sm shadow-lg shadow-indigo-600/30 mt-4">
              {lang === 'fr' ? "Continuer vers mon rapport" : "Kontinye pou w debloke rapò a"}
            </button>
          </div>
        )}
       

        {/* 4. Paywall (Paj Peman ak Kòd Aksè) */}
        {step === 'paywall' && (
          <div className="max-w-xl mx-auto bg-slate-900/95 border border-indigo-500/30 p-6 rounded-2xl shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-block p-3 bg-indigo-500/10 rounded-full text-indigo-400 text-2xl">
                🔒
              </div>
              <h2 className="text-xl font-bold text-white">
                {lang === 'fr' ? "Votre rapport clinique est prêt !" : "Rapò klinik ou an pare !"}
              </h2>
              <p className="text-xs text-slate-300">
                {lang === 'fr' 
                  ? "Pour débloquer l'analyse complète, effectuez votre contribution ci-dessous."
                  : "Pou w ka debloke analiz konplè a, fè ti kotizasyon anba a."}
              </p>
            </div>

            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-xs space-y-2">
              <p className="font-semibold text-amber-300">
                💳 {lang === 'fr' ? "Paiement (500 HTG / $5 USD)" : "Peman (500 HTG / $5 USD)"}
              </p>
              <p className="text-slate-200 font-mono">📲 MonCash / Natcash : 50933907667 / 50931559979</p>
              <p className="text-slate-200 font-mono">💵 Zelle (Lòtbò dlo) : $5 USD</p>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/60">
                👉 {lang === 'fr' 
                  ? "Envoyez la capture d'écran du paiement sur WhatsApp (3390-7667 / 3155-9979) pour recevoir votre code." 
                  : "Voye screenshot peman an sou WhatsApp (3390-7667 / 3155-9979) pou w resevwa kòd pa w la."}
              </p>
            </div>

           <div className="space-y-3">
             {/* Chan 1: Code d'accès (Otomatik & Inik pou aparèy sa a) */}
<div>
  <label className="block text-xs font-medium text-slate-400 mb-1">
    {lang === 'fr' ? "Votre Code d'accès unique" : "Kòd daksè inik ou an"}
  </label>
  <div className="flex gap-2">
    <input
      type="text"
      value={accessCode}
      readOnly
      className="w-full bg-slate-900 text-indigo-400 p-3 rounded-xl border border-indigo-500/50 text-sm font-mono font-bold tracking-wider uppercase cursor-not-allowed"
    />
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(accessCode)}
      className="bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 transition"
      title={lang === 'fr' ? "Copier le code" : "Kopie kòd la"}
    >
      📋
    </button>
  </div>
  <p className="text-[11px] text-slate-400 mt-1">
    {lang === 'fr' 
      ? "👉 Envoyez ce code sur WhatsApp pour recevoir votre PIN de confirmation." 
      : "👉 Voye kòd sa a sou WhatsApp pou w ka resevwa PIN konfimasyon w lan."}
  </p>
</div>

{/* Chan 2: Code PIN (Moun nan ap rantre PIN ou ba li a) */}
<div className="mt-4">
  <label className="block text-xs font-medium text-slate-400 mb-1">
    {lang === 'fr' ? "Code PIN de confirmation" : "Kòd PIN konfimasyon"}
  </label>
  <input
    type="text"
    value={pinCode}
    onChange={(e) => setPinCode(e.target.value.toUpperCase())}
    placeholder={lang === 'fr' ? "Entrez le PIN reçu (Ex: 8A3F91)" : "Antre PIN ou resevwa a (Eg: 8A3F91)"}
    className="w-full bg-slate-800 text-white p-3 rounded-xl border border-indigo-500/50 text-sm font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
  />
</div>
            </div>
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs text-center">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('clinical_questions')}
                className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                {lang === 'fr' ? "Retour" : "Retounen"}
              </button>
             <button
  type="button"
  onClick={handleVerifyAndGenerate}
  disabled={isLoading || !pinCode}
  className={`w-full py-3.5 rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2 ${
    isLoading || !pinCode
      ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
  }`}
>
  {isLoading ? (
    <>
      <span className="animate-spin">⏳</span>
      {lang === 'fr' ? "Génération en cours..." : "M ap jenere rapò a..."}
    </>
  ) : (
    lang === 'fr' ? "Générer mon rapport" : "Jenere rapò mwen an"
  )}
</button>
            </div>
          </div>
        )}

        {/* 5. Loading */}
        {step === 'loading' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-slate-300 font-medium">
              {lang === 'fr' ? "Analyse clinique des données par l'IA..." : "N ap analize done klinik ou yo..."}
            </p>
          </div>
        )}

        {/* 6. Crisis / Emergency */}
        {step === 'crisis' && crisisData && (
          <div className="bg-rose-950/60 border-2 border-rose-600 p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="text-3xl">⚠️</span>
              <h2 className="text-xl font-bold">
                {lang === 'fr' ? "Assistance et soutien immédiat" : "Èd ak sipò imedyat"}
              </h2>
            </div>
            
            <p className="text-rose-100 text-sm leading-relaxed">
              {crisisData.message}
            </p>

            <div className="bg-slate-900/80 p-4 rounded-lg space-y-3 border border-rose-900">
              <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                {lang === 'fr' ? "Numéros d'urgence gratuits" : "Nimewo ijans gratis"}
              </h3>
              {crisisData.resources?.map((res, index) => (
                <div key={index} className="flex justify-between items-center text-sm border-b border-slate-800 pb-2 last:border-b-0">
                  <div>
                    <span className="font-semibold text-white">{res.country} : </span>
                    <span className="text-slate-300">{res.label}</span>
                  </div>
                  {res.number && (
                    <a href={`tel:${res.number}`} className="font-bold text-rose-400 bg-rose-950/80 px-3 py-1 rounded border border-rose-700">
                      {res.number}
                    </a>
                  )}
                </div>
              ))}
            </div>

            <button 
              onClick={handleReset} 
              className="w-full bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg text-xs font-semibold text-slate-300 transition mt-2">
              {lang === 'fr' ? "Retourner à l'accueil" : "Tounen nan paj akèy"}
            </button>
          </div>
        )}
        

        {/* 7. Results */}
        {step === 'result' && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-indigo-400 print:hidden">
              {lang === 'fr' ? "Votre Profil & Rapport de Synthèse" : "Profil ak Rapò Pèsonalite Ou"}
            </h2>

            {/* Score Visualization */}
            {calculatedScores && (
              <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700 mb-6 space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {lang === 'fr' ? "Scores psychométriques (0 - 100%)" : "Eskò psikometrik (0 - 100%)"}
                </h3>

                {TRAIT_CONFIG.map((trait) => {
                  const val = calculatedScores[trait.key] || 0;
                  return (
                    <div key={trait.key}>
                      <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                        <span>{lang === 'fr' ? trait.labelFr : trait.labelHt}</span>
                        <span className="font-bold text-indigo-300">{val}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-3 rounded-full transition-all duration-1000 ${trait.color}`} 
                          style={{ width: `${val}%` }}>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex gap-3 mb-4 print:hidden">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md">
                <span>🖨️</span> {lang === 'fr' ? "Imprimer / Exporter PDF" : "Enprime / Eksporte PDF"}
              </button>
              <button 
                onClick={handleCopyReport}
                className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition">
                <span>{copied ? "✅" : "📋"}</span> 
                {copied 
                  ? (lang === 'fr' ? "Copié !" : "Kopie !") 
                  : (lang === 'fr' ? "Copier le texte" : "Kopie tèks la")}
              </button>
            </div>

            {/* Markdown Report View */}
            {reportText ? (
              <div className="bg-slate-900 p-6 rounded-xl text-slate-200 text-sm max-h-[500px] overflow-y-auto mb-6 border border-slate-700">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h3: ({node, ...props}) => <h3 className="text-lg font-bold text-indigo-300 mt-5 mb-2 border-b border-slate-700 pb-1" {...props} />,
                    table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="w-full text-left border-collapse border border-slate-700 text-xs" {...props} /></div>,
                    th: ({node, ...props}) => <th className="bg-slate-800 p-2.5 border border-slate-700 font-semibold text-indigo-200" {...props} />,
                    td: ({node, ...props}) => <td className="p-2.5 border border-slate-700" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1.5" {...props} />,
                    p: ({node, ...props}) => <p className="mb-3" {...props} />
                  }}
                >
                  {reportText}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="p-4 bg-amber-900/30 border border-amber-600 rounded-xl text-amber-200 text-sm mb-6">
                {lang === 'fr' 
                  ? "Aucun rapport généré. Veuillez vérifier la réponse du serveur." 
                  : "Pa gen rapò ki jenere. Silvouplè verifye repons sèvè a."}
              </div>
            )}

            <button 
              onClick={handleReset} 
              className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-bold transition text-sm print:hidden">
              {lang === 'fr' ? "Recommencer une nouvelle évaluation" : "Kòmanse yon lòt evalyasyon"}
            </button>
          </div>
        )}
      {/* Si kòd la poko debloke (isUnlocked === false), afiche Paywall la */}
{!isUnlocked ? (
  <div className="paywall-container">
    <p className="text-red-500 font-bold">{backendError}</p>
    
    <input 
      type="text" 
      placeholder="Code d'accès" 
      value={accessCode} 
      onChange={(e) => setAccessCode(e.target.value)} 
    />
    
    <input 
      type="text" 
      placeholder="Code PIN (si requis)" 
      value={pinCode} 
      onChange={(e) => setPinCode(e.target.value)} 
    />

    <button 
      onClick={handleVerifyAndGenerate}
      disabled={backendLoading}
      className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
    >
      {backendLoading ? "Vérification..." : "Générer mon rapport"}
    </button>
  </div>
) : (
  /* Lè kòd la bon epi isUnlocked === true, se lè sa a pou l afiche rezilta yo ak rapò a */
  <div className="results-container">
    <h2>Votre Rapport Clinique Complexe</h2>
    <div>{backendReport}</div>
  </div>
)}

      </div>
    </div>
  );
}