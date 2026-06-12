/* =============================================================================
 * hexa-content.js — Données par défaut & contenu pédagogique
 * -----------------------------------------------------------------------------
 *  - HEXA_DEFAULT : jeu de données client pré-rempli (exemple « Monsieur et
 *    Madame X ») servant aussi de modèle de saisie.
 *  - HEXA_EDU     : contenu pédagogique statique (PER, AV, PEA, SCPI, FCPR,
 *    SCI à l'IS, démembrement…), identique d'un client à l'autre.
 *  - HEXA_MODULES : liste des modules activables/désactivables dans le formulaire.
 * ========================================================================== */
(function () {
  "use strict";

  // ==========================================================================
  // 1) DONNÉES CLIENT PAR DÉFAUT (exemple)
  // ==========================================================================
  var HEXA_DEFAULT = {
    doc: {
      title: "Étude patrimoniale",
      client: "Monsieur et Madame X",
      date: "Juin 2026",
      location: "Hexa Patrimoine – Maisons-Laffitte",
      advisorName: "Julien DANIEL",
      advisorFirm: "Hexa Patrimoine",
      advisorEmail: "j.daniel@hexa-patrimoine.com",
      advisorPhone: "06 58 80 36 30",
      advisorOrias: "6004342",
      advisorMembership: "Membre Anacofi-CIF & Anacofi Courtage",
      advisorCPI: "Transactions sur immeuble et fonds de commerce N°CPI78012026000000016"
    },

    // AUCUN résultat figé dans ce jeu d'exemple : la synthèse exécutive, le
    // diagnostic, la cartographie des risques, le commentaire d'actif et l'audit
    // successoral sont intégralement recalculés par HexaCompute.syncDerived()
    // à partir des saisies ci-dessous.

    foyer: {
      membres: [
        { qualite: "Monsieur", prenom: "Jean", nom: "X", naissance: "1978-04-15", lieuNaissance: "Paris (75)", capacite: "Majeur capable", handicap: "Non", situationMaritale: "Marié(e)s", regime: "Communauté réduite aux acquêts (régime légal)", filiation: "", activitePro: "Salarié(e)", statut: "Cadre", contrat: "CDI", statutFiscal: "Salarié", prevoyanceDeces: "Oui", prevoyanceIncapInval: "Oui" },
        { qualite: "Madame", prenom: "Marie", nom: "X", naissance: "1970-02-10", lieuNaissance: "Lyon (69)", capacite: "Majeur capable", handicap: "Non", situationMaritale: "Marié(e)s", regime: "Communauté réduite aux acquêts (régime légal)", filiation: "", activitePro: "Chef d'entreprise", statut: "Gérante", contrat: "Mandat social", statutFiscal: "TNS (indépendant / gérant majoritaire)", prevoyanceDeces: "Non", prevoyanceIncapInval: "Non" },
        { qualite: "Enfant", prenom: "Paul", nom: "X", naissance: "2003-06-20", lieuNaissance: "Versailles (78)", capacite: "Majeur capable", handicap: "Non", situationMaritale: "Célibataire", regime: "", filiation: "Enfant du couple", activitePro: "Étudiant(e)", statut: "", contrat: "" },
        { qualite: "Enfant", prenom: "Léa", nom: "X", naissance: "2005-11-08", lieuNaissance: "Versailles (78)", capacite: "Majeur capable", handicap: "Non", situationMaritale: "Célibataire", regime: "", filiation: "Enfant du couple", activitePro: "Étudiant(e)", statut: "", contrat: "" }
      ],
      residence: "France",
      tmi: "30 %",
      activite: "Revenus professionnels + revenus d'investissement + autres revenus"
    },
    foyerNote: "Données déclaratives à confirmer lors de la collecte des pièces (livret de famille, contrat de mariage, avis d'imposition).",

    actif: {
      immobilier: [
        { designation: "Maison Maisons-Laffitte", classe: "Résidence principale", type: "Maison", valeur: "550 000", dateAcquisition: "2009-05-01", prixAcquisition: "380 000", fraisAcquisition: "", travaux: "", fraisCession: "", proprietaire: "Communauté", quote: "100", droit: "PP", ageUsufruitier: "" },
        { designation: "Appartement La Rochelle", classe: "Investissement locatif", type: "Appartement", valeur: "230 000", dateAcquisition: "2016-09-15", prixAcquisition: "175 000", fraisAcquisition: "", travaux: "", fraisCession: "", proprietaire: "Monsieur Jean", quote: "100", droit: "PP", ageUsufruitier: "" },
        { designation: "Immeuble de rapport Tours", classe: "Investissement locatif", type: "Immeuble de rapport", valeur: "1 794 000", dateAcquisition: "2019-03-20", prixAcquisition: "1 450 000", fraisAcquisition: "", travaux: "", fraisCession: "", proprietaire: "Communauté", quote: "100", droit: "PP", ageUsufruitier: "" },
        { designation: "Maison de campagne", classe: "Résidence secondaire", type: "Maison", valeur: "160 000", dateAcquisition: "2012-07-01", prixAcquisition: "110 000", fraisAcquisition: "", travaux: "", fraisCession: "", proprietaire: "Communauté", quote: "100", droit: "PP", ageUsufruitier: "" },
        { designation: "Terrain (5 rue du Paradis)", classe: "Investissement locatif", type: "Foncier non bâti", valeur: "160 000", dateAcquisition: "2021-11-01", prixAcquisition: "150 000", fraisAcquisition: "", travaux: "", fraisCession: "", proprietaire: "Enfant Paul", quote: "100", droit: "NP", ageUsufruitier: "57" }
      ],
      autres: [
        { type: "PEA", designation: "PEA", valeur: "150 000", versements: "120 000", proprietaire: "Communauté", quote: "100", droit: "PP", ageUsufruitier: "", assure: "", beneficiaires: "" },
        { type: "Assurance-vie", designation: "Contrat d'assurance-vie", valeur: "260 000", versements: "200 000", proprietaire: "Communauté", quote: "100", droit: "PP", ageUsufruitier: "", assure: "Monsieur Jean", beneficiaires: "Le conjoint survivant, à défaut les enfants nés ou à naître par parts égales" },
        { type: "autre", designation: "Parts de société", valeur: "14 900", versements: "", proprietaire: "Monsieur Jean", quote: "100", droit: "PP", ageUsufruitier: "", assure: "", beneficiaires: "" },
        { type: "Compte courant", designation: "Comptes & livrets", valeur: "25 000", versements: "", proprietaire: "Communauté", quote: "100", droit: "PP", ageUsufruitier: "", assure: "", beneficiaires: "" }
      ],
      passifs: [
        { designation: "Prêt immobilier La Rochelle", typeCredit: "Immobilier", rattachement: "Appartement La Rochelle", crd: "40 000", dateFin: "2030-03-31", mensualite: "1 050", taux: "1,15 %" },
        { designation: "Crédit travaux", typeCredit: "Consommation", rattachement: "Autre", crd: "14 900", dateFin: "2027-09-30", mensualite: "427", taux: "2,30 %" }
      ],
      comment: "" // généré automatiquement (assetComment) à chaque recalcul
    },

    budget: {
      revenus: [
        { poste: "Revenus professionnels", libelle: "Salaires", montants: { "Monsieur Jean": "55 000", "Madame Marie": "22 748" } },
        { poste: "Revenus d'investissement", libelle: "Dividendes & coupons", montants: { "Foyer": "32 418" } },
        { poste: "Autres revenus", libelle: "Revenus divers", montants: { "Foyer": "18 000" } }
      ],
      charges: [
        { poste: "Remboursements d'emprunts et dettes", libelle: "Prêts immobiliers", montants: { "Foyer": "17 728" } },
        { poste: "Dépenses d'usage", libelle: "Vie courante", montants: { "Foyer": "44 900" } },
        { poste: "Cotisations Retraite / Épargne / Prévoyance", libelle: "", montants: {} },
        { poste: "Impôts et taxes", libelle: "IR + taxes locales", montants: { "Foyer": "17 920" } }
      ],
      exceptionnels: {
        revenus: [
          { libelle: "Prime / cession exceptionnelle", montant: "5 000" }
        ],
        charges: [
          { libelle: "Travaux exceptionnels (toiture)", montant: "12 000" }
        ]
      },
      note: ""
    },

    // Situation fiscale (IR informatif / tendance ; la TMI est saisie dans le foyer) et épargne retraite.
    fiscalite: { revenuImposable: "", irN1: "", irN2: "" },
    epargneRetraite: { perPlafondMonsieur: { N1: "", N2: "", N3: "", N4: "" }, perPlafondMadame: { N1: "", N2: "", N3: "", N4: "" }, perMutualisation: "Non" },

    // Hypothèses du moteur de calcul successoral (les montants ci-dessus sont
    // recalculés automatiquement à partir du patrimoine et de ces paramètres).
    successionParams: {
      assuranceVieHorsSuccession: "Oui",  // Oui : AV traitée hors barème (art. 990 I) ; Non : intégrée à l'assiette
      donationEntreEpoux: "Non",          // DDV (donation au dernier vivant) consentie ? élargit les options du conjoint (clé si enfant non commun)
      anneeReference: ""                  // année d'évaluation des âges ; vide = déduite de la date du document
    },

    // Donations déjà consenties (suivi du rappel fiscal des 15 ans, art. 784 CGI)
    donations: [
      { donateur: "Monsieur Jean", beneficiaire: "Enfant Paul", valeur: "50 000", type: "Donation-partage", date: "2018-06-15" },
      { donateur: "Madame Marie", beneficiaire: "Enfant Léa", valeur: "30 000", type: "Avance successorale (rapportable)", date: "2022-09-01" }
    ],

    profilPatrimonial: "Automatique",
    objectifs: [
      { title: "Réduire la pression fiscale", detail: "IFI et fiscalité des revenus fonciers — priorité immédiate" },
      { title: "Préparer la retraite & des revenus complémentaires", detail: "Constituer une épargne long terme défiscalisée" },
      { title: "Diversifier le patrimoine", detail: "Rééquilibrer vers les actifs financiers et la liquidité" },
      { title: "Organiser la transmission", detail: "Anticiper la succession, préserver l'équité entre enfants" },
      { title: "Étudier une mobilité internationale", detail: "Sécuriser le cadre fiscal et successoral d'un départ" }
    ],

    // Plus-value de cession : forfaits d'acquisition (art. 150 VB) actifs par défaut.
    pvParams: { forfaits: "Oui" },

    arbitrage: { note: "Sélectionnez les actifs à arbitrer et le montant à dégager ; le total alimente le « disponible après arbitrage ».", montants: { "immo:1": "190 000", "immo:3": "160 000", "autre:0": "80 000" } },

    // Donations envisagées : liste des donations planifiées (donateur + bénéficiaire +
    // montant). Le coût des droits de chaque donation est calculé automatiquement et
    // alimente la slide « Stratégie de donation » (exemple seeded sur le capital dégagé).
    donationsEnvisagees: [
      { donateur: "Monsieur Jean", beneficiaire: "Enfant Paul", montant: "140 000" },
      { donateur: "Madame Marie", beneficiaire: "Enfant Léa", montant: "140 000" }
    ],

    // Réinvestissement par enveloppe : allocation du capital dégagé par l'arbitrage,
    // net des donations envisagées, vers des supports d'investissement cibles.
    // Saisie de démo calibrée sur le capital NET à allouer (brut 430 000 − impôt de
    // plus-value ≈ 10 449 − donations 280 000) pour un reste à 0.
    reinvestissements: [
      { enveloppe: "Assurance-vie luxembourgeoise", montant: "100 000" },
      { enveloppe: "PER", montant: "39 551" }
    ],

    // Plan d'action : AUCUNE étape figée — la feuille de route est générée par
    // HexaCompute.feuilleDeRoute() depuis les arbitrages, donations envisagées
    // et réinvestissements saisis ci-dessus.

    contexte: {
      intro: "Lors de nos premiers échanges, nous avons passé en revue vos objectifs patrimoniaux et en avons établi l'ordre de priorité. Vous trouverez ci-après une synthèse de l'étude patrimoniale, assortie de pistes d'optimisation appuyées par des projections chiffrées.",
      avertissement: "La présente étude patrimoniale constitue une étude personnalisée établie après recueil des informations transmises par le client. Elle ne constitue pas une consultation juridique ou fiscale au sens de la réglementation en vigueur. Les aspects civils, fiscaux, comptables et successoraux évoqués doivent être validés, le cas échéant, par des professionnels habilités (notaire, expert-comptable, avocat fiscaliste). Le conseiller ne se substitue pas à ces derniers. Les décisions de mise en œuvre relèvent de la seule responsabilité du client. Les hypothèses et projections présentées ne constituent aucun engagement de performance. Tout investissement comporte des risques, notamment de perte en capital, et selon les supports des risques de liquidité, de marché, de change, de crédit et de valorisation."
    }
  };

  // ==========================================================================
  // 2) CONTENU PÉDAGOGIQUE STATIQUE
  // ==========================================================================
  var HEXA_EDU = {
    methodologie: {
      steps: [
        { n: "1", t: "Découverte", d: "Recueil de la situation familiale, patrimoniale et des revenus" },
        { n: "2", t: "Diagnostic", d: "Forces, faiblesses et cartographie des risques du patrimoine" },
        { n: "3", t: "Objectifs", d: "Hiérarchisation des priorités du client" },
        { n: "4", t: "Préconisations", d: "Solutions argumentées, reliées à chaque objectif" },
        { n: "5", t: "Plan d'action", d: "Recommandations chiffrées et calendrier de mise en œuvre" },
        { n: "6", t: "Suivi", d: "Points d'étape et actualisation dans le temps" }
      ],
      cadre: "Document établi par un CIF (membre ANACOFI-CIF). Étude personnalisée établie sur les informations et données transmises par le client. La mise en œuvre requiert l'accompagnement de professionnels qualifiés (notaire, avocat fiscaliste, expert-comptable).",
      perimetre: "Périmètre : audit civil, fiscal et financier du foyer. Sources : éléments déclarés par le client, avis d'imposition, relevés patrimoniaux, barèmes fiscaux en vigueur."
    },

    abattements: {
      parente: [
        ["Parent → enfant", "100 000 €", "Tous les 15 ans"],
        ["Grand-parent → petit-enfant", "31 865 €", "Tous les 15 ans"],
        ["Arrière-grand-parent → arrière-petit-enfant", "5 310 €", "Tous les 15 ans"],
        ["Frères / sœurs", "15 932 €", "Tous les 15 ans"],
        ["Neveux / nièces", "7 967 €", "Tous les 15 ans"],
        ["Personne handicapée", "159 325 €", "Cumulable"]
      ],
      don: ["Don familial de somme d'argent", "31 865 €", "Donateur < 80 ans, bénéficiaire majeur — tous les 15 ans"],
      note: "Chaque parent peut transmettre dès aujourd'hui jusqu'à 131 865 € à chaque enfant en franchise de droits, en cumulant deux dispositifs : l'abattement de droit commun de 100 000 € (art. 779 CGI), valable pour tout type de bien, et le don familial de somme d'argent de 31 865 € (art. 790 G CGI), réservé aux dons d'argent. La capacité réellement disponible est calculée dans le tableau « Capacité de donation en franchise », nette des donations de moins de 15 ans déjà consenties (art. 784 CGI). Ces abattements se reconstituent tous les 15 ans."
    },

    demembrement: {
      intro: "Le démembrement nécessite impérativement l'accompagnement d'un notaire pour la rédaction de l'acte.",
      steps: [
        { n: "01", t: "Donation de la nue-propriété", d: "Les parents transfèrent la nue-propriété du bien à leurs enfants par acte notarié.\n• Acte authentique obligatoire\n• Calcul des droits sur la valeur réduite\n• Prise en charge possible des droits par les parents" },
        { n: "02", t: "Réserve d'usufruit", d: "Les parents donateurs conservent l'usufruit du bien, généralement à vie.\n• Droit d'occuper le logement\n• Droit de percevoir les loyers (si locatif)\n• Gestion courante conservée" },
        { n: "03", t: "Clauses & vigilance", d: "Sécuriser l'acte par des clauses spécifiques pour éviter les litiges futurs.\n• Réversion d'usufruit au conjoint survivant\n• Répartition des charges (art. 605/606)\n• Interdiction d'aliéner sans accord" }
      ]
    },

    baremeUsufruit: {
      intro: "La valeur de la nue-propriété, base de calcul des droits de donation, est déterminée selon l'âge de l'usufruitier (donateur) au jour de la donation — Article 669 du CGI.",
      rows: [
        ["Moins de 21 ans", "90 %", "10 %"], ["21 à 30 ans", "80 %", "20 %"],
        ["31 à 40 ans", "70 %", "30 %"], ["41 à 50 ans", "60 %", "40 %"],
        ["51 à 60 ans", "50 %", "50 %"], ["61 à 70 ans", "40 %", "60 %"],
        ["71 à 80 ans", "30 %", "70 %"], ["81 à 90 ans", "20 %", "80 %"],
        ["91 ans et plus", "10 %", "90 %"]
      ],
      exemple: "Exemple — donation à 56 ans : bien de 200 000 €, base taxable (NP 50 %) = 100 000 €. Les droits sont calculés sur 100 000 € au lieu de 200 000 €, avant l'abattement en ligne directe de 100 000 € par parent et par enfant (tous les 15 ans)."
    },

    strategies: [
      {
        t: "Attribution exclusive avec soulte", accent: "PETROL",
        sub: "Chaque enfant reçoit un bien distinct ; l'enfant avantagé verse une soulte pour rétablir l'équilibre.",
        plus: ["Simple à mettre en place", "Pas d'acte notarié complexe", "Pas d'indivision sur les biens", "Coût notarié limité"],
        moins: ["Rapport au décès à valeur actuelle", "Soulte à financer", "Rééquilibrage remis en cause si les biens s'apprécient différemment", "Source potentielle de conflits"],
        verdict: "Solution transitoire ou petit patrimoine"
      },
      {
        t: "Donation-partage", accent: "GOLD",
        sub: "Acte notarié (art. 1078 C. civ.). Les valeurs sont figées au jour de l'acte — aucun rapport à valeur future.",
        plus: ["Valeur figée au jour de l'acte", "Aucun risque de réévaluation au décès", "Limite le risque de conflit familial", "Un seul acte, droits calculés une fois", "Soulte intégrée sans droits supplémentaires"],
        moins: ["Accord de tous les enfants requis", "Coût notarié légèrement supérieur", "Irrévocable"],
        verdict: "Solution optimale pour patrimoine significatif"
      },
      {
        t: "SCI familiale — démembrement de parts", accent: "PETROL",
        sub: "Les biens sont apportés à une SCI ; la NP des parts est donnée à parts égales. La gouvernance est organisée par les statuts.",
        plus: ["Zéro indivision sur les biens", "Gouvernance organisée par statuts", "Décote de liquidité sur parts (~20 %)", "Base IFI réduite par le CCA", "Transmission progressive / 15 ans"],
        moins: ["Frais de création (~2 000 €)", "Comptabilité annuelle obligatoire", "Délai 6-12 mois avant donation"],
        verdict: "Solution premium — patrimoine > 800 K€"
      }
    ],
    strategiesNote: "Toutes ces stratégies nécessitent l'intervention d'un notaire et/ou d'un avocat fiscaliste. Elles sont combinables selon le profil patrimonial.",

    per: {
      fonctionnement: [
        { title: "Alimentation souple", body: "Versements volontaires libres ou programmés, épargne salariale (intéressement, participation) et transferts d'anciens contrats." },
        { title: "Horizon retraite", body: "Épargne bloquée jusqu'à la retraite pour sécuriser l'objectif long terme. Gestion pilotée selon votre profil (Prudent à Dynamique)." },
        { title: "Déblocage anticipé", body: "Possible pour l'achat de la résidence principale et en cas d'accidents de la vie (invalidité, décès du conjoint, fin de droits chômage…)." },
        { title: "Sorties à la carte", body: "Liberté de choix à la retraite : capital (en une ou plusieurs fois), rente viagère, ou un mix des deux." },
        { title: "Fiscalité à la carte", body: "Choix à l'entrée : déduire les versements pour baisser l'impôt immédiat, ou y renoncer pour alléger la fiscalité à la sortie." },
        { title: "Leviers d'optimisation", body: "Idéal pour les TMI élevées. Report des plafonds sur 5 ans et mutualisation des plafonds entre conjoints." }
      ],
      entree: [
        "Vos versements volontaires sont déduits de votre revenu imposable, réduisant l'impôt immédiat.",
        "Plafond salarié 2026 : 4 710 € à 37 680 € (10 % des revenus nets).",
        "Le cas échéant, pour un travailleur non salarié (TNS) : plafond spécifique pouvant atteindre 88 911 € (calcul sur le bénéfice)."
      ],
      sortie: [
        "Si versements DÉDUITS — Capital : imposé au barème IR (sans abattement 10 %), gains au PFU 31,4 %. Rente : imposée comme pension (abattement 10 %) + PS.",
        "Si versements NON DÉDUITS — Capital : exonéré, seuls les gains taxés au PFU 31,4 %. Rente : fiscalité allégée (RVTO) selon l'âge.",
        "PFU = Prélèvement Forfaitaire Unique (12,8 % IR + 18,6 % PS)."
      ]
      // Pas de « reco » chiffrée en dur : le bandeau d'économie d'IR de la diapo
      // PER est calculé depuis les plafonds saisis (épargne retraite) × TMI du foyer.
    },

    av: {
      fonctionnement: [
        { title: "Versements et seuils", body: "Aucun plafond légal. Tickets d'entrée élevés (souvent ≥ 125 000 €). Versements en numéraire ou par apport de titres." },
        { title: "Supports éligibles", body: "Fonds en euros, unités de compte, fonds dédiés (FID, FAS) et fonds internes collectifs. Accès au non coté, devises multiples." },
        { title: "Triangle de sécurité", body: "Actifs ségrégués chez une banque dépositaire, sous contrôle du régulateur (CAA). Privilège de super-priorité de l'assuré." },
        { title: "Rachats et liquidité", body: "Rachats partiels ou totaux à tout moment. Liquidité variable selon les supports (le non coté reste peu liquide)." },
        { title: "Neutralité fiscale", body: "Le Luxembourg n'applique pas de fiscalité propre : c'est la fiscalité du pays de résidence qui s'applique." },
        { title: "Profil et usage", body: "Outil de structuration patrimoniale et de mobilité internationale, pour patrimoines recherchant sécurité et portabilité." }
      ],
      fiscalite: [
        { title: "Neutralité fiscale (Luxembourg)", body: "Ni impôt ni retenue à la source au Luxembourg. Pour un résident français, c'est la fiscalité française de l'assurance vie qui s'applique." },
        { title: "Rachats (< 8 ans)", body: "Seule la part de gains du retrait est imposée : PFU de 12,8 % d'IR, ou sur option le barème progressif de l'IR." },
        { title: "Rachats après 8 ans", body: "Abattement annuel de 4 600 € (9 200 € pour un couple). Au-delà : 7,5 % jusqu'à 150 000 € de versements, 12,8 % au-delà." },
        { title: "Prélèvements sociaux", body: "17,2 % sur les gains (assurance-vie exclue de la hausse LFSS 2026 ; les autres enveloppes sont à 18,6 %), lors des rachats et au fil de l'eau sur le fonds en euros." },
        { title: "Transmission avant 70 ans", body: "Art. 990 I CGI : abattement de 152 500 € par bénéficiaire, puis 20 % jusqu'à 700 000 € et 31,25 % au-delà." },
        { title: "Après 70 ans & portabilité", body: "Art. 757 B : abattement global de 30 500 € sur les primes, puis droits de succession. Fiscalité portable en cas d'expatriation." }
      ],
      vie: [
        { title: "Disponibilité totale", body: "Votre capital n'est jamais bloqué : rachats partiels ou totaux à tout moment." },
        { title: "Fiscalité avantageuse", body: "Après 8 ans, fiscalité allégée sur les gains (abattement annuel 4 600 € / 9 200 € pour un couple)." },
        { title: "Souplesse de gestion", body: "Arbitrez librement entre fonds euro et unités de compte pour diversifier votre patrimoine." }
      ],
      transmission: [
        { title: "Hors succession", body: "Juridiquement, le capital décès ne fait pas partie de la succession du défunt (Code des assurances)." },
        { title: "Liberté de choix", body: "Grâce à la clause bénéficiaire, vous désignez librement qui recevra les capitaux." },
        { title: "Fiscalité privilégiée", body: "Abattements spécifiques (jusqu'à 152 500 € par bénéficiaire) réduisant les droits de succession." }
      ],
      avant70: { article: "Article 990 I du CGI", abattement: "152 500 €", abattementNote: "par bénéficiaire désigné, renouvelable", bareme: "20 % jusqu'à 700 000 € (après abattement), 31,25 % au-delà. Intérêts capitalisés exonérés." },
      apres70: { article: "Article 757 B du CGI", abattement: "30 500 €", abattementNote: "global, partagé entre tous les bénéficiaires", bareme: "Réintégration dans l'actif successoral. Seules les primes versées sont taxées ; les intérêts générés restent exonérés." }
    },
    avFr: {
      fonctionnement: [
        { title: "Accessibilité", body: "Ouverte à tous, sans plafond légal : versements libres ou programmés dès quelques centaines d'euros." },
        { title: "Supports", body: "Fonds en euros à capital garanti et unités de compte (actions, obligations, SCPI, ETF…). Gestion libre ou pilotée." },
        { title: "Garantie des dépôts", body: "Capitaux garantis par le FGAP jusqu'à 70 000 € par assuré et par compagnie d'assurance." },
        { title: "Rachats & liquidité", body: "Épargne disponible à tout moment (rachats partiels ou totaux) ; avances possibles sans désinvestir." },
        { title: "Cadre « Sapin 2 »", body: "Blocage temporaire des rachats possible sur décision du HCSF en cas de crise systémique grave." },
        { title: "Profil & usage", body: "Épargne de précaution, financement de projets, préparation de la retraite et transmission." }
      ],
      fiscalite: [
        { title: "Rachats avant 8 ans", body: "Seule la part de gains du retrait est imposée : PFU de 12,8 % d'IR, ou sur option le barème progressif de l'IR." },
        { title: "Rachats après 8 ans", body: "Abattement annuel de 4 600 € (9 200 € pour un couple) ; au-delà : 7,5 % jusqu'à 150 000 € de versements, 12,8 % ensuite." },
        { title: "Prélèvements sociaux", body: "17,2 % sur les gains (assurance-vie exclue de la hausse LFSS 2026 ; les autres enveloppes sont à 18,6 %)." },
        { title: "Transmission avant 70 ans (art. 990 I)", body: "Abattement de 152 500 € par bénéficiaire, puis 20 % jusqu'à 700 000 €, 31,25 % au-delà." },
        { title: "Après 70 ans (art. 757 B)", body: "Abattement global de 30 500 € sur les primes versées ; les intérêts générés restent exonérés." }
      ]
    },

    scpi: {
      intro: "Une SCPI est un véhicule d'investissement collectif géré par une société de gestion agréée AMF. Les investisseurs achètent des parts et deviennent indirectement propriétaires d'un parc immobilier diversifié (bureaux, commerces, logistique, résidentiel, santé).",
      kpis: [
        { v: "4 – 7 %", l: "Rendement brut moyen" },
        { v: "200 €", l: "Ticket d'entrée min." },
        { v: "~700 Mds €", l: "Capitalisation France" },
        { v: "> 200", l: "SCPI agréées AMF" }
      ],
      familles: [
        { title: "SCPI de rendement", body: "Objectif : revenus réguliers. Immobilier tertiaire (bureaux, commerces, logistique, santé). La plus répandue." },
        { title: "SCPI fiscales", body: "Objectif : réduction d'impôt (Pinel, Denormandie, Malraux, déficit foncier). Rendement moindre, horizon 15 ans min." },
        { title: "SCPI de valorisation", body: "Objectif : plus-value à terme. Peu ou pas de revenus courants. Stratégie patrimoniale à long terme." }
      ],
      avantages: ["Accessibilité dès 200 € — pas de gestion locative", "Diversification : dizaines d'actifs, plusieurs zones", "Rendement 4 à 6 % bruts/an (SCPI de rendement)", "SCPI européennes : revenus hors PS via conventions", "Gestion déléguée — société agréée AMF"],
      vigilance: ["Liquidité limitée — revente variable (marché secondaire)", "Risque de perte : la valeur des parts peut baisser", "Rendement variable — vacance locative possible", "Revenus fonciers taxés TMI + 17,2 % PS (sauf euro.)", "Horizon long : 8 à 10 ans minimum"]
    },

    pea: {
      fonctionnement: [
        { title: "Plafond de versement", body: "150 000 € (300 000 € pour un couple, soit deux PEA). Versements en numéraire uniquement." },
        { title: "Titres éligibles", body: "Actions de sociétés européennes (UE/EEE), fonds (OPCVM, ETF) investis à 75 % min. en titres éligibles." },
        { title: "Retraits et durée", body: "Tout retrait avant 5 ans entraîne la clôture. Après 5 ans : retraits partiels libres et versements toujours possibles." },
        { title: "Sortie capital ou rente", body: "Sortie en capital après 5 ans, en une ou plusieurs fois. Possibilité de rente viagère exonérée d'IR." },
        { title: "Cadre fiscal avantageux", body: "Gains exonérés d'IR après 5 ans (hors PS). Capitalisation en franchise d'impôt tant qu'aucun retrait." },
        { title: "Profil et risque", body: "Investissement actions : risque de perte en capital et volatilité. Horizon long terme (5 ans min.) conseillé." }
      ],
      fiscalite: [
        { title: "Retrait avant 5 ans", body: "Gain net imposé au PFU de 31,4 % (12,8 % IR + 18,6 % PS) et clôture. Option possible pour le barème de l'IR." },
        { title: "Retrait après 5 ans", body: "Gains totalement exonérés d'IR. Seuls les prélèvements sociaux restent dus, au taux en vigueur au retrait." },
        { title: "Prélèvements sociaux", body: "Taux de 18,6 % depuis 2026 (hausse de la CSG). Dus uniquement lors des retraits." },
        { title: "Titres non cotés", body: "Exonération des dividendes plafonnée à 10 %/an de la valeur des titres. La fraction excédentaire est imposable." },
        { title: "Décès et transmission", body: "Le décès entraîne la clôture. Les titres intègrent l'actif successoral (droits de succession de droit commun)." },
        { title: "Pertes et clôture", body: "Clôture en moins-value : imputable sur plus-values de même nature de l'année et des 10 années suivantes." }
      ]
    },

    peapme: {
      fonctionnement: [
        { title: "Plafond de versement", body: "225 000 €, commun avec le PEA classique (dont 150 000 € max sur le PEA). Versements en numéraire." },
        { title: "Titres éligibles", body: "PME et ETI européennes (< 5 000 salariés, CA < 1,5 Md€), fonds (FCP, FIP, OPCVM) et obligations éligibles." },
        { title: "Retraits et durée", body: "Retrait avant 5 ans : clôture. Après 5 ans : retraits partiels libres, versements toujours possibles." },
        { title: "Sortie capital ou rente", body: "Sortie en capital après 5 ans. Possibilité de rente viagère exonérée d'impôt sur le revenu." },
        { title: "Cadre fiscal avantageux", body: "Gains exonérés d'IR après 5 ans (hors PS). Capitalisation en franchise d'impôt." },
        { title: "Profil et risque", body: "Petites valeurs : potentiel élevé mais risque de perte et liquidité plus faible. Horizon long conseillé." }
      ],
      fiscalite: [
        { title: "Retrait avant 5 ans", body: "Gain imposé au PFU de 31,4 % (12,8 % IR + 18,6 % PS) et clôture. Option barème de l'IR possible." },
        { title: "Retrait après 5 ans", body: "Gains exonérés d'IR. Seuls les prélèvements sociaux restent dus, au taux en vigueur." },
        { title: "Prélèvements sociaux", body: "18,6 % depuis 2026 (hausse de la CSG). Dus uniquement lors des retraits." },
        { title: "Titres non cotés", body: "Exonération des dividendes plafonnée à 10 %/an de la valeur des titres." },
        { title: "Décès et transmission", body: "Clôture au décès. Les titres intègrent l'actif successoral (droits de droit commun)." },
        { title: "Financement de l'économie réelle", body: "Le PEA-PME finance les PME et ETI européennes dans un cadre fiscal privilégié." }
      ]
    },

    fcpr: {
      fonctionnement: [
        { title: "Souscription et parts", body: "Achat de parts, sans plafond légal. Minimum souvent fixé par le fonds (ex. 1 000 €). Versement en une fois ou par appels de capital." },
        { title: "Actifs éligibles", body: "Au moins 50 % en titres de sociétés non cotées. Le solde peut inclure des actifs cotés ou de la trésorerie." },
        { title: "Durée et blocage", body: "Capital bloqué 8 à 10 ans (prorogeable). Liquidité très faible avant l'échéance." },
        { title: "Sortie et distributions", body: "Remboursement progressif au fil des cessions. Plus-values versées en phase de liquidation." },
        { title: "Cadre fiscal avantageux", body: "Plus-values exonérées d'IR après 5 ans (hors PS), sous conditions de réinvestissement (FCPR fiscal)." },
        { title: "Profil et risque", body: "Non coté : fort potentiel mais risque élevé de perte et illiquidité. Réservé aux investisseurs avertis." }
      ],
      fiscalite: [
        { title: "FCPR fiscal : exonération d'IR", body: "PV et revenus exonérés d'IR à la sortie, si conservation ≥ 5 ans et réinvestissement des produits." },
        { title: "Prélèvements sociaux dus", body: "L'exonération ne porte que sur l'IR. PS sur PV mobilières : 18,6 % depuis la LFSS 2026." },
        { title: "Condition des 5 ans", body: "Délai courant dès la souscription. Une cession avant ce terme fait perdre l'exonération." },
        { title: "FCPR non fiscal : droit commun", body: "À défaut de conditions remplies : PFU à 31,4 % (12,8 % IR + 18,6 % PS), ou barème de l'IR." },
        { title: "Pas d'avantage à l'entrée", body: "Contrairement aux FIP/FCPI, aucune réduction d'impôt à la souscription. L'avantage est à la sortie." },
        { title: "Personnes morales (IS)", body: "PV de cession de parts éligibles : taux réduit d'IS de 15 %, sous conditions de détention et de quotas." }
      ]
    },

    sci: {
      montage: [
        "Acquisition d'un immeuble de rapport dans une ville de province > 5 000 habitants à dominante résidentielle.",
        "Apport à la SCI : 300 K€ (vente) en compte courant d'associés (CCA) + emprunt bancaire 500 K€. Total : 800 K€.",
        "Les revenus s'accumulent dans la SCI, puis peuvent être sortis via remboursement du CCA sans fiscalité personnelle et en dividendes (PFU 31,4%) après remboursement du CCA.",
        "Le recours au levier du crédit réduit la valeur des parts au démembrement ; le CCA constitue une épargne rémunérée et non bancarisée.",
        "Attention : la monopropriété implique la charge de tout l'immeuble (toiture, façade, planchers…). Maintenir de la trésorerie."
      ],
      flow: ["Parents", "SCI à l'IS", "Immeuble de rapport", "Enfants (NP des parts)"],
      transmission: [
        { n: "1", t: "Évaluation des parts", d: "[Valeur économique des parts − passif (compte courant et emprunt)] × coefficient de nue-propriété." },
        { n: "2", t: "Acte notarié de donation", d: "Donation-partage pour sécuriser la répartition entre les enfants." },
        { n: "3", t: "Paiement des droits", d: "Droits éventuels pris en charge par les parents ; ce paiement n'est pas une libéralité supplémentaire." }
      ],
      sortie: {
        intro: "Exemple — usufruitier de 57 ans (usufruit 50 %, NP 50 %).",
        rows: [
          ["Valeur marché des parts", "1 000 000 €"],
          ["− Passif (compte courant + emprunt)", "− 700 000 €"],
          ["Valeur nette", "300 000 €"],
          ["Nue-propriété (50 %)", "150 000 €"],
          ["Abattements disponibles (couple / 2 enfants)", "400 000 €"],
          ["Base taxable", "0 €"]
        ],
        result: "Résultat : transmission en franchise de droits, alors que les parents conservent le droit aux revenus sur la totalité du patrimoine. Au décès, les enfants deviennent pleins propriétaires sans taxation supplémentaire (art. 1133 C. civ.)."
      },
      avantages: [
        { crit: "Donation NP", av: "Droits réduits, contrôle conservé", lim: "Suivi rigoureux de la répartition usufruit/NP" },
        { crit: "Compte courant + emprunt", av: "Décote de valeur des parts, remboursement non fiscalisé", lim: "Intérêts plafonnés, risque de blocage si non documenté" },
        { crit: "SCPI européennes", av: "Rendement net, diversification, crédit d'impôt", lim: "Risque de change indirect, liquidité limitée" },
        { crit: "SCI à l'IS", av: "Amortissement, taux IS réduit, capitalisation des revenus", lim: "Obligations comptables, option irrévocable 5 ans" },
        { crit: "IFI", av: "Passif déductible", lim: "Respect strict des seuils de détention" },
        { crit: "Abus de droit", av: "Montage justifié par des objectifs patrimoniaux propres", lim: "Risque de requalification (LPF art. L64/L64 A) neutralisé par une motivation patrimoniale documentée" }
      ],
      vigilance: [
        { title: "Motivation patrimoniale écrite", body: "Dans le préambule des statuts et de l'acte de donation : gestion collective, protection du conjoint, organisation de la transmission." },
        { title: "Documentation du compte courant", body: "Contrat de prêt, modalités de remboursement, intérêts conformes au marché." },
        { title: "Traçabilité des flux", body: "Procès-verbal pour tracer retraits et remboursements, dans le respect de l'objet social." },
        { title: "Suivi IFI", body: "Suivre la composition de l'actif des SCPI pour déduire la fraction non immobilière et valoriser les parts à l'actif net." },
        { title: "Tenue comptable", body: "Livre-journal, grand-livre, états financiers annuels." }
      ],
      chronologie: [
        ["1. Dépôt du capital", "Jour J", "Notaire / Banque", "Attestation de dépôt"],
        ["2. Rédaction des statuts SCI", "J − 1 mois", "Notaire / avocat", "Statuts (création)"],
        ["3. Option IS", "J − 1 mois", "Notaire / avocat", "Statuts + lettre d'option au SIE"],
        ["4. Apport compte courant", "J + 1", "Associé / expert-comptable", "Convention de prêt"],
        ["5. Souscription SCPI + emprunt", "J + 2", "Gérant SCI", "Bulletins de souscription"],
        ["6. Donation-partage NP des parts", "Après apport CCA + emprunt", "Notaire", "Acte authentique"],
        ["7. Tenue comptable annuelle", "Trimestriel", "Expert-comptable", "États financiers, liasse IS"],
        ["8. Remboursement compte courant", "À discrétion", "Gérant SCI", "PV + virement"]
      ]
    },

    suivi: [
      { n: "1", t: "Validation de l'étude", d: "Échanges sur les préconisations et choix du scénario par le client" },
      { n: "2", t: "Consultations spécialisées", d: "Notaire, avocat fiscaliste et expert-comptable pour les actes et montages" },
      { n: "3", t: "Formalisation", d: "Lettre de mission, rapport d'adéquation et documents réglementaires (CIF)" },
      { n: "4", t: "Mise en œuvre", d: "Souscriptions, arbitrages et actes selon le calendrier défini" },
      { n: "5", t: "Points de suivi", d: "Revue annuelle et actualisation selon l'évolution fiscale et familiale" }
    ]
  };

  // ==========================================================================
  // 3) MODULES ACTIVABLES (cases à cocher dans le formulaire)
  // ==========================================================================
  var HEXA_MODULES = [
    // Cadre & pédagogie
    { id: "methodologie", label: "Méthodologie & périmètre de l'audit", def: true, cat: "Cadre & pédagogie" },
    { id: "contexte", label: "Contexte de rendez-vous & avertissement", def: true, cat: "Cadre & pédagogie" },
    { id: "successoral", label: "Pédagogie successorale (abattements, démembrement, barème, stratégies)", def: true, cat: "Cadre & pédagogie" },
    { id: "suivi", label: "Suivi & prochaines étapes", def: true, cat: "Cadre & pédagogie" },
    // Contenants (enveloppes & supports où loger l'épargne)
    { id: "assuranceVie", label: "Assurance-vie française", def: true, cat: "Contenants" },
    { id: "assuranceVieLux", label: "Assurance-vie luxembourgeoise", def: true, cat: "Contenants" },
    { id: "scpi", label: "SCPI", def: true, cat: "Contenants" },
    { id: "pea", label: "PEA", def: true, cat: "Contenants" },
    { id: "peapme", label: "PEA-PME", def: true, cat: "Contenants" },
    { id: "fcpr", label: "FCPR (capital-investissement)", def: true, cat: "Contenants" },
    { id: "sciIs", label: "Immeuble de rapport en SCI à l'IS", def: true, cat: "Contenants" },
    { id: "per", label: "Plan Épargne Retraite (PER)", def: true, cat: "Contenants" }
  ];

  window.HEXA_DEFAULT = HEXA_DEFAULT;
  window.HEXA_EDU = HEXA_EDU;
  window.HEXA_MODULES = HEXA_MODULES;
})();
