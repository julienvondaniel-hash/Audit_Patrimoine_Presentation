/* =============================================================================
 * hexa-succession.js — Moteur de calcul des droits de succession (France 2026)
 * -----------------------------------------------------------------------------
 * Fonctions PURES (sans DOM), paramétrables et testables. Le moteur calcule,
 * à partir du seul patrimoine saisi, les droits de succession au 1er et au 2nd
 * décès, pour les trois options du conjoint (art. 1094-1 C. civ.), et pour les
 * deux ordres de décès (Monsieur/Madame). Il alimente automatiquement le PPT.
 *
 * Logique en 3 étapes par décès :
 *   A. Liquidation du régime matrimonial (communauté légale : 50 % des communs
 *      reviennent au survivant et sortent de la succession).
 *   B. Dévolution selon l'option du conjoint (usufruit 669 CGI / quart / QD).
 *   C. Imposition de la part nette des enfants (abattement 779 + barème ligne
 *      directe, strictement par tranches, aucun arrondi avant le total).
 *
 * Référence : barèmes 2026 codés en dur (non indexés).
 * Exposé sous window.HexaSuccession.
 * ========================================================================== */
(function () {
  "use strict";

  var root = typeof window !== "undefined" ? window
    : (typeof globalThis !== "undefined" ? globalThis : this);

  // --- Conversion d'une saisie (« 1 794 000 », « 156 045 € »…) en nombre ------
  function parseNum(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null) return 0;
    var s = String(v).replace(/[^0-9.,\-]/g, "");
    if (s === "" || s === "-") return 0;
    s = s.replace(/[.,]/g, "");
    var n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
  }

  // ===========================================================================
  // BARÈMES 2026 (codés en dur, non indexés)
  // ===========================================================================

  // Barème progressif en ligne directe (parent → enfant) — art. 777 CGI.
  // Tranches sur la part nette taxable (après abattement).
  var TRANCHES = [
    { plafond: 8072, taux: 0.05 },
    { plafond: 12109, taux: 0.10 },
    { plafond: 15932, taux: 0.15 },
    { plafond: 552324, taux: 0.20 },
    { plafond: 902838, taux: 0.30 },
    { plafond: 1805677, taux: 0.40 },
    { plafond: Infinity, taux: 0.45 }
  ];

  // Calcul STRICTEMENT par tranches (aucun arrondi intermédiaire).
  function baremeLigneDirecte(taxable) {
    if (!(taxable > 0)) return 0;
    var droits = 0, prec = 0;
    for (var i = 0; i < TRANCHES.length; i++) {
      var t = TRANCHES[i];
      if (taxable > t.plafond) { droits += (t.plafond - prec) * t.taux; prec = t.plafond; }
      else { droits += (taxable - prec) * t.taux; break; }
    }
    return droits;
  }

  // Abattements (art. 779 & s. CGI)
  var ABATTEMENT_ENFANT = 100000;        // par enfant ET par parent, renouvelable 15 ans
  var ABATTEMENT_HANDICAP = 159325;      // cumulable (art. 779 II)
  var ABATTEMENT_CONJOINT = 80724;       // art. 790 E — abattement de donation entre époux/partenaires

  // Barème usufruit / nue-propriété selon l'âge de l'usufruitier — art. 669 CGI.
  // Retourne la quote-part de NUE-PROPRIÉTÉ (la part taxable transmise aux enfants).
  function nuePropPct(age) {
    if (age < 21) return 0.10;
    if (age <= 30) return 0.20;
    if (age <= 40) return 0.30;
    if (age <= 50) return 0.40;
    if (age <= 60) return 0.50;
    if (age <= 70) return 0.60;
    if (age <= 80) return 0.70;
    if (age <= 90) return 0.80;
    return 0.90;
  }

  // ===========================================================================
  // RÉSERVE HÉRÉDITAIRE & QUOTITÉ DISPONIBLE (art. 913 C. civ.)
  // ===========================================================================
  // 1 enfant → réserve 1/2 ; 2 → 2/3 ; 3 et + → 3/4.
  function reserveGlobale(nEnfants) {
    if (nEnfants <= 0) return 0;
    if (nEnfants === 1) return 1 / 2;
    if (nEnfants === 2) return 2 / 3;
    return 3 / 4;
  }
  function quotiteDisponible(nEnfants) { return 1 - reserveGlobale(nEnfants); }

  // ===========================================================================
  // OPTIONS DU CONJOINT SURVIVANT (donation au dernier vivant, art. 1094-1)
  // ===========================================================================
  var OPTIONS = [
    { id: "US", name: "100 % Usufruit" },
    { id: "QUART", name: "1/4 en PP, 3/4 en US" },
    { id: "QD", name: "Quotité disponible" }
  ];
  // Dévolution légale (art. 757) : sans donation au dernier vivant (DDV) et en
  // présence d'un enfant non commun, le conjoint est limité au 1/4 en PP (pas
  // d'option usufruit) ; les enfants reçoivent les 3/4 en PP, taxés au 1er décès.
  var OPTION_LEGALE = { id: "LEGAL757", name: "Dévolution légale — conjoint 1/4 PP (art. 757)" };
  // Options ouvertes au conjoint selon la filiation des enfants et l'existence d'une DDV.
  function optionsConjoint(ctx) {
    if (ctx && ctx.enfantsNonCommuns && !ctx.donationEntreEpoux) return [OPTION_LEGALE];
    return OPTIONS;
  }

  // Part TAXABLE reçue par l'ensemble des enfants au 1er décès, selon l'option.
  //  - US    : enfants = 100 % en nue-propriété (valorisée à l'âge du survivant)
  //  - QUART : conjoint 1/4 PP + 3/4 US → enfants = 3/4 en nue-propriété
  //  - QD    : conjoint = quotité disponible en PP → enfants = réserve en PP
  function baseEnfants1erDeces(optId, succession, ageSurvivant, nEnfants) {
    var np = nuePropPct(ageSurvivant);
    if (optId === "US") return succession * np;
    if (optId === "QUART") return succession * 0.75 * np;
    if (optId === "LEGAL757") return succession * 0.75; // art. 757 : enfants = 3/4 en PP (taxés au 1er décès)
    return succession * reserveGlobale(nEnfants); // QD : réserve en pleine propriété
  }

  // Part reçue par le conjoint EN PLEINE PROPRIÉTÉ (réintègre son patrimoine et
  // sera donc taxée au 2nd décès). US : 0 (usufruit pur, art. 1133 → extinction
  // non taxée). QUART : 1/4. QD : quotité disponible.
  function ppAuConjoint(optId, succession, nEnfants) {
    if (optId === "US") return 0;
    if (optId === "QUART") return succession * 0.25;
    if (optId === "LEGAL757") return succession * 0.25; // art. 757 : conjoint 1/4 en PP
    return succession * quotiteDisponible(nEnfants);
  }

  // ===========================================================================
  // ÉTAPE C — droits dus par les enfants (abattement par enfant + barème)
  // ===========================================================================
  // childAbat : tableau des abattements par enfant (gère handicap & rappel de
  // donation < 15 ans). Aucun arrondi avant la somme.
  function droitsEnfants(baseTotale, childAbat) {
    var n = childAbat.length;
    if (n <= 0 || baseTotale <= 0) return 0;
    var part = baseTotale / n; // partage égalitaire entre enfants
    var droits = 0;
    for (var i = 0; i < n; i++) droits += baremeLigneDirecte(Math.max(0, part - childAbat[i]));
    return droits;
  }

  // ===========================================================================
  // ÉTAPE A — Liquidation du régime matrimonial à partir du patrimoine saisi
  // ===========================================================================
  function bucketOf(proprietaire) {
    var p = String(proprietaire || "");
    if (/^(Communaut|Soci|SCI|SCP|SARL|Indivision)/i.test(p)) return "commun"; // communauté, sociétés de famille, indivision
    if (/^(M\.|Monsieur)/i.test(p)) return "propreM";
    if (/^(Mme|Madame)/i.test(p)) return "propreMme";
    return "exclu"; // détenu par un enfant / tiers → hors succession des parents
  }

  // Regroupe l'actif en propres M / propres Mme / communs (net de dettes),
  // exclut les biens déjà démembrés (NP détenue par un enfant) et, par défaut,
  // l'assurance-vie (régime dérogatoire 990 I / 757 B, hors barème).
  function liquidation(data, params) {
    var actif = (data && data.actif) || {};
    var avHors = params.assuranceVieHorsSuccession;
    var biens = (actif.immobilier || []).concat(actif.autres || []);
    var pot = { commun: 0, propreM: 0, propreMme: 0 };
    var avParBucket = { commun: 0, propreM: 0, propreMme: 0 };
    var npSansUsufruitier = []; // NP d'un PARENT sans âge d'usufruitier : exclusion à confirmer

    biens.forEach(function (b) {
      var bucket = bucketOf(b.proprietaire);
      if (bucket === "exclu") return;                 // bien d'un enfant → exclu
      if (b.droit === "NP") {
        // Exclusion (art. 1133) légitime si le parent n'est QUE nu-propriétaire.
        // Sans âge d'usufruitier renseigné, l'usufruitier n'est pas identifié :
        // on collecte le bien pour alerte (calcul par défaut inchangé).
        if (b.ageUsufruitier == null || String(b.ageUsufruitier) === "") npSansUsufruitier.push(b.designation || b.type || "bien démembré");
        return;                                       // NP déjà transmise → exclue (art. 1133)
      }
      var val = parseNum(b.valeur) * (parseNum(b.quote) || 100) / 100;
      var estAV = /assurance.?vie/i.test(b.type || "") || /assurance.?vie/i.test(b.designation || "");
      if (estAV) { avParBucket[bucket] += val; if (avHors) return; } // AV : hors barème par défaut
      pot[bucket] += val;
    });

    // Dettes : rattachées à un bien (→ bucket du bien) sinon réputées communes.
    (actif.passifs || []).forEach(function (d) {
      var crd = parseNum(d.crd);
      var rat = d.rattachement;
      var asset = biens.filter(function (b) { return b.designation === rat; })[0];
      var bucket = asset ? bucketOf(asset.proprietaire) : "commun";
      if (bucket === "exclu") bucket = "commun";
      pot[bucket] -= crd;
    });

    return {
      communsNet: pot.commun, propreMNet: pot.propreM, propreMmeNet: pot.propreMme,
      avTotal: avParBucket.commun + avParBucket.propreM + avParBucket.propreMme,
      npSansUsufruitier: npSansUsufruitier
    };
  }

  // ===========================================================================
  // Donation NP anticipée (variantes « avec donation »)
  // ===========================================================================
  // Modèle : chaque parent donne en nue-propriété des biens d'une valeur en
  // PLEINE PROPRIÉTÉ « donationPP », en conservant l'usufruit. Effets :
  //  - au décès, l'usufruit s'éteint sans droits (art. 1133) → la PLEINE
  //    propriété (donationPP) sort de l'assiette successorale ;
  //  - la NP transmise (donationPP × NP%) consomme l'abattement des enfants
  //    (rappel fiscal des donations < 15 ans, art. 784 CGI).
  // Par défaut, on donne « à hauteur des abattements » : NP transmise =
  // nEnfants × 100 000 € par parent (droits de donation ≈ 0).
  function donationParParent(params, ageDonateur, nEnfants) {
    var npPct = nuePropPct(ageDonateur);
    var ppDefaut = nEnfants * ABATTEMENT_ENFANT / npPct; // NP couverte par les abattements
    var pp = (params.donationPPParParent != null && params.donationPPParParent !== "")
      ? parseNum(params.donationPPParParent) : ppDefaut;
    var npTransmise = pp * npPct;
    return {
      ppRetiree: pp,                                   // sort de l'assiette au décès
      npPerChild: npTransmise / Math.max(1, nEnfants)  // NP transmise par enfant (consomme l'abattement)
    };
  }

  // ===========================================================================
  // Scénarios pour un ordre de décès donné (défunt → survivant)
  // ===========================================================================
  function scenariosPourDeces(ctx) {
    // ctx : { propreDefunt, propreSurvivant, communsNet, ageSurvivant, ageDefunt,
    //         nEnfants, abat1Base[], abat2Base[], avecDonation, params }
    var demiCommuns = ctx.communsNet / 2; // art. 1401-1404 : 50 % au survivant
    var donD = ctx.avecDonation ? donationParParent(ctx.params, ctx.ageDefunt, ctx.nEnfants) : null;
    var donS = ctx.avecDonation ? donationParParent(ctx.params, ctx.ageSurvivant, ctx.nEnfants) : null;

    // Abattements par enfant : base = 100 000 € − rappel des donations < 15 ans
    // (déjà calculé dans abat1Base/abat2Base, handicap inclus), encore réduits
    // par la donation NP prospective des variantes « avec donation ».
    var abat1 = ctx.abat1Base.map(function (a) { return donD ? Math.max(0, a - donD.npPerChild) : a; });
    var abat2 = ctx.abat2Base.map(function (a) { return donS ? Math.max(0, a - donS.npPerChild) : a; });

    // Assiette successorale du défunt (étape A) : propres + 50 % communs − donation.
    var successionDefunt = ctx.propreDefunt + demiCommuns - (donD ? donD.ppRetiree : 0);

    return optionsConjoint(ctx).map(function (opt) {
      // 1er décès — droits des enfants (conjoint exonéré, loi TEPA 2007).
      var base1 = baseEnfants1erDeces(opt.id, successionDefunt, ctx.ageSurvivant, ctx.nEnfants);
      var d1 = droitsEnfants(base1, abat1);

      // 2nd décès — patrimoine du survivant : sa moitié de communauté + ses
      // propres + ce qu'il a reçu en PLEINE propriété au 1er décès.
      var ppRecu = ppAuConjoint(opt.id, successionDefunt, ctx.nEnfants);
      var successionSurvivant = ctx.propreSurvivant + demiCommuns - (donS ? donS.ppRetiree : 0) + ppRecu;
      var d2 = droitsEnfants(successionSurvivant, abat2);

      return { name: opt.name, d1: Math.round(d1), d2: Math.round(d2) };
    });
  }

  // ===========================================================================
  // Helpers foyer
  // ===========================================================================
  // Année de référence des âges et des délais (rappel 15 ans). Garde-fou : une
  // saisie ANTÉRIEURE à l'année de la date du document est ignorée (avertissement
  // en console) — on ne calcule JAMAIS une succession sur un millésime antérieur
  // à l'étude. Une saisie future (projection) reste permise.
  function anneeReference(data, params) {
    var m = /(\d{4})/.exec((data && data.doc && data.doc.date) || "");
    var anneeDoc = m ? parseInt(m[1], 10) : new Date().getFullYear();
    var saisie = (params && params.anneeReference) ? parseInt(params.anneeReference, 10) : NaN;
    if (isNaN(saisie)) return anneeDoc;
    if (saisie < anneeDoc) {
      var k = saisie + "<" + anneeDoc; // avertir UNE fois par couple saisie/document (la fonction est appelée à chaque recalcul)
      if (!anneeReference._warned) anneeReference._warned = {};
      if (!anneeReference._warned[k] && typeof console !== "undefined" && console.warn) {
        anneeReference._warned[k] = 1;
        console.warn("HexaSuccession : année de référence saisie (" + saisie + ") antérieure à la date du document (" + anneeDoc + ") — " + anneeDoc + " retenue pour le calcul.");
      }
      return anneeDoc;
    }
    return saisie;
  }
  function ageA(naissance, annee) {
    var m = /(\d{4})/.exec(String(naissance || ""));
    return m ? (annee - parseInt(m[1], 10)) : 0;
  }
  // Âge EXACT (mois/jour pris en compte) à une date de référence — contrairement à
  // ageA qui ne compare que les millésimes. null si l'une des dates est invalide.
  function ageExact(naissance, dateRef) {
    var d = new Date(naissance), r = new Date(dateRef);
    if (isNaN(d.getTime()) || isNaN(r.getTime())) return null;
    var age = r.getFullYear() - d.getFullYear();
    var m = r.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && r.getDate() < d.getDate())) age--;
    return age;
  }
  // Date de référence COMPLÈTE du document : data.doc.date si elle est parseable
  // (« 2026-06-19 »), sinon le 1er janvier de l'année de référence (choix prudent :
  // dans l'année, c'est la date qui minimise les âges).
  function dateRefDocument(data, params) {
    var raw = (data && data.doc && data.doc.date) || "";
    var d = new Date(raw);
    if (!isNaN(d.getTime()) && /\d{4}/.test(String(raw))) return d;
    return new Date(anneeReference(data, params || {}) + "-01-01");
  }
  // Majorité d'un membre (éligibilité donataire au don familial, art. 790 G) :
  //  1. la CAPACITÉ saisie fait foi — « Mineur » exclut ; « Majeur capable »,
  //     « Tutelle », « Curatelle » incluent (un majeur protégé reste un MAJEUR,
  //     éligible sous réserve des règles de protection — ce n'est pas un mineur) ;
  //  2. à défaut, l'âge EXACT à la date du document si une date fiable existe ;
  //  3. dans le doute (ni capacité, ni date exploitable) : NON éligible (prudence fiscale).
  function estMajeur(membre, dateRef) {
    var cap = String((membre && membre.capacite) || "");
    if (cap === "Mineur") return false;
    if (cap === "Majeur capable" || cap === "Tutelle" || cap === "Curatelle") return true;
    var age = (membre && membre.naissance) ? ageExact(membre.naissance, dateRef) : null;
    return age == null ? false : age >= 18;
  }
  function membres(data) { return (data && data.foyer && data.foyer.membres) || []; }
  function membreParQualite(data, q) {
    return membres(data).filter(function (m) { return (m.qualite || "") === q; })[0] || null;
  }
  function enfants(data) {
    return membres(data).filter(function (m) { return (m.qualite || "") === "Enfant"; });
  }
  function labelMembre(m) { return ((m.qualite || "") + " " + (m.prenom || "")).trim(); }
  function anneeDe(v) { var m = /(\d{4})/.exec(String(v || "")); return m ? parseInt(m[1], 10) : null; }

  // Rappel fiscal des donations < 15 ans (art. 784 CGI) : montant déjà donné par
  // un donateur à un bénéficiaire et encore dans le délai de 15 ans à l'année réf.
  function donneAvant15ans(donations, donateurLabel, beneficiaireLabel, annee) {
    var somme = 0;
    (donations || []).forEach(function (d) {
      if (d.donateur === donateurLabel && d.beneficiaire === beneficiaireLabel) {
        var a = anneeDe(d.date);
        if (a == null || (annee - a) < 15) somme += parseNum(d.valeur);
      }
    });
    return somme;
  }

  // Suivi du délai des 15 ans (pour affichage et préconisations).
  function donationsSuivi(data, paramsIn) {
    var params = withDefaults(paramsIn || (data && data.successionParams));
    var annee = anneeReference(data, params);
    return ((data && Array.isArray(data.donations)) ? data.donations : []).map(function (d) {
      var a = anneeDe(d.date), reste = a == null ? null : Math.min(15, Math.max(0, 15 - (annee - a)));
      return {
        donateur: d.donateur, beneficiaire: d.beneficiaire, valeur: parseNum(d.valeur),
        type: d.type, date: d.date, anneeReconstitution: a == null ? null : a + 15,
        ansRestants: reste,
        statut: a == null ? "Date à renseigner" : (reste > 0 ? "Rappel fiscal — reconstitution dans " + reste + " an" + (reste > 1 ? "s" : "") + " (" + (a + 15) + ")" : "Abattement reconstitué")
      };
    });
  }

  var DON_MANUEL = 31865; // art. 790 G — don familial de somme d'argent (donateur < 80 ans, donataire majeur)
  function estDonManuel(type) { return /somme d'argent|don familial|don manuel/i.test(String(type || "")); }

  // Capacité de donation en franchise de droits, par parent et par enfant. Cumule deux
  // dispositifs reconstitués tous les 15 ans, minorés des donations encore rappelables
  // (< 15 ans, art. 784) du même donateur au même bénéficiaire :
  //   - abattement de droit commun : 100 000 € (art. 779 ; + 159 325 € si handicap, art. 779 II) ;
  //   - don familial de somme d'argent : 31 865 € (art. 790 G ; parent < 80 ans, enfant majeur).
  function donationCapacite(data, paramsIn) {
    var params = withDefaults(paramsIn || (data && data.successionParams));
    var annee = anneeReference(data, params);
    var donations = (data && Array.isArray(data.donations)) ? data.donations : [];
    function norm(s) { return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }
    // Donations d'un donateur à un bénéficiaire encore dans le délai des 15 ans, ventilées
    // entre don manuel (790 G) et abattement de droit commun (779). Appariement tolérant
    // (casse / espaces) pour fiabiliser la minoration malgré des libellés saisis librement.
    function rappelables(donateur, beneficiaire) {
      var dc = 0, dm = 0;
      donations.forEach(function (d) {
        if (norm(d.donateur) !== norm(donateur) || norm(d.beneficiaire) !== norm(beneficiaire)) return;
        var a = anneeDe(d.date);
        if (a != null && (annee - a) >= 15) return; // délai écoulé : abattement reconstitué
        if (estDonManuel(d.type)) dm += parseNum(d.valeur); else dc += parseNum(d.valeur);
      });
      return { dc: dc, dm: dm };
    }
    var lesEnfants = enfants(data);
    var dateRef = dateRefDocument(data, params); // date complète du document (majorité 790 G)
    var parents = [];
    [membreParQualite(data, "Monsieur"), membreParQualite(data, "Madame")].forEach(function (p) {
      if (!p) return;
      var label = labelMembre(p), ageParent = p.naissance ? ageA(p.naissance, annee) : null;
      var rows = lesEnfants.map(function (e) {
        var abat = ABATTEMENT_ENFANT + (e.handicap === "Oui" ? ABATTEMENT_HANDICAP : 0);
        var u = rappelables(label, labelMembre(e));
        var dispoAbat = Math.max(0, abat - u.dc);
        // Majorité du donataire (art. 790 G) : la capacité saisie fait foi, sinon
        // l'âge exact à la date du document ; dans le doute, NON éligible.
        var eligibleDM = (ageParent == null || ageParent < 80) && estMajeur(e, dateRef);
        var dispoDM = eligibleDM ? Math.max(0, DON_MANUEL - u.dm) : 0;
        var total = dispoAbat + dispoDM;
        return {
          enfant: labelMembre(e), abattement: abat, utilise: u.dc, disponibleAbattement: dispoAbat,
          donManuel: dispoDM, eligibleDonManuel: eligibleDM, utiliseDonManuel: u.dm,
          disponible: total, consomme: total <= 0
        };
      });
      var totalDispo = rows.reduce(function (s, r) { return s + r.disponible; }, 0);
      parents.push({ label: label, ageParent: ageParent, rows: rows, totalDisponible: totalDispo, consomme: rows.length > 0 && totalDispo <= 0 });
    });
    return { annee: annee, parents: parents, nEnfants: lesEnfants.length, abattementEnfant: ABATTEMENT_ENFANT, donManuel: DON_MANUEL };
  }

  // Abattement de donation disponible pour UNE donation (donateur → bénéficiaire),
  // déterminé par le lien de parenté et net des donations encore rappelables (< 15 ans).
  //   - parent → enfant : 100 000 € (art. 779 ; + 159 325 € si handicap, art. 779 II)
  //     + don familial de 31 865 € (art. 790 G) si donateur < 80 ans et donataire majeur ;
  //   - entre époux : 80 724 € (art. 790 E) ;
  //   - autre : aucun abattement modélisé ici.
  function abattementDonation(data, donateurLabel, beneficiaireLabel, paramsIn) {
    var params = withDefaults(paramsIn || (data && data.successionParams));
    var annee = anneeReference(data, params);
    var donations = (data && Array.isArray(data.donations)) ? data.donations : [];
    function find(lbl) { return ((data && data.foyer && data.foyer.membres) || []).filter(function (m) { return labelMembre(m) === lbl; })[0] || null; }
    var dn = find(donateurLabel), bn = find(beneficiaireLabel);
    var lien, base;
    if (bn && bn.qualite === "Enfant") {
      lien = "Enfant";
      base = ABATTEMENT_ENFANT + (bn.handicap === "Oui" ? ABATTEMENT_HANDICAP : 0);
      // Don familial (790 G) : donateur < 80 ans ET donataire MAJEUR — la capacité
      // saisie fait foi, sinon l'âge exact à la date du document ; doute = exclu.
      var ageDon = (dn && dn.naissance) ? ageA(dn.naissance, annee) : null;
      if ((ageDon == null || ageDon < 80) && estMajeur(bn, dateRefDocument(data, params))) base += DON_MANUEL;
    } else if (dn && bn && ((dn.qualite === "Monsieur" && bn.qualite === "Madame") || (dn.qualite === "Madame" && bn.qualite === "Monsieur"))) {
      lien = "Conjoint";
      base = ABATTEMENT_CONJOINT;
    } else {
      lien = "Autre";
      base = 0;
    }
    var prior = donneAvant15ans(donations, donateurLabel, beneficiaireLabel, annee);
    var disponible = Math.max(0, base - prior);
    return { lien: lien, base: base, prior: prior, disponible: disponible };
  }

  // ===========================================================================
  // POINT D'ENTRÉE — compute(data, params)
  // ===========================================================================
  function withDefaults(params) {
    params = params || {};
    var av = params.assuranceVieHorsSuccession;
    return {
      anneeReference: params.anneeReference || "",
      // défaut : true (hors barème). Accepte booléen ou « Oui »/« Non ».
      assuranceVieHorsSuccession: !(av === false || av === "Non" || av === "non"),
      // Donation au dernier vivant (DDV) consentie ? Accepte booléen ou « Oui »/« Non ». Défaut : false.
      donationEntreEpoux: (params.donationEntreEpoux === true || params.donationEntreEpoux === "Oui" || params.donationEntreEpoux === "oui"),
      donationPPParParent: params.donationPPParParent != null ? params.donationPPParParent : ""
    };
  }

  function observation(scenarios, meta) {
    meta = meta || {};
    function k(n) { return Math.round(n / 1000) + " k€"; }
    if (!scenarios.length) return "";
    // Dévolution légale (enfant non commun, sans DDV) : un seul scénario possible.
    if (scenarios.length === 1) {
      return "Enfant(s) non commun(s) sans donation au dernier vivant (DDV) : le conjoint survivant est limité au 1/4 en pleine propriété (art. 757) ; les enfants reçoivent les 3/4 en PP, taxés dès le 1er décès (coût total ≈ " + k(scenarios[0].d1 + scenarios[0].d2) + "). Une DDV (art. 1094-1) rouvrirait les options : 100 % usufruit, 1/4 PP + 3/4 US, ou quotité disponible.";
    }
    var totals = scenarios.map(function (s) { return s.d1 + s.d2; });
    var min = Math.min.apply(null, totals), max = Math.max.apply(null, totals);
    var best = scenarios[totals.indexOf(min)];
    var ddv = (meta.enfantsNonCommuns && meta.donationEntreEpoux) ? " Donation au dernier vivant prise en compte : malgré un enfant non commun, ces options restent ouvertes au conjoint (art. 1094-1)." : "";
    return "L'option « " + best.name + " » est la plus favorable fiscalement : "
      + "elle minimise le coût total de la succession (" + k(min) + " contre jusqu'à " + k(max) + ")." + ddv;
  }

  function compute(data, paramsIn) {
    var params = withDefaults((paramsIn || (data && data.successionParams)));
    var annee = anneeReference(data, params);
    var liq = liquidation(data, params);
    var lesEnfants = enfants(data);
    var nEnfants = lesEnfants.length;
    var enfantsNonCommuns = lesEnfants.some(function (e) { return e.filiation && e.filiation !== "Enfant du couple"; });
    var donations = (data && Array.isArray(data.donations)) ? data.donations : [];

    var mr = membreParQualite(data, "Monsieur");
    var mme = membreParQualite(data, "Madame");
    var ageM = mr ? ageA(mr.naissance, annee) : 0;
    var ageMme = mme ? ageA(mme.naissance, annee) : 0;
    var labelM = mr ? labelMembre(mr) : "Monsieur", labelMme = mme ? labelMembre(mme) : "Madame";

    // Abattement résiduel par enfant pour un donateur donné : 100 000 € − donations
    // < 15 ans (art. 784), + 159 325 € si l'enfant est handicapé (art. 779 II).
    function abatBasePour(donateurLabel) {
      return lesEnfants.map(function (e) {
        var residuel = Math.max(0, ABATTEMENT_ENFANT - donneAvant15ans(donations, donateurLabel, labelMembre(e), annee));
        return residuel + (e.handicap === "Oui" ? ABATTEMENT_HANDICAP : 0);
      });
    }

    function build(defunt, avecDonation) {
      var estM = defunt === "M";
      var ctx = {
        propreDefunt: estM ? liq.propreMNet : liq.propreMmeNet,
        propreSurvivant: estM ? liq.propreMmeNet : liq.propreMNet,
        communsNet: liq.communsNet,
        ageSurvivant: estM ? ageMme : ageM,
        ageDefunt: estM ? ageM : ageMme,
        nEnfants: nEnfants,
        enfantsNonCommuns: enfantsNonCommuns,
        donationEntreEpoux: params.donationEntreEpoux,
        abat1Base: abatBasePour(estM ? labelM : labelMme),   // donateur = défunt
        abat2Base: abatBasePour(estM ? labelMme : labelM),   // donateur = survivant (2nd décès)
        avecDonation: avecDonation, params: params
      };
      return scenariosPourDeces(ctx);
    }

    var monsieur = build("M", false);
    var madame = build("Mme", false);
    var meta = { enfantsNonCommuns: enfantsNonCommuns, donationEntreEpoux: params.donationEntreEpoux };
    return {
      monsieur: { scenarios: monsieur, observation: observation(monsieur, meta) },
      madame: { scenarios: madame, observation: observation(madame, meta) },
      monsieurDon: { scenarios: build("M", true) },
      madameDon: { scenarios: build("Mme", true) },
      details: {
        annee: annee, ageM: ageM, ageMme: ageMme, nEnfants: nEnfants,
        regime: (mr && mr.regime) || (mme && mme.regime) || "",
        communsNet: liq.communsNet, propreMNet: liq.propreMNet, propreMmeNet: liq.propreMmeNet,
        avTotal: liq.avTotal, assuranceVieHorsSuccession: params.assuranceVieHorsSuccession,
        enfantsNonCommuns: enfantsNonCommuns, donationEntreEpoux: params.donationEntreEpoux
      }
    };
  }

  root.HexaSuccession = {
    compute: compute,
    anneeReference: anneeReference,
    donationsSuivi: donationsSuivi,
    donationCapacite: donationCapacite,
    abattementDonation: abattementDonation,
    baremeLigneDirecte: baremeLigneDirecte,
    nuePropPct: nuePropPct,
    ageExact: ageExact,
    estMajeur: estMajeur,
    reserveGlobale: reserveGlobale,
    quotiteDisponible: quotiteDisponible,
    liquidation: liquidation,
    droitsEnfants: droitsEnfants,
    ABATTEMENT_ENFANT: ABATTEMENT_ENFANT
  };

  // Support Node (tests unitaires) en plus du navigateur.
  if (typeof module !== "undefined" && module.exports) module.exports = root.HexaSuccession;
})();
