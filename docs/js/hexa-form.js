/* =============================================================================
 * hexa-form.js — Formulaire de saisie (éditeur générique piloté par les données)
 * -----------------------------------------------------------------------------
 * Construit dynamiquement le formulaire à partir de la structure de l'objet de
 * données, et réécrit les valeurs saisies directement dans cet objet (liaison
 * bidirectionnelle par closures). Gère : champs texte, zones de texte, nombres,
 * listes de chaînes, et tableaux d'objets (ajout / suppression de lignes).
 * ========================================================================== */
(function () {
  "use strict";

  // Libellés FR conviviaux pour les clés de données
  var LABELS = {
    title: "Titre", client: "Client", date: "Date", location: "Cabinet / lieu",
    advisorName: "Conseiller", advisorFirm: "Cabinet", advisorEmail: "Email", advisorPhone: "Téléphone",
    advisorOrias: "Numéro Orias", advisorMembership: "Adhésions", advisorCPI: "Carte CPI",
    diagnostic: "Diagnostic en bref", recommandations: "Recommandations clés",
    forces: "Forces", vigilance: "Points de vigilance",
    foyer: "Composition du foyer", foyerNote: "Note (foyer)", membres: "Membres du foyer",
    qualite: "Qualité", prenom: "Prénom", nom: "Nom", naissance: "Date de naissance",
    lieuNaissance: "Lieu de naissance", capacite: "Capacité juridique", handicap: "Handicap", filiation: "Enfant de",
    activitePro: "Activité", statut: "Statut", contrat: "Contrat",
    statutFiscal: "Statut fiscal-social", prevoyanceDeces: "Prévoyance décès", prevoyanceIncapInval: "Prévoyance incapacité / invalidité",
    fiscalite: "Situation fiscale", revenuImposable: "Revenu net imposable (€)", irN1: "IR payé N-1 (€)", irN2: "IR payé N-2 (€)",
    epargneRetraite: "Épargne retraite", perPlafondMonsieur: "Plafond PER disponible — Monsieur", perPlafondMadame: "Plafond PER disponible — Madame", perMutualisation: "Mutualisation des plafonds (conjoints)",
    N1: "N-1 (€)", N2: "N-2 (€)", N3: "N-3 (€)", N4: "N-4 (€)",
    situationMaritale: "Situation maritale", regime: "Régime matrimonial", residence: "Résidence fiscale", tmi: "Tranche marginale d'imposition (TMI)", activite: "Activité & revenus", transmission: "Objectif de transmission",
    detail: "Détail", k: "Libellé", v: "Valeur",
    brut: "Actif brut", passif: "Passif", net: "Actif net", partImmo: "Part immobilière",
    endettement: "Taux d'endettement", comment: "Commentaire",
    immobilier: "Patrimoine immobilier", autres: "Autres actifs (financiers & divers)",
    classe: "Classe", type: "Type", categorie: "Catégorie", valeur: "Valeur (€)", dateAcquisition: "Date d'acquisition", prixAcquisition: "Prix d'acquisition (€)",
    fraisAcquisition: "Frais d'acq. réels (€) (vide = forfait 7,5 %)", travaux: "Travaux réels (€) (vide = forfait 15 % si > 5 ans)", fraisCession: "Frais de cession (€)",
    forfaits: "Forfaits d'acquisition (art. 150 VB : frais 7,5 % + travaux 15 %)",
    proprietaire: "Propriétaire", quote: "Quote-part %", droit: "Droit", ageUsufruitier: "Âge usufruitier",
    versements: "Versements (€)", assure: "Assuré", beneficiaires: "Bénéficiaires",
    passifs: "Passif — prêts en cours", designation: "Désignation", crd: "Capital restant dû (€)",
    dateFin: "Date de fin", mensualite: "Mensualité (€)", taux: "Taux",
    typeCredit: "Type de crédit", rattachement: "Rattachement", libelle: "Libellé",
    revenus: "Revenus", charges: "Charges", exceptionnels: "Éléments exceptionnels",
    disponible: "Budget disponible", note: "Note de bas de page", poste: "Poste", montant: "Montant (€)", personne: "Personne",
    risk: "Risque", level: "Niveau", desc: "Description",
    monsieur: "1er décès — Monsieur", madame: "1er décès — Madame",
    monsieurDon: "Monsieur — avec donation NP", madameDon: "Madame — avec donation NP",
    scenarios: "Scénarios", observation: "Observation", name: "Scénario",
    d1: "Droits 1er décès", d2: "Droits 2nd décès", total: "Total", delta: "Gain",
    successionParams: "Hypothèses de calcul",
    assuranceVieHorsSuccession: "Assurance-vie hors succession (990 I)",
    donationEntreEpoux: "Donation au dernier vivant (DDV) consentie ?",
    donationPPParParent: "Donation NP par parent — valeur PP (€, vide = abattements)",
    anneeReference: "Année de référence (vide = date du doc.)",
    donations: "Donations consenties (suivi des 15 ans)", donateur: "Donateur", beneficiaire: "Bénéficiaire", date: "Date",
    bien: "Bien",
    rows: "Lignes", parent: "Parent", np: "% NP", valeurNP: "Valeur NP", abattement: "Abattement",
    base: "Base taxable", droits: "Droits", reste: "Abattements restants",
    objectifs: "Objectifs hiérarchisés", profilPatrimonial: "Profil patrimonial (pré-remplit les objectifs)", arbitrage: "Arbitrage immobilier", intro: "Introduction",
    current: "Situation actuelle", strategies: "Stratégies proposées", gain: "Gain global", enveloppe: "Enveloppe cible",
    donationsEnvisagees: "Donations envisagées", reinvestissements: "Réinvestissement par enveloppe",
    rendement: "Rendement", rendementLabel: "Légende rendement", points: "Points", label: "Libellé",
    value: "Valeur", good: "Positif ?", profil: "Profil", fisc: "Fiscalité", accentGold: "Accent doré ?",
    planAction: "Plan d'action", step: "Étape", objectif: "Objectif", proposition: "Proposition",
    contexte: "Contexte & avertissement", avertissement: "Avertissement",
    profilNote: "Note (profil)", synthese: "Synthèse exécutive", actif: "Actif consolidé",
    budget: "Budget", risques: "Cartographie des risques", succession: "Audit successoral", doc: "Document & conseiller"
  };

  var LONG_KEYS = { comment: 1, note: 1, avertissement: 1, intro: 1, gain: 1, observation: 1, desc: 1, detail: 1, reste: 1, proposition: 1, objectif: 1, profilNote: 1, donationNote: 1, rendementLabel: 1, fisc: 1, v: 1 };

  // Liste des pays (français), pour la résidence fiscale
  var COUNTRIES = [
    "Afghanistan", "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Angola", "Antigua-et-Barbuda",
    "Arabie saoudite", "Argentine", "Arménie", "Australie", "Autriche", "Azerbaïdjan", "Bahamas", "Bahreïn",
    "Bangladesh", "Barbade", "Belgique", "Belize", "Bénin", "Bhoutan", "Biélorussie", "Birmanie (Myanmar)",
    "Bolivie", "Bosnie-Herzégovine", "Botswana", "Brésil", "Brunei", "Bulgarie", "Burkina Faso", "Burundi",
    "Cambodge", "Cameroun", "Canada", "Cap-Vert", "Chili", "Chine", "Chypre", "Colombie", "Comores",
    "Congo (Brazzaville)", "Congo (RDC)", "Corée du Nord", "Corée du Sud", "Costa Rica", "Côte d'Ivoire",
    "Croatie", "Cuba", "Danemark", "Djibouti", "Dominique", "Égypte", "Émirats arabes unis", "Équateur",
    "Érythrée", "Espagne", "Estonie", "Eswatini", "États-Unis", "Éthiopie", "Fidji", "Finlande", "France",
    "Gabon", "Gambie", "Géorgie", "Ghana", "Grèce", "Grenade", "Guatemala", "Guinée", "Guinée-Bissau",
    "Guinée équatoriale", "Guyana", "Haïti", "Honduras", "Hongrie", "Îles Marshall", "Îles Salomon", "Inde",
    "Indonésie", "Irak", "Iran", "Irlande", "Islande", "Israël", "Italie", "Jamaïque", "Japon", "Jordanie",
    "Kazakhstan", "Kenya", "Kirghizistan", "Kiribati", "Koweït", "Laos", "Lesotho", "Lettonie", "Liban",
    "Liberia", "Libye", "Liechtenstein", "Lituanie", "Luxembourg", "Macédoine du Nord", "Madagascar", "Malaisie",
    "Malawi", "Maldives", "Mali", "Malte", "Maroc", "Maurice", "Mauritanie", "Mexique", "Micronésie", "Moldavie",
    "Monaco", "Mongolie", "Monténégro", "Mozambique", "Namibie", "Nauru", "Népal", "Nicaragua", "Niger",
    "Nigeria", "Norvège", "Nouvelle-Zélande", "Oman", "Ouganda", "Ouzbékistan", "Pakistan", "Palaos", "Palestine",
    "Panama", "Papouasie-Nouvelle-Guinée", "Paraguay", "Pays-Bas", "Pérou", "Philippines", "Pologne", "Portugal",
    "Qatar", "République centrafricaine", "République dominicaine", "République tchèque", "Roumanie", "Royaume-Uni",
    "Russie", "Rwanda", "Saint-Kitts-et-Nevis", "Saint-Marin", "Saint-Vincent-et-les-Grenadines", "Sainte-Lucie",
    "Salvador", "Samoa", "Sao Tomé-et-Principe", "Sénégal", "Serbie", "Seychelles", "Sierra Leone", "Singapour",
    "Slovaquie", "Slovénie", "Somalie", "Soudan", "Soudan du Sud", "Sri Lanka", "Suède", "Suisse", "Suriname",
    "Syrie", "Tadjikistan", "Tanzanie", "Tchad", "Thaïlande", "Timor oriental", "Togo", "Tonga",
    "Trinité-et-Tobago", "Tunisie", "Turkménistan", "Turquie", "Tuvalu", "Ukraine", "Uruguay", "Vanuatu",
    "Vatican", "Venezuela", "Viêt Nam", "Yémen", "Zambie", "Zimbabwe"
  ];

  // Enveloppes / supports d'investissement cibles (réinvestissement du capital dégagé)
  var ENVELOPPES = ["Assurance-vie française", "Assurance-vie luxembourgeoise", "PER", "PEA", "PEA-PME", "SCPI", "FCPR", "SCI à l'IS", "Compte-titres", "Contrat de capitalisation", "Autre"];

  // Champs à choix fermé (rendus en menu déroulant)
  var ENUMS = {
    level: ["Élevé", "Moyen", "Modéré"],
    qualite: ["Monsieur", "Madame", "Enfant", "Autre"],
    capacite: ["Majeur capable", "Mineur", "Tutelle", "Curatelle"],
    handicap: ["Non", "Oui"],
    statutFiscal: ["", "Salarié", "TNS (indépendant / gérant majoritaire)", "Dirigeant assimilé salarié", "Retraité", "Sans activité"],
    prevoyanceDeces: ["Non", "Oui"], prevoyanceIncapInval: ["Non", "Oui"], perMutualisation: ["Non", "Oui"],
    filiation: ["Enfant du couple", "Monsieur 1er lit", "Madame 1er lit"],
    assuranceVieHorsSuccession: ["Oui", "Non"],
    donationEntreEpoux: ["Non", "Oui"],
    tmi: ["Non renseignée", "0 %", "11 %", "30 %", "41 %", "45 %"],
    profilPatrimonial: ["Automatique", "A — Cadre/dirigeant en constitution", "B — Patrimoine établi (immobilier)", "C — Senior en transmission", "D — Jeune actif / primo-constituant", "E — Chef d'entreprise / cession"],
    residence: COUNTRIES,
    situationMaritale: ["Marié(e)s", "Pacsés", "En concubinage", "Célibataire", "Veuf(ve)"],
    droit: ["PP", "NP", "UF"],
    classe: ["Résidence principale", "Résidence secondaire", "Investissement locatif"],
    typeCredit: ["Immobilier", "Consommation"],
    forfaits: ["Oui", "Non"],
    activitePro: ["Salarié(e)", "Fonctionnaire", "Indépendant / TNS", "Chef d'entreprise", "Profession libérale", "Retraité(e)", "Sans activité", "Étudiant(e)", "Autre"],
    enveloppe: ENVELOPPES
  };
  var IMMO_TYPES = ["Maison", "Appartement", "Immeuble de rapport", "Parking", "Foncier non bâti", "Château", "Manoir", "Étang", "Forêt", "Terre agricole", "Péniche", "Autre"];
  var AUTRES_TYPES = ["Liquidités", "Compte courant", "Compte à terme", "Livret A", "LDD", "LEP", "Livret Jeune", "PEL", "CEL", "PEA", "PEA-PME", "Compte-titres", "Assurance-vie", "Contrat de capitalisation", "FCPR", "FCPI", "Club Deal", "autre"];
  var DONATION_TYPES = ["Avance successorale (rapportable)", "Hors part successorale", "Donation-partage", "Don familial de somme d'argent"];
  var SITUATIONS = ENUMS.situationMaritale;
  var REGIME_MARIAGE = ["Communauté réduite aux acquêts (régime légal)", "Communauté universelle", "Séparation de biens", "Participation aux acquêts"];
  var REGIME_PACS = ["Indivision", "Séparation de biens"];
  function regimeOptionsFor(s) { return s === "Marié(e)s" ? REGIME_MARIAGE : (s === "Pacsés" ? REGIME_PACS : null); }
  var REVENU_POSTES = ["Revenus professionnels", "Revenus de remplacement", "Revenus fonciers", "Revenus d'investissement", "Revenus de capitaux mobiliers", "Pensions / retraites", "Autres revenus"];
  var CHARGE_POSTES = ["Remboursements d'emprunts et dettes", "Dépenses d'usage", "Cotisations Retraite / Épargne / Prévoyance", "Impôts et taxes", "Loyers", "Autres charges"];

  var formData = null;
  function memberLabels() {
    var ms = (formData && formData.foyer && formData.foyer.membres) || [];
    return ms.map(function (m) { return ((m.qualite || "") + " " + (m.prenom || "")).trim(); }).filter(Boolean);
  }
  // Menus déroulants dynamiques (options calculées depuis les données)
  var DYNAMIC_ENUMS = {
    personne: function () { return memberLabels().concat(["Foyer"]); },
    proprietaire: function () { return memberLabels().concat(["Communauté", "Société d'acquêts", "Indivision", "SCI", "SCP", "SARL de famille"]); },
    rattachement: function () {
      // Un prêt ne se rattache qu'à un bien IMMOBILIER (ou « Autre »).
      var im = (formData && formData.actif && formData.actif.immobilier) || [];
      return im.map(function (a) { return a.designation || ((a.classe || "") + " " + (a.type || "")).trim(); }).filter(Boolean).concat(["Autre"]);
    },
    assure: function () { return memberLabels(); },
    donateur: function () {
      var ms = (formData && formData.foyer && formData.foyer.membres) || [];
      return ms.filter(function (m) { return m.qualite === "Monsieur" || m.qualite === "Madame"; })
        .map(function (m) { return ((m.qualite || "") + " " + (m.prenom || "")).trim(); }).filter(Boolean);
    },
    beneficiaire: function () { return memberLabels(); }
  };
  // Options dépendant d'un champ frère du même élément
  var DEP_ENUMS = {
    regime: function (item) { return regimeOptionsFor(item.situationMaritale); },
    poste: function (item) { return ("personne" in item) ? REVENU_POSTES : CHARGE_POSTES; },
    type: function (item) { return ("classe" in item) ? IMMO_TYPES : (("donateur" in item) ? DONATION_TYPES : AUTRES_TYPES); }
  };
  // Champs affichés seulement si un champ frère remplit une condition
  var CONDITIONAL = {
    regime: { on: "situationMaritale", when: function (s) { return s === "Marié(e)s" || s === "Pacsés"; }, na: "— sans objet" },
    ageUsufruitier: { on: "droit", when: function (d) { return d === "NP"; }, na: "—" },
    // Filiation : pertinente uniquement pour les enfants (identifie les enfants d'un 1er lit)
    filiation: { on: "qualite", when: function (q) { return q === "Enfant"; }, na: "—" },
    statutFiscal: { on: "qualite", when: function (q) { return q !== "Enfant"; }, na: "—" },
    prevoyanceDeces: { on: "qualite", when: function (q) { return q !== "Enfant"; }, na: "—" },
    prevoyanceIncapInval: { on: "qualite", when: function (q) { return q !== "Enfant"; }, na: "—" },
    // Versements : PEA / PEA-PME (capacité de versement) + assurance-vie / capitalisation (primes versées)
    versements: { on: "type", when: function (t) { return t === "PEA" || t === "PEA-PME" || t === "Assurance-vie" || t === "Contrat de capitalisation"; }, na: "—" },
    // Assuré & bénéficiaires : seulement pour l'assurance-vie
    assure: { on: "type", when: function (t) { return t === "Assurance-vie"; }, na: "—" },
    beneficiaires: { on: "type", when: function (t) { return t === "Assurance-vie"; }, na: "—" }
  };
  // Champs dont la modification re-rend le tableau (pilotent des champs dépendants)
  var CTRL_FIELDS = { situationMaritale: 1, droit: 1, type: 1, qualite: 1 };
  function adjustDependents(item, field) {
    if (field === "situationMaritale") { var o = regimeOptionsFor(item.situationMaritale); item.regime = o ? (o.indexOf(item.regime) >= 0 ? item.regime : o[0]) : ""; }
    else if (field === "qualite") { item.filiation = item.qualite === "Enfant" ? (item.filiation || "Enfant du couple") : ""; }
    else if (field === "droit") { if (item.droit !== "NP") item.ageUsufruitier = ""; }
    else if (field === "type") {
      if (["PEA", "PEA-PME", "Assurance-vie", "Contrat de capitalisation"].indexOf(item.type) < 0) item.versements = "";
      if (item.type !== "Assurance-vie") { item.assure = ""; item.beneficiaires = ""; }
    }
  }
  // Champs date (rendus en sélecteur de date, format contraint)
  var DATE_KEYS = { naissance: 1, dateFin: 1, date: 1, dateAcquisition: 1 };
  // Champs présents dans les données mais NON éditables tels quels dans le formulaire
  var HIDDEN_KEYS = { activite: 1, comment: 1 };
  // Tableaux affichés « transposés » (éléments en colonnes, champs en lignes)
  var TRANSPOSE_KEYS = { membres: 1 };
  // statutFiscal volontairement VIDE par défaut : « Salarié » ne doit jamais être
  // affiché sans saisie explicite (affichage « — » à défaut).
  var MEMBER_TEMPLATE = { qualite: "Enfant", prenom: "", nom: "", naissance: "", lieuNaissance: "", capacite: "Majeur capable", handicap: "Non", situationMaritale: "Célibataire", regime: "", filiation: "Enfant du couple", activitePro: "Sans activité", statut: "", contrat: "", statutFiscal: "", prevoyanceDeces: "Non", prevoyanceIncapInval: "Non" };

  function label(key) { return LABELS[key] || key; }
  function isLong(key, val) { return LONG_KEYS[key] || (typeof val === "string" && val.length > 90); }
  function isScalar(v) { return v === null || ["string", "number", "boolean"].indexOf(typeof v) >= 0; }

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function selectInput(options, current, onChange) {
    var sel = el("select");
    options.forEach(function (opt) { var o = el("option", null, opt); o.value = opt; if (opt === current) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", function () { onChange(sel.value); });
    return sel;
  }

  // Champ d'édition pour une cellule item[c] (select / date / nombre / texte).
  // rerender : callback pour re-générer le tableau quand un champ pilote change.
  function cellInput(item, c, rerender) {
    rerender = rerender || function () {};
    var v = item[c], inp;
    // champ conditionnel masqué selon un champ frère
    if (CONDITIONAL[c] && !CONDITIONAL[c].when(item[CONDITIONAL[c].on])) return el("div", "cell-na", CONDITIONAL[c].na || "—");
    // options dépendant d'un champ frère (régime ↔ situation, poste ↔ revenus/charges)
    if (DEP_ENUMS[c]) {
      var pop = DEP_ENUMS[c](item) || [];
      if (v && pop.indexOf(v) < 0) pop = [v].concat(pop);
      inp = selectInput(pop, v, function (nv) {
        item[c] = nv;
        if (CTRL_FIELDS[c]) { adjustDependents(item, c); rerender(); }
        emitChange();
      }); inp.className = "field-input"; return inp;
    }
    // options dynamiques (depuis les données globales : membres, biens…)
    if (DYNAMIC_ENUMS[c]) {
      var dop = DYNAMIC_ENUMS[c]();
      if (v && dop.indexOf(v) < 0) dop = [v].concat(dop);
      inp = selectInput(dop, v, function (nv) { item[c] = nv; emitChange(); }); inp.className = "field-input"; return inp;
    }
    if (ENUMS[c]) {
      inp = selectInput(ENUMS[c], v, function (nv) {
        item[c] = nv;
        if (CTRL_FIELDS[c]) { adjustDependents(item, c); rerender(); }
        emitChange();
      }); inp.className = "field-input"; return inp;
    }
    if (DATE_KEYS[c]) { inp = el("input", "field-input"); inp.type = "date"; inp.value = v == null ? "" : v; inp.addEventListener("change", function () { item[c] = inp.value; emitChange(); }); return inp; }
    if (typeof v === "number") { inp = el("input", "field-input"); inp.type = "number"; inp.value = v; inp.addEventListener("input", function () { item[c] = inp.value === "" ? 0 : Number(inp.value); emitChange(); }); return inp; }
    if (typeof v === "boolean") { inp = el("input"); inp.type = "checkbox"; inp.checked = v; inp.addEventListener("change", function () { item[c] = inp.checked; emitChange(); }); return inp; }
    if (isLong(c, v)) { inp = el("textarea", "field-input"); inp.rows = 2; inp.value = v == null ? "" : v; inp.addEventListener("input", function () { item[c] = inp.value; emitChange(); }); return inp; }
    inp = el("input", "field-input"); inp.type = "text"; inp.value = v == null ? "" : v; inp.addEventListener("input", function () { item[c] = inp.value; emitChange(); }); return inp;
  }

  // Nouvel objet « vierge » calqué sur la structure des éléments existants (ou
  // sur un gabarit fourni quand le tableau est vide).
  function blankItem(arr, template) {
    var cols = arr.length ? Object.keys(arr[0]) : (template ? Object.keys(template) : []);
    var blank = {};
    cols.forEach(function (c) {
      // Propriétaire par défaut : « Communauté » (valeur réelle, comptée dans
      // l'audit successoral ; un champ vide serait classé « exclu »).
      if (c === "proprietaire") { blank[c] = "Communauté"; return; }
      if (ENUMS[c]) { blank[c] = ENUMS[c][0]; return; }
      if (DYNAMIC_ENUMS[c]) { var o = DYNAMIC_ENUMS[c]() || []; blank[c] = o.length ? o[0] : ""; return; }
      var s = arr.length ? arr[0][c] : (template ? template[c] : "");
      blank[c] = typeof s === "number" ? 0 : (typeof s === "boolean" ? false : "");
    });
    return blank;
  }

  // Gabarits de ligne pour les tableaux d'objets : affichent les bonnes colonnes
  // même quand le tableau est vide (clés non déductibles des données) et servent
  // à créer une nouvelle ligne. budget vs exceptionnels : distingués par la
  // présence de la clé « exceptionnels » (présente uniquement sur le budget).
  function listTemplate(parent, key) {
    var isBudget = !!(parent && Object.prototype.hasOwnProperty.call(parent, "exceptionnels"));
    switch (key) {
      case "revenus": return isBudget ? { poste: REVENU_POSTES[0], libelle: "", montants: {} } : { libelle: "", montant: "" };
      case "charges": return isBudget ? { poste: CHARGE_POSTES[0], libelle: "", montants: {} } : { libelle: "", montant: "" };
      case "immobilier": return { designation: "", classe: ENUMS.classe[0], type: IMMO_TYPES[0], valeur: "", dateAcquisition: "", prixAcquisition: "", fraisAcquisition: "", travaux: "", fraisCession: "", proprietaire: "Communauté", quote: "100", droit: "PP", ageUsufruitier: "" };
      case "autres": return { type: AUTRES_TYPES[0], designation: "", valeur: "", versements: "", proprietaire: "Communauté", quote: "100", droit: "PP", ageUsufruitier: "", assure: "", beneficiaires: "" };
      case "passifs": return { designation: "", crd: "", dateFin: "", mensualite: "", taux: "", typeCredit: ENUMS.typeCredit[0], rattachement: "" };
      case "donations": return { donateur: "", beneficiaire: "", valeur: "", type: DONATION_TYPES[0], date: "" };
      case "donationsEnvisagees": return { donateur: "", beneficiaire: "", montant: "" };
      case "reinvestissements": return { enveloppe: ENVELOPPES[0], montant: "" };
      default: return null;
    }
  }

  // --- champ scalaire (texte / textarea / nombre) ---
  function scalarField(parent, key, host, opts) {
    opts = opts || {};
    var val = parent[key];
    var wrap = el("div", "field" + (opts.inline ? " field-inline" : ""));
    if (!opts.noLabel) wrap.appendChild(el("label", "field-label", label(key)));
    var input;
    if (ENUMS[key]) {
      input = selectInput(ENUMS[key], val, function (v) { parent[key] = v; emitChange(); });
    } else if (DATE_KEYS[key]) {
      input = el("input"); input.type = "date"; input.value = val == null ? "" : val;
      input.addEventListener("change", function () { parent[key] = input.value; emitChange(); });
    } else if (typeof val === "boolean") {
      input = el("input"); input.type = "checkbox"; input.checked = val;
      input.addEventListener("change", function () { parent[key] = input.checked; emitChange(); });
      wrap.classList.add("field-check");
    } else if (typeof val === "number") {
      input = el("input"); input.type = "number"; input.value = val;
      input.addEventListener("input", function () { parent[key] = input.value === "" ? 0 : Number(input.value); emitChange(); });
    } else if (isLong(key, val)) {
      input = el("textarea"); input.rows = opts.rows || 3; input.value = val == null ? "" : val;
      input.addEventListener("input", function () { parent[key] = input.value; emitChange(); });
    } else {
      input = el("input"); input.type = "text"; input.value = val == null ? "" : val;
      input.addEventListener("input", function () { parent[key] = input.value; emitChange(); });
    }
    input.className = (input.className ? input.className + " " : "") + "field-input";
    wrap.appendChild(input);
    host.appendChild(wrap);
  }

  // --- liste de chaînes (forces, vigilance, diagnostic…) ---
  function stringList(parent, key, host) {
    var arr = parent[key];
    var box = el("div", "list-box");
    var head = el("div", "list-head");
    head.appendChild(el("span", "list-title", label(key)));
    var addBtn = el("button", "btn-mini", "+ Ajouter");
    addBtn.type = "button";
    head.appendChild(addBtn);
    box.appendChild(head);
    var rowsHost = el("div", "list-rows");
    box.appendChild(rowsHost);
    function render() {
      rowsHost.innerHTML = "";
      arr.forEach(function (item, i) {
        var row = el("div", "list-row");
        var inp = el("input", "field-input"); inp.type = "text"; inp.value = item;
        inp.addEventListener("input", function () { arr[i] = inp.value; emitChange(); });
        var del = el("button", "btn-del", "✕"); del.type = "button";
        del.addEventListener("click", function () { arr.splice(i, 1); render(); emitChange(); });
        row.appendChild(inp); row.appendChild(del); rowsHost.appendChild(row);
      });
    }
    addBtn.addEventListener("click", function () { arr.push(""); render(); emitChange(); });
    render();
    host.appendChild(box);
  }

  // --- tableau d'objets (scénarios, lignes, breakdown…) ---
  function objectTable(parent, key, host, template) {
    var arr = parent[key];
    var cols = arr.length ? Object.keys(arr[0]) : (template ? Object.keys(template) : []);
    var box = el("div", "list-box");
    var head = el("div", "list-head");
    head.appendChild(el("span", "list-title", label(key)));
    var addBtn = el("button", "btn-mini", "+ Ligne"); addBtn.type = "button";
    head.appendChild(addBtn);
    box.appendChild(head);
    var tableWrap = el("div", "table-wrap");
    var table = el("table", "edit-table");
    var thead = el("thead"); var htr = el("tr");
    cols.forEach(function (c) { htr.appendChild(el("th", "col-" + c, label(c))); });
    htr.appendChild(el("th", "th-act", ""));
    thead.appendChild(htr); table.appendChild(thead);
    var tbody = el("tbody"); table.appendChild(tbody);
    tableWrap.appendChild(table); box.appendChild(tableWrap);
    function render() {
      tbody.innerHTML = "";
      arr.forEach(function (item, i) {
        var tr = el("tr");
        cols.forEach(function (c) {
          var td = el("td", "col-" + c);
          td.appendChild(cellInput(item, c, render));
          tr.appendChild(td);
        });
        var actTd = el("td", "th-act");
        var del = el("button", "btn-del", "✕"); del.type = "button";
        del.addEventListener("click", function () { arr.splice(i, 1); render(); emitChange(); });
        actTd.appendChild(del); tr.appendChild(actTd);
        tbody.appendChild(tr);
      });
    }
    addBtn.addEventListener("click", function () { arr.push(blankItem(arr, template)); render(); emitChange(); });
    render();
    host.appendChild(box);
  }

  // tableau d'objets « transposé » : éléments en colonnes, champs en lignes
  function transposedTable(parent, key, host) {
    var arr = parent[key];
    var box = el("div", "list-box");
    var head = el("div", "list-head");
    head.appendChild(el("span", "list-title", label(key)));
    var addBtn = el("button", "btn-mini", "+ Membre"); addBtn.type = "button";
    head.appendChild(addBtn);
    box.appendChild(head);
    var wrap = el("div", "table-wrap");
    var table = el("table", "edit-table edit-table-t");
    wrap.appendChild(table); box.appendChild(wrap);
    function render() {
      table.innerHTML = "";
      // Normalisation : chaque membre doit posséder toutes les clés du gabarit, pour que
      // les lignes (ex. « Enfant de ») s'affichent même avec des données anciennes/importées
      // dépourvues de la clé. La filiation par défaut dépend de la qualité (cf. adjustDependents).
      var tmplKeys = Object.keys(MEMBER_TEMPLATE);
      arr.forEach(function (m) {
        tmplKeys.forEach(function (k) {
          if (!(k in m)) m[k] = (k === "filiation") ? (m.qualite === "Enfant" ? "Enfant du couple" : "") : MEMBER_TEMPLATE[k];
        });
      });
      // Ordre canonique du gabarit + éventuelles clés supplémentaires présentes dans les données.
      var fields = tmplKeys.concat(arr.length ? Object.keys(arr[0]).filter(function (k) { return tmplKeys.indexOf(k) < 0; }) : []);
      var thead = el("thead"), htr = el("tr");
      htr.appendChild(el("th", "row-label", "Caractéristique"));
      arr.forEach(function (m, i) {
        var th = el("th");
        th.appendChild(el("span", null, "Membre " + (i + 1)));
        var del = el("button", "btn-del btn-del-col", "✕"); del.type = "button";
        del.addEventListener("click", function () { arr.splice(i, 1); render(); emitChange(); });
        th.appendChild(del);
        htr.appendChild(th);
      });
      thead.appendChild(htr); table.appendChild(thead);
      var tbody = el("tbody");
      fields.forEach(function (fld) {
        var tr = el("tr");
        tr.appendChild(el("td", "row-label", label(fld)));
        arr.forEach(function (m) { var td = el("td"); td.appendChild(cellInput(m, fld, render)); tr.appendChild(td); });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
    }
    addBtn.addEventListener("click", function () {
      arr.push(JSON.parse(JSON.stringify(MEMBER_TEMPLATE)));
      render(); emitChange();
    });
    render();
    host.appendChild(box);
  }

  // tableau d'objets « plat » (toutes les valeurs sont scalaires) ?
  function arrayIsFlat(arr) {
    return arr.every(function (it) {
      return it && typeof it === "object" && !Array.isArray(it) && Object.keys(it).every(function (k) { return isScalar(it[k]); });
    });
  }

  // --- liste d'objets complexes (avec sous-tableaux/objets) : cartes ---
  function itemCards(parent, key, host) {
    var arr = parent[key];
    var box = el("div", "list-box");
    var head = el("div", "list-head");
    head.appendChild(el("span", "list-title", label(key)));
    var addBtn = el("button", "btn-mini", "+ Ajouter"); addBtn.type = "button";
    head.appendChild(addBtn);
    box.appendChild(head);
    var rowsHost = el("div", "cards-rows");
    box.appendChild(rowsHost);
    function render() {
      rowsHost.innerHTML = "";
      arr.forEach(function (item, i) {
        var card = el("div", "item-card");
        var ch = el("div", "item-card-head");
        ch.appendChild(el("span", null, label(key) + " · " + (i + 1)));
        var del = el("button", "btn-del", "✕"); del.type = "button";
        del.addEventListener("click", function () { arr.splice(i, 1); render(); emitChange(); });
        ch.appendChild(del);
        card.appendChild(ch);
        var cb = el("div", "item-card-body");
        renderObject(item, cb, 1);
        card.appendChild(cb);
        rowsHost.appendChild(card);
      });
    }
    addBtn.addEventListener("click", function () {
      arr.push(arr.length ? JSON.parse(JSON.stringify(arr[arr.length - 1])) : {});
      render(); emitChange();
    });
    render();
    host.appendChild(box);
  }

  // --- revenus saisis par personne : une colonne par personne, une ligne par revenu ---
  function revenusMatrix(parent, key, host) {
    var arr = parent[key];
    var isCharges = (key === "charges");
    var postes = isCharges ? CHARGE_POSTES : REVENU_POSTES;
    var box = el("div", "list-box");
    var head = el("div", "list-head");
    head.appendChild(el("span", "list-title", (isCharges ? "Charges" : "Revenus") + " — une colonne par personne"));
    var addBtn = el("button", "btn-mini", isCharges ? "+ Ligne de charge" : "+ Ligne de revenu"); addBtn.type = "button";
    head.appendChild(addBtn);
    box.appendChild(head);
    var wrap = el("div", "table-wrap");
    var table = el("table", "edit-table");
    wrap.appendChild(table); box.appendChild(wrap);
    function render() {
      table.innerHTML = "";
      var persons = memberLabels().concat(["Foyer"]);
      var thead = el("thead"), htr = el("tr");
      htr.appendChild(el("th", null, "Poste"));
      htr.appendChild(el("th", null, "Libellé"));
      persons.forEach(function (p) { htr.appendChild(el("th", null, p)); });
      htr.appendChild(el("th", "th-act", ""));
      thead.appendChild(htr); table.appendChild(thead);
      var tbody = el("tbody");
      arr.forEach(function (line, i) {
        if (!line.montants) line.montants = {};
        var tr = el("tr");
        var tdP = el("td"); var sp = selectInput(postes, line.poste, function (v) { line.poste = v; emitChange(); }); sp.className = "field-input"; tdP.appendChild(sp); tr.appendChild(tdP);
        var tdL = el("td"); var li = el("input", "field-input"); li.type = "text"; li.value = line.libelle || ""; li.addEventListener("input", function () { line.libelle = li.value; emitChange(); }); tdL.appendChild(li); tr.appendChild(tdL);
        persons.forEach(function (p) {
          var td = el("td"); var inp = el("input", "field-input"); inp.type = "text"; inp.value = line.montants[p] || "";
          inp.addEventListener("input", function () { line.montants[p] = inp.value; emitChange(); });
          td.appendChild(inp); tr.appendChild(td);
        });
        var tdA = el("td", "th-act"); var del = el("button", "btn-del", "✕"); del.type = "button"; del.addEventListener("click", function () { arr.splice(i, 1); render(); emitChange(); }); tdA.appendChild(del); tr.appendChild(tdA);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
    }
    addBtn.addEventListener("click", function () { arr.push({ poste: postes[0], libelle: "", montants: {} }); render(); emitChange(); });
    render();
    host.appendChild(box);
  }

  // --- arbitrage : tableau de revue de TOUS les actifs (valeur nette, date d'acq.,
  // montant à arbitrer/vendre). Les montants sont stockés dans data.arbitrage.montants
  // par clé d'actif ; emitChange() rafraîchit le « disponible après arbitrage » calculé.
  function renderArbitrageTable(data, host) {
    data.arbitrage = data.arbitrage || {};
    data.arbitrage.montants = data.arbitrage.montants || {};
    var K = window.HexaCompute;
    var lignes = (K && K.arbitrageActifs(data).lignes) || [];
    // Construit un tableau (sous-titre + colonnes) pour un sous-ensemble d'actifs ;
    // l'input numérique reste lié à data.arbitrage.montants[l.key] via emitChange().
    function table(title, headers, items, withDate) {
      host.appendChild(el("div", "subgroup-title", title));
      var wrap = el("div", "table-wrap");
      var tbl = el("table", "edit-table");
      var thead = el("thead"), htr = el("tr");
      headers.forEach(function (h) { htr.appendChild(el("th", null, h)); });
      thead.appendChild(htr); tbl.appendChild(thead);
      var tbody = el("tbody");
      items.forEach(function (l) {
        var tr = el("tr");
        tr.appendChild(el("td", null, l.designation));
        tr.appendChild(el("td", null, l.detail || l.categorie));
        tr.appendChild(el("td", null, K ? K.formatEur(l.valeurNette) : String(l.valeurNette)));
        if (withDate) tr.appendChild(el("td", null, l.dateAcquisition ? (K ? K.formatDateFR(l.dateAcquisition) : l.dateAcquisition) : "—"));
        else tr.appendChild(el("td", null, "—"));
        var tdM = el("td");
        var inp = el("input", "field-input"); inp.type = "text"; inp.inputMode = "numeric";
        inp.value = data.arbitrage.montants[l.key] || "";
        inp.addEventListener("input", function () { data.arbitrage.montants[l.key] = inp.value; emitChange(); });
        tdM.appendChild(inp); tr.appendChild(tdM);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody); wrap.appendChild(tbl); host.appendChild(wrap);
    }
    var immo = lignes.filter(function (l) { return l.isImmo; });
    var mob = lignes.filter(function (l) { return !l.isImmo; });
    table("Immobilier", ["Actif", "Classe", "Valeur nette", "Date d'acq.", "Montant à arbitrer / vendre"], immo, true);
    table("Mobilier / financier", ["Actif", "Type", "Valeur", "—", "Montant à désinvestir"], mob, false);
  }

  // --- aiguillage générique pour un tableau ---
  function renderArrayField(parent, key, host) {
    var arr = parent[key];
    if (TRANSPOSE_KEYS[key]) { transposedTable(parent, key, host); return; }
    var tmpl = listTemplate(parent, key); // colonnes connues même si le tableau est vide
    // Migration : d'anciennes saisies ont pu réduire un tableau d'objets à une
    // liste de chaînes ; on rétablit la forme objet attendue par le gabarit.
    if (tmpl && !tmpl.montants) {
      arr.forEach(function (it, i) {
        if (typeof it !== "object" || it === null) {
          var o = {}; Object.keys(tmpl).forEach(function (k) { o[k] = tmpl[k]; });
          if ("libelle" in o && it != null && it !== "") o.libelle = String(it);
          arr[i] = o;
        }
      });
    }
    // Migration : tableau matriciel (montants par personne) dont les items portent
    // encore un montant unique -> on bascule ce montant sur « Foyer ».
    if (tmpl && tmpl.montants) {
      arr.forEach(function (it) {
        if (it && typeof it === "object" && !it.montants) {
          it.montants = (it.montant != null && it.montant !== "") ? { "Foyer": it.montant } : {};
          delete it.montant;
        }
      });
    }
    if ((arr.length && typeof arr[0] === "object" && arr[0].montants) || (!arr.length && tmpl && tmpl.montants)) { revenusMatrix(parent, key, host); return; }
    if ((arr.length && typeof arr[0] === "object") || (!arr.length && tmpl)) {
      if (!arr.length || arrayIsFlat(arr)) objectTable(parent, key, host, tmpl);
      else itemCards(parent, key, host);
    } else {
      stringList(parent, key, host);
    }
  }

  // --- rend un objet (récursif) ---
  function renderObject(obj, host, depth) {
    Object.keys(obj).forEach(function (key) {
      if (HIDDEN_KEYS[key]) return;
      var val = obj[key];
      // Clé attendue comme tableau d'objets (gabarit connu) mais valeur malformée
      // (scalaire ou objet isolé) : on rétablit un tableau pour un affichage correct.
      if (!Array.isArray(val) && listTemplate(obj, key)) { obj[key] = (val && typeof val === "object") ? [val] : []; renderArrayField(obj, key, host); return; }
      if (val === null || val === undefined) { scalarField(obj, key, host); return; }
      if (Array.isArray(val)) { renderArrayField(obj, key, host); return; }
      if (typeof val === "object") {
        var grp = el("div", "subgroup");
        var h = el("div", "subgroup-title", label(key));
        grp.appendChild(h);
        var inner = el("div", "subgroup-body");
        grp.appendChild(inner);
        renderObject(val, inner, (depth || 0) + 1);
        host.appendChild(grp);
        return;
      }
      scalarField(obj, key, host);
    });
  }

  // sections de premier niveau, dans l'ordre du document
  var SECTIONS = [
    { key: "doc", title: "Document & conseiller", icon: "📄" },
    { key: "foyer", title: "Composition du foyer", icon: "👥", wrap: ["foyer", "foyerNote"] },
    { key: "actif", title: "Composition du patrimoine", icon: "🏠" },
    { key: "budget", title: "Analyse budgétaire", icon: "€" },
    { key: "fiscaliteRetraite", title: "Situation fiscale & épargne retraite", icon: "🧾", wrap: ["fiscalite", "epargneRetraite"] },
    { key: "diagnostic", title: "Diagnostic (forces / vigilance)", icon: "⚖" },
    { key: "risques", title: "Cartographie des risques", icon: "⚠" },
    { key: "succession", title: "Audit successoral", icon: "⚱", wrap: ["donations", "successionParams"] },
    { key: "objectifs", title: "Objectifs hiérarchisés", icon: "🎯", wrap: ["profilPatrimonial", "objectifs"] },
    { key: "arbitrage", title: "Préconisations — arbitrage", icon: "↗" },
    { key: "donationsEnvisagees", title: "Donations envisagées", icon: "🎁" },
    { key: "reinvestissements", title: "Réinvestissement par enveloppe", icon: "🔁" },
    { key: "planAction", title: "Plan d'action", icon: "✅" },
    { key: "contexte", title: "Contexte & avertissement", icon: "ℹ" },
    { key: "synthese", title: "Synthèse exécutive", icon: "✦" }
  ];

  var changeCb = null;
  function emitChange() { if (changeCb) changeCb(); }

  function build(data, container, onChange) {
    changeCb = onChange;
    formData = data;
    container.innerHTML = "";
    SECTIONS.forEach(function (sec, idx) {
      var details = el("details", "section");
      if (idx === 0) details.open = true;
      var summary = el("summary", "section-summary");
      summary.appendChild(el("span", "section-icon", sec.icon));
      summary.appendChild(el("span", "section-name", sec.title));
      summary.appendChild(el("span", "section-chevron", "▾"));
      details.appendChild(summary);
      var body = el("div", "section-body");
      var keys = sec.wrap || [sec.key];
      // Sections entièrement dérivées des données : pas de saisie, juste l'aperçu calculé.
      var COMPUTED_ONLY = { diagnostic: 1, risques: 1, synthese: 1, planAction: 1 };
      // Arbitrage : note + tableau des actifs (piloté par les données), pas de rendu générique.
      if (sec.key === "arbitrage") {
        data.arbitrage = data.arbitrage || {};
        scalarField(data.arbitrage, "note", body);
        // Plus-value de cession : forfaits art. 150 VB activés par défaut (option globale).
        data.pvParams = data.pvParams || { forfaits: "Oui" };
        scalarField(data.pvParams, "forfaits", body);
        renderArbitrageTable(data, body);
      } else if (!COMPUTED_ONLY[sec.key]) {
        keys.forEach(function (k) {
          var v = data[k];
          // Clé attendue comme tableau d'objets (gabarit connu) mais valeur malformée
          // (scalaire ou objet isolé) : on rétablit un tableau pour un affichage correct.
          if (!Array.isArray(v) && listTemplate(data, k)) { data[k] = (v && typeof v === "object") ? [v] : []; renderArrayField(data, k, body); return; }
          if (Array.isArray(v)) {
            renderArrayField(data, k, body);
          } else if (v && typeof v === "object") {
            renderObject(v, body, 0);
          } else {
            scalarField(data, k, body);
          }
        });
      }
      // bloc de valeurs calculées (lecture seule)
      if (sec.key === "actif" || sec.key === "budget" || sec.key === "synthese" || sec.key === "diagnostic" || sec.key === "arbitrage" || sec.key === "donationsEnvisagees" || sec.key === "reinvestissements" || sec.key === "planAction" || sec.key === "succession" || sec.key === "risques" || sec.key === "objectifs") {
        var cbox = el("div", "computed-box");
        cbox.id = "computed-" + sec.key;
        body.appendChild(cbox);
      }
      details.appendChild(body);
      container.appendChild(details);
    });
    refreshComputed(data);
  }

  // Rafraîchit les blocs « valeurs calculées » (appelé à chaque modification)
  function refreshComputed(data) {
    var K = window.HexaCompute;
    if (!K) return;
    function grid(title, pairs) {
      var box = el("div");
      box.appendChild(el("div", "comp-title", title));
      var g = el("div", "comp-grid");
      pairs.forEach(function (p) {
        var it = el("div", "comp-item");
        it.appendChild(el("span", "comp-k", p[0]));
        it.appendChild(el("span", "comp-v", p[1]));
        g.appendChild(it);
      });
      box.appendChild(g);
      return box;
    }
    var cdg = document.getElementById("computed-diagnostic");
    if (cdg && data.actif) {
      var dg = K.diagnostic(data);
      cdg.innerHTML = "";
      cdg.appendChild(el("div", "comp-title", "Forces & points de vigilance — générés automatiquement à partir des données"));
      function diagList(title, items, cls) {
        var box = el("div", "diag-col " + cls);
        box.appendChild(el("div", "diag-head", title));
        items.forEach(function (it) { box.appendChild(el("div", "diag-item", it)); });
        return box;
      }
      var cols = el("div", "diag-cols");
      cols.appendChild(diagList("✓ Forces", dg.forces, "diag-green"));
      cols.appendChild(diagList("⚠ Points de vigilance", dg.vigilance, "diag-red"));
      cdg.appendChild(cols);
    }
    var car = document.getElementById("computed-arbitrage");
    if (car && data.arbitrage) {
      var aa = K.arbitrageActifs(data);
      car.innerHTML = "";
      car.appendChild(grid("Calculé automatiquement", [
        ["Actifs à arbitrer", String(aa.aArbitrer.length)],
        ["Disponible après arbitrage", K.formatEur(aa.disponibleApres)]
      ]));
      var props = K.preconisations(data);
      if (props.length) {
        car.appendChild(el("div", "comp-sub", "Préconisations personnalisées"));
        props.forEach(function (pr, i) { car.appendChild(el("div", "comp-sentence", (i + 1) + ". " + pr.title + " — " + pr.detail)); });
      }
    }
    var cde = document.getElementById("computed-donationsEnvisagees");
    if (cde && K.donationStrategie && window.HexaSuccession) {
      var ds = K.donationStrategie(data);
      cde.innerHTML = "";
      cde.appendChild(grid("Coût des donations envisagées", [
        ["Total donné", K.formatEur(ds.totalMontant)],
        ["En franchise", K.formatEur(ds.totalFranchise)],
        ["Coût total des droits", K.formatEur(ds.totalDroits)],
        ["Capital dégagé (arbitrage)", K.formatEur(ds.disponibleApres)]
      ]));
      ds.lignes.forEach(function (l) {
        cde.appendChild(el("div", "comp-sentence", l.donateur + " → " + l.beneficiaire + " (" + l.lien + ") : " + K.formatEur(l.montant) + " — franchise " + K.formatEur(l.enFranchise) + ", droits " + K.formatEur(l.droits)));
      });
    }
    var cre = document.getElementById("computed-reinvestissements");
    if (cre && K.reinvestTotals) {
      var rt = K.reinvestTotals(data);
      cre.innerHTML = "";
      cre.appendChild(grid("Allocation du capital dégagé", [
        ["Capital dégagé (arbitrage)", K.formatEur(rt.disponible)],
        ["Donations envisagées", K.formatEur(rt.donne)],
        ["À réinvestir", K.formatEur(rt.aAllouer)],
        ["Réinvesti (saisi)", K.formatEur(rt.total)],
        ["Reste à allouer", K.formatEur(rt.reste)]
      ]));
      rt.parEnveloppe.forEach(function (e) {
        cre.appendChild(el("div", "comp-sentence", e.enveloppe + " : " + K.formatEur(e.montant)));
      });
    }
    var cpa = document.getElementById("computed-planAction");
    if (cpa && K.feuilleDeRoute) {
      var fr = K.feuilleDeRoute(data);
      cpa.innerHTML = "";
      cpa.appendChild(el("div", "comp-title", "Feuille de route — générée à partir des arbitrages, donations et réinvestissements"));
      if (!fr.length) cpa.appendChild(el("div", "comp-sentence", "Renseignez les arbitrages, les donations envisagées et les réinvestissements pour générer la feuille de route."));
      else fr.forEach(function (s, i) { cpa.appendChild(el("div", "comp-sentence", (i + 1) + ". " + s.title + " — " + s.objectif + " : " + s.proposition)); });
    }
    var cs = document.getElementById("computed-synthese");
    if (cs && data.actif && data.synthese) {
      cs.innerHTML = "";
      cs.appendChild(el("div", "comp-title", "Synthèse exécutive — générée à partir des résultats du formulaire"));
      cs.appendChild(el("div", "comp-sub", "Diagnostic en bref"));
      cs.appendChild(el("div", "comp-sentence", "▸ " + K.patrimoineBullet(data)));
      (data.synthese.diagnostic || []).forEach(function (b) { cs.appendChild(el("div", "comp-sentence", "▸ " + b)); });
      cs.appendChild(el("div", "comp-sub", "Recommandations clés"));
      (data.synthese.recommandations || []).forEach(function (r, i) {
        cs.appendChild(el("div", "comp-sentence", (i + 1) + ". " + r.title + " — " + r.detail));
      });
    }
    var cob = document.getElementById("computed-objectifs");
    if (cob && K.profilInfo) {
      var pi = K.profilInfo(data);
      cob.innerHTML = "";
      cob.appendChild(el("div", "comp-title", "Profil patrimonial — pré-remplit les objectifs ci-dessus"));
      cob.appendChild(el("div", "comp-sentence", (pi.auto ? "Profil détecté automatiquement : " : "Profil retenu : ") + pi.nom + (pi.auto ? "" : "  (détection : " + pi.detecteNom + ")")));
      if (pi.horizon) cob.appendChild(el("div", "comp-sentence", pi.horizon));
      cob.appendChild(el("div", "comp-sentence", "Changez « Profil patrimonial » pour pré-remplir une autre grille d'objectifs ; les lignes restent ensuite modifiables."));
    }
    var crq = document.getElementById("computed-risques");
    if (crq && data.risques) {
      crq.innerHTML = "";
      crq.appendChild(el("div", "comp-title", "Cartographie des risques — générée automatiquement à partir des données"));
      var rwrap = el("div", "table-wrap"), rtbl = el("table", "edit-table");
      var rth = el("thead"), rhtr = el("tr");
      ["Risque", "Niveau", "Description"].forEach(function (h) { rhtr.appendChild(el("th", null, h)); });
      rth.appendChild(rhtr); rtbl.appendChild(rth);
      var rtb = el("tbody");
      data.risques.forEach(function (it) {
        var tr = el("tr");
        tr.appendChild(el("td", null, it.risk));
        tr.appendChild(el("td", null, it.level));
        tr.appendChild(el("td", null, it.desc));
        rtb.appendChild(tr);
      });
      rtbl.appendChild(rtb); rwrap.appendChild(rtbl); crq.appendChild(rwrap);
    }
    var ca = document.getElementById("computed-actif");
    if (ca && data.actif) {
      var t = K.assetTotals(data.actif, data); // périmètre couple (hors actifs des enfants)
      ca.innerHTML = "";
      ca.appendChild(grid("Calculé automatiquement", [
        ["Immobilier", K.formatEur(t.immo)], ["Autres actifs", K.formatEur(t.autres)],
        ["Actif brut", K.formatEur(t.brut)], ["Passif (CRD)", K.formatEur(t.passif)],
        ["Actif net", K.formatEur(t.net)], ["Part immobilière", K.formatPctVal(t.partImmoPct)],
        ["Taux d'endettement", K.formatPctVal(t.endettementPct)]
      ]));
      if (data.actif.comment) { ca.appendChild(el("div", "comp-sub", "Commentaire (généré)")); ca.appendChild(el("div", "comp-sentence", data.actif.comment)); }
    }
    var cb = document.getElementById("computed-budget");
    if (cb && data.budget) {
      var bt = K.budgetTotals(data.budget);
      cb.innerHTML = "";
      cb.appendChild(grid("Calculé automatiquement", [
        ["Total revenus", K.formatEur(bt.totalRevenus)], ["Total charges", K.formatEur(bt.totalCharges)],
        ["Revenus except.", K.formatEur(bt.totalExcRevenus)], ["Charges except.", K.formatEur(bt.totalExcCharges)],
        ["Budget disponible", K.formatEur(bt.disponible) + "  (" + K.formatPct(bt.disponible, bt.totalRevenus) + ")"],
        ["Capacité d'épargne / mois", K.formatEur(bt.epargneMensuelle)],
        ["Taux d'effort", K.formatPctVal(bt.tauxEffortPct)],
        ["Taux de pression fiscale", K.formatPctVal(bt.pressionFiscalePct)]
      ]));
    }
    var csu = document.getElementById("computed-succession");
    if (csu && data.succession && data.succession.monsieur) {
      var su = data.succession, det = su.details || {};
      csu.innerHTML = "";
      csu.appendChild(el("div", "comp-title", "Audit successoral — droits recalculés automatiquement depuis le patrimoine"));
      // Avertissement non bloquant : année de référence saisie ANTÉRIEURE à la date du
      // document ou d'une donation (la valeur n'est jamais modifiée ; vider le champ
      // la déduit automatiquement du document). Disparaît si vidée ou rendue cohérente.
      (function () {
        var arRaw = ((data.successionParams || {}).anneeReference == null ? "" : String((data.successionParams || {}).anneeReference)).trim();
        if (!arRaw) return;
        function yr(s) { var m = /(\d{4})/.exec(String(s || "")); return m ? parseInt(m[1], 10) : null; }
        var ar = yr(arRaw), docY = yr(data.doc && data.doc.date);
        var donY = (Array.isArray(data.donations) ? data.donations : []).map(function (d) { return yr(d.date); }).filter(function (x) { return x != null; });
        var minDon = donY.length ? Math.min.apply(null, donY) : null;
        if (ar != null && docY != null && ar < docY) {
          csu.appendChild(el("div", "comp-sentence", "⚠ L'année de référence saisie (" + arRaw + ") est antérieure à la date du document (" + docY + ") : le moteur retient " + docY + " pour le calcul (jamais de millésime antérieur à l'étude). Laissez le champ vide pour la déduire automatiquement."));
        } else if (ar != null && minDon != null && ar < minDon) {
          csu.appendChild(el("div", "comp-sentence", "⚠ L'année de référence saisie (" + arRaw + ") est antérieure à la date d'une donation renseignée. Vérifiez cette saisie."));
        }
      })();
      function succBlock(title, sc) {
        var box = el("div", "comp-succ-block");
        box.appendChild(el("div", "comp-sentence", title));
        var wrap = el("div", "table-wrap");
        var tbl = el("table", "edit-table");
        var thead = el("thead"), htr = el("tr");
        ["Scénario", "Droits 1er décès", "Droits 2nd décès", "TOTAL"].forEach(function (h) { htr.appendChild(el("th", null, h)); });
        thead.appendChild(htr); tbl.appendChild(thead);
        var tb = el("tbody");
        sc.scenarios.forEach(function (s) {
          var tr = el("tr");
          tr.appendChild(el("td", null, s.name));
          tr.appendChild(el("td", null, K.formatEur(K.parseNum(s.d1))));
          tr.appendChild(el("td", null, K.formatEur(K.parseNum(s.d2))));
          tr.appendChild(el("td", null, K.formatEur(K.scenarioTotal(s))));
          tb.appendChild(tr);
        });
        tbl.appendChild(tb); wrap.appendChild(tbl); box.appendChild(wrap);
        return box;
      }
      csu.appendChild(succBlock("Si Monsieur décède en premier", su.monsieur));
      csu.appendChild(succBlock("Si Madame décède en premier", su.madame));
      if (su.monsieur.observation) csu.appendChild(el("div", "comp-sentence", "▸ Monsieur : " + su.monsieur.observation));
      if (su.madame.observation) csu.appendChild(el("div", "comp-sentence", "▸ Madame : " + su.madame.observation));
      if (window.HexaSuccession && window.HexaSuccession.donationsSuivi) {
        var suivi = window.HexaSuccession.donationsSuivi(data);
        if (suivi.length) {
          csu.appendChild(el("div", "comp-sub", "Donations consenties — délai des 15 ans (art. 784 CGI)"));
          suivi.forEach(function (s) {
            csu.appendChild(el("div", "comp-sentence", s.donateur + " → " + s.beneficiaire + " : " + K.formatEur(s.valeur) + " (" + s.type + ", " + K.formatDateFR(s.date) + ") — " + s.statut));
          });
        }
      }
      if (det.enfantsNonCommuns) csu.appendChild(el("div", "comp-sentence", det.donationEntreEpoux
        ? "✓ Enfant(s) non commun(s) avec donation au dernier vivant (DDV) : le conjoint conserve les options d'usufruit (art. 1094-1)."
        : "⚠ Enfant(s) non commun(s) sans DDV : le conjoint est limité au 1/4 en pleine propriété (art. 757) ; les enfants reçoivent 3/4 en PP, taxés au 1er décès. Une donation au dernier vivant rouvrirait les options d'usufruit."));
      if ((K.parseNum(det.communsNet) + K.parseNum(det.propreMNet) + K.parseNum(det.propreMmeNet) + K.parseNum(det.avTotal)) === 0)
        csu.appendChild(el("div", "comp-sentence", "ℹ Renseignez le patrimoine (section « Composition du patrimoine ») pour chiffrer les droits ; sans actif, tous les montants restent à 0 €."));
      csu.appendChild(el("div", "comp-sentence",
        "Hypothèses — régime déclaré : " + (det.regime || "non renseigné") + " (liquidation par qualité de détention selon le régime déclaré) ; " +
        (det.assuranceVieHorsSuccession === false ? "AV intégrée à l'assiette" : "AV hors succession (990 I)") +
        " ; âges " + det.ageM + " / " + det.ageMme + " ans (" + det.annee + ") ; " + det.nEnfants + " enfant(s) ; " +
        "communs nets " + K.formatEur(det.communsNet) + ", propres M " + K.formatEur(det.propreMNet) +
        ", propres Mme " + K.formatEur(det.propreMmeNet) + "."));
    }
  }

  function buildModules(modulesState, container, onChange) {
    container.innerHTML = "";
    var lastCat = null;
    window.HEXA_MODULES.forEach(function (m) {
      if (m.cat && m.cat !== lastCat) { container.appendChild(el("div", "module-cat", m.cat)); lastCat = m.cat; }
      var lab = el("label", "module-toggle");
      var cb = el("input"); cb.type = "checkbox"; cb.checked = modulesState[m.id] !== false;
      cb.addEventListener("change", function () { modulesState[m.id] = cb.checked; if (onChange) onChange(); });
      lab.appendChild(cb);
      lab.appendChild(el("span", "module-label", m.label));
      container.appendChild(lab);
    });
  }

  window.HexaForm = { build: build, buildModules: buildModules, refreshComputed: refreshComputed };
})();
