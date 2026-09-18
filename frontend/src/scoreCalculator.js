/**
 * Calcule les scores Big Five (OCEAN) sur une échelle de 0 à 100%
 * @param {Array} questionsList - La liste des 30 questions posées à l'utilisateur
 * @param {Object} userAnswers - Objet des réponses { questionId: scoreDe1A5 }
 * @returns {Object} Scores normalisés { O: xx, C: xx, E: xx, A: xx, N: xx }
 */
export function calculateBigFiveScores(questionsList, userAnswers) {
  // 1. Structure pour accumuler les points bruts et le nombre de réponses par trait
  const traits = {
    O: { total: 0, count: 0 }, // Ouverture
    C: { total: 0, count: 0 }, // Conscience / Rigueur
    E: { total: 0, count: 0 }, // Extraversion
    A: { total: 0, count: 0 }, // Agréabilité
    N: { total: 0, count: 0 }  // Névrosisme / Instabilité Émotionnelle
  };

  // 2. Parcourir toutes les questions posées lors du test
  questionsList.forEach((question) => {
    const rawScore = userAnswers[question.id];

    if (rawScore !== undefined && traits[question.trait]) {
      let finalScore = Number(rawScore);

      // Reverse scoring (échelle 1 à 5 : 1->5, 2->4, 3->3, 4->2, 5->1)
      if (question.reverse) {
        finalScore = 6 - finalScore;
      }

      traits[question.trait].total += finalScore;
      traits[question.trait].count += 1;
    }
  });

  // 3. Normalisation et conversion sur une échelle de 0 à 100%
  const normalizedScores = {};

  Object.keys(traits).forEach((traitKey) => {
    const { total, count } = traits[traitKey];

    if (count > 0) {
      // Calcul de la moyenne brute (entre 1.0 et 5.0)
      const rawAverage = total / count;

      // Formule de conversion min-max (1.0 -> 0% et 5.0 -> 100%)
      const scoreOn100 = Math.round(((rawAverage - 1) / 4) * 100);

      normalizedScores[traitKey] = Math.max(0, Math.min(100, scoreOn100));
    } else {
      normalizedScores[traitKey] = 0;
    }
  });

  return normalizedScores;
}

/**
 * Génère dynamiquement un jeu de 30 questions équilibré (6 questions x 5 traits)
 * tiré au sort parmi la banque complète de 60 questions.
 * @param {Array} allQuestions - Le tableau complet des 60 questions
 * @returns {Array} Les 30 questions sélectionnées et mélangées
 */
export function getRandom30Questions(allQuestions) {
  const traitKeys = ['O', 'C', 'E', 'A', 'N'];
  let selected = [];

  traitKeys.forEach((trait) => {
    // Filtrer les 12 questions associées au trait
    const traitPool = allQuestions.filter((q) => q.trait === trait);
    // Mélanger aléatoirement les questions du trait
    const shuffledTraitPool = [...traitPool].sort(() => 0.5 - Math.random());
    // Piger les 6 premières
    selected.push(...shuffledTraitPool.slice(0, 6));
  });

  // Mélanger à nouveau l'ensemble des 30 questions pour varier les traits au cours du test
  return selected.sort(() => 0.5 - Math.random());
}