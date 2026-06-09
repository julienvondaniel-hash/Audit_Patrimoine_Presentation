/* =============================================================================
 * hexa-compute.js — Calculs automatiques (totaux, pourcentages, indicateurs)
 * -----------------------------------------------------------------------------
 * Fonctions pures (sans DOM) utilisées par le générateur de slides ET le
 * formulaire pour dériver les valeurs calculées à partir des seules saisies.
 * Exposé sous window.HexaCompute.
 * ========================================================================== */
(function () {
  "use strict";

  // Convertit une saisie (« 156 045 € », « 77 748 », nombre, « — ») en nombre.
  function parseNum(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null) return 0;
    var s = String(v).replace(/ /g, " ").replace(/[^0-9.,\-]/g, "");
    if (s === "" || s === "-") return 0;
    s = s.replace(/[.,]/g, ""); // montants entiers : on retire séparateurs
    var n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
  }

  // Vrai si la saisie est « vide » (vide, « — », « - »).
  function isBlank(v) {
    return String(v == null ? "" : v).replace(/[\s —-]/g, "") === "";
  }

  // 1 234 567 -> « 1 234 567 » (séparateur de milliers = espace)
  function formatNum(n) {
    var neg = n < 0;
    n = Math.abs(Math.round(n));
    var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (neg ? "− " : "") + s;
  }
  function formatEur(n) { return formatNum(n) + " €"; }
  // Avec signe explicite (pour les gains : « − 40 503 € »)
  function formatEurSigned(n) {
    if (Math.round(n) === 0) return "0 €";
    return (n < 0 ? "− " : "+ ") + formatNum(Math.abs(n)) + " €";
  }
  // Pourcentage à 1 décimale, virgule française. base nul -> « — ».
  function formatPct(part, whole) {
    if (!whole) return "—";
    return (part / whole * 100).toFixed(1).replace(".", ",") + " %";
  }
  // Pourcentage à partir d'une valeur déjà en %.
  function formatPctVal(p) { return p.toFixed(1).replace(".", ",") + " %"; }
  // 3 289 000 -> « 3,3 M€ »
  function formatMillions(n) { return (Math.round(n / 1e5) / 10).toFixed(1).replace(".", ",") + " M€"; }
  // « 1978-04-15 » -> « 15/04/1978 » (sinon renvoie la saisie telle quelle)
  function formatDateFR(s) {
    if (!s) return "—";
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
    return m ? (m[3] + "/" + m[2] + "/" + m[1]) : String(s);
  }

  // --- Actif : totaux & indicateurs dérivés ---
  function assetTotals(actif) {
    actif = actif || {};
    var immo = 0, autres = 0;
    (actif.immobilier || []).forEach(function (a) { immo += parseNum(a.valeur); });
    (actif.autres || []).forEach(function (a) { autres += parseNum(a.valeur); });
    var brut = immo + autres;
    var passif = 0;
    (actif.passifs || []).forEach(function (l) { passif += parseNum(l.crd); }); // total CRD des prêts
    var net = brut - passif;
    return {
      immo: immo, autres: autres, brut: brut, passif: passif, net: net,
      partImmoPct: brut ? (immo / brut * 100) : 0,
      endettementPct: brut ? (passif / brut * 100) : 0
    };
  }

  // Données du graphique : valeur des actifs attribuée à chaque détenteur (membre / communauté…).
  function assetChartData(actif) {
    actif = actif || {};
    var groups = {}, order = [];
    function add(label, v) { label = label || "Non attribué"; if (!(label in groups)) { groups[label] = 0; order.push(label); } groups[label] += v; }
    (actif.immobilier || []).forEach(function (a) { add(a.proprietaire, parseNum(a.valeur)); });
    (actif.autres || []).forEach(function (a) { add(a.proprietaire, parseNum(a.valeur)); });
    return { labels: order, values: order.map(function (l) { return groups[l]; }) };
  }

  // Catégorie d'actif (pour la répartition par type) à partir d'une ligne d'actif.
  function assetCategory(a) {
    if ("classe" in a) return a.classe === "Investissement locatif" ? "Immobilier locatif" : "Immobilier de jouissance";
    var cash = { "Compte courant": 1, "Livret A": 1, "LDD": 1, "PEL": 1, "CEL": 1 };
    var titres = { "PEA": 1, "PEA-PME": 1, "FCPR": 1, "FCPI": 1, "Club Deal": 1, "Contrat de capitalisation": 1 };
    if (a.type === "Assurance-vie") return "Assurance-vie";
    if (cash[a.type]) return "Liquidités";
    if (titres[a.type]) return "Valeurs mobilières";
    return "Autres actifs";
  }

  // Répartition croisée : pour chaque détenteur, la ventilation par type d'actif.
  function assetByHolderType(actif) {
    actif = actif || {};
    var ORDER = ["Immobilier de jouissance", "Immobilier locatif", "Liquidités", "Valeurs mobilières", "Assurance-vie", "Autres actifs"];
    var biens = (actif.immobilier || []).concat(actif.autres || []);
    var holders = [], cats = [], matrix = {};
    biens.forEach(function (a) {
      var h = a.proprietaire || "Non attribué", c = assetCategory(a), v = parseNum(a.valeur);
      if (holders.indexOf(h) < 0) holders.push(h);
      if (cats.indexOf(c) < 0) cats.push(c);
      matrix[h] = matrix[h] || {};
      matrix[h][c] = (matrix[h][c] || 0) + v;
    });
    cats.sort(function (x, y) { return ORDER.indexOf(x) - ORDER.indexOf(y); });
    return { holders: holders, categories: cats, matrix: matrix };
  }

  // Libellé « Activité & revenus » dérivé des postes de revenus renseignés.
  function activiteFromBudget(budget) {
    var seen = {}, posts = [];
    ((budget && budget.revenus) || []).forEach(function (r) {
      var has = r.montants
        ? Object.keys(r.montants).some(function (k) { return !isBlank(r.montants[k]); })
        : !isBlank(r.montant);
      if (!has) return;
      var p = String(r.poste || "").replace(/\*+\s*$/, "").trim();
      if (p && !seen[p]) { seen[p] = 1; posts.push(p); }
    });
    if (!posts.length) return "—";
    return posts.map(function (p, i) { return i === 0 ? p : (p.charAt(0).toLowerCase() + p.slice(1)); }).join(" + ");
  }

  // Arbitrage : total alloué aux stratégies & reste disponible vs enveloppe.
  function arbitrageTotals(arb) {
    arb = arb || {};
    var total = 0;
    (arb.strategies || []).forEach(function (s) { total += parseNum(s.montant); });
    var env = parseNum(arb.enveloppe);
    return { total: total, enveloppe: env, reste: env - total };
  }

  // Diagnostic forces / points de vigilance, dérivé des données saisies.
  function diagnostic(data) {
    var t = assetTotals((data && data.actif) || {}), bt = budgetTotals((data && data.budget) || {});
    var membres = (data && data.foyer && data.foyer.membres) || [];
    var immo = (data && data.actif && data.actif.immobilier) || [];
    var autres = (data && data.actif && data.actif.autres) || [];
    var forces = [], vig = [];
    var enfants = membres.filter(function (m) { return m.qualite === "Enfant"; }).length;
    var hasLocatif = immo.some(function (a) { return a.classe === "Investissement locatif"; });
    var cash = { "Compte courant": 1, "Livret A": 1, "LDD": 1, "PEL": 1, "CEL": 1 };
    var liquid = 0; autres.forEach(function (a) { if (cash[a.type]) liquid += parseNum(a.valeur); });
    var liquidPct = t.brut ? liquid / t.brut * 100 : 0;
    var autresPct = t.brut ? t.autres / t.brut * 100 : 0;
    var hasNP = immo.concat(autres).some(function (a) { return a.droit === "NP"; });
    var protege = membres.some(function (m) { return ["Mineur", "Tutelle", "Curatelle"].indexOf(m.capacite) >= 0; });
    var handicap = membres.some(function (m) { return m.handicap === "Oui"; });

    if (t.net >= 1000000) forces.push("Patrimoine net conséquent (~" + formatMillions(t.net) + ")");
    else if (t.net > 0) forces.push("Patrimoine net de " + formatEur(t.net));
    if (t.brut && t.endettementPct < 15) forces.push("Endettement maîtrisé (" + formatPctVal(t.endettementPct) + ") : capacité d'action préservée");
    if (hasLocatif) forces.push("Patrimoine immobilier de rapport générant des revenus réguliers");
    if (bt.disponible > 0) forces.push("Capacité d'épargne dégagée (~" + formatEur(bt.disponible) + " / an)");
    if (autresPct >= 15) forces.push("Épargne financière présente (" + formatPctVal(autresPct) + " du patrimoine)");
    if (hasNP) forces.push("Transmission déjà engagée (démembrement en place)");

    if (t.partImmoPct >= 65) vig.push("Sur-concentration immobilière (" + formatPctVal(t.partImmoPct) + " de l'actif brut)");
    if (t.immo > 1300000) vig.push("Assiette IFI alourdie par l'immobilier détenu (" + formatEur(t.immo) + ")");
    if (hasLocatif) vig.push("Revenus fonciers fortement fiscalisés (TMI + prélèvements sociaux)");
    if (liquidPct < 5) vig.push("Liquidité limitée (" + formatPctVal(liquidPct) + " du patrimoine)");
    if (autresPct < 20) vig.push("Diversification financière insuffisante (" + formatPctVal(autresPct) + ")");
    if (enfants >= 1) vig.push("Transmission à anticiper : " + enfants + " enfant" + (enfants > 1 ? "s" : "") + (enfants > 1 ? ", biens de valeurs potentiellement inégales" : ""));
    if (t.endettementPct > 33) vig.push("Endettement élevé (" + formatPctVal(t.endettementPct) + ")");
    if (protege) vig.push("Personne protégée dans le foyer (mineur / tutelle / curatelle) : formalités spécifiques");
    if (handicap) vig.push("Personne en situation de handicap : dispositifs dédiés (abattement, épargne handicap)");

    if (!forces.length) forces.push("À compléter selon les données saisies.");
    if (!vig.length) vig.push("Aucun point de vigilance majeur identifié.");
    return { forces: forces, vigilance: vig };
  }

  // --- PEA / PEA-PME : versements cumulés et capacité de versement restante ---
  // Plafonds : PEA 150 000 € ; enveloppe commune PEA + PEA-PME = 225 000 €.
  function peaCapacity(actif) {
    actif = actif || {};
    var vPEA = 0, vPME = 0, hasPEA = false, hasPME = false;
    (actif.autres || []).forEach(function (a) {
      if (a.type === "PEA") { hasPEA = true; vPEA += parseNum(a.versements); }
      else if (a.type === "PEA-PME") { hasPME = true; vPME += parseNum(a.versements); }
    });
    return {
      hasPEA: hasPEA, hasPME: hasPME, versePEA: vPEA, versePME: vPME,
      plafondPEA: 150000, plafondGlobal: 225000,
      restePEA: Math.max(0, Math.min(150000 - vPEA, 225000 - vPEA - vPME)), // dispo sur le PEA
      resteGlobal: Math.max(0, 225000 - vPEA - vPME)                        // dispo enveloppe commune
    };
  }

  // --- Cartographie des risques : déduite automatiquement des données saisies ---
  function riskMap(data) {
    var t = assetTotals((data && data.actif) || {}), bt = budgetTotals((data && data.budget) || {});
    var actif = (data && data.actif) || {}, immo = actif.immobilier || [], autres = actif.autres || [];
    var membres = (data && data.foyer && data.foyer.membres) || [];
    var enfants = membres.filter(function (m) { return m.qualite === "Enfant"; }).length;
    var hasLocatif = immo.some(function (a) { return a.classe === "Investissement locatif"; });
    var cash = { "Compte courant": 1, "Livret A": 1, "LDD": 1, "PEL": 1, "CEL": 1 };
    var liquid = 0; autres.forEach(function (a) { if (cash[a.type]) liquid += parseNum(a.valeur); });
    var liquidPct = t.brut ? liquid / t.brut * 100 : 0, autresPct = t.brut ? t.autres / t.brut * 100 : 0;
    var r = [];
    if (t.partImmoPct >= 65) r.push({ risk: "Concentration immobilière", level: "Élevé", desc: formatPctVal(t.partImmoPct) + " de l'actif sur une seule classe : risque de liquidité et de marché" });
    else if (t.partImmoPct >= 45) r.push({ risk: "Concentration immobilière", level: "Moyen", desc: formatPctVal(t.partImmoPct) + " de l'actif en immobilier" });
    if (t.immo > 1300000) r.push({ risk: "Pression fiscale (IFI" + (hasLocatif ? " + IR foncier" : "") + ")", level: hasLocatif ? "Élevé" : "Moyen", desc: "Imposition récurrente du patrimoine" + (hasLocatif ? " et des loyers (TMI + prélèvements sociaux)" : "") });
    else if (hasLocatif) r.push({ risk: "Fiscalité des revenus fonciers", level: "Moyen", desc: "Loyers fortement fiscalisés (TMI + prélèvements sociaux)" });
    if (enfants >= 1) r.push({ risk: "Transmission / indivision", level: enfants >= 2 ? "Moyen" : "Modéré", desc: enfants + " enfant" + (enfants > 1 ? "s" : "") + " : transmission à organiser pour éviter le blocage successoral" });
    if (liquidPct < 5) r.push({ risk: "Liquidité de court terme", level: "Modéré", desc: "Épargne disponible limitée (" + formatPctVal(liquidPct) + ") hors actifs immobiliers" });
    if (autresPct < 20) r.push({ risk: "Diversification financière", level: "Modéré", desc: "Faible exposition aux marchés financiers (" + formatPctVal(autresPct) + ")" });
    if (t.endettementPct > 33) r.push({ risk: "Endettement élevé", level: "Élevé", desc: "Taux d'endettement de " + formatPctVal(t.endettementPct) });
    if (bt.totalRevenus && bt.disponible < 0) r.push({ risk: "Budget déséquilibré", level: "Élevé", desc: "Charges supérieures aux revenus (déficit de " + formatEur(-bt.disponible) + " / an)" });
    if (!r.length) r.push({ risk: "Profil de risque maîtrisé", level: "Modéré", desc: "Aucun risque majeur identifié à partir des données saisies" });
    return r.slice(0, 6);
  }

  // --- Synthèse exécutive : alimentée automatiquement par les résultats ci-dessus ---
  function buildSynthese(data) {
    var dg = diagnostic(data), t = assetTotals((data && data.actif) || {}), bt = budgetTotals((data && data.budget) || {});
    var actif = (data && data.actif) || {}, immo = actif.immobilier || [];
    var membres = (data && data.foyer && data.foyer.membres) || [];
    var enfants = membres.filter(function (m) { return m.qualite === "Enfant"; }).length;
    var autresPct = t.brut ? t.autres / t.brut * 100 : 0;
    // Diagnostic en bref : 1 force + points de vigilance. La 1re ligne « patrimoine
    // net » étant ajoutée par la slide (K.patrimoineBullet), on exclut la force
    // homonyme pour éviter le doublon dans « Diagnostic en bref ».
    var forcesHorsPat = dg.forces.filter(function (f) { return !/patrimoine net/i.test(f); });
    var diagBullets = (forcesHorsPat.length ? [forcesHorsPat[0]] : []).concat(dg.vigilance.slice(0, 3));
    // Recommandations déduites des points saillants.
    var recs = [];
    if (t.partImmoPct >= 60 || t.immo > 1300000) recs.push({ title: "Réduire l'IFI et la fiscalité foncière", detail: "Arbitrer une partie de l'immobilier détenu en direct vers des enveloppes plus souples" });
    if (bt.disponible > 0) recs.push({ title: "Préparer la retraite et baisser l'IR", detail: "Alimenter des PER (report des plafonds sur 5 ans, mutualisation entre conjoints)" });
    if (autresPct < 20) recs.push({ title: "Diversifier l'épargne financière", detail: "FCPR / PEA / PEA-PME / assurance-vie : actions cotées, obligataire, private equity" });
    if (enfants >= 1) recs.push({ title: "Organiser la transmission", detail: "Donations en nue-propriété, clause bénéficiaire d'assurance-vie, démembrement" });
    if (!recs.length) recs.push({ title: "Consolider la stratégie patrimoniale", detail: "Optimiser l'allocation d'actifs et la fiscalité selon les objectifs du client" });
    return { diagnostic: diagBullets, recommandations: recs.slice(0, 4) };
  }

  // --- Préconisation de cession immobilière (arbitrage) -----------------------
  // Déclenchée si un bien locatif détenu EN DIRECT (PP) par le couple est associé
  // à un détenteur de plus de 65 ans, ou à une TMI élevée (≥ 30 %) — les revenus
  // fonciers étant alors taxés à TMI + 17,2 % de prélèvements sociaux.
  function tmiPct(data) {
    var m = /(\d+)/.exec((data && data.foyer && data.foyer.tmi) || "");
    return m ? parseInt(m[1], 10) : 0;
  }
  function refYear(data) {
    var m = /(\d{4})/.exec((data && data.doc && data.doc.date) || "");
    return m ? parseInt(m[1], 10) : new Date().getFullYear();
  }
  function cessionImmoReco(data) {
    var actif = (data && data.actif) || {}, immo = actif.immobilier || [];
    var membres = (data && data.foyer && data.foyer.membres) || [], annee = refYear(data);
    var locatifs = immo.filter(function (a) {
      return a.classe === "Investissement locatif" && a.droit === "PP" && /^(Communaut|Monsieur|M\.|Madame|Mme)/i.test(a.proprietaire || "");
    });
    var tmi = tmiPct(data), over65 = false, who = [];
    locatifs.forEach(function (a) {
      membres.forEach(function (m) {
        if (m.qualite !== "Monsieur" && m.qualite !== "Madame") return;
        var label = ((m.qualite || "") + " " + (m.prenom || "")).trim();
        var owns = /^Communaut/i.test(a.proprietaire) || a.proprietaire === label;
        var yr = /(\d{4})/.exec(m.naissance || "");
        if (owns && yr && (annee - parseInt(yr[1], 10)) > 65) { over65 = true; if (who.indexOf(label) < 0) who.push(label); }
      });
    });
    var reasons = [];
    if (locatifs.length) {
      if (over65) reasons.push("détenteur de plus de 65 ans (" + who.join(", ") + ") : anticiper la transmission et alléger la gestion");
      if (tmi >= 30) reasons.push("TMI élevée (" + tmi + " %) : revenus fonciers taxés à " + tmi + " % + 17,2 % de prélèvements sociaux");
    }
    return { recommend: locatifs.length > 0 && reasons.length > 0, reasons: reasons, biens: locatifs.map(function (a) { return a.designation; }), tmi: tmi, over65: over65 };
  }

  // --- Profils patrimoniaux : objectifs hiérarchisés pré-remplis -------------
  var PROFILS = {
    A: {
      nom: "A — Cadre/dirigeant en constitution", horizon: "Horizon dominant : moyen-long terme.",
      objectifs: [
        { title: "Réduire la pression fiscale", detail: "IR (TMI 41-45 %) et prélèvements sur l'épargne : priorité immédiate" },
        { title: "Préparer la retraite", detail: "Constituer des revenus différés défiscalisés (PER, capitalisation)" },
        { title: "Constituer & diversifier un capital", detail: "Faire travailler la capacité d'épargne, répartir les classes d'actifs" },
        { title: "Protéger la famille", detail: "Prévoyance décès/invalidité, protection du conjoint" },
        { title: "Amorcer la transmission", detail: "Premières donations, clause bénéficiaire" }
      ]
    },
    B: {
      nom: "B — Patrimoine établi (sur-concentré immobilier)", horizon: "Horizon : priorité immédiate sur le fiscal, déploiement sur 3-8 ans.",
      objectifs: [
        { title: "Réduire la pression fiscale", detail: "IFI et fiscalité foncière : priorité immédiate" },
        { title: "Diversifier & liquéfier", detail: "Rééquilibrer vers les actifs financiers, restaurer de la liquidité" },
        { title: "Préparer la retraite & revenus complémentaires", detail: "Épargne long terme, revenus différés" },
        { title: "Organiser la transmission", detail: "Anticiper la succession, préserver l'équité entre enfants, éviter l'indivision" },
        { title: "Sécuriser un cadre international (si pertinent)", detail: "Fiabiliser fiscalité et succession d'une mobilité" }
      ]
    },
    C: {
      nom: "C — Senior en phase de transmission", horizon: "Horizon : actions à enclencher rapidement (effet de seuil des 70/80 ans).",
      objectifs: [
        { title: "Protéger le conjoint survivant", detail: "Réversion d'usufruit, donation au dernier vivant : priorité" },
        { title: "Organiser la transmission", detail: "Donations démembrées, donation-partage, clause bénéficiaire" },
        { title: "Optimiser les droits de succession", detail: "Exploiter les abattements (art. 779, 990 I) avant 70/80 ans" },
        { title: "Maintenir des revenus & de la liquidité", detail: "Préserver le train de vie, anticiper la dépendance" },
        { title: "Préparer la dépendance", detail: "Financer un risque de perte d'autonomie" }
      ]
    },
    D: {
      nom: "D — Jeune actif / primo-constituant", horizon: "Horizon : long terme, tolérance au risque plus élevée.",
      objectifs: [
        { title: "Constituer une épargne de précaution", detail: "Sécuriser 3-6 mois de charges en liquidité : priorité" },
        { title: "Préparer un projet", detail: "Apport résidence principale, accession" },
        { title: "Faire travailler l'épargne long terme", detail: "PEA, assurance-vie, profil dynamique (l'horizon le permet)" },
        { title: "Optimiser la fiscalité progressivement", detail: "Au fil de la montée en TMI" },
        { title: "Couvrir les risques", detail: "Prévoyance de base, surtout si charges de famille" }
      ]
    },
    E: {
      nom: "E — Chef d'entreprise / cession à venir", horizon: "Horizon : très dépendant de la date de cession — souvent urgent.",
      objectifs: [
        { title: "Préparer & optimiser la cession", detail: "Pacte Dutreil, apport-cession (150-0 B ter), calendrier : priorité" },
        { title: "Réemployer le produit de cession", detail: "Diversifier le capital dégagé, sortir du risque mono-actif" },
        { title: "Réduire la fiscalité de la plus-value", detail: "Abattements, réinvestissement, timing" },
        { title: "Sécuriser le patrimoine privé", detail: "Séparer pro et perso, protéger la famille" },
        { title: "Organiser la transmission", detail: "Anticiper sur les titres avant cession (valeur plus faible)" }
      ]
    }
  };

  // Détection du profil à partir des caractéristiques (âge, TMI, patrimoine…).
  function detectProfil(data) {
    var membres = (data && data.foyer && data.foyer.membres) || [], annee = refYear(data);
    function age(m) { var y = /(\d{4})/.exec(m.naissance || ""); return y ? annee - parseInt(y[1], 10) : null; }
    var adultes = membres.filter(function (m) { return m.qualite === "Monsieur" || m.qualite === "Madame"; });
    var ages = adultes.map(age).filter(function (a) { return a != null; });
    var maxAge = ages.length ? Math.max.apply(null, ages) : null;
    var minAge = ages.length ? Math.min.apply(null, ages) : null;
    var t = assetTotals((data && data.actif) || {}), tmi = tmiPct(data);
    var pro = 0;
    (((data && data.actif) || {}).autres || []).forEach(function (a) {
      if (/soci[eé]t[eé]|sarl|parts|titres|fonds de commerce/i.test((a.designation || "") + " " + (a.type || ""))) pro += parseNum(a.valeur);
    });
    var proShare = t.brut ? pro / t.brut * 100 : 0;
    var chefEntreprise = adultes.some(function (m) { return /chef d'entreprise|gérant|indépendant|profession lib/i.test((m.activitePro || "") + " " + (m.statut || "")); });

    if (chefEntreprise && proShare >= 25) return "E";                       // patrimoine pro prépondérant
    if (maxAge != null && maxAge >= 65 && maxAge <= 88) return "C";          // senior en transmission
    if (maxAge != null && maxAge < 40 && t.net < 300000) return "D";        // jeune primo-constituant
    if (t.net >= 1000000 && t.partImmoPct >= 60) return "B";                // patrimoine établi immobilier
    if (minAge != null && minAge >= 38 && maxAge <= 57 && tmi >= 41) return "A"; // cadre en constitution
    if (t.net >= 1000000) return "B";
    if (maxAge != null && maxAge < 40) return "D";
    return "A";
  }
  function resolveProfilId(data) {
    var sel = (data && data.profilPatrimonial) || "Automatique";
    if (/^[A-E]\b/.test(sel)) return sel.charAt(0);   // profil forcé par l'utilisateur
    return detectProfil(data);                        // « Automatique »
  }
  function profilInfo(data) {
    var det = detectProfil(data), id = resolveProfilId(data);
    var sel = (data && data.profilPatrimonial) || "Automatique";
    return { id: id, nom: (PROFILS[id] || {}).nom || "", horizon: (PROFILS[id] || {}).horizon || "", auto: !/^[A-E]\b/.test(sel), detecteNom: (PROFILS[det] || {}).nom || "" };
  }

  // --- Commentaire dynamique de la composition de l'actif ---------------------
  function assetComment(data) {
    var t = assetTotals((data && data.actif) || {});
    if (!t.brut) return "Renseignez les actifs pour générer automatiquement le commentaire.";
    var actif = (data && data.actif) || {}, autres = actif.autres || [];
    var cash = { "Compte courant": 1, "Livret A": 1, "LDD": 1, "PEL": 1, "CEL": 1 };
    var liquid = 0; autres.forEach(function (a) { if (cash[a.type]) liquid += parseNum(a.valeur); });
    var liquidPct = t.brut ? liquid / t.brut * 100 : 0, autresPct = t.brut ? t.autres / t.brut * 100 : 0;
    var parts = ["Patrimoine net de " + formatEur(t.net)];
    parts.push(t.partImmoPct >= 65 ? "fortement concentré sur l'immobilier (" + formatPctVal(t.partImmoPct) + ")" : "réparti à " + formatPctVal(t.partImmoPct) + " sur l'immobilier");
    parts.push(t.endettementPct < 15 ? "avec un endettement limité (" + formatPctVal(t.endettementPct) + ")" : "avec un endettement de " + formatPctVal(t.endettementPct));
    var phrase = parts.join(", ") + ".";
    var add = [];
    if (autresPct < 20) add.push("diversification financière à renforcer (" + formatPctVal(autresPct) + " d'actifs financiers)");
    if (liquidPct < 5) add.push("liquidités faibles (" + formatPctVal(liquidPct) + ")");
    if (add.length) phrase += " Points d'attention : " + add.join(" et ") + ".";
    return phrase;
  }

  // --- Préconisations conditionnelles (arbitrage) -----------------------------
  function preconisations(data) {
    var props = [], membres = (data && data.foyer && data.foyer.membres) || [], annee = refYear(data);
    function lbl(m) { return ((m.qualite || "") + " " + (m.prenom || "")).trim(); }
    function age(m) { var y = /(\d{4})/.exec(m.naissance || ""); return y ? annee - parseInt(y[1], 10) : null; }
    var parents = membres.filter(function (m) { return m.qualite === "Monsieur" || m.qualite === "Madame"; });
    var enfants = membres.filter(function (m) { return m.qualite === "Enfant"; });
    var donations = (data && data.donations) || [];
    // 1. Donations en franchise de droits (abattement disponible)
    if (parents.length && enfants.length) {
      var avail = 0;
      parents.forEach(function (p) {
        enfants.forEach(function (e) {
          var used = 0;
          donations.forEach(function (d) {
            if (d.donateur === lbl(p) && d.beneficiaire === lbl(e)) { var ya = /(\d{4})/.exec(d.date || ""); if (!ya || (annee - parseInt(ya[1], 10)) < 15) used += parseNum(d.valeur); }
          });
          avail += Math.max(0, 100000 - used);
        });
      });
      if (avail > 0) props.push({ title: "Donner en franchise de droits", detail: "Abattement disponible : " + formatEur(avail) + " au total (100 000 €/enfant/parent, renouvelable tous les 15 ans) + 31 865 €/enfant/parent de don familial de somme d'argent (donateur < 80 ans)." });
    }
    // 2. Assurance-vie avant 70 ans
    var under70 = parents.filter(function (p) { var a = age(p); return a != null && a < 70; }).map(lbl);
    if (under70.length) props.push({ title: "Alimenter l'assurance-vie avant 70 ans", detail: under70.join(" et ") + " : verser avant 70 ans pour profiter de l'abattement de 152 500 € par bénéficiaire (art. 990 I), hors succession." });
    // 3. PEA / PEA-PME
    var cap = peaCapacity((data && data.actif) || {});
    if (cap.resteGlobal > 0) props.push({ title: "Utiliser les enveloppes PEA / PEA-PME", detail: "Capacité de versement disponible : " + formatEur(cap.restePEA) + " sur le PEA, " + formatEur(cap.resteGlobal) + " au total (PEA + PEA-PME)." });
    // 4. Cession immobilière locative
    var cr = cessionImmoReco(data);
    if (cr.recommend) props.push({ title: "Céder un bien immobilier locatif", detail: "Bien(s) : " + (cr.biens.join(", ") || "—") + ". Motif : " + cr.reasons.join(" ; ") + "." });
    return props;
  }

  // Met à jour les champs dérivés conservés dans les données (pour l'export).
  function syncDerived(data) {
    if (data && data.foyer && data.budget) data.foyer.activite = activiteFromBudget(data.budget);
    if (data && data.actif) {
      data.diagnostic = diagnostic(data);            // forces / points de vigilance
      data.risques = riskMap(data);                  // cartographie des risques (auto)
      data.synthese = buildSynthese(data);           // synthèse exécutive (auto)
      data.actif.comment = assetComment(data);       // commentaire de l'actif (auto)
    }
    // Objectifs hiérarchisés : pré-remplis selon le profil patrimonial (détecté ou choisi).
    if (data && data.foyer) {
      var pid = resolveProfilId(data);
      if (pid && PROFILS[pid] && pid !== data._profilApplique) {
        data.objectifs = JSON.parse(JSON.stringify(PROFILS[pid].objectifs));
        data._profilApplique = pid;
        data._objectifsRepopulated = true; // signale au formulaire de se redessiner
      }
    }
    // Audit successoral : recalculé automatiquement depuis le patrimoine saisi.
    if (data && typeof window !== "undefined" && window.HexaSuccession) {
      if (!data.successionParams) data.successionParams = { assuranceVieHorsSuccession: "Oui", donationPPParParent: "", anneeReference: "" };
      try { data.succession = window.HexaSuccession.compute(data, data.successionParams); }
      catch (e) { if (typeof console !== "undefined" && console.error) console.error("Audit successoral — échec du recalcul :", e); }
    }
  }

  // --- Budget : totaux récurrents, exceptionnels, disponible ---
  function sumMontants(list) {
    var t = 0; (list || []).forEach(function (r) { t += parseNum(r.montant); }); return t;
  }
  // Revenus saisis par personne : montants = { "Monsieur Jean": "…", "Foyer": "…" }
  function sumRevenus(list) {
    var t = 0;
    (list || []).forEach(function (r) { var m = r.montants || {}; Object.keys(m).forEach(function (k) { t += parseNum(m[k]); }); });
    return t;
  }
  function lineTotal(line) { var t = 0, m = (line && line.montants) || {}; Object.keys(m).forEach(function (k) { t += parseNum(m[k]); }); return t; }
  // Libellés des personnes (membres du foyer + « Foyer ») servant de colonnes aux revenus.
  function personLabels(data) {
    var ms = (data && data.foyer && data.foyer.membres) || [];
    return ms.map(function (m) { return ((m.qualite || "") + " " + (m.prenom || "")).trim(); }).filter(Boolean).concat(["Foyer"]);
  }
  function budgetTotals(budget) {
    budget = budget || {};
    var exc = budget.exceptionnels || {};
    var totalRevenus = sumRevenus(budget.revenus);
    // Total d'une ligne de charge : somme des montants par personne (nouveau modèle)
    // ou montant unique (ancien modèle) — robuste aux deux formes.
    function chargeLineTotal(c) {
      if (c && c.montants) { var s = 0; Object.keys(c.montants).forEach(function (k) { s += parseNum(c.montants[k]); }); return s; }
      return parseNum(c && c.montant);
    }
    var totalCharges = (budget.charges || []).reduce(function (acc, c) { return acc + chargeLineTotal(c); }, 0);
    // Somme des charges d'un poste donné (plusieurs lignes possibles pour un poste).
    function chargesPoste(p) { var t = 0; (budget.charges || []).forEach(function (c) { if (c && c.poste === p) t += chargeLineTotal(c); }); return t; }
    var remboursements = chargesPoste("Remboursements d'emprunts et dettes");
    var impots = chargesPoste("Impôts et taxes");
    return {
      totalRevenus: totalRevenus,
      totalCharges: totalCharges,
      totalExcRevenus: sumMontants(exc.revenus),
      totalExcCharges: sumMontants(exc.charges),
      disponible: totalRevenus - totalCharges, // hors exceptionnel
      epargneMensuelle: (totalRevenus - totalCharges) / 12,
      // Taux d'effort (endettement budgétaire) = remboursements de crédits / revenus.
      tauxEffortPct: totalRevenus ? (remboursements / totalRevenus * 100) : 0,
      // Pression fiscale = impôts et taxes / revenus.
      pressionFiscalePct: totalRevenus ? (impots / totalRevenus * 100) : 0
    };
  }

  // Première ligne de la synthèse, générée : montant = actif net (brut − passif),
  // pourcentage = part immobilière (saisie dans la composition de l'actif).
  function patrimoineBullet(data) {
    var t = assetTotals((data && data.actif) || {});
    return "Patrimoine net d'environ " + formatMillions(t.net) +
      ", concentré à " + formatPctVal(t.partImmoPct) + " sur l'immobilier";
  }

  // --- Succession : total = droits 1er décès + droits 2nd décès ---
  function scenarioTotal(sc) { return parseNum(sc.d1) + parseNum(sc.d2); }

  // Gain d'une variante (avec donation) vs scénario de base de même rang.
  function donationGain(baseScenarios, donScenario, index) {
    if (!baseScenarios || !baseScenarios[index]) return null;
    return scenarioTotal(donScenario) - scenarioTotal(baseScenarios[index]);
  }

  window.HexaCompute = {
    parseNum: parseNum, isBlank: isBlank,
    formatNum: formatNum, formatEur: formatEur, formatEurSigned: formatEurSigned,
    formatPct: formatPct, formatPctVal: formatPctVal, formatMillions: formatMillions, formatDateFR: formatDateFR,
    assetTotals: assetTotals, assetChartData: assetChartData, assetByHolderType: assetByHolderType, budgetTotals: budgetTotals,
    lineTotal: lineTotal, personLabels: personLabels, arbitrageTotals: arbitrageTotals, patrimoineBullet: patrimoineBullet,
    activiteFromBudget: activiteFromBudget, diagnostic: diagnostic, syncDerived: syncDerived,
    scenarioTotal: scenarioTotal, donationGain: donationGain,
    peaCapacity: peaCapacity, riskMap: riskMap, buildSynthese: buildSynthese,
    cessionImmoReco: cessionImmoReco, tmiPct: tmiPct,
    assetComment: assetComment, preconisations: preconisations,
    PROFILS: PROFILS, detectProfil: detectProfil, profilInfo: profilInfo
  };
})();
