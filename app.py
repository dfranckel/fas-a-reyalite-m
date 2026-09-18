import os
import re
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

load_dotenv(override=True)
# Mappings des libellés pour le prompt clinique (à placer au niveau global dans app.py)
DURATION_LABELS = {
    "less_than_1_month": "Moins d'un mois (Aigu)",
    "1_to_6_months": "De 1 à 6 mois (Épisodique)",
    "more_than_6_months": "Plus de 6 mois (Persistant)"
}

IMPACT_LABELS = {
    "none": "Aucun impact notable",
    "mild": "Léger (gêne mineure)",
    "moderate": "Modéré (détresse / difficulté)",
    "severe": "Sévère (altération forte)"
}

RELATIONAL_STATUS_LABELS = {
    "in_couple": "En couple / Marié(e)",
    "single": "Célibataire (Choix personnel)",
    "separated": "Séparé(e) / En rupture récente",
    "cohabitating": "Vie commune / Famille proche"
}

SOLITUDE_NATURE_LABELS = {
    "chosen": "Choix ressourçant",
    "suffered": "Subie / Isolement"
}

SOCIAL_NETWORK_LABELS = {
    "supportive": "Entourage aidant et bienveillant",
    "tense": "Relations parfois conflictuelles ou tendues",
    "isolated": "Sentiment d'isolement / Peu de soutien"
}

WORK_LABELS = {
    "fulfilling": "Épanouissant / Satisfaisant",
    "stressful": "Stressant / Exigeant",
    "exhausting": "Épuisant / Source d'anxiété"
}

SLEEP_LABELS = {
    "good": "Bon / Réparateur",
    "disturbed": "Perturbé / Réveils fréquents",
    "insomnia": "Insomnies / Difficultés à s'endormir"
}

app = Flask(__name__)

# Autorise les appels CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Limiteur de requêtes par IP
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

DURATION_LABELS = {
    "less_than_1_month": "Aiguë (< 1 mois)",
    "1_to_6_months": "Épisodique (1 à 6 mois)",
    "more_than_6_months": "Chronique / Persistant (> 6 mois)"
}

IMPACT_LABELS = {
    "none": "Nul",
    "mild": "Léger (gêne mineure)",
    "moderate": "Modéré (détresse / altération nette)",
    "severe": "Sévère (incapacité fonctionnelle importante)"
}

CRISIS_KEYWORDS = [
    r"\bsuicide\b", r"\bsuicider\b", r"\bmourir\b", r"\bme tuer\b", 
    r"\ben finir\b", r"\bplus envie de vivre\b", r"\bauto-mutilation\b",
    r"\bme pendre\b", r"\bmarre de la vie\b", r"\bsweet release\b"
]

def contains_crisis_signals(text):
    if not text:
        return False
    text_clean = text.lower()
    for pattern in CRISIS_KEYWORDS:
        if re.search(pattern, text_clean):
            return True
    return False
import random
import string
from datetime import datetime

# Wout pou jenere yon nouvo kòd inik
@app.route('/api/admin/generate-code', methods=['GET', 'POST'])
def generate_code():
    # Verification ti sekrè admin an
    secret = request.args.get('secret') or request.json.get('secret') if request.is_json else None
    if secret != "MonAdminSecret123":
        return jsonify({"error": "Non autorisé"}), 401

    # Jenere yon kòd inik (Egzanp: BF-8K2M9P)
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    new_code = f"BF-{random_str}"

    # Anregistre kòd la nan diksyonè ACCESS_CODES la ak used: False
    ACCESS_CODES[new_code] = {
        "created_at": datetime.now().isoformat(),
        "used": False
    }

    return jsonify({
        "success": True,
        "access_code": new_code,
        "message": f"Nouveau code généré avec succès: {new_code}"
    })
@app.route('/api/verify-code', methods=['POST'])
def verify_code():
    data = request.get_json(silent=True) or {}
    code = data.get('code', '').strip().upper()

    if not code:
        return jsonify({"valid": False, "message": "Code manquant"}), 400

    if code not in ACCESS_CODES:
        return jsonify({"valid": False, "message": "Code invalide"}), 404

    if ACCESS_CODES[code]["used"]:
        return jsonify({"valid": False, "message": "Ce code a déjà été utilisé"}), 400

    return jsonify({"valid": True, "message": "Code valide"}), 200

@app.before_request
def log_request_info():
    print(f"--> Requête reçue : {request.method} {request.path}")

import hashlib
from flask import Flask, request, jsonify

SECRET_SALT = "FAS2026_SECRET"

def calculate_expected_pin(code_str):
    raw_str = f"{code_str.strip().upper()}{SECRET_SALT}"
    return hashlib.sha256(raw_str.encode('utf-8')).hexdigest().upper()[:6]

@app.route('/api/generate-report', methods=['POST', 'OPTIONS'], strict_slashes=False)
@limiter.limit("100 per hour")
def generate_report():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    data = request.get_json(silent=True) or {}
    print("Données reçues :", data)

    access_code = data.get("access_code", "").strip().upper()
    input_pin = data.get("pin", "").strip().upper()

    # 1. VERIFIKASYON KÒD DAKSÈ
    if not access_code:
        return jsonify({"error": "Code d'accès manquant."}), 400

    ADMIN_CODE = "BF-TEST-2026"

    # Verifikasyon Admin vs Itilizatè Nòmal
    if access_code == ADMIN_CODE:
        print("--> Aksè kòm Admin konfime")
    else:
        if not input_pin:
            return jsonify({"error": "PIN de confirmation manquant."}), 400

        expected_pin = calculate_expected_pin(access_code)
        if input_pin != expected_pin:
            return jsonify({"error": "PIN de confirmation invalide."}), 403

    # 2. EKSTRAKSYON DONE YO
    scores = data.get('scores')
    clinical_context = data.get('clinical_context', {})
    user_comment = data.get('user_comment', '').strip()
    lang = data.get('lang', 'fr')
    
    unfulfilled = clinical_context.get('unfulfilled_desires', '').strip() or "Aucune précision apportée"
    disappointments = clinical_context.get('major_disappointments', '').strip() or "Aucune précision apportée"

    # Tcheke si scores pa None epi li pa vide (si se yon dict oswa list)
    if scores is None or (isinstance(scores, (dict, list)) and len(scores) == 0):
        return jsonify({"error": "Scores manquants ou invalides."}), 400

    # 3. FILT DE KRIZ
    if contains_crisis_signals(user_comment):
        return jsonify({
            "crisis": True,
            "message": "Votre message exprime une souffrance importante. Vous n'êtes pas seul(e). Des professionnels sont disponibles gratuitement pour vous écouter 24h/24 et 7j/7.",
            "resources": [
                {"country": "France", "number": "3114", "label": "Numéro national de prévention du suicide"},
                {"country": "Haïti / International", "number": "116", "label": "Ligne d'écoute et de soutien"},
                {"country": "Urgence internationale", "label": "Consultez befrienders.org pour trouver une ligne dans votre pays"}
            ]
        }), 200

    # 4. SWIT LOJIK JENERE RAPÒ A (AI Call / Prompts)...

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return jsonify({"error": "Clé GROQ_API_KEY non configurée"}), 500

   # 2. Formate le contexte clinique reçu du formulaire React
    dur_str = DURATION_LABELS.get(clinical_context.get('duration'), 'Non renseigné')
    imp_str = IMPACT_LABELS.get(clinical_context.get('impact'), 'Non renseigné')
    rel_str = RELATIONAL_STATUS_LABELS.get(clinical_context.get('relational_status'), 'Non renseigné')
    sol_str = SOLITUDE_NATURE_LABELS.get(clinical_context.get('solitude_nature'), 'Non renseigné')
    soc_str = SOCIAL_NETWORK_LABELS.get(clinical_context.get('social_network_quality'), 'Non renseigné')
    work_str = WORK_LABELS.get(clinical_context.get('work_satisfaction'), 'Non renseigné')
    sleep_str = SLEEP_LABELS.get(clinical_context.get('sleep'), 'Non renseigné')
    
    anhedonia_val = clinical_context.get('anhedonia')
    anhedonia_str = "Perte d'intérêt / plaisir (Anhédonie déclarée)" if anhedonia_val is True else "Plaisir conservé dans les loisirs"

    satisfaction_text = clinical_context.get('sources_of_satisfaction', '').strip() or "Aucune précision apportée"
    fatigue_text = clinical_context.get('sources_of_fatigue', '').strip() or "Aucune précision apportée"

    recent_change_labels = {"no": "Non", "yes": "Oui", "unknown": "Je ne sais pas / Je préfère ne pas préciser"}
    recent_change_val = clinical_context.get('recent_change')
    recent_change_str = recent_change_labels.get(recent_change_val, recent_change_val or "Non renseigné")

    current_pressure_labels = {"work_studies": "Travail / études", "relationships": "Relations", "family": "Famille", "finances": "Finances", "health_lifestyle": "Santé / habitudes de vie", "future_uncertainty": "Incertitude concernant l'avenir", "multiple": "Plusieurs choses à la fois", "other": "Autre"}
    current_pressure_val = clinical_context.get('current_pressure')
    current_pressure_str = current_pressure_labels.get(current_pressure_val, current_pressure_val or "Non renseigné")

    current_resources_labels = {"trusted_person": "Une personne de confiance", "activity_hobby": "Une activité / un loisir", "work_project": "Travail / projet", "alone_time": "Le temps seul", "family": "Famille", "routine": "Routine", "nothing": "Rien de particulier actuellement", "other": "Autre"}
    current_resources_val = clinical_context.get('current_resources')
    current_resources_str = current_resources_labels.get(current_resources_val, current_resources_val or "Non renseigné")

    current_vs_usual_labels = {"no": "Non, je me reconnais assez bien", "a_little": "Un peu différent(e)", "clearly": "Nettement différent(e)", "unknown": "Je ne sais pas"}
    current_vs_usual_val = clinical_context.get('current_vs_usual')
    current_vs_usual_str = current_vs_usual_labels.get(current_vs_usual_val, current_vs_usual_val or "Non renseigné")


    lang_instruction = (
        "Rédige le rapport intégralement en Français." 
        if lang == 'fr' 
        else "Ekri tout rapò a nèt nan lang Kreyòl Ayisyen."
    )

    system_prompt = (
     "Agis comme un spécialiste en psychologie, psychométrie et interprétation clinique prudente.\n"
    "Rédige un rapport de synthèse personnalisé de 300 à 350 mots maximum (hors tableau), uniquement à partir des données fournies.\n\n"

    "PRINCIPES FONDAMENTAUX :\n"
    "- Le Big Five décrit des tendances générales et relativement durables de personnalité.\n"
    "- Les réponses Big Five représentent la manière habituelle d'être et de réagir sur une période de référence d'environ 2 à 3 ans.\n"
    "- Les informations sur la vie quotidienne, les relations, la solitude, le travail, le sommeil, l'énergie, les loisirs, les événements récents et les changements décrivent principalement la situation actuelle.\n"
    "- Distingue toujours la personnalité habituelle de l'expérience actuelle.\n"
    "- Un trait de personnalité n'est jamais, à lui seul, la cause d'une émotion, d'un symptôme ou d'une difficulté actuelle.\n"
    "- Une expérience actuelle ne doit jamais être transformée en trait durable de personnalité.\n\n"

    "CALIBRATION STRICTE DES SCORES (EXEMPLE NÉVROSISME) :\n"
    "- 0% à 35% : Niveau bas / faible.\n"
    "- 36% à 65% : Niveau modéré / moyen. (Un score de 58% est MODÉRÉ. Ne le qualifie pas d'élevé ni de problématique. Il indique une réactivité émotionnelle classique).\n"
    "- 66% à 100% : Niveau élevé.\n"
    "- Le Névrosisme ne permet pas, à lui seul, de conclure à une anxiété, une détresse ou un trouble actuel.\n\n"

    "RÈGLE CENTRALE DE FIDÉLITÉ :\n"
    "- Utilise uniquement les informations réellement fournies.\n"
    "- Une possibilité psychologique générale ne constitue pas une information sur cette personne.\n"
    "- N'invente aucune émotion, difficulté, comportement, capacité, besoin, vulnérabilité ou ressource.\n"
    "- Si une information importante manque, conserve cette limite au lieu de la remplacer par une hypothèse.\n"
    "- La durée décrit une temporalité et le degré d'impact décrit un niveau d'atteinte du quotidien déclaré. Aucun des deux ne constitue, à lui seul, une description émotionnelle ou un symptôme.\n\n"

    "PRIORITÉ AUX NOUVEAUX INDICATEURS DU CONTEXTE ACTUEL :\n"
    "- Les réponses fournies dans la section « Précisions sur votre situation globale » constituent des données directes et prioritaires sur l'expérience actuelle de la personne.\n"
    "- Analyse explicitement, lorsque les données sont présentes, les indicateurs suivants : durée, impact au quotidien, situation relationnelle, manière de vivre la solitude, ressenti au travail ou aux études, intérêts ou attentes récemment comblés ou non comblés, événement ou situation ayant démotivé ou marqué négativement la personne, changement important récent, changement ayant le plus marqué la période, principale source de dépense d'énergie, ressource habituellement utilisée dans les périodes difficiles, perception d'une différence par rapport au fonctionnement habituel et qualité du sommeil.\n"
    "- Ces indicateurs ne sont pas de simples informations secondaires : ils doivent être intégrés activement à la lecture de l'expérience actuelle.\n"
    "- Lorsque plusieurs de ces indicateurs convergent, fais apparaître cette convergence dans la synthèse.\n"
    "- Lorsque certains indicateurs divergent, signale cette divergence sans chercher à la résoudre artificiellement.\n"
    "- Si la personne indique être différente de son fonctionnement habituel, considère cette information comme un élément central de l'état actuel et distingue-la clairement de son profil de personnalité.\n"
    "- Si un changement récent est indiqué, prends-le en compte comme un élément contextuel actuel sans lui attribuer automatiquement une cause psychologique.\n"
    "- Si une source d'énergie ou une ressource est explicitement indiquée, utilise cette information dans l'analyse et, si pertinent, dans les stratégies pratiques.\n"
    "- Si la personne indique qu'un intérêt, un besoin ou une attente n'a pas été comblé, considère cette information comme une donnée de contexte et non comme une caractéristique de personnalité.\n"
    "- Si aucun de ces indicateurs n'est renseigné, ne les invente pas et n'en déduis rien.\n\n"

    "LECTURE CROISÉE :\n"
    "- Commence toujours par les données concrètement rapportées dans le contexte actuel.\n"
    "- Ensuite seulement, examine si le profil Big Five apporte réellement une nuance.\n"
    "- Une relation entre personnalité et situation actuelle n'est pas obligatoire.\n"
    "- Une relation entre un trait et une expérience actuelle peut être mentionnée uniquement lorsqu'elle est raisonnablement soutenue par les données.\n"
    "- Présente alors cette relation comme une possibilité de compréhension et jamais comme une causalité établie.\n"
    "- Ne laisse jamais un score Big Five remplacer une information actuelle explicitement rapportée.\n"
    "- Une lecture croisée peut montrer une convergence, une divergence, une nuance ou une absence de lien identifiable.\n"
    "- Si les nouveaux indicateurs décrivent suffisamment l'expérience actuelle mais qu'aucun lien pertinent avec les traits n'est identifiable, présente les deux niveaux séparément.\n"
    "- Si aucune émotion, difficulté, réaction, déclencheur ou situation concrète n'est rapporté(e), ne crée pas de lien personnalisé entre les scores et l'état actuel.\n\n"

    "RÈGLE PARTICULIÈRE AU NÉVROSISME :\n"
    "- Le Névrosisme décrit une tendance habituelle relative concernant la sensibilité aux émotions négatives et aux situations perçues comme stressantes.\n"
    "- Il peut être utilisé pour nuancer le fonctionnement habituel de la personne.\n"
    "- Il ne permet pas, à lui seul, de conclure à une anxiété, une inquiétude, une détresse, une fragilité, une instabilité, une fatigue ou un stress actuel.\n"
    "- Un Névrosisme faible ou modéré ne permet pas non plus de conclure à l'absence de ces difficultés.\n"
    "- Lorsque la personne rapporte concrètement une expérience émotionnelle, une réaction au stress ou une difficulté, le Névrosisme peut apporter une nuance sur la manière habituelle dont cette expérience pourrait être vécue ou abordée.\n"
    "- Cette nuance reste hypothétique et ne doit jamais présenter le Névrosisme comme la cause de l'expérience.\n"
    "- Ne relie jamais directement le score de Névrosisme à la durée ou au degré d'impact.\n"
    "- N'utilise jamais le Névrosisme seul pour créer une stratégie pratique.\n\n"

    "INTERPRÉTATION DES AUTRES SCORES :\n"
    "- Interprète les cinq dimensions comme des tendances relatives du profil.\n"
    "- Ne transforme pas automatiquement un score en qualité, défaut, symptôme, capacité, ressource ou vulnérabilité.\n"
    "- N'attribue pas une capacité psychologique précise à une combinaison de scores si elle n'a pas été directement évaluée.\n"
    "- Les interactions entre traits ne doivent être utilisées que lorsqu'elles apportent réellement quelque chose à la compréhension du profil.\n\n"

    "CONTEXTE ACTUEL :\n"
    "- Utilise les informations sur les relations, la solitude, le travail ou les études, le sommeil, l'énergie, les loisirs, la satisfaction, les attentes, les événements récents, les changements et les ressources comme des observations du fonctionnement actuel.\n"
    "- Ces informations peuvent être mises en relation lorsqu'elles convergent réellement.\n"
    "- Ne les transforme pas automatiquement en diagnostic ou en explication causale.\n"
    "- Une modification du sommeil, de l'énergie, du plaisir, des relations ou des habitudes décrit un changement actuel et ne doit pas être automatiquement attribuée à la personnalité.\n\n"

    "POSTURE CLINIQUE :\n"
    "- Ne pose aucun diagnostic.\n"
    "- Présente les éléments à explorer comme des pistes et non comme des conclusions.\n"
    "- N'utilise pas la durée ou l'impact comme preuve d'un trouble ou d'un symptôme précis.\n"
    "- N'utilise pas les scores Big Five comme preuve de présence ou d'absence d'un trouble.\n"
    "- Évite les affirmations telles que « ce score explique », « ce score démontre » ou « ce score prouve ».\n"
    "- Prête une attention particulière aux déceptions majeures et aux attentes non comblées signalées par l'utilisateur (unfulfilled_desires et major_disappointments).\n"
    "- Si l'utilisateur mentionne un événement négatif marquant, une déception récente ou une frustration, ne conclue pas hâtivement à un trait de personnalité rigide ou instable.\n"
    "- Fais la distinction explicite dans la synthèse entre la personnalité de fond (tendances générales sur les 2-3 dernières années) et l'impact ponctuel ou réactif de cet événement démotivant sur son état émotionnel actuel.\n"
    "- Les indicateurs de changement récent, pression actuelle, ressources actuelles et fonctionnement actuel par rapport à l'habitude sont des données directes du contexte actuel.\n"
    "- Si la personne indique qu'elle est différente de son fonctionnement habituel, donne priorité à cette information et ne l'attribue pas automatiquement aux scores Big Five.\n"
    "- Le changement récent décrit une situation actuelle ; ne lui invente pas de cause psychologique.\n\n"

    "STRUCTURE DU RAPPORT (TOUTES LES SECTIONS SONT OBLIGATOIRES) :\n"
    "1. Tableau des scores (Score | Niveau | Tendance observée)\n"
    "2. Lecture croisée du profil et de l'expérience actuelle (jusqu'à 3 observations pertinentes)\n"
    "   - Commence par les nouveaux indicateurs du contexte actuel.\n"
    "   - Intègre les convergences ou divergences entre ces indicateurs.\n"
    "   - Utilise ensuite les scores Big Five uniquement pour apporter une nuance pertinente.\n"
    "3. Lecture clinique complémentaire\n"
    "   • Éléments du contexte à explorer\n"
    "   • Axes d'investigation complémentaire (3 maximum)\n"
    "4. Stratégies pratiques personnalisées (0 à 4 actions)\n"
    "5. Note de réserve et conclusion (1 à 2 phrases)\n\n"

    "RÈGLE POUR LA LECTURE CROISÉE :\n"
    "- Ne crée jamais une relation uniquement pour remplir cette section.\n"
    "- Les nouveaux indicateurs actuels doivent être considérés avant les scores de personnalité.\n"
    "- Si aucune relation pertinente n'est identifiable, dis-le clairement.\n\n"

    "RÈGLE POUR LES STRATÉGIES :\n"
    "- Une stratégie doit être directement justifiée par une difficulté, une émotion, une situation, une habitude ou un besoin explicitement rapporté.\n"
    "- Les ressources explicitement identifiées par la personne peuvent également être utilisées pour formuler une action proportionnée.\n"
    "- Les scores Big Five peuvent seulement nuancer une stratégie déjà justifiée par les données actuelles.\n"
    "- Ne propose pas automatiquement de journal, respiration, relaxation, activité physique, organisation, amélioration du sommeil ou soutien social.\n"
    "- Si aucune difficulté concrète n'est suffisamment décrite, il est préférable de proposer 0 stratégie plutôt que de remplir la section avec des conseils génériques.\n"
    "- Les stratégies restent des pistes simples et proportionnées, jamais un traitement ni une solution garantie.\n\n"

    "DEMONSTRATION DE LA MÉTHODE D'ANALYSE ATTENDUE (EXEMPLE DE RAISONNEMENT) :\n"
    "--- EXEMPLE FICTIF ---\n"
    "Données fictives :\n"
    "- Big Five : Extraversion 75 %, Névrosisme 58 %\n"
    "- Changement récent : Oui (Rupture récente)\n"
    "- Source d'énergie : Relations\n"
    "- Fonctionnement actuel : Nettement différent de l'habitude\n"
    "- Sommeil : Perturbé\n"
    "- Ressource : Une personne de confiance\n\n"
    "Raisonnement attendu :\n"
    "1. Priorité au contexte actuel : Rupture récente, charge relationnelle, fonctionnement différent de l'habitude, sommeil perturbé.\n"
    "2. Nuance via Big Five : L'Extraversion (75%) montre un contraste entre la tendance habituelle (orientée interactions) et l'énergie forte que demandent les relations actuellement.\n"
    "3. Limites du Névrosisme : Le Névrosisme (58%) est une tendance habituelle, il NE CAUSE PAS la rupture ni la baisse de sommeil et ne prouve pas une détresse clinique.\n"
    "--- FIN EXEMPLE FICTIF ---\n\n"

    "AVANT DE RÉDIGER :\n"
    "- Distingue mentalement : 1) les données directement rapportées, en donnant priorité aux nouveaux indicateurs actuels, 2) les relations raisonnablement soutenues par les données, 3) ce qui reste inconnu.\n"
    "- Donne toujours plus de poids aux données directement rapportées qu'aux interprétations psychologiques générales.\n"
    "- Vérifie que chaque observation du rapport peut être reliée à une donnée réellement fournie.\n"
    "- La qualité du rapport dépend de sa fidélité aux données, pas du nombre d'interprétations produites.\n\n"

    f"INSTRUCTION STRICTE DE LANGUE :\n{lang_instruction}\n"
    )

    # 3. Assemblage complet du prompt utilisateur
    user_message = f"""
DONNÉES DU PATIENT :
---
1. PROFIL PSYCHOMÉTRIQUE (BIG FIVE) :
- Ouverture (O) : {scores.get('O', 0)}%
- Conscience (C) : {scores.get('C', 0)}%
- Extraversion (E) : {scores.get('E', 0)}%
- Agréabilité (A) : {scores.get('A', 0)}%
- Névrosisme (N) : {scores.get('N', 0)}%

2. CONTEXTE DE VIE ACTUEL (DÉCLARÉ PAR LE PATIENT) :
- Durée des manifestations : {dur_str}
- Impact sur le quotidien : {imp_str}
- Situation relationnelle : {rel_str}
- Expérience de la solitude : {sol_str}
- Qualité du réseau social / entourage : {soc_str}
- Ressenti au travail / études : {work_str}
- Qualité du sommeil : {sleep_str}
- Plaisir / Loisirs : {anhedonia_str}
- Ce qui apporte de la satisfaction : {satisfaction_text}
- Ce qui irrite ou fatigue le plus : {fatigue_text} 
- Changement important récent : {recent_change_str}
- Changement qui a le plus marqué cette période : {clinical_context.get('change_description', '').strip() or "Aucune précision apportée"}
- Ce qui demande le plus d'énergie actuellement : {current_pressure_str}
- Ce qui aide habituellement à traverser les périodes difficiles : {current_resources_str}
- Fonctionnement actuel par rapport à l'habitude : {current_vs_usual_str}

3. ÉVÉNEMENTS RÉCENTS ET DÉCEPTIONS (CONTEXTE PONCTUEL)/DURÉE ET IMPACT DÉCLARÉS :
- Attentes / Désirs récents (comblés ou non) : {unfulfilled}
- Événements démotivants / Marquants négativement : {disappointments}
- Durée des manifestations : {dur_str}
- Impact perçu sur le quotidien : {imp_str}

4. REMARQUES / COMMENTAIRE LIBRE DU PATIENT :
"{user_comment if user_comment else 'Aucun commentaire fourni.'}"
---

Consigne : Rédige le rapport selon les règles cliniques strictes imposées.
"""

    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.2,
            "max_tokens": 1500
        }

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=30,
        )

        result = response.json()

        if response.status_code != 200:
            error_msg = result.get("error", {}).get("message", "Erreur API Groq")
            return jsonify({"error": f"Erreur Groq: {error_msg}"}), response.status_code

        report_text = result["choices"][0]["message"]["content"]
       # 6. Marquage du code comme UTILISÉ uniquement APRÈS le succès de la génération du rapport
        ACCESS_CODES[access_code]["used"] = True

        return jsonify({"report": report_text})

    except requests.exceptions.Timeout:
        return jsonify({"error": "Délai d'attente dépassé (Timeout)"}), 504
    except Exception as e:
        return jsonify({"error": f"Erreur serveur: {str(e)}"}), 500
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Limite de requêtes atteinte.", "status": 429}), 429
import secrets # Pour générer des codes uniques et sécurisés
import string

# Dictionnaire de stockage des codes d'accès en mémoire
# Format: {"BF-A1B2C3": {"used": False, "created_at": "2026-09-16"}}
ACCESS_CODES = {
    "BF-TEST-2026": {"used": False} # Code de test administrateur
}

def generate_unique_code(prefix="BF"):
    """Génère un code aléatoire unique du type BF-8X9K22"""
    characters = string.ascii_uppercase + string.digits
    while True:
        random_str = ''.join(secrets.choice(characters) for _ in range(6))
        code = f"{prefix}-{random_str}"
        if code not in ACCESS_CODES:
            ACCESS_CODES[code] = {"used": False}
            return code

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)