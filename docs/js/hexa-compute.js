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
    var s = String(v).replace(/ /g, " ").replace(/[^0-9.,\-]/g, "");
    if (s === "" || s === "-") return 0;
    s = s.replace(/[.,]/g, ""); // montants entiers : on retire séparateurs
    var n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
  }

  // Vrai si la saisie est « vide » (vide, « — », « - »).
  function isBlank(v) {
    return String(v == null ? "" : v).replace(/[\s —-]/g, "") === "";
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

  // Types d'actifs considérés comme « liquidités » (source unique, référencée partout
  // pour classer les liquidités et calculer leur part — évite les divergences).
  var CASH_TYPES = { "Compte courant": 1, "Compte à terme": 1, "Livret A": 1, "LDD": 1, "LEP": 1, "Livret Jeune": 1, "PEL": 1, "CEL": 1, "Liquidités": 1 };

  // Taux fiscaux centralisés — SOURCE UNIQUE de vérité (ne pas redéfinir « en dur »
  // dans les fiches). Prélèvements sociaux : la LFSS 2026 (adoptée le 16/12/2025)
  // porte la CSG du capital de 9,2 % à 10,6 %, soit 18,6 % de PS sur les revenus
  // MOBILIERS (dividendes, intérêts, plus-values mobilières, CTO, PEA, PER en
  // capital). Restent à 17,2 % : assurance-vie, contrats de capitalisation, revenus
  // FONCIERS et plus-values IMMOBILIÈRES, PEL, CEL.
  var FISCAL = {
    psMobilier: 0.186, psMobilierPct: "18,6 %",        // revenus mobiliers (post-LFSS 2026)
    psImmoFoncier: 0.172, psImmoFoncierPct: "17,2 %",  // AV, foncier, plus-value immobilière, capi
    pfuIRPct: "12,8 %",
    pfuMobilier: 0.314, pfuMobilierPct: "31,4 %",       // 12,8 % IR + 18,6 % PS
    irPlusValueImmo: 0.19                               // IR sur plus-value immobilière (art. 150 U)
  };

  // Vrai si « proprietaire » désigne un enfant du foyer. Sert à séparer le périmètre
  // « couple » du périmètre « enfants » : les actifs propres des enfants sont exclus
  // de l'assiette IFI, de la masse successorale des parents et du patrimoine net du
  // couple (ils restent saisissables mais ne gonflent pas les agrégats du couple).
  function isEnfantOwner(data, proprietaire) {
    var p = String(proprietaire || "").trim();
    if (!p) return false;
    var ms = (data && data.foyer && data.foyer.membres) || [];
    return ms.some(function (m) {
      if ((m.qualite || "") !== "Enfant") return false;
      var label = ((m.qualite || "") + " " + (m.prenom || "")).trim();
      return p === label || (m.prenom && p === String(m.prenom).trim());
    });
  }

  // Valeur retenue dans les TOTAUX : pour un bien en nue-propriété (droit « NP ») avec un
  // âge d'usufruitier renseigné, on applique le barème de l'article 669 CGI (quote-part de
  // nue-propriété selon l'âge), via HexaSuccession.nuePropPct. Sinon, valeur pleine.
  function valeurFiscale(a) {
    var v = parseNum(a && a.valeur);
    if (a && a.droit === "NP" && a.ageUsufruitier != null && String(a.ageUsufruitier) !== "") {
      var age = parseInt(a.ageUsufruitier, 10);
      var np = (typeof window !== "undefined" && window.HexaSuccession && window.HexaSuccession.nuePropPct && !isNaN(age)) ? window.HexaSuccession.nuePropPct(age) : 1;
      return Math.round(v * np);
    }
    return v;
  }

  // --- Actif : totaux & indicateurs dérivés ---
  // assetTotals(actif[, data]) : si « data » est fourni, on calcule le périmètre
  // « couple » en excluant les actifs détenus par les enfants (cf. isEnfantOwner).
  function assetTotals(actif, data) {
    actif = actif || {};
    function _excl(a) { return data ? isEnfantOwner(data, a && a.proprietaire) : false; }
    var immo = 0, autres = 0;
    (actif.immobilier || []).forEach(function (a) { if (!_excl(a)) immo += valeurFiscale(a); });
    (actif.autres || []).forEach(function (a) { if (!_excl(a)) autres += valeurFiscale(a); });
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

  // --- IFI (impôt sur la fortune immobilière) : assiette NETTE puis barème ---
  // Assiette nette = immobilier brut − abattement légal de 30 % sur la résidence
  // principale (art. 973 CGI) − dettes immobilières déductibles (prêts « Immobilier »
  // ou rattachés à un bien). Barème progressif (seuil d'assujettissement 1,3 M€,
  // imposition dès 800 000 €, décote entre 1,3 et 1,4 M€).
  function ifiBareme(b) {
    if (b < 800000) return 0;
    var tr = [[800000, 1300000, 0.005], [1300000, 2570000, 0.007], [2570000, 5000000, 0.01], [5000000, 10000000, 0.0125], [10000000, Infinity, 0.015]];
    var x = 0; tr.forEach(function (s) { if (b > s[0]) x += (Math.min(b, s[1]) - s[0]) * s[2]; });
    if (b >= 1300000 && b < 1400000) x -= Math.max(0, 17500 - 0.0125 * b); // décote
    return Math.max(0, x);
  }
  function ifi(data) {
    var actif = (data && data.actif) || {};
    var immo = actif.immobilier || [], passifs = actif.passifs || [];
    var brute = 0, abattementRP = 0, designations = {};
    immo.forEach(function (a) {
      if (isEnfantOwner(data, a.proprietaire)) return; // périmètre couple : biens des enfants hors IFI des parents
      var v = valeurFiscale(a); brute += v;
      // Décote de 30 % (art. 973 CGI) : résidence principale détenue en pleine propriété.
      if (/r[ée]sidence\s+principale/i.test(a.classe || "") && (a.droit || "PP") === "PP") abattementRP += v * 0.30;
      if (a.designation) designations[a.designation] = 1;
    });
    var dette = 0;
    passifs.forEach(function (l) { if ((l.typeCredit || "") === "Immobilier" || designations[l.rattachement || ""]) dette += parseNum(l.crd); });
    var nette = Math.max(0, brute - abattementRP - dette);
    return { brute: brute, abattementRP: abattementRP, dette: dette, nette: nette, montant: ifiBareme(nette), assujetti: nette >= 1300000 };
  }

  // Données du graphique : valeur des actifs attribuée à chaque détenteur (membre / communauté…).
  function assetChartData(actif) {
    actif = actif || {};
    var groups = {}, order = [];
    function add(label, v) { label = label || "Non attribué"; if (!(label in groups)) { groups[label] = 0; order.push(label); } groups[label] += v; }
    (actif.immobilier || []).forEach(function (a) { add(a.proprietaire, valeurFiscale(a)); });
    (actif.autres || []).forEach(function (a) { add(a.proprietaire, valeurFiscale(a)); });
    return { labels: order, values: order.map(function (l) { return groups[l]; }) };
  }

  // Catégorie d'actif (pour la répartition par type) à partir d'une ligne d'actif.
  function assetCategory(a) {
    if ("classe" in a) return a.classe === "Investissement locatif" ? "Immobilier locatif" : "Immobilier de jouissance";
    var cash = CASH_TYPES;
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
      var h = a.proprietaire || "Non attribué", c = assetCategory(a), v = valeurFiscale(a);
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
  // (Conservée pour rétrocompatibilité ; le nouveau modèle utilise arbitrageActifs.)
  function arbitrageTotals(arb) {
    arb = arb || {};
    var total = 0;
    (arb.strategies || []).forEach(function (s) { total += parseNum(s.montant); });
    var env = parseNum(arb.enveloppe);
    return { total: total, enveloppe: env, reste: env - total };
  }

  // Arbitrage (modèle piloté par les données) : passe en revue TOUS les actifs du
  // client. Pour l'immobilier, valeur nette = valeur − CRD rattaché ; le montant à
  // arbitrer/vendre est saisi par actif (data.arbitrage.montants[key]). La somme des
  // montants donne le « disponible après arbitrage ».
  function arbitrageActifs(data) {
    var arb = (data && data.arbitrage) || {};
    var montants = arb.montants || {};
    var passifs = (data && data.actif && data.actif.passifs) || [];
    var immo = (data && data.actif && data.actif.immobilier) || [];
    var autres = (data && data.actif && data.actif.autres) || [];
    function crdFor(desig) {
      var c = 0;
      if (desig) passifs.forEach(function (p) { if ((p.rattachement || "") === desig) c += parseNum(p.crd); });
      return c;
    }
    var lignes = [];
    immo.forEach(function (item, i) {
      // Source unique de vérité : on réutilise la valeur fiscale (barème 669 appliqué
      // aux biens démembrés), jamais une valeur recalculée localement.
      var key = "immo:" + i, valeur = valeurFiscale(item), crd = crdFor(item.designation);
      lignes.push({
        key: key, designation: item.designation || "", categorie: "Immobilier",
        detail: item.classe || "", valeur: valeur, crd: crd,
        valeurNette: Math.max(0, valeur - crd), dateAcquisition: item.dateAcquisition || "",
        prixAcquisition: parseNum(item.prixAcquisition), isImmo: true, montant: parseNum(montants[key])
      });
    });
    autres.forEach(function (item, j) {
      var key = "autre:" + j, valeur = parseNum(item.valeur);
      lignes.push({
        key: key, designation: item.designation || "", categorie: "Financier",
        detail: item.type || "", valeur: valeur, crd: 0,
        valeurNette: valeur, dateAcquisition: "",
        isImmo: false, montant: parseNum(montants[key])
      });
    });
    var totalImmo = lignes.reduce(function (s, l) { return s + (l.isImmo ? l.montant : 0); }, 0);
    var totalMobilier = lignes.reduce(function (s, l) { return s + (l.isImmo ? 0 : l.montant); }, 0);
    var disponibleApres = totalImmo + totalMobilier;
    var aArbitrer = lignes.filter(function (l) { return l.montant > 0; });
    var venteImmo = aArbitrer.some(function (l) { return l.isImmo; });
    return { lignes: lignes, aArbitrer: aArbitrer, totalImmo: totalImmo, totalMobilier: totalMobilier, disponibleApres: disponibleApres, venteImmo: venteImmo };
  }

  // Stratégie de donation : chiffre une LISTE de donations envisagées
  // (data.donationsEnvisagees), chacune identifiée par donateur + bénéficiaire +
  // montant. Pour chaque donation, l'abattement disponible est déterminé par le lien
  // de parenté (HexaSuccession.abattementDonation : 100 000 € + don manuel 790 G par
  // enfant/parent, 80 724 € entre époux, art. 790 E), net des donations < 15 ans. La
  // franchise est consommée de façon cumulative par couple donateur|bénéficiaire ; le
  // coût des droits est estimé au barème en ligne directe sur la part excédentaire.
  function donationStrategie(data) {
    var S = (typeof window !== "undefined" && window.HexaSuccession) ? window.HexaSuccession : null;
    var planned = (data && Array.isArray(data.donationsEnvisagees)) ? data.donationsEnvisagees : [];
    var membres = (data && data.foyer && data.foyer.membres) || [];
    function membreParLabel(lbl) {
      lbl = String(lbl || "").trim();
      return membres.filter(function (m) { return ((m.qualite || "") + " " + (m.prenom || "")).trim() === lbl; })[0] || null;
    }
    var used = {}; // franchise déjà consommée par couple « donateur|bénéficiaire »
    var lignes = planned.map(function (d) {
      var ab = S ? S.abattementDonation(data, d.donateur, d.beneficiaire) : { lien: "Autre", disponible: 0 };
      var pk = (d.donateur || "") + "|" + (d.beneficiaire || "");
      var dispo = Math.max(0, ab.disponible - (used[pk] || 0));
      var montant = parseNum(d.montant);
      var franchise = Math.min(montant, dispo);
      var excedent = Math.max(0, montant - franchise);
      var droits = (S && excedent > 0) ? S.baremeLigneDirecte(excedent) : 0;
      used[pk] = (used[pk] || 0) + franchise;
      // Alerte civile : bénéficiaire MINEUR (administration légale, art. 382 s. C. civ.).
      var bn = membreParLabel(d.beneficiaire);
      var mineur = !!(bn && bn.capacite === "Mineur");
      return { donateur: d.donateur || "", beneficiaire: d.beneficiaire || "", lien: ab.lien, montant: montant, abattement: dispo, enFranchise: franchise, excedent: excedent, droits: droits, beneficiaireMineur: mineur };
    });
    var totalMontant = lignes.reduce(function (s, l) { return s + l.montant; }, 0);
    var totalFranchise = lignes.reduce(function (s, l) { return s + l.enFranchise; }, 0);
    var totalDroits = lignes.reduce(function (s, l) { return s + l.droits; }, 0);
    var disponibleApres = arbitrageActifs(data).disponibleApres;
    var beneficiairesMineurs = lignes.filter(function (l) { return l.beneficiaireMineur; }).map(function (l) { return l.beneficiaire; });
    return { lignes: lignes, totalMontant: totalMontant, totalFranchise: totalFranchise, totalDroits: totalDroits, disponibleApres: disponibleApres, beneficiairesMineurs: beneficiairesMineurs };
  }

  // Avertissement civil attaché aux donations vers un bénéficiaire mineur (texte
  // unique, repris par le livret et la diapo « Stratégie de donation »).
  var ALERTE_DONATION_MINEUR = "Bénéficiaire mineur : la donation est juridiquement possible mais l'acceptation et la gestion des fonds relèvent de l'administration légale (art. 382 s. C. civ.) ; certains actes requièrent l'autorisation du juge des tutelles. Privilégier un pacte adjoint encadrant l'emploi des fonds.";

  // Réinvestissement par enveloppe : alloue le capital NET dégagé par l'arbitrage
  // (brut − fiscalité de plus-value immobilière), net des donations envisagées, vers
  // des supports cibles (data.reinvestissements : liste de { enveloppe, montant }).
  // Regroupe les montants par enveloppe distincte (ordre de première apparition) et
  // confronte le total réinvesti au capital à allouer. Expose : disponible (brut),
  // impotPV, disponibleNet (capital net réellement disponible) et pvNonChiffree
  // (vrai tant qu'une plus-value du plan de cession n'est pas chiffrable).
  function reinvestTotals(data) {
    var dispo = arbitrageActifs(data).disponibleApres;     // brut, avant impôt de plus-value
    var pv = plusValueImmo(data);
    var dispoNet = Math.max(0, dispo - pv.totalImpot);     // capital net réellement disponible
    var donne = donationStrategie(data).totalMontant;
    var lignes = (data && Array.isArray(data.reinvestissements)) ? data.reinvestissements : [];
    var total = lignes.reduce(function (s, l) { return s + parseNum(l.montant); }, 0);
    var parEnveloppe = [], index = {};
    lignes.forEach(function (l) {
      var env = (l.enveloppe == null ? "" : String(l.enveloppe)).trim();
      if (!env) return; // enveloppes vides ignorées
      var m = parseNum(l.montant);
      if (index[env] == null) { index[env] = parEnveloppe.length; parEnveloppe.push({ enveloppe: env, montant: 0 }); }
      parEnveloppe[index[env]].montant += m;
    });
    var aAllouer = Math.max(0, dispoNet - donne);          // « à réinvestir » = NET après impôt de PV
    var reste = aAllouer - total;
    return { lignes: lignes, parEnveloppe: parEnveloppe, total: total,
      disponible: dispo, impotPV: pv.totalImpot, disponibleNet: dispoNet, pvNonChiffree: pv.hasWarning,
      donne: donne, aAllouer: aAllouer, reste: reste };
  }

  // --- Plus-value immobilière sur cession (art. 150 U et s. CGI) --------------
  // Pour chaque bien immobilier effectivement arbitré (montant > 0), chiffre la
  // plus-value : IR 19 % + prélèvements sociaux 17,2 % (immobilier — hors hausse
  // LFSS 2026) + surtaxe (art. 1609 nonies G), après abattements pour durée de
  // détention (art. 150 VC : IR exonéré à 22 ans, PS à 30 ans). Prix/date
  // d'acquisition manquants → ligne marquée « à renseigner » (warning), jamais omise.
  function abattementDureeIR(n) {
    if (n < 6) return 0;
    if (n <= 21) return (n - 5) * 0.06;
    return 1; // 22 ans et + : exonération d'IR
  }
  function abattementDureePS(n) {
    if (n < 6) return 0;
    if (n <= 21) return (n - 5) * 0.0165;
    if (n === 22) return 16 * 0.0165 + 0.016;
    if (n <= 30) return 16 * 0.0165 + 0.016 + (n - 22) * 0.09;
    return 1; // 30 ans et + : exonération de PS
  }
  // Surtaxe sur les plus-values immobilières > 50 000 € (art. 1609 nonies G).
  function surtaxePVImmo(pv) {
    if (pv <= 50000) return 0;
    var b = [
      [60000, function (v) { return 0.02 * v - (60000 - v) / 20; }],
      [100000, function (v) { return 0.02 * v; }],
      [110000, function (v) { return 0.03 * v - (110000 - v) / 10; }],
      [150000, function (v) { return 0.03 * v; }],
      [160000, function (v) { return 0.04 * v - (160000 - v) * 0.15; }],
      [200000, function (v) { return 0.04 * v; }],
      [210000, function (v) { return 0.05 * v - (210000 - v) * 0.20; }],
      [250000, function (v) { return 0.05 * v; }],
      [260000, function (v) { return 0.06 * v - (260000 - v) * 0.25; }],
      [Infinity, function (v) { return 0.06 * v; }]
    ];
    for (var i = 0; i < b.length; i++) if (pv <= b[i][0]) return Math.max(0, Math.round(b[i][1](pv)));
    return 0;
  }
  function plusValueImmo(data) {
    var annee = refYear(data);
    var immo = (data && data.actif && data.actif.immobilier) || [];
    var aa = arbitrageActifs(data);
    // Forfaits d'acquisition (art. 150 VB) : appliqués PAR DÉFAUT (favorables au
    // client), désactivables globalement (data.pvParams.forfaits = "Non") ou par
    // bien (item.pvForfaits = "Non"). Les montants RÉELS saisis priment quand ils
    // sont plus favorables que le forfait.
    var forfaitsGlobaux = !(data && data.pvParams && (data.pvParams.forfaits === "Non" || data.pvParams.forfaits === false));
    var cedes = aa.lignes.filter(function (l) { return l.isImmo && l.montant > 0; });
    var lignes = cedes.map(function (l) {
      var item = immo[parseInt(String(l.key).split(":")[1], 10)] || {};
      var prixVente = parseNum(item.valeur);
      // Frais de cession à la charge du vendeur (diagnostics, mainlevée d'hypothèque…)
      // déduits du prix de cession s'ils sont saisis (art. 150 VA).
      var fraisCession = parseNum(item.fraisCession);
      var prixCession = Math.max(0, prixVente - fraisCession);
      // La résidence principale est exonérée de plus-value (art. 150 U II 1° CGI).
      if (/r[ée]sidence\s+principale/i.test(item.classe || "")) {
        return { designation: l.designation, exonere: true, prixCession: prixVente, motif: "résidence principale exonérée (art. 150 U II)" };
      }
      var prixAcq = parseNum(item.prixAcquisition);
      var m = /(\d{4})/.exec(String(item.dateAcquisition || "")), anAcq = m ? parseInt(m[1], 10) : null;
      if (!prixAcq || anAcq == null) {
        var manque = [];
        if (!prixAcq) manque.push("prix d'acquisition");
        if (anAcq == null) manque.push("date d'acquisition");
        return { designation: l.designation, warning: true, prixCession: prixVente, manque: manque.join(" et ") };
      }
      var duree = Math.max(0, annee - anAcq);
      // Prix d'acquisition CORRIGÉ (art. 150 VB) :
      //  - frais d'acquisition : réels (item.fraisAcquisition) ou forfait 7,5 % — le plus favorable ;
      //  - travaux : réels (item.travaux) ou forfait 15 % de plein droit si détention > 5 ans.
      var forfaits = forfaitsGlobaux && item.pvForfaits !== "Non";
      var fraisAcq = Math.max(parseNum(item.fraisAcquisition), forfaits ? prixAcq * 0.075 : 0);
      var travaux = Math.max(parseNum(item.travaux), (forfaits && duree > 5) ? prixAcq * 0.15 : 0);
      var prixAcqCorrige = Math.round(prixAcq + fraisAcq + travaux);
      var pvBrute = Math.max(0, prixCession - prixAcqCorrige);
      var baseIR = Math.round(pvBrute * (1 - abattementDureeIR(duree)));
      var basePS = Math.round(pvBrute * (1 - abattementDureePS(duree)));
      var ir = Math.round(baseIR * FISCAL.irPlusValueImmo);
      var ps = Math.round(basePS * FISCAL.psImmoFoncier);
      var surtaxe = surtaxePVImmo(baseIR);
      var impot = ir + ps + surtaxe;
      return { designation: l.designation, warning: false, prixCession: prixCession, prixVente: prixVente,
        fraisCession: fraisCession, prixAcquisition: prixAcq, fraisAcquisition: Math.round(fraisAcq),
        travaux: Math.round(travaux), prixAcqCorrige: prixAcqCorrige, forfaits: forfaits,
        duree: duree, pvBrute: pvBrute, baseIR: baseIR, basePS: basePS, ir: ir, ps: ps, surtaxe: surtaxe,
        impot: impot, net: prixCession - impot };
    });
    return {
      lignes: lignes,
      totalImpot: lignes.reduce(function (s, l) { return s + (l.impot || 0); }, 0),
      totalPV: lignes.reduce(function (s, l) { return s + (l.pvBrute || 0); }, 0),
      hasWarning: lignes.some(function (l) { return l.warning; }),
      forfaits: forfaitsGlobaux,
      count: lignes.length
    };
  }

  // IFI APRÈS arbitrage : recalcul de l'assiette une fois les biens immobiliers
  // arbitrés sortis du patrimoine. Cession TOTALE (montant arbitré ≥ valeur nette
  // du bien) : bien retiré et dette rattachée soldée par le prix de vente ;
  // cession partielle : valeur du bien réduite du montant arbitré. C'est le gain
  // phare de la stratégie : IFI actuel → IFI cible (souvent 0 € si l'assiette
  // résiduelle passe sous le seuil de 1,3 M€).
  function ifiPostArbitrage(data) {
    var avant = ifi(data);
    var aa = arbitrageActifs(data);
    var clone = JSON.parse(JSON.stringify(data));
    var immo = (clone.actif && clone.actif.immobilier) || [];
    var soldees = {}; // biens cédés en totalité → dette rattachée soldée
    var sortie = 0;
    aa.lignes.forEach(function (l) {
      if (!l.isImmo || l.montant <= 0) return;
      var item = immo[parseInt(String(l.key).split(":")[1], 10)];
      if (!item) return;
      if (l.montant >= l.valeurNette) {
        if (item.designation) soldees[item.designation] = 1;
        sortie += valeurFiscale(item);
        item.valeur = "0";
      } else {
        sortie += Math.min(l.montant, valeurFiscale(item));
        item.valeur = String(Math.max(0, parseNum(item.valeur) - l.montant));
      }
    });
    (clone.actif && clone.actif.passifs || []).forEach(function (p) { if (soldees[p.rattachement || ""]) p.crd = "0"; });
    var apres = ifi(clone);
    return { avant: avant, apres: apres, assietteSortie: sortie, gain: Math.max(0, avant.montant - apres.montant) };
  }

  // Feuille de route opérationnelle dérivée des décisions saisies (logique partagée
  // par la diapo « Plan d'action » et l'aperçu du formulaire) : arbitrages →
  // donations envisagées → réinvestissements par enveloppe. Renvoie une liste
  // d'étapes { title, objectif, proposition }.
  function feuilleDeRoute(data) {
    var aa = arbitrageActifs(data), ds = donationStrategie(data), rt = reinvestTotals(data);
    var steps = [];
    function step(title, objectif, proposition) { steps.push({ title: title, objectif: objectif, proposition: proposition }); }
    var immoArb = aa.lignes.filter(function (l) { return l.isImmo && l.montant > 0; });
    var mobArb = aa.lignes.filter(function (l) { return !l.isImmo && l.montant > 0; });
    if (immoArb.length) {
      var tImmo = immoArb.reduce(function (s, l) { return s + l.montant; }, 0);
      var pvFR = plusValueImmo(data);
      var propImmo = immoArb.map(function (l) { return l.designation; }).join(", ") + ". Mandat de vente — délai estimé ~3 mois par bien.";
      if (pvFR.totalImpot > 0) propImmo += " Fiscalité de cession estimée ≈ " + formatEur(pvFR.totalImpot) + " (net ≈ " + formatEur(rt.disponibleNet) + ").";
      if (pvFR.hasWarning) propImmo += " Capital net sous réserve de la fiscalité de cession non chiffrée.";
      step("Céder l'immobilier ciblé", "Arbitrer " + formatEur(tImmo), propImmo);
    }
    if (mobArb.length) {
      var tMob = mobArb.reduce(function (s, l) { return s + l.montant; }, 0);
      step("Réallouer son épargne", "Arbitrer " + formatEur(tMob), mobArb.map(function (l) { return l.designation + " (" + formatEur(l.montant) + ")"; }).join(" · ") + ".");
    }
    if (ds.totalMontant > 0) {
      step("Consentir les donations", "Transmettre " + formatEur(ds.totalMontant), ds.lignes.map(function (l) { return l.donateur + " → " + l.beneficiaire + " " + formatEur(l.montant); }).join(" · ") + (ds.totalDroits > 0 ? ". Droits estimés ≈ " + formatEur(ds.totalDroits) + "." : ". En franchise de droits."));
    }
    rt.parEnveloppe.filter(function (e) { return e.montant > 0; }).forEach(function (e) {
      step("Réinvestir — " + e.enveloppe, formatEur(e.montant), "Verser " + formatEur(e.montant) + " sur " + e.enveloppe + ".");
    });
    if (rt.aAllouer > 0 && rt.reste > 0) step("Allouer le solde", "Reste " + formatEur(rt.reste), "Capital net non encore réinvesti : " + formatEur(rt.reste) + " — à affecter selon le profil de risque et l'horizon." + (rt.pvNonChiffree ? " Capital net sous réserve de la fiscalité de cession non chiffrée." : ""));
    return steps;
  }

  // Données manquantes qui FAUSSENT les chiffres (bandeau en tête de synthèse) :
  //  - biens en NP sans âge d'usufruitier → retenus en pleine valeur (art. 669) ;
  //  - biens du plan de cession sans prix/date d'acquisition → plus-value non chiffrée.
  function donneesManquantes(data) {
    var actif = (data && data.actif) || {};
    var out = [];
    var npSans = (actif.immobilier || []).concat(actif.autres || []).filter(function (a) {
      return a.droit === "NP" && (a.ageUsufruitier == null || String(a.ageUsufruitier) === "");
    }).map(function (a) { return a.designation || a.type || "bien démembré"; });
    if (npSans.length) out.push("Âge de l'usufruitier à renseigner — " + npSans.join(", ") + " : à défaut, le bien démembré est retenu pour sa PLEINE valeur (barème art. 669 inapplicable), assiettes et droits surévalués.");
    var pvManq = plusValueImmo(data).lignes.filter(function (l) { return l.warning; }).map(function (l) { return l.designation || "bien cédé"; });
    if (pvManq.length) out.push("Prix / date d'acquisition à renseigner — " + pvManq.join(", ") + " : plus-value de cession non chiffrée, fiscalité du plan de cession sous-estimée.");
    // NP d'un parent sans usufruitier identifié : l'exclusion successorale (art. 1133)
    // suppose que les parents ne sont QUE nu-propriétaires — à confirmer.
    var S = (typeof window !== "undefined" && window.HexaSuccession) ? window.HexaSuccession : null;
    var npSucc = (S && S.liquidation) ? (S.liquidation(data, { assuranceVieHorsSuccession: true }).npSansUsufruitier || []) : [];
    if (npSucc.length) out.push("Bien en nue-propriété sans usufruitier identifié — " + npSucc.join(", ") + " : exclu de la masse successorale ; à confirmer (l'exclusion suppose que les parents ne sont que nu-propriétaires).");
    return out;
  }

  // Statut fiscal AFFICHABLE : jamais de « Salarié » par défaut. Vide si non
  // renseigné, si la personne est « Sans activité », ou si « Salarié » contredit
  // manifestement l'activité saisie (étudiant, retraité, enfant) — artefact de
  // l'ancien gabarit. L'affichage remplace une valeur vide par « — ».
  function statutFiscalAffiche(m) {
    var act = String((m && m.activitePro) || "");
    var s = String((m && m.statutFiscal) || "").trim();
    if (!s) return "";
    if (/sans activité/i.test(act)) return "";
    if (s === "Salarié" && (/étudiant/i.test(act) || /retrait/i.test(act) || (m && m.qualite === "Enfant"))) return "";
    return s;
  }

  // Diagnostic forces / points de vigilance, dérivé des données saisies.
  function diagnostic(data) {
    var t = assetTotals((data && data.actif) || {}, data), bt = budgetTotals((data && data.budget) || {});
    var membres = (data && data.foyer && data.foyer.membres) || [];
    var immo = (data && data.actif && data.actif.immobilier) || [];
    var autres = (data && data.actif && data.actif.autres) || [];
    var forces = [], vig = [];
    var enfants = membres.filter(function (m) { return m.qualite === "Enfant"; }).length;
    var hasLocatif = immo.some(function (a) { return a.classe === "Investissement locatif"; });
    var cash = CASH_TYPES;
    var liquid = 0; autres.forEach(function (a) { if (cash[a.type]) liquid += parseNum(a.valeur); });
    var liquidPct = t.brut ? liquid / t.brut * 100 : 0;
    var autresPct = t.brut ? t.autres / t.brut * 100 : 0;
    var hasNP = immo.concat(autres).some(function (a) { return a.droit === "NP"; });
    // Mineur (administration légale / autorité parentale) et majeur protégé (tutelle /
    // curatelle) relèvent de régimes distincts : on ne les confond pas.
    var mineurs = membres.filter(function (m) { return m.capacite === "Mineur"; });
    var majeursProteges = membres.filter(function (m) { return ["Tutelle", "Curatelle"].indexOf(m.capacite) >= 0; });
    var handicap = membres.some(function (m) { return m.handicap === "Oui"; });
    var fi = ifi(data);

    if (t.net >= 1000000) forces.push("Patrimoine net conséquent (~" + formatMillions(t.net) + ")");
    else if (t.net > 0) forces.push("Patrimoine net de " + formatEur(t.net));
    if (t.brut && t.endettementPct < 15) forces.push("Endettement maîtrisé (" + formatPctVal(t.endettementPct) + ") : capacité d'action préservée");
    if (hasLocatif) forces.push("Patrimoine immobilier de rapport générant des revenus réguliers");
    if (bt.disponible > 0) forces.push("Capacité d'épargne dégagée (~" + formatEur(bt.disponible) + " / an)");
    if (autresPct >= 15) forces.push("Épargne financière présente (" + formatPctVal(autresPct) + " du patrimoine)");
    if (hasNP) forces.push("Transmission déjà engagée (démembrement en place)");

    if (t.partImmoPct >= 65) vig.push("Sur-concentration immobilière (" + formatPctVal(t.partImmoPct) + " de l'actif brut)");
    if (fi.assujetti) {
      var ifiAdj = [];
      if (fi.abattementRP > 0) ifiAdj.push("résidence principale −30 %");
      if (fi.dette > 0) ifiAdj.push("dettes immobilières déduites");
      vig.push("Assujetti à l'IFI — assiette nette " + formatEur(fi.nette) + (ifiAdj.length ? " (" + ifiAdj.join(", ") + ")" : "") + ", IFI estimé ≈ " + formatEur(fi.montant));
    }
    if (hasLocatif) vig.push("Revenus fonciers fortement fiscalisés (TMI + prélèvements sociaux)");
    if (liquidPct < 5) vig.push("Liquidité limitée (" + formatPctVal(liquidPct) + " du patrimoine)");
    if (autresPct < 20) vig.push("Diversification financière insuffisante (" + formatPctVal(autresPct) + ")");
    if (enfants >= 1) vig.push("Transmission à anticiper : " + enfants + " enfant" + (enfants > 1 ? "s" : "") + (enfants > 1 ? ", biens de valeurs potentiellement inégales" : ""));
    if (t.endettementPct > 33) vig.push("Endettement élevé (" + formatPctVal(t.endettementPct) + ")");
    if (mineurs.length) vig.push("Mineur(s) dans le foyer : actes de disposition soumis à l'administration légale (autorité parentale), voire à l'autorisation du juge");
    // Incohérence régime matrimonial / détention : la société d'acquêts est un
    // aménagement d'un régime de SÉPARATION de biens — incompatible avec un régime
    // communautaire déclaré.
    var regimeCommunautaire = membres.some(function (m) { return /communaut/i.test(m.regime || ""); });
    var bienSocAcquets = immo.concat(autres).some(function (a) { return (a.proprietaire || "") === "Société d'acquêts"; });
    if (regimeCommunautaire && bienSocAcquets) vig.push("Incohérence possible : un bien est détenu via une « Société d'acquêts » alors que le régime déclaré est communautaire — la société d'acquêts est un aménagement d'un régime de séparation de biens ; vérifier la saisie");
    if (majeursProteges.length) vig.push("Majeur protégé (tutelle / curatelle) dans le foyer : actes soumis à autorisation — formalités spécifiques");
    if (handicap) vig.push("Personne en situation de handicap : dispositifs dédiés (abattement, épargne handicap)");
    // Protection sociale du dirigeant TNS sans couverture incapacité/invalidité : point prioritaire.
    var tnsSansPrev = membres.filter(function (m) { return /TNS/.test(m.statutFiscal || "") && (m.prevoyanceIncapInval || "") !== "Oui"; });
    if (tnsSansPrev.length) vig.unshift("Protection sociale du dirigeant à renforcer : " + tnsSansPrev.map(function (m) { return ((m.qualite || "") + " " + (m.prenom || "")).trim(); }).join(", ") + " (TNS) sans couverture incapacité / invalidité");
    // Tendance IR (informative) à partir des montants N-1 / N-2 saisis.
    var fisc = (data && data.fiscalite) || {}, ir1 = parseNum(fisc.irN1), ir2 = parseNum(fisc.irN2);
    if (ir1 && ir2 && Math.abs(ir1 - ir2) >= 0.05 * Math.max(ir1, ir2)) vig.push("IR en " + (ir1 > ir2 ? "hausse" : "baisse") + " (N-2 : " + formatEur(ir2) + " → N-1 : " + formatEur(ir1) + ")");

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
    var t = assetTotals((data && data.actif) || {}, data), bt = budgetTotals((data && data.budget) || {});
    var actif = (data && data.actif) || {}, immo = actif.immobilier || [], autres = actif.autres || [];
    var membres = (data && data.foyer && data.foyer.membres) || [];
    var enfants = membres.filter(function (m) { return m.qualite === "Enfant"; }).length;
    var hasLocatif = immo.some(function (a) { return a.classe === "Investissement locatif"; });
    var cash = CASH_TYPES;
    var liquid = 0; autres.forEach(function (a) { if (cash[a.type]) liquid += parseNum(a.valeur); });
    var liquidPct = t.brut ? liquid / t.brut * 100 : 0, autresPct = t.brut ? t.autres / t.brut * 100 : 0;
    var r = [];
    if (t.partImmoPct >= 65) r.push({ risk: "Concentration immobilière", level: "Élevé", desc: formatPctVal(t.partImmoPct) + " de l'actif sur une seule classe : risque de liquidité et de marché" });
    else if (t.partImmoPct >= 45) r.push({ risk: "Concentration immobilière", level: "Moyen", desc: formatPctVal(t.partImmoPct) + " de l'actif en immobilier" });
    if (ifi(data).assujetti) r.push({ risk: "Pression fiscale (IFI" + (hasLocatif ? " + IR foncier" : "") + ")", level: hasLocatif ? "Élevé" : "Moyen", desc: "Imposition récurrente du patrimoine" + (hasLocatif ? " et des loyers (TMI + prélèvements sociaux)" : "") });
    else if (hasLocatif) r.push({ risk: "Fiscalité des revenus fonciers", level: "Moyen", desc: "Loyers fortement fiscalisés (TMI + prélèvements sociaux)" });
    if (enfants >= 1) r.push({ risk: "Transmission / indivision", level: enfants >= 2 ? "Moyen" : "Modéré", desc: enfants + " enfant" + (enfants > 1 ? "s" : "") + " : transmission à organiser pour éviter le blocage successoral" });
    if (liquidPct < 5) r.push({ risk: "Liquidité de court terme", level: "Modéré", desc: "Épargne disponible limitée (" + formatPctVal(liquidPct) + ") hors actifs immobiliers" });
    if (autresPct < 20) r.push({ risk: "Diversification financière", level: "Modéré", desc: "Faible exposition aux marchés financiers (" + formatPctVal(autresPct) + ")" });
    if (t.endettementPct > 33) r.push({ risk: "Endettement élevé", level: "Élevé", desc: "Taux d'endettement de " + formatPctVal(t.endettementPct) });
    if (bt.totalRevenus && bt.disponible < 0) r.push({ risk: "Budget déséquilibré", level: "Élevé", desc: "Charges supérieures aux revenus (déficit de " + formatEur(-bt.disponible) + " / an)" });
    var tnsSansPrev = membres.filter(function (m) { return /TNS/.test(m.statutFiscal || "") && (m.prevoyanceIncapInval || "") !== "Oui"; });
    if (tnsSansPrev.length) r.unshift({ risk: "Protection sociale du dirigeant", level: "Élevé", desc: "Dirigeant TNS sans couverture incapacité / invalidité : revenus non protégés en cas d'arrêt de travail" });
    if (!r.length) r.push({ risk: "Profil de risque maîtrisé", level: "Modéré", desc: "Aucun risque majeur identifié à partir des données saisies" });
    return r.slice(0, 6);
  }

  // --- Synthèse exécutive : alimentée automatiquement par les résultats ci-dessus ---
  function buildSynthese(data) {
    var dg = diagnostic(data), t = assetTotals((data && data.actif) || {}, data), bt = budgetTotals((data && data.budget) || {});
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
    if (t.partImmoPct >= 60 || ifi(data).assujetti) recs.push({ title: "Réduire l'IFI et la fiscalité foncière", detail: "Arbitrer une partie de l'immobilier détenu en direct vers des enveloppes plus souples" });
    if (bt.disponible > 0) recs.push({ title: "Préparer la retraite et baisser l'IR", detail: "Alimenter des PER (report des plafonds sur 5 ans, mutualisation entre conjoints)" });
    if (autresPct < 20) recs.push({ title: "Diversifier l'épargne financière", detail: "FCPR / PEA / PEA-PME / assurance-vie : actions cotées, obligataire, private equity" });
    if (enfants >= 1) recs.push({ title: "Organiser la transmission", detail: "Donations en nue-propriété, clause bénéficiaire d'assurance-vie" });
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
      if (tmi >= 30) reasons.push("TMI élevée (" + tmi + " %) : revenus fonciers taxés à " + tmi + " % + " + FISCAL.psImmoFoncierPct + " de prélèvements sociaux");
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
    var t = assetTotals((data && data.actif) || {}, data), tmi = tmiPct(data);
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
    // Commentaire de la diapo « Composition du patrimoine » : agrégats sur le
    // périmètre COUPLE (une seule part immobilière dans tout le document), avec
    // mention explicite de la part des enfants présentée à l'inventaire.
    var t = assetTotals((data && data.actif) || {}, data);
    if (!t.brut) return "Renseignez les actifs pour générer automatiquement le commentaire.";
    var partEnfants = assetTotals((data && data.actif) || {}).brut - t.brut;
    var actif = (data && data.actif) || {}, autres = actif.autres || [];
    var cash = CASH_TYPES;
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
    // Pont des agrégats : le lecteur doit retrouver la différence entre l'actif
    // brut total (inventaire, tous détenteurs) et l'assiette du couple.
    if (partEnfants > 0) phrase += " Pont des agrégats : actif brut total " + formatEur(t.brut + partEnfants) + " − actifs détenus par les enfants " + formatEur(partEnfants) + " = actif brut du couple " + formatEur(t.brut) + " (assiette IFI et masse successorale).";
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
    // Source unique de vérité : la capacité de donation en franchise provient de
    // HexaSuccession.donationCapacite (abattement 779 + don familial 790 G, nets des
    // donations < 15 ans, art. 784) — le MÊME chiffre que les diapos et le livret.
    var Sdon = (typeof window !== "undefined" && window.HexaSuccession) ? window.HexaSuccession : null;
    if (parents.length && enfants.length && Sdon && Sdon.donationCapacite) {
      var cap0 = Sdon.donationCapacite(data);
      var avail = (cap0.parents || []).reduce(function (s, p) { return s + parseNum(p.totalDisponible); }, 0);
      if (avail > 0) props.push({ title: "Donner en franchise de droits", detail: "Capacité totale en franchise : " + formatEur(avail) + " (abattement 100 000 €/enfant/parent, art. 779 + don familial 31 865 €, art. 790 G, donateur < 80 ans), nette des donations de moins de 15 ans déjà consenties (art. 784 CGI)." });
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
    // 5. PER — épargne retraite (différencié salarié / TNS ; économie d'IR sur la TMI saisie du foyer).
    var tmi = tmiPct(data), er = (data && data.epargneRetraite) || {};
    var actifs = parents.filter(function (p) { var s = p.statutFiscal || ""; return s && s !== "Retraité" && s !== "Sans activité"; });
    var retraites = parents.filter(function (p) { return /retrait/i.test(p.statutFiscal || "") || /retrait/i.test(p.activitePro || ""); });
    var plafTot = function (o) { o = o || {}; return parseNum(o.N1) + parseNum(o.N2) + parseNum(o.N3) + parseNum(o.N4); }; var plaf = plafTot(er.perPlafondMonsieur) + plafTot(er.perPlafondMadame);
    var tnsActif = actifs.some(function (p) { return /TNS|Dirigeant/.test(p.statutFiscal || ""); });
    // La reco PER vaut pour les actifs ; pour un parent RETRAITÉ elle n'est conservée
    // que si un plafond reste mobilisable, avec une nuance explicite (déduction encore
    // pertinente à TMI élevée, mais objectif retraite et blocage moins adaptés).
    if ((actifs.length && (plaf > 0 || tnsActif)) || (retraites.length && plaf > 0)) {
      var tns = actifs.some(function (p) { return /TNS/.test(p.statutFiscal || ""); });
      var mut = (er.perMutualisation === "Oui" || er.perMutualisation === true);
      var eco = (tmi && plaf) ? Math.round(plaf * tmi / 100) : 0;
      var d = (actifs.length
          ? (tns ? "Dirigeant TNS : le plafond PER / Madelin se calcule sur le bénéfice et peut dépasser le plafond salarié. " : "Salarié(s) / assimilé(s) : déduction des versements dans la limite du plafond épargne retraite. ")
          : "")
        + (plaf ? "Plafond disponible saisi (report N-1 à N-4) : " + formatEur(plaf) + (mut ? " (mutualisé entre conjoints)" : "") + ". " : "")
        + (eco ? "Économie d'IR si plafond utilisé : ≈ " + formatEur(eco) + " (TMI " + tmi + " %)." : (tmi ? "Économie d'IR = versement × TMI (" + tmi + " %)." : "Renseignez la TMI (foyer) et le plafond PER pour chiffrer l'économie."));
      if (retraites.length) {
        var nomsRet = retraites.map(function (p) { return ((p.qualite || "") + " " + (p.prenom || "")).trim(); }).join(", ");
        d += " Statut retraité (" + nomsRet + ") : la déduction conserve son intérêt tant que la TMI reste élevée, mais l'objectif « préparer la retraite » et l'horizon de blocage des fonds sont moins pertinents — à arbitrer avec le besoin de liquidité.";
      }
      props.push({ title: "Alimenter un PER (réduction d'IR)", detail: d });
    }
    return props;
  }

  // Met à jour les champs dérivés conservés dans les données (pour l'export).
  function syncDerived(data) {
    // Rétrocompatibilité : garantir les nouveaux blocs optionnels sur d'anciens JSON (sans écraser).
    if (data && !data.fiscalite) data.fiscalite = { revenuImposable: "", irN1: "", irN2: "" };
    if (data && !data.pvParams) data.pvParams = { forfaits: "Oui" }; // forfaits art. 150 VB par défaut (favorables)
    if (data && (!data.epargneRetraite || typeof data.epargneRetraite.perPlafondMonsieur !== "object")) {
      var erPrev = data.epargneRetraite || {};
      data.epargneRetraite = { perPlafondMonsieur: { N1: "", N2: "", N3: "", N4: "" }, perPlafondMadame: { N1: "", N2: "", N3: "", N4: "" }, perMutualisation: erPrev.perMutualisation || "Non" };
    }
    if (data && data.foyer && data.budget) data.foyer.activite = activiteFromBudget(data.budget);
    // Purge des montants de revenus/charges rattachés à une personne qui n'existe plus
    // (renommée ou retirée du foyer) : sinon les totaux additionneraient des valeurs
    // orphelines, invisibles dans le tableau (dont les colonnes = personnes courantes).
    if (data && data.budget && data.foyer) {
      var _valid = {}; personLabels(data).forEach(function (p) { _valid[p] = 1; });
      ["revenus", "charges"].forEach(function (kind) {
        (data.budget[kind] || []).forEach(function (r) {
          if (r && r.montants) Object.keys(r.montants).forEach(function (k) { if (!_valid[k]) delete r.montants[k]; });
        });
      });
    }
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
      if (!data.successionParams) data.successionParams = { assuranceVieHorsSuccession: "Oui", anneeReference: "" };
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
    var t = assetTotals((data && data.actif) || {}, data);
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
    valeurFiscale: valeurFiscale, isEnfantOwner: isEnfantOwner, FISCAL: FISCAL, assetTotals: assetTotals, assetChartData: assetChartData, assetByHolderType: assetByHolderType, budgetTotals: budgetTotals, ifi: ifi,
    lineTotal: lineTotal, personLabels: personLabels, arbitrageTotals: arbitrageTotals, arbitrageActifs: arbitrageActifs, donationStrategie: donationStrategie, reinvestTotals: reinvestTotals, plusValueImmo: plusValueImmo, ifiPostArbitrage: ifiPostArbitrage, feuilleDeRoute: feuilleDeRoute, patrimoineBullet: patrimoineBullet,
    statutFiscalAffiche: statutFiscalAffiche, ALERTE_DONATION_MINEUR: ALERTE_DONATION_MINEUR,
    activiteFromBudget: activiteFromBudget, diagnostic: diagnostic, syncDerived: syncDerived,
    scenarioTotal: scenarioTotal, donationGain: donationGain,
    peaCapacity: peaCapacity, riskMap: riskMap, buildSynthese: buildSynthese,
    cessionImmoReco: cessionImmoReco, tmiPct: tmiPct,
    assetComment: assetComment, preconisations: preconisations, donneesManquantes: donneesManquantes,
    PROFILS: PROFILS, detectProfil: detectProfil, profilInfo: profilInfo
  };
})();
