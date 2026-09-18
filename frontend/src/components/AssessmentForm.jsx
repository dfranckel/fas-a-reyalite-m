import React, { useState } from 'react';

const AssessmentForm = () => {
  // 1. États du formulaire (Langue, Code d'accès et Big Five)
  const [lang, setLang] = useState('fr');
  const [accessCode, setAccessCode] = useState(''); // <-- NOUVEAU : État pour le code d'accès
  
  const [scores, setScores] = useState({
    O: 82,
    C: 52,
    E: 28,
    A: 78,
    N: 74,
  });

  // Contexte clinique
  const [clinicalContext, setClinicalContext] = useState({
    duration: 'less_than_1_month',
    impact: 'moderate',
    work: 'Ingénieur informatique en télétravail depuis 6 mois suite à une restructuration d’entreprise.',
    sleep_energy: 'Réveils nocturnes réguliers depuis 3 semaines. Baisse d’énergie l’après-midi.',
    social_relations: 'Contact régulier avec 2 amis proches. Peu enclin à sortir le soir.',
    emotions: 'Agacement occasionnel lié aux délais de travail imposés.',
    hobbies: 'Lecture, jeux vidéo. Activité physique réduite en salle depuis 1 mois par manque de motivation.',
  });

  const [userComment, setUserComment] = useState('J’ai du mal à me concentrer en fin de journée.');

  // 2. États d'exécution et de réponse
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState('');
  const [crisisData, setCrisisData] = useState(null);
  const [error, setError] = useState(null);

  // 3. Soumission du formulaire vers le backend Flask
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReport('');
    setCrisisData(null);

    // Construction du Payload envoyé à Flask
   const payload = {
  access_code: accessCode, // <-- Doit être exactement 'access_code'
  scores: scores,
  clinical_context: clinicalContext,
  lang: lang,
  type: 'bfi_30'
};

    try {
      const response = await fetch('http://localhost:5000/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // En cas d'erreur 403 (Code invalide/déjà utilisé), affiche le message renvoyé par Python
        throw new Error(data.error || 'Erreur lors de la génération du rapport.');
      }

      if (data.crisis) {
        setCrisisData(data);
      } else {
        setReport(data.report);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Rendu de l'interface utilisateur
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>{lang === 'fr' ? 'Évaluation Psychométrique & Clinique' : 'Evolyasyon Sikometrik ak Klinik'}</h2>

      {/* Sélecteur de langue */}
      <div style={{ marginBottom: '15px' }}>
        <label><strong>{lang === 'fr' ? 'Langue du rapport :' : 'Lang rapò a :'} </strong></label>
        <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ padding: '5px 10px', marginLeft: '10px' }}>
          <option value="fr">Français</option>
          <option value="ht">Kreyòl Ayisyen</option>
        </select>
      </div>

      <form onSubmit={handleSubmit}>

        {/* NOUVEAU : Champ de saisie du Code d'Accès */}
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#eef2f5', borderRadius: '4px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            <strong>{lang === 'fr' ? 'Code d\'accès :' : 'Kòd aksè :'}</strong>
          </label>
          <input
            type="text"
            required
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder={lang === 'fr' ? 'Entrez votre code (ex: CODE123)' : 'Antre kòd ou a (eg: CODE123)'}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', textTransform: 'uppercase' }}
          />
        </div>

        {/* Champ commentaire libre */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            <strong>{lang === 'fr' ? 'Remarques ou commentaire libre :' : 'Rema ak kòmantè lib :'}</strong>
          </label>
          <textarea
            rows="4"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            value={userComment}
            onChange={(e) => setUserComment(e.target.value)}
            placeholder={lang === 'fr' ? 'Décrivez vos ressentis actuels...' : 'Rakonte kijan w santi w kounye a...'}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading
            ? (lang === 'fr' ? 'Génération en cours...' : 'M ap jenere rapò a...')
            : (lang === 'fr' ? 'Générer le rapport' : 'Jenere rapò a')}
        </button>
      </form>

      {/* Affichage des Erreurs */}
      {error && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {/* Affichage de l'Alerte de Crise */}
      {crisisData && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderLeft: '5px solid #ffc107', borderRadius: '4px' }}>
          <h3>⚠️ {lang === 'fr' ? 'Aide et soutien' : 'Soutyen ak èd'}</h3>
          <p>{crisisData.message}</p>
          <ul>
            {crisisData.resources.map((res, index) => (
              <li key={index}>
                <strong>{res.country} :</strong> {res.number ? `${res.number} - ` : ''}{res.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Affichage du Rapport Généré */}
      {report && (
        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '6px' }}>
          <h3>{lang === 'fr' ? 'Rapport de Synthèse Clinique' : 'Rapò Sentèz Klinik'}</h3>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{report}</div>
        </div>
      )}
    </div>
  );
};

export default AssessmentForm;