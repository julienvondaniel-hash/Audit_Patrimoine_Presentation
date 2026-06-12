/* =============================================================================
 * hexa-print.js — Livret imprimable A4 (portrait) de l'étude patrimoniale
 * -----------------------------------------------------------------------------
 * Génère un document HTML autonome, mis en page pour l'impression A4 PORTRAIT
 * STRICTE (aucun paysage), ouvert dans une nouvelle fenêtre puis envoyé à
 * window.print() — l'utilisateur choisit « Enregistrer en PDF ». N'utilise AUCUNE
 * bibliothèque externe : les schémas sont en HTML/CSS pur (flexbox, gradients,
 * bordures) afin d'être fiables à l'impression. NE modifie PAS la génération
 * PptxGenJS.
 *
 * Les CHIFFRES sont strictement ceux des slides : on appelle les mêmes fonctions
 * de calcul (window.HexaCompute / window.HexaSuccession) — aucune valeur n'est
 * recalculée ici. Toutes les sections sont défensives (gardes sur données
 * manquantes, tableaux par défaut []), de sorte à ne jamais lever d'exception.
 *
 * API publique inchangée : window.HexaPrint.open(data).
 * window.HexaPrint.buildHtml(data) est exposé en plus (rendu pur, testable).
 * ========================================================================== */
(function () {
  "use strict";

  // --- Palette de marque (utilisée dans le CSS et les schémas) ----------------
  var C = {
    petrol: "#005159", petrolDk: "#003b41", petrolLt: "#1b6b7c",
    teal: "#5ba5b8", tealPale: "#d6edf0", gold: "#d4af37", goldDk: "#b8941f",
    ink: "#1f2937", slate: "#334155", slateLt: "#64748b", line: "#e2e8f0",
    mist: "#f7fafa", green: "#1a7a4a", red: "#c0392b"
  };
  // Couleurs de série pour les schémas (donut, barres empilées) — ordre stable.
  var SERIES = [C.petrol, C.gold, C.teal, C.petrolLt, C.goldDk, C.slate, C.green, C.slateLt];

  // --- Échappement HTML pour tout texte issu des données client ---------------
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Tableau garanti (jamais null/undefined).
  function arr(a) { return Array.isArray(a) ? a : []; }
  // Exécute fn et renvoie son résultat, ou null en cas d'erreur
  // (sécurise les appels aux moteurs de calcul sur données partielles).
  function safe(fn) { try { return fn(); } catch (e) { return null; } }

  // ===========================================================================
  // CSS d'impression (charte Hexa, A4 portrait stricte)
  // ===========================================================================
  function printCss() {
    return [
      "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Open+Sans:wght@400;600&display=swap');",
      // A4 PORTRAIT exclusivement. Marges uniformes : aucun élément fixe ne réserve
      // d'espace dans la boîte de marge, donc inutile d'agrandir haut/bas.
      "@page { size: A4 portrait; margin: 15mm 14mm; }",
      "* { box-sizing: border-box; }",
      // Impression des couleurs (fonds pétrole/or, barres, gradients).
      "html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
      "html, body { margin: 0; padding: 0; }",
      "body { font-family: 'Open Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: " + C.ink + "; font-size: 10.5pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
      "h1, h2, h3, h4 { font-family: 'Montserrat', system-ui, sans-serif; margin: 0; }",
      "h1 { color: " + C.petrol + "; font-size: 23pt; font-weight: 800; }",
      "h3 { color: " + C.petrolDk + "; font-size: 11.5pt; font-weight: 700; margin: 14px 0 5px; letter-spacing: .2px; }",
      "h4 { color: " + C.petrol + "; font-size: 10pt; font-weight: 700; margin: 0 0 4px; }",
      "p { margin: 0 0 8px; }",
      "ul { margin: 4px 0 10px; padding-left: 18px; }",
      "li { margin: 0 0 4px; }",
      "small, .note { font-size: 8.5pt; color: " + C.slateLt + "; }",
      ".kicker { font-family: 'Montserrat', sans-serif; font-size: 8.5pt; font-weight: 700; letter-spacing: 2px; color: " + C.goldDk + "; text-transform: uppercase; margin: 0 0 2px; }",
      ".lead { font-size: 11pt; color: " + C.slate + "; margin-bottom: 12px; }",
      ".intro { font-size: 9.8pt; color: " + C.slate + "; margin: 0 0 10px; }",
      ".muted { color: " + C.slateLt + "; }",

      // --- Pages & sauts ------------------------------------------------------
      ".page { page-break-after: always; position: relative; }",
      ".page:last-child { page-break-after: auto; }",
      "h2, h3, h4 { break-after: avoid; }",
      "table, .card, .kpi-row, figure, .schema, .cascade, .legend, .flow-step, .essentiel, .barrow, .av70, .steps, .usage { break-inside: avoid; }",
      // Aucun bloc ne doit dépasser la largeur utile (~182mm en portrait) ni être rogné.
      "table, .card, .schema, .cascade, .kpi-row, .legend, figure { max-width: 100%; }",
      "img, svg { max-width: 100%; }",

      // --- En-tête de section : chip numérotée + titre + filet --------------
      ".sec-head { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; break-after: avoid; }",
      ".sec-num { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 50%; background: " + C.petrol + "; color: #fff; font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 13pt; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 2px " + C.gold + "; }",
      ".sec-head h2 { color: " + C.petrol + "; font-size: 16pt; font-weight: 700; margin: 0; flex: 1 1 auto; border-bottom: 2px solid " + C.gold + "; padding-bottom: 5px; }",
      ".sec-head .kicker { margin: 0 0 1px; }",
      ".sec-head .htxt { flex: 1 1 auto; }",

      // --- Tableaux -----------------------------------------------------------
      // table-layout: fixed + word-wrap : les colonnes ne poussent jamais au-delà
      // de la page, le texte long passe à la ligne plutôt que de déborder.
      "table { width: 100%; max-width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-size: 9.6pt; table-layout: fixed; }",
      "th, td { border: 1px solid " + C.line + "; padding: 5px 8px; text-align: left; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }",
      "thead th { background: " + C.petrol + "; color: #fff; font-family: 'Montserrat', sans-serif; font-weight: 600; font-size: 9pt; }",
      "tbody tr:nth-child(even) { background: " + C.mist + "; }",
      "td.num, th.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }",
      "tr.totes td { font-weight: 700; background: #fbf3dc; color: " + C.goldDk + "; border-top: 2px solid " + C.gold + "; }",
      "table.compact { font-size: 8.8pt; }",
      "table.compact th, table.compact td { padding: 3px 6px; }",

      // --- Cartes / encadrés --------------------------------------------------
      ".card { border: 1px solid " + C.line + "; background: " + C.mist + "; border-radius: 8px; padding: 11px 13px; margin: 0 0 10px; }",
      ".card h3 { margin-top: 0; }",
      ".card.warn { background: #fbeae8; border-color: #e7c3bd; }",
      ".card.gold { background: #fbf3dc; border-color: #e6d39a; }",
      ".card.petrol { background: " + C.petrol + "; border-color: " + C.petrolDk + "; color: #fff; }",
      ".card.petrol h3, .card.petrol h4 { color: #fff; }",
      ".cols2 { display: flex; gap: 16px; }",
      ".cols2 > div { flex: 1 1 0; min-width: 0; }",
      ".pill { display: inline-block; border-radius: 10px; padding: 1px 9px; font-size: 8pt; font-weight: 700; font-family: 'Montserrat', sans-serif; color: #fff; }",
      ".pill.eleve { background: " + C.red + "; }",
      ".pill.moyen { background: " + C.goldDk + "; }",
      ".pill.modere { background: " + C.petrolLt + "; }",
      ".foot-note { margin-top: 14px; padding-top: 8px; border-top: 1px solid " + C.line + "; font-size: 8.5pt; color: " + C.slateLt + "; }",

      // --- KPI tiles ----------------------------------------------------------
      ".kpi-row { display: flex; gap: 8px; margin: 4px 0 14px; flex-wrap: wrap; }",
      ".kpi { flex: 1 1 0; min-width: 92px; background: " + C.petrol + "; color: #fff; border-radius: 8px; padding: 10px 10px 9px; text-align: center; box-shadow: inset 0 -3px 0 " + C.gold + "; }",
      ".kpi.gold { background: " + C.gold + "; color: " + C.petrolDk + "; box-shadow: inset 0 -3px 0 " + C.goldDk + "; }",
      ".kpi.gold .l { color: " + C.petrolDk + "; }",
      ".kpi .v { font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 15pt; line-height: 1.05; }",
      ".kpi .l { font-size: 7.3pt; letter-spacing: .4px; text-transform: uppercase; color: " + C.tealPale + "; margin-top: 4px; line-height: 1.2; }",

      // --- Schémas : donut (conic-gradient) ----------------------------------
      ".schema { margin: 6px 0 14px; }",
      ".donut-wrap { display: flex; gap: 18px; align-items: center; }",
      ".donut { flex: 0 0 auto; width: 132px; height: 132px; border-radius: 50%; position: relative; }",
      ".donut::after { content: ''; position: absolute; inset: 30px; background: #fff; border-radius: 50%; box-shadow: inset 0 0 0 1px " + C.line + "; }",
      ".donut .center { position: absolute; inset: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; z-index: 1; }",
      ".donut .center .big { font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 12pt; color: " + C.petrol + "; line-height: 1.05; }",
      ".donut .center .lbl { font-size: 6.8pt; text-transform: uppercase; letter-spacing: .4px; color: " + C.slateLt + "; margin-top: 2px; }",

      // --- Schémas : légendes & barres ---------------------------------------
      ".legend { flex: 1 1 auto; min-width: 0; font-size: 9pt; }",
      ".legend .li { display: flex; align-items: center; gap: 7px; margin: 0 0 4px; }",
      ".legend .sw { flex: 0 0 auto; width: 11px; height: 11px; border-radius: 3px; }",
      ".legend .nm { flex: 1 1 auto; min-width: 0; }",
      ".legend .vl { flex: 0 0 auto; font-variant-numeric: tabular-nums; font-weight: 600; color: " + C.slate + "; }",
      ".legend .pc { flex: 0 0 auto; width: 46px; text-align: right; color: " + C.slateLt + "; font-variant-numeric: tabular-nums; }",

      ".barrow { display: flex; align-items: center; gap: 9px; margin: 0 0 7px; }",
      ".barrow .cap { flex: 0 0 96px; font-size: 9pt; font-weight: 600; color: " + C.slate + "; }",
      ".barrow .track { flex: 1 1 auto; height: 18px; background: " + C.mist + "; border-radius: 5px; box-shadow: inset 0 0 0 1px " + C.line + "; overflow: hidden; }",
      ".barrow .fill { height: 100%; border-radius: 5px 0 0 5px; }",
      ".barrow .amt { flex: 0 0 auto; font-size: 9pt; font-variant-numeric: tabular-nums; font-weight: 700; color: " + C.petrolDk + "; min-width: 78px; text-align: right; }",

      // --- Schéma : réserve / quotité disponible -----------------------------
      ".rq-bar { display: flex; width: 100%; height: 30px; border-radius: 6px; overflow: hidden; box-shadow: inset 0 0 0 1px " + C.line + "; margin: 8px 0 6px; font-family: 'Montserrat', sans-serif; }",
      ".rq-bar .seg { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 9pt; font-weight: 700; }",
      ".rq-bar .reserve { background: " + C.petrol + "; }",
      ".rq-bar .quotite { background: " + C.gold + "; color: " + C.petrolDk + "; }",

      // --- Schéma : cascade (flux Arbitrage → Donations → Réinvest → Reste) ---
      // 4 blocs + 3 flèches tiennent dans la largeur portrait (~182mm) : les blocs
      // partagent l'espace (flex:1 1 0; min-width:0) et les flèches peuvent rétrécir.
      ".cascade { display: flex; align-items: stretch; gap: 0; margin: 10px 0 6px; flex-wrap: nowrap; max-width: 100%; width: 100%; }",
      ".flow-step { flex: 1 1 0; min-width: 0; border-radius: 8px; padding: 8px 5px; text-align: center; color: #fff; position: relative; overflow: hidden; }",
      ".flow-step .fl { font-size: 6.8pt; letter-spacing: .3px; text-transform: uppercase; opacity: .92; }",
      ".flow-step .fv { font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 11pt; margin-top: 3px; line-height: 1.05; word-break: break-word; }",
      ".flow-step .fs { font-size: 7pt; opacity: .9; margin-top: 2px; }",
      ".flow-arrow { flex: 0 1 18px; min-width: 10px; display: flex; align-items: center; justify-content: center; color: " + C.goldDk + "; font-size: 13pt; font-weight: 800; }",

      // --- Solutions & contenants : pédagogie + schémas dédiés ---------------
      // Carte « contenant » (remplace l'ancien .card pour les enveloppes).
      ".essentiel { border: 1px solid " + C.line + "; background: " + C.mist + "; border-radius: 8px; padding: 11px 13px; margin: 0 0 12px; }",
      ".essentiel > h3 { margin-top: 0; display: flex; align-items: center; gap: 8px; }",
      ".essentiel > h3 .tag { flex: 0 0 auto; font-family: 'Montserrat', sans-serif; font-size: 7pt; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #fff; background: " + C.gold + "; color: " + C.petrolDk + "; border-radius: 9px; padding: 1px 8px; }",
      // Ligne « À quoi ça sert / Pour qui » en tête de chaque contenant.
      ".usage { display: flex; gap: 8px; margin: 0 0 8px; }",
      ".usage .chip { flex: 1 1 0; min-width: 0; background: #fff; border: 1px solid " + C.line + "; border-left: 3px solid " + C.teal + "; border-radius: 6px; padding: 5px 8px; font-size: 8.6pt; line-height: 1.3; }",
      ".usage .chip b { display: block; font-family: 'Montserrat', sans-serif; font-size: 7pt; letter-spacing: .5px; text-transform: uppercase; color: " + C.petrol + "; margin-bottom: 1px; }",
      ".usage .chip.qui { border-left-color: " + C.gold + "; }",

      // Matrice de synthèse « Quel contenant pour quel objectif ? ».
      "table.matrix { font-size: 8.4pt; table-layout: fixed; }",
      "table.matrix th, table.matrix td { padding: 4px 5px; text-align: center; }",
      "table.matrix thead th { font-size: 7.6pt; line-height: 1.15; }",
      "table.matrix th.obj { text-align: left; background: " + C.petrolDk + "; width: 26%; }",
      "table.matrix td.obj { text-align: left; font-weight: 600; color: " + C.petrolDk + "; background: " + C.mist + "; }",
      "table.matrix td .yes { color: " + C.green + "; font-weight: 800; font-size: 10pt; }",
      "table.matrix td .may { color: " + C.goldDk + "; font-weight: 700; }",
      "table.matrix td .no { color: " + C.line + "; }",

      // Schéma Assurance-vie : deux mini-cartes avant / après 70 ans.
      ".av70 { display: flex; gap: 10px; margin: 6px 0 4px; align-items: stretch; }",
      ".av70 .seg70 { flex: 1 1 0; min-width: 0; border-radius: 8px; padding: 9px 11px; color: #fff; }",
      ".av70 .seg70.avant { background: " + C.petrol + "; }",
      ".av70 .seg70.apres { background: " + C.petrolLt + "; }",
      ".av70 .seg70 .hd { font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 8.4pt; letter-spacing: .3px; text-transform: uppercase; }",
      ".av70 .seg70 .art { font-size: 7.4pt; opacity: .92; margin-top: 1px; }",
      ".av70 .seg70 .ab { font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 15pt; margin: 5px 0 1px; line-height: 1.05; }",
      ".av70 .seg70 .abn { font-size: 7.6pt; opacity: .95; }",
      ".av70 .seg70 .br { font-size: 7.6pt; opacity: .92; margin-top: 5px; border-top: 1px solid rgba(255,255,255,.3); padding-top: 4px; }",

      // Schéma générique « étapes » (PER : versement → capitalisation → sortie ;
      // PEA : timeline < 5 ans / ≥ 5 ans). Variante claire de .cascade.
      ".steps { display: flex; align-items: stretch; gap: 0; margin: 6px 0 4px; max-width: 100%; }",
      ".steps .stp { flex: 1 1 0; min-width: 0; background: #fff; border: 1px solid " + C.line + "; border-top: 3px solid " + C.petrol + "; border-radius: 7px; padding: 7px 8px; text-align: center; }",
      ".steps .stp.gold { border-top-color: " + C.gold + "; }",
      ".steps .stp.teal { border-top-color: " + C.teal + "; }",
      ".steps .stp .sl { font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 8.4pt; color: " + C.petrolDk + "; }",
      ".steps .stp .sd { font-size: 7.6pt; color: " + C.slate + "; margin-top: 2px; line-height: 1.28; }",
      ".steps .sarr { flex: 0 1 16px; min-width: 9px; display: flex; align-items: center; justify-content: center; color: " + C.goldDk + "; font-size: 12pt; font-weight: 800; }",
      ".schema-cap { font-size: 8pt; color: " + C.slateLt + "; margin: 2px 0 0; }",

      // --- Couverture ---------------------------------------------------------
      ".cover { page-break-after: always; position: relative; overflow: hidden; min-height: 264mm; display: flex; flex-direction: column; }",
      ".cover-bg { position: absolute; inset: -16mm; background: " + C.petrol + "; background-image: radial-gradient(circle at 88% 9%, rgba(212,175,55,.18) 0 80px, transparent 81px), radial-gradient(circle at 98% 24%, rgba(255,255,255,.05) 0 150px, transparent 151px), radial-gradient(circle at 3% 97%, rgba(91,165,184,.18) 0 175px, transparent 176px); z-index: 0; }",
      ".cover-inner { position: relative; z-index: 1; color: #fff; padding-top: 40mm; flex: 1 1 auto; }",
      ".cover .kicker { color: " + C.gold + "; font-size: 10pt; letter-spacing: 3px; }",
      ".cover h1 { color: #fff; font-size: 34pt; line-height: 1.1; margin: 0; max-width: 155mm; }",
      ".cover-rule { height: 5px; width: 120px; background: " + C.gold + "; border: 0; margin: 22px 0; }",
      ".cover-client { font-family: 'Montserrat', sans-serif; font-size: 20pt; font-weight: 600; color: " + C.tealPale + "; }",
      ".cover-meta { font-size: 11pt; color: #bfe0e5; margin-top: 10px; letter-spacing: .4px; }",
      ".cover-advisor { position: relative; z-index: 1; color: #d6edf0; font-size: 9.5pt; line-height: 1.6; max-width: 155mm; padding-bottom: 2mm; }",
      ".cover-advisor strong { color: #fff; }",
      ".cover-advisor .conf { display: block; margin-top: 10px; font-size: 8pt; color: #9fc7cd; border-top: 1px solid rgba(255,255,255,.25); padding-top: 8px; }",

      // --- Sommaire -----------------------------------------------------------
      ".toc { font-size: 11pt; list-style: none; padding-left: 0; }",
      ".toc li { margin: 0 0 8px; padding-left: 38px; position: relative; color: " + C.slate + "; }",
      ".toc li .n { position: absolute; left: 0; top: -1px; width: 26px; height: 26px; border-radius: 50%; background: " + C.mist + "; border: 1px solid " + C.line + "; color: " + C.petrol + "; font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 9.5pt; display: flex; align-items: center; justify-content: center; }",
      ".toc li strong { font-family: 'Montserrat', sans-serif; color: " + C.petrolDk + "; font-weight: 600; }",

      // --- En-tête / pied courants : SUPPRIMÉS ------------------------------
      // En impression PDF (Chrome), un en-tête/pied positionné en superposition ne
      // réserve PAS d'espace dans la boîte de marge @page : le contenu multi-pages
      // passait SOUS lui → chevauchements. La couverture et les en-têtes de section
      // numérotés portent déjà l'identité du document ; on ne simule pas de numéros
      // de page.

      // --- Aperçu écran (pages cartonnées + bouton) --------------------------
      "@media screen {",
      "  body { background: #eef3f4; }",
      "  .page, .cover { background: #fff; max-width: 210mm; margin: 8mm auto; padding: 18mm 14mm 14mm; box-shadow: 0 2px 14px rgba(0,0,0,.14); }",
      "  .cover { padding: 0 14mm; }",
      // Bouton d'impression : `sticky` (écran uniquement) — reste visible au défilement
      // sans recourir à un positionnement superposé, et n'affecte jamais l'impression.
      "  .noprint { position: sticky; float: right; top: 14px; right: 14px; margin: 0 14px 0 0; z-index: 9; }",
      "  .noprint button { font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 13px; color: #fff; background: " + C.petrol + "; border: 0; border-bottom: 3px solid " + C.gold + "; border-radius: 8px; padding: 10px 16px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.2); }",
      "}"
    ].join("\n");
  }

  // ===========================================================================
  // Petits constructeurs de fragments HTML
  // ===========================================================================
  // En-tête de section : chip numérotée + kicker + titre H2 souligné.
  function head(num, kicker, title) {
    var chip = num != null ? '<div class="sec-num">' + esc(num) + "</div>" : "";
    return '<div class="sec-head">' + chip + '<div class="htxt">'
      + (kicker ? '<p class="kicker">' + esc(kicker) + "</p>" : "")
      + "<h2>" + title + "</h2></div></div>";
  }
  // Liste à puces à partir d'un tableau de chaînes.
  function ul(items) {
    items = arr(items);
    if (!items.length) return "";
    return "<ul>" + items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  }
  // Liste « titre — détail ». Accepte .detail OU .body (formats HEXA_EDU).
  function ulTitled(items) {
    items = arr(items);
    if (!items.length) return "";
    return "<ul>" + items.map(function (o) {
      if (o == null) return "";
      if (typeof o === "string") return "<li>" + esc(o) + "</li>";
      var d = o.detail != null ? o.detail : o.body;
      return "<li><strong>" + esc(o.title) + "</strong>" + (d ? " — " + esc(d) : "") + "</li>";
    }).join("") + "</ul>";
  }
  // Blocs KPI.
  function kpi(value, label, gold) {
    return '<div class="kpi' + (gold ? " gold" : "") + '"><div class="v">' + esc(value) + '</div><div class="l">' + esc(label) + "</div></div>";
  }
  function kpiRow(kpis) { return '<div class="kpi-row">' + kpis.join("") + "</div>"; }
  // Tableau : en-têtes + lignes. Chaque cellule = { v, num, cls } ou chaîne.
  // numCols : indices (0-based) des colonnes à aligner à droite. extraCls sur <table>.
  function table(headers, rows, numCols, extraCls) {
    numCols = numCols || [];
    function isNum(i) { return numCols.indexOf(i) >= 0; }
    var thead = "<thead><tr>" + arr(headers).map(function (h, i) {
      return '<th' + (isNum(i) ? ' class="num"' : "") + ">" + esc(h) + "</th>";
    }).join("") + "</tr></thead>";
    var tbody = "<tbody>" + arr(rows).map(function (r) {
      var cls = r && r._tote ? ' class="totes"' : "";
      var cells = arr(r && r.cells ? r.cells : r);
      return "<tr" + cls + ">" + cells.map(function (c, i) {
        var num = isNum(i) || (c && typeof c === "object" && c.num);
        var val = (c && typeof c === "object") ? c.v : c;
        return "<td" + (num ? ' class="num"' : "") + ">" + esc(val) + "</td>";
      }).join("") + "</tr>";
    }).join("") + "</tbody>";
    return "<table" + (extraCls ? ' class="' + extraCls + '"' : "") + ">" + thead + tbody + "</table>";
  }
  // Ligne pédagogique « À quoi ça sert » / « Pour qui » en tête d'un contenant.
  function usageLine(sert, qui) {
    if (!sert && !qui) return "";
    var html = '<div class="usage">';
    if (sert) html += '<div class="chip"><b>À quoi ça sert</b>' + esc(sert) + "</div>";
    if (qui) html += '<div class="chip qui"><b>Pour qui</b>' + esc(qui) + "</div>";
    return html + "</div>";
  }
  // Encadré « l'essentiel » d'un contenant (solutions).
  // fonctionnement / fiscalite : tableaux d'objets {title, body|detail} ou chaînes.
  // opts (optionnel) : { tag, sert, qui, schema } pour la pédagogie + schémas.
  function essentiel(titre, fonctionnement, fiscalite, banner, opts) {
    opts = opts || {};
    var tag = opts.tag ? ' <span class="tag">' + esc(opts.tag) + "</span>" : "";
    var html = '<div class="essentiel"><h3>' + esc(titre) + tag + "</h3>";
    html += usageLine(opts.sert, opts.qui);
    html += '<div class="cols2">';
    html += "<div><h4>Fonctionnement</h4>" + ulTitled(arr(fonctionnement).slice(0, 4)) + "</div>";
    html += "<div><h4>Fiscalité &amp; atouts</h4>" + ulTitled(arr(fiscalite).slice(0, 4)) + "</div>";
    html += "</div>";
    if (opts.schema) html += opts.schema;
    if (banner) html += '<p class="note"><strong>' + esc(banner) + "</strong></p>";
    html += "</div>";
    return html;
  }

  // ===========================================================================
  // Constructeurs de SCHÉMAS (HTML/CSS pur, imprimables, portrait)
  // ===========================================================================
  // Donut conic-gradient + légende. parts = [{name, value}]. fmtVal/fmtPct formatteurs.
  function donut(parts, total, centerLabel, fmtVal, fmtPct) {
    parts = arr(parts).filter(function (p) { return p && p.value > 0; });
    if (!parts.length || !(total > 0)) return "";
    var acc = 0, stops = [], legend = [];
    parts.forEach(function (p, i) {
      var col = SERIES[i % SERIES.length];
      var from = acc / total * 360, to = (acc + p.value) / total * 360;
      acc += p.value;
      stops.push(col + " " + from.toFixed(2) + "deg " + to.toFixed(2) + "deg");
      var pct = p.value / total * 100;
      legend.push('<div class="li"><span class="sw" style="background:' + col + '"></span>'
        + '<span class="nm">' + esc(p.name) + '</span>'
        + '<span class="vl">' + esc(fmtVal(p.value)) + '</span>'
        + '<span class="pc">' + esc(fmtPct(pct)) + "</span></div>");
    });
    var center = centerLabel
      ? '<div class="center"><div class="big">' + esc(centerLabel.big) + '</div><div class="lbl">' + esc(centerLabel.lbl) + "</div></div>"
      : "";
    return '<div class="schema"><div class="donut-wrap">'
      + '<div class="donut" style="background:conic-gradient(' + stops.join(",") + ')">' + center + "</div>"
      + '<div class="legend">' + legend.join("") + "</div></div></div>";
  }

  // Barre horizontale proportionnelle unique (légende caption + montant).
  function barRow(caption, value, max, color, fmtVal) {
    var pct = max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
    return '<div class="barrow"><span class="cap">' + esc(caption) + "</span>"
      + '<span class="track"><span class="fill" style="width:' + pct.toFixed(1) + "%;background:" + color + '"></span></span>'
      + '<span class="amt">' + esc(fmtVal(value)) + "</span></div>";
  }

  // Barre empilée réserve/quotité (fractions 0-1).
  function reserveQuotiteBar(reservePct, quotitePct, fracRes, fracQd) {
    return '<div class="schema"><div class="rq-bar">'
      + '<span class="seg reserve" style="width:' + (reservePct * 100).toFixed(1) + '%">Réserve ' + esc(fracRes) + "</span>"
      + '<span class="seg quotite" style="width:' + (quotitePct * 100).toFixed(1) + '%">Quotité ' + esc(fracQd) + "</span>"
      + "</div></div>";
  }

  // Cascade de flux : steps = [{label, value, sub, color}]. Reliés par « → ».
  function cascade(steps, fmtVal) {
    steps = arr(steps);
    if (!steps.length) return "";
    var parts = [];
    steps.forEach(function (s, i) {
      if (i > 0) parts.push('<div class="flow-arrow">&rarr;</div>');
      parts.push('<div class="flow-step" style="background:' + (s.color || C.petrol) + '">'
        + '<div class="fl">' + esc(s.label) + "</div>"
        + '<div class="fv">' + esc(fmtVal(s.value)) + "</div>"
        + (s.sub ? '<div class="fs">' + esc(s.sub) + "</div>" : "")
        + "</div>");
    });
    return '<div class="cascade">' + parts.join("") + "</div>";
  }

  // Suite d'étapes pédagogiques (PER, PEA…) : steps = [{ label, desc, accent }].
  // accent : "" (pétrole), "gold", "teal". Reliées par « → ».
  function stepsFlow(steps) {
    steps = arr(steps);
    if (!steps.length) return "";
    var parts = [];
    steps.forEach(function (s, i) {
      if (i > 0) parts.push('<div class="sarr">&rarr;</div>');
      parts.push('<div class="stp' + (s.accent ? " " + s.accent : "") + '">'
        + '<div class="sl">' + esc(s.label) + "</div>"
        + (s.desc ? '<div class="sd">' + esc(s.desc) + "</div>" : "")
        + "</div>");
    });
    return '<div class="steps">' + parts.join("") + "</div>";
  }

  // Schéma Assurance-vie : transmission avant / après 70 ans (deux mini-cartes).
  // avant / apres : objets HEXA_EDU { article, abattement, abattementNote, bareme }.
  function avSplit70(avant, apres) {
    function seg(cls, titre, o) {
      o = o || {};
      return '<div class="seg70 ' + cls + '">'
        + '<div class="hd">' + esc(titre) + "</div>"
        + (o.article ? '<div class="art">' + esc(o.article) + "</div>" : "")
        + '<div class="ab">' + esc(o.abattement || "") + "</div>"
        + (o.abattementNote ? '<div class="abn">' + esc(o.abattementNote) + "</div>" : "")
        + (o.bareme ? '<div class="br">' + esc(o.bareme) + "</div>" : "")
        + "</div>";
    }
    return '<div class="schema"><div class="av70">'
      + seg("avant", "Primes versées avant 70 ans", avant)
      + seg("apres", "Primes versées après 70 ans", apres)
      + "</div>"
      + '<p class="schema-cap">La fiscalité de transmission dépend de l\'âge de l\'assuré au moment des versements.</p>'
      + "</div>";
  }

  // ===========================================================================
  // buildHtml(data) — rendu pur (renvoie une chaîne HTML complète, testable)
  // ===========================================================================
  function buildHtml(data) {
    data = data || {};
    var K = window.HexaCompute, S = window.HexaSuccession;

    // Formatteurs : on délègue à HexaCompute si présent, sinon repli minimal.
    var fEur = (K && K.formatEur) ? K.formatEur : function (n) { return String(n) + " €"; };
    var fPctV = (K && K.formatPctVal) ? K.formatPctVal : function (p) { return p + " %"; };
    var fMln = (K && K.formatMillions) ? K.formatMillions : function (n) { return n + " €"; };
    var fDate = (K && K.formatDateFR) ? K.formatDateFR : function (s) { return s || "—"; };
    var pNum = (K && K.parseNum) ? K.parseNum : function (v) { var n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; };
    // Total d'un scénario successoral (d1/d2 pouvant être nombres ou « 156 045 € »).
    var scTot = (K && K.scenarioTotal) ? K.scenarioTotal : function (sc) { return pNum(sc && sc.d1) + pNum(sc && sc.d2); };
    // Fraction lisible (1/2, 2/3, 3/4, 1/3, 1/4…).
    function frac(x) {
      if (x === 0.5) return "1/2";
      if (Math.abs(x - 2 / 3) < 1e-6) return "2/3";
      if (Math.abs(x - 1 / 3) < 1e-6) return "1/3";
      if (x === 0.75) return "3/4";
      if (x === 0.25) return "1/4";
      if (x === 1) return "100 %";
      return Math.round(x * 100) + " %";
    }

    var doc = data.doc || {};
    var modules = data.modules || {};
    var EDU = window.HEXA_EDU || {};
    function modOn(id) { return modules[id] !== false; } // absent => actif (comme l'aperçu du plan)

    var pages = [];

    // ---- 1) Couverture ----------------------------------------------------
    (function () {
      var advisorBits = [];
      if (doc.advisorName) advisorBits.push("<strong>" + esc(doc.advisorName) + "</strong>");
      if (doc.advisorFirm) advisorBits.push(esc(doc.advisorFirm));
      var contact = [];
      if (doc.advisorEmail) contact.push(esc(doc.advisorEmail));
      if (doc.advisorPhone) contact.push(esc(doc.advisorPhone));
      if (doc.advisorOrias) contact.push("Orias " + esc(doc.advisorOrias));
      var extra = [];
      if (doc.advisorMembership) extra.push(esc(doc.advisorMembership));
      if (doc.advisorCPI) extra.push(esc(doc.advisorCPI));
      var html = '<section class="cover">'
        + '<div class="cover-bg"></div>'
        + '<div class="cover-inner">'
        + "<h1>" + esc(doc.title || "Étude patrimoniale") + "</h1>"
        + '<hr class="cover-rule">'
        + '<div class="cover-client">' + esc(doc.client || "") + "</div>"
        + '<div class="cover-meta">' + esc(doc.location || "") + (doc.location && doc.date ? " · " : "") + esc(doc.date || "") + "</div>"
        + "</div>"
        + '<div class="cover-advisor">'
        + (advisorBits.length ? "<p>" + advisorBits.join(" — ") + "</p>" : "")
        + (contact.length ? "<p>" + contact.join(" · ") + "</p>" : "")
        + (extra.length ? "<p>" + extra.join("<br>") + "</p>" : "")
        + '<span class="conf">Document confidentiel — © Propriété exclusive de Seine Gestion Privée. Étude personnalisée ne se substituant pas à une consultation juridique ou fiscale.</span>'
        + "</div>"
        + "</section>";
      pages.push(html);
    })();

    // ---- 2) Sommaire ------------------------------------------------------
    (function () {
      var items = ["Synthèse exécutive", "Composition du foyer", "Patrimoine", "Analyse budgétaire", "Diagnostic & risques"];
      if (data.succession) items.push("Audit successoral");
      items.push("Objectifs", "Préconisations");
      var hasSolutions = ["per", "assuranceVie", "assuranceVieLux", "scpi", "pea", "peapme", "fcpr", "sciIs"].some(modOn);
      if (hasSolutions) items.push("Solutions & contenants");
      items.push("Plan d'action", "Mentions & avertissements");
      pages.push('<section class="page">' + head(null, "Sommaire", "Table des matières")
        + '<p class="intro">Le présent livret reprend, à l\'identique des chiffres de l\'étude, l\'analyse de votre situation patrimoniale, le diagnostic, les préconisations et le plan d\'action chiffré.</p>'
        + '<ol class="toc">' + items.map(function (t, i) {
          return '<li><span class="n">' + (i + 1) + "</span><strong>" + esc(t) + "</strong></li>";
        }).join("") + "</ol></section>");
    })();

    // ---- 3) Synthèse exécutive -------------------------------------------
    (function () {
      var syn = data.synthese || {};
      var bullet = (K && K.patrimoineBullet) ? safe(function () { return K.patrimoineBullet(data); }) : "";
      // Indicateurs d'analyse : périmètre COUPLE (les actifs des enfants en sont exclus).
      var t = (K && K.assetTotals) ? safe(function () { return K.assetTotals(data.actif || {}, data); }) : null;
      var bt = (K && K.budgetTotals) ? safe(function () { return K.budgetTotals(data.budget || {}); }) : null;
      var fi = (K && K.ifi) ? safe(function () { return K.ifi(data); }) : null;
      var capa = (S && S.donationCapacite) ? safe(function () { return S.donationCapacite(data); }) : null;
      var capaTot = 0;
      if (capa) arr(capa.parents).forEach(function (p) { capaTot += pNum(p.totalDisponible); });

      var html = '<section class="page">' + head("0", "Section liminaire", "Synthèse exécutive");
      // Bandeau « données manquantes » : saisies absentes qui faussent les chiffres.
      var manque = (K && K.donneesManquantes) ? safe(function () { return K.donneesManquantes(data); }) : null;
      if (manque && manque.length) {
        html += '<div class="card warn"><strong>⚠ Données à compléter — chiffres impactés :</strong><ul>'
          + manque.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul></div>";
      }
      if (bullet) html += '<p class="lead">' + esc(bullet) + ".</p>";

      // KPI de tête de synthèse
      var tiles = [];
      if (t) tiles.push(kpi(fMln(t.net), "Actif net"));
      if (t) tiles.push(kpi(fPctV(t.partImmoPct), "Part immobilière"));
      if (fi) tiles.push(kpi(fi.assujetti ? fEur(fi.montant) : "Néant", "IFI estimé"));
      // Gain phare : IFI cible une fois la stratégie d'arbitrage exécutée.
      var ipaSyn = (K && K.ifiPostArbitrage) ? safe(function () { return K.ifiPostArbitrage(data); }) : null;
      if (ipaSyn && ipaSyn.gain > 0) tiles.push(kpi(fEur(ipaSyn.apres.montant), "IFI après arbitrage", true));
      if (bt) tiles.push(kpi(fEur(bt.disponible), "Capacité d'épargne / an"));
      if (capaTot > 0) tiles.push(kpi(fEur(capaTot), "Donation en franchise", true));
      if (tiles.length) html += kpiRow(tiles);

      html += "<h3>Diagnostic en bref</h3>" + ul(syn.diagnostic);
      var recs = arr(syn.recommandations);
      if (recs.length) html += "<h3>Recommandations stratégiques</h3>" + ulTitled(recs);
      html += "</section>";
      pages.push(html);
    })();

    // ---- 4) Composition du foyer -----------------------------------------
    (function () {
      var membres = arr(data.foyer && data.foyer.membres);
      var rows = membres.map(function (m) {
        var act = [m.activitePro, m.statut, m.contrat].filter(Boolean).join(" · ");
        return [
          ((m.qualite || "") + (m.prenom ? " " + m.prenom : "")).trim(),
          fDate(m.naissance),
          act || "—",
          ((K && K.statutFiscalAffiche) ? K.statutFiscalAffiche(m) : (m.statutFiscal || "")) || "—",
          m.capacite || "—"
        ];
      });
      var html = '<section class="page">' + head("1", "Découverte", "Composition du foyer");
      html += '<p class="intro">Identification des membres du foyer fiscal, de leur situation et de leur capacité juridique — base de l\'analyse civile et successorale.</p>';
      if (rows.length) html += table(["Qualité / Prénom", "Naissance", "Activité", "Statut fiscal", "Capacité"], rows);
      else html += "<p>Aucun membre du foyer renseigné.</p>";
      // Régime matrimonial (premier membre le portant).
      var regime = membres.map(function (m) { return m.regime; }).filter(Boolean)[0];
      if (regime) html += "<p><strong>Régime matrimonial :</strong> " + esc(regime) + ".</p>";
      if (data.foyer && data.foyer.activite) html += "<p><strong>Activité &amp; revenus :</strong> " + esc(data.foyer.activite) + "</p>";
      if (data.foyerNote) html += '<p class="note">' + esc(data.foyerNote) + "</p>";
      html += "</section>";
      pages.push(html);
    })();

    // ---- 5) Patrimoine ----------------------------------------------------
    (function () {
      var actif = data.actif || {};
      var immo = arr(actif.immobilier), autres = arr(actif.autres), passifs = arr(actif.passifs);
      // Agrégats sur le périmètre COUPLE (une seule part immobilière dans tout le
      // document) ; l'inventaire ci-dessous liste néanmoins tous les détenteurs.
      var t = (K && K.assetTotals) ? K.assetTotals(actif, data) : { brut: 0, passif: 0, net: 0, immo: 0, partImmoPct: 0 };
      var vFisc = (K && K.valeurFiscale) ? K.valeurFiscale : function (a) { return pNum(a && a.valeur); };
      var fi = (K && K.ifi) ? safe(function () { return K.ifi(data); }) : null;
      function crdFor(desig) { var c = 0; if (desig) passifs.forEach(function (p) { if ((p.rattachement || "") === desig) c += pNum(p.crd); }); return c; }
      var npAssets = immo.concat(autres).filter(function (a) { return a.droit === "NP"; });
      var hasNP = npAssets.length > 0;

      var html = '<section class="page">' + head("2", "Découverte", "Patrimoine");
      html += '<p class="intro">Inventaire valorisé de l\'actif (immobilier et financier) et du passif. Les biens en nue-propriété sont retenus selon le barème de l\'article 669 du CGI.</p>';
      // Pont des agrégats : actif brut total (inventaire) → actifs des enfants
      // exclus → actif brut du couple (assiette IFI / succession).
      var brutTotal = (K && K.assetTotals) ? safe(function () { return K.assetTotals(actif).brut; }) : 0;
      var partEnf = brutTotal ? safe(function () { return brutTotal - K.assetTotals(actif, data).brut; }) : 0;
      if (partEnf > 0) html += '<p class="note"><strong>Pont des agrégats :</strong> actif brut total (tous détenteurs) ' + esc(fEur(brutTotal))
        + ' − actifs détenus par les enfants ' + esc(fEur(partEnf))
        + ' = <strong>actif brut du couple ' + esc(fEur(brutTotal - partEnf)) + '</strong> (assiette IFI et masse successorale — les biens des enfants restent listés à l\'inventaire ci-dessous).</p>';

      // KPI synthèse + IFI estimé
      var tiles = [
        kpi(fEur(t.brut), "Actif brut"),
        kpi(fEur(t.passif), "Passif (CRD)"),
        kpi(fEur(t.net), "Actif net"),
        kpi(fPctV(t.partImmoPct), "Part immobilière")
      ];
      if (fi) tiles.push(kpi(fi.assujetti ? fEur(fi.montant) : "Néant", "IFI estimé", true));
      html += kpiRow(tiles);

      // SCHÉMA 1 : répartition du patrimoine par catégorie d'actif (donut).
      var abh = (K && K.assetByHolderType) ? safe(function () { return K.assetByHolderType(actif); }) : null;
      if (abh && arr(abh.categories).length) {
        var byCat = {};
        arr(abh.categories).forEach(function (c) { byCat[c] = 0; });
        var holders = abh.matrix || {};
        Object.keys(holders).forEach(function (h) {
          var row = holders[h] || {};
          Object.keys(row).forEach(function (c) { byCat[c] = (byCat[c] || 0) + pNum(row[c]); });
        });
        var parts = arr(abh.categories).map(function (c) { return { name: c, value: byCat[c] || 0 }; })
          .filter(function (p) { return p.value > 0; });
        var totCat = parts.reduce(function (s, p) { return s + p.value; }, 0);
        if (parts.length && totCat > 0) {
          html += "<h3>Répartition de l'actif brut par catégorie</h3>";
          html += donut(parts, totCat, { big: fMln(totCat), lbl: "Actif brut" }, fEur, fPctV);
        }
      }

      // Immobilier
      if (immo.length) {
        html += "<h3>Patrimoine immobilier</h3>";
        var immoTotNet = 0, immoTotCrd = 0;
        var immoRows = immo.map(function (a) {
          var net = vFisc(a), crd = crdFor(a.designation);
          immoTotNet += net; immoTotCrd += crd;
          var droit = a.droit === "NP" && a.ageUsufruitier ? "NP (usuf. " + esc(a.ageUsufruitier) + " ans)" : (a.droit || "PP");
          return { cells: [
            a.designation || "—", a.classe || a.type || "—",
            { v: fEur(net), num: true },
            { v: fEur(crd), num: true },
            fDate(a.dateAcquisition), a.proprietaire || "—", droit
          ] };
        });
        immoRows.push({ _tote: true, cells: ["Sous-total immobilier", "", fEur(immoTotNet), fEur(immoTotCrd), "", "", ""] });
        html += table(["Désignation", "Classe", "Valeur nette", "Encours (CRD)", "Acquisition", "Propriétaire", "Droit"], immoRows, [2, 3], "compact");
      }

      // Autres actifs
      if (autres.length) {
        html += "<h3>Autres actifs (financiers &amp; divers)</h3>";
        var autresTot = 0;
        var autresRows = autres.map(function (a) {
          var v = vFisc(a); autresTot += v;
          var droit = a.droit === "NP" && a.ageUsufruitier ? "NP (usuf. " + esc(a.ageUsufruitier) + " ans)" : (a.droit || "PP");
          return { cells: [a.designation || a.type || "—", a.type || "—", { v: fEur(v), num: true }, a.proprietaire || "—", droit] };
        });
        autresRows.push({ _tote: true, cells: ["Sous-total autres actifs", "", fEur(autresTot), "", ""] });
        html += table(["Désignation", "Type", "Valeur", "Propriétaire", "Droit"], autresRows, [2]);
      }

      // Passifs
      if (passifs.length) {
        html += "<h3>Passifs</h3>";
        var passTot = 0;
        var passRows = passifs.map(function (l) {
          passTot += pNum(l.crd);
          return { cells: [l.designation || "—", l.typeCredit || "—", { v: fEur(pNum(l.crd)), num: true }, l.taux || "—", fDate(l.dateFin), l.rattachement || "—"] };
        });
        passRows.push({ _tote: true, cells: ["Total passif (CRD)", "", fEur(passTot), "", "", ""] });
        html += table(["Désignation", "Type de crédit", "CRD", "Taux", "Fin", "Rattachement"], passRows, [2]);
      }

      // SCHÉMA 4 : démembrement / art. 669 (si bien en NP).
      if (hasNP) {
        html += "<h3>Démembrement — barème de l'article 669 du CGI</h3>";
        html += '<p class="note">La valeur de la nue-propriété (NP) croît avec l\'âge de l\'usufruitier. Quote-part NP retenue selon l\'âge :</p>';
        var ages = [50, 60, 70, 80];
        var npRows = ages.map(function (age) {
          var np = (S && S.nuePropPct) ? S.nuePropPct(age) : 0;
          return { cells: ["Usufruitier ≈ " + age + " ans", { v: Math.round(np * 100) + " %", num: true }, { v: Math.round((1 - np) * 100) + " %", num: true }] };
        });
        html += table(["Âge de l'usufruitier", "Nue-propriété", "Usufruit"], npRows, [1, 2], "compact");
        // Biens du foyer concernés : valeur pleine → quote-part NP → valeur fiscale retenue.
        var anyMissing = false;
        var npLineRows = npAssets.map(function (a) {
          var np = (a.ageUsufruitier && S && S.nuePropPct) ? S.nuePropPct(a.ageUsufruitier) : null;
          if (np == null) anyMissing = true;
          return { cells: [
            a.designation || a.type || "—",
            { v: fEur(pNum(a.valeur)), num: true },
            a.ageUsufruitier ? esc(a.ageUsufruitier) + " ans" : "à renseigner",
            { v: np != null ? Math.round(np * 100) + " %" : "—", num: true },
            { v: fEur(vFisc(a)), num: true }
          ] };
        });
        html += '<p class="note"><strong>Biens du foyer détenus en nue-propriété :</strong></p>';
        html += table(["Bien", "Valeur pleine", "Âge usufruitier", "Quote-part NP", "Valeur fiscale retenue"], npLineRows, [1, 3, 4], "compact");
        if (anyMissing) html += '<p class="note">Pour un bien dont l\'âge de l\'usufruitier n\'est pas renseigné, la valeur pleine est retenue : la décote de l\'article 669 n\'est pas calculable sans cet âge.</p>';
      }
      html += "</section>";
      pages.push(html);
    })();

    // ---- 6) Analyse budgétaire -------------------------------------------
    (function () {
      var budget = data.budget || {};
      var bt = (K && K.budgetTotals) ? K.budgetTotals(budget) : { totalRevenus: 0, totalCharges: 0, disponible: 0, tauxEffortPct: 0, pressionFiscalePct: 0 };
      var persons = (K && K.personLabels) ? K.personLabels(data) : ["Foyer"];
      var lineTot = (K && K.lineTotal) ? K.lineTotal : function (l) { var s = 0, m = (l && l.montants) || {}; Object.keys(m).forEach(function (k) { s += pNum(m[k]); }); return s; };

      var html = '<section class="page">' + head("3", "Découverte", "Analyse budgétaire");
      html += '<p class="intro">Capacité d\'épargne annuelle du foyer, taux d\'effort et pression fiscale — déterminants de l\'effort d\'investissement soutenable.</p>';

      // SCHÉMA 2 : 3 barres proportionnelles Revenus / Charges / Disponible.
      var maxB = Math.max(bt.totalRevenus, bt.totalCharges, Math.max(0, bt.disponible)) || 1;
      html += "<h3>Flux annuels du foyer</h3>";
      html += '<div class="schema">'
        + barRow("Revenus", bt.totalRevenus, maxB, C.petrol, fEur)
        + barRow("Charges", bt.totalCharges, maxB, C.red, fEur)
        + barRow("Disponible", Math.max(0, bt.disponible), maxB, C.green, fEur)
        + "</div>";

      // Revenus : matrice personnes
      var revenus = arr(budget.revenus);
      if (revenus.length) {
        html += "<h3>Revenus</h3>";
        var revHeaders = ["Poste"].concat(persons).concat(["Total"]);
        var numIdx = []; for (var i = 1; i < revHeaders.length; i++) numIdx.push(i);
        var revRows = revenus.map(function (r) {
          var cells = [r.poste + (r.libelle ? " — " + r.libelle : "")];
          persons.forEach(function (p) { var v = (r.montants || {})[p]; cells.push({ v: K && K.isBlank && K.isBlank(v) ? "—" : fEur(pNum(v)), num: true }); });
          cells.push({ v: fEur(lineTot(r)), num: true });
          return { cells: cells };
        });
        revRows.push({ _tote: true, cells: ["Total des revenus"].concat(persons.map(function () { return ""; })).concat([fEur(bt.totalRevenus)]) });
        html += table(revHeaders, revRows, numIdx, persons.length > 2 ? "compact" : null);
      }

      // Charges
      var charges = arr(budget.charges);
      if (charges.length) {
        html += "<h3>Charges</h3>";
        function chargeT(c) { if (c && c.montants) return lineTot(c); return pNum(c && c.montant); }
        var chRows = charges.map(function (c) {
          return { cells: [c.poste + (c.libelle ? " — " + c.libelle : ""), { v: fEur(chargeT(c)), num: true }, { v: bt.totalRevenus ? fPctV(chargeT(c) / bt.totalRevenus * 100) : "—", num: true }] };
        });
        chRows.push({ _tote: true, cells: ["Total des charges", fEur(bt.totalCharges), ""] });
        html += table(["Poste", "Montant", "% revenus"], chRows, [1, 2]);
      }

      // Indicateurs
      html += kpiRow([
        kpi(fEur(bt.disponible), "Budget disponible / an"),
        kpi(fPctV(bt.tauxEffortPct), "Taux d'effort"),
        kpi(fPctV(bt.pressionFiscalePct), "Pression fiscale")
      ]);
      // Note libre du budget volontairement NON affichée (comme dans le PPTX) : en données
      // réelles elle peut contenir d'anciens totaux erronés contredisant les encadrés calculés.
      html += "</section>";
      pages.push(html);
    })();

    // ---- 7) Diagnostic & risques -----------------------------------------
    (function () {
      var dg = (K && K.diagnostic) ? K.diagnostic(data) : { forces: [], vigilance: [] };
      var risques = arr(data.risques);
      var fi = (K && K.ifi) ? K.ifi(data) : null;

      var html = '<section class="page">' + head("4", "Diagnostic", "Diagnostic &amp; risques");
      html += '<p class="intro">Lecture synthétique des forces et des fragilités du patrimoine, cartographie des risques et exposition à l\'impôt sur la fortune immobilière.</p>';
      html += '<div class="cols2">';
      html += "<div><h3>Forces</h3>" + ul(dg.forces) + "</div>";
      html += "<div><h3>Points de vigilance</h3>" + ul(dg.vigilance) + "</div>";
      html += "</div>";

      if (risques.length) {
        html += "<h3>Cartographie des risques</h3>";
        html += "<table><thead><tr><th>Risque</th><th>Niveau</th><th>Description</th></tr></thead><tbody>"
          + risques.map(function (r) {
            var cls = r.level === "Élevé" ? "eleve" : (r.level === "Moyen" ? "moyen" : "modere");
            return "<tr><td>" + esc(r.risk) + '</td><td><span class="pill ' + cls + '">' + esc(r.level) + "</span></td><td>" + esc(r.desc) + "</td></tr>";
          }).join("") + "</tbody></table>";
      }

      if (fi) {
        html += "<h3>Impôt sur la fortune immobilière (IFI)</h3>";
        html += '<div class="card' + (fi.assujetti ? " warn" : "") + '">';
        if (fi.assujetti) {
          var ifiParts = ["immobilier brut " + esc(fEur(fi.brute))];
          if (fi.abattementRP > 0) ifiParts.push("résidence principale −30 % = −" + esc(fEur(fi.abattementRP)));
          if (fi.dette > 0) ifiParts.push("dettes immobilières déduites −" + esc(fEur(fi.dette)));
          html += "<p><strong>Foyer assujetti à l'IFI.</strong> Assiette nette : <strong>" + esc(fEur(fi.nette))
            + "</strong> (" + ifiParts.join(", ") + "). IFI estimé : <strong>" + esc(fEur(fi.montant)) + "</strong>.</p>";
        } else {
          html += "<p>Foyer <strong>non assujetti</strong> à l'IFI (assiette nette estimée " + esc(fEur(fi.nette)) + ", inférieure au seuil de 1 300 000 €).</p>";
        }
        html += '<p class="note">Barème progressif de 0,5 % à 1,5 % (art. 977 CGI)'
          + (fi.abattementRP > 0 ? ", après abattement de 30 % sur la résidence principale (art. 973 CGI)" : "") + '.</p>';
        html += "</div>";
      }
      html += "</section>";
      pages.push(html);
    })();

    // ---- 8) Audit successoral (si data.succession) ------------------------
    if (data.succession) (function () {
      var suc = data.succession;
      var membres = arr(data.foyer && data.foyer.membres);
      var nEnfants = membres.filter(function (m) { return m.qualite === "Enfant"; }).length;

      var html = '<section class="page">' + head("5", "Audit successoral", "Audit successoral");
      html += '<p class="intro">Simulation des droits de succession aux deux décès selon l\'option retenue par le conjoint survivant, et rappel des règles civiles de dévolution.</p>';

      // SCHÉMA 3 : réserve héréditaire vs quotité disponible.
      if (S && S.reserveGlobale && nEnfants > 0) {
        var res = S.reserveGlobale(nEnfants), qd = S.quotiteDisponible(nEnfants);
        html += '<div class="card"><h4>Réserve héréditaire &amp; quotité disponible (art. 913 C. civ.)</h4>';
        html += "<p>" + nEnfants + " enfant" + (nEnfants > 1 ? "s" : "") + " : la réserve globale (part minimale revenant aux enfants) représente <strong>" + frac(res)
          + "</strong> du patrimoine ; la quotité disponible (librement transmissible) représente <strong>" + frac(qd) + "</strong>.</p>";
        html += reserveQuotiteBar(res, qd, frac(res), frac(qd));
        html += "</div>";
      }

      // Droits aux 2 décès — Monsieur & Madame
      function scenarioTable(title, block) {
        if (!block || !arr(block.scenarios).length) return "";
        var rows = arr(block.scenarios).map(function (s) {
          return { cells: [s.name || "—", { v: fEur(pNum(s.d1)), num: true }, { v: fEur(pNum(s.d2)), num: true }, { v: fEur(scTot(s)), num: true }] };
        });
        var h = "<h3>" + esc(title) + "</h3>" + table(["Option du conjoint", "Droits 1er décès", "Droits 2nd décès", "Coût total"], rows, [1, 2, 3]);
        if (block.observation) h += '<p class="note">' + esc(block.observation) + "</p>";
        return h;
      }
      html += scenarioTable("Scénario — décès de Monsieur en premier", suc.monsieur);
      html += scenarioTable("Scénario — décès de Madame en premier", suc.madame);

      // Abattements (HEXA_EDU) : parenté + don manuel.
      var ab = EDU.abattements;
      if (ab) {
        html += "<h3>Abattements de donation &amp; succession</h3>";
        var abRows = arr(ab.parente).map(function (r) { return { cells: [r[0], { v: r[1] }, r[2]] }; });
        if (ab.don) abRows.push({ cells: [ab.don[0], { v: ab.don[1] }, ab.don[2]] });
        html += table(["Lien de parenté", "Abattement", "Périodicité / conditions"], abRows, [1]);
        if (ab.note) html += '<p class="note">' + esc(ab.note) + "</p>";
      }
      html += "</section>";
      pages.push(html);

      // Donations : capacité en franchise + suivi du délai des 15 ans
      var capa = (S && S.donationCapacite) ? safe(function () { return S.donationCapacite(data); }) : null;
      var suivi = (S && S.donationsSuivi) ? safe(function () { return S.donationsSuivi(data); }) : null;
      if ((capa && arr(capa.parents).length) || arr(suivi).length) {
        var h2 = '<section class="page">' + head("5", "Audit successoral", "Donations &amp; capacité de transmission");
        h2 += '<p class="intro">Marge de transmission immédiate en franchise de droits (abattement de 100 000 € par parent et par enfant tous les 15 ans, art. 779 CGI, complété du don familial de somme d\'argent de l\'art. 790 G).</p>';
        if (capa && arr(capa.parents).length) {
          h2 += "<h3>Capacité de donation en franchise de droits</h3>";
          capa.parents.forEach(function (p) {
            var rows = arr(p.rows).map(function (r) {
              return { cells: [r.enfant || "—", { v: fEur(r.abattement), num: true }, { v: fEur(r.disponibleAbattement), num: true }, { v: fEur(r.donManuel), num: true }, { v: fEur(r.disponible), num: true }] };
            });
            rows.push({ _tote: true, cells: [(p.label || "") + " — total", "", "", "", fEur(p.totalDisponible)] });
            h2 += "<h4>" + esc(p.label) + "</h4>" + table(["Bénéficiaire", "Abattement (779)", "Dispo. abattement", "Don manuel (790 G)", "Total disponible"], rows, [1, 2, 3, 4], "compact");
          });
        }
        if (arr(suivi).length) {
          h2 += "<h3>Donations consenties — suivi du délai de 15 ans</h3>";
          var suiviRows = arr(suivi).map(function (s) {
            return { cells: [s.donateur || "—", s.beneficiaire || "—", { v: fEur(s.valeur), num: true }, s.type || "—", fDate(s.date), s.statut || "—"] };
          });
          h2 += table(["Donateur", "Bénéficiaire", "Montant", "Type", "Date", "Statut (art. 784 CGI)"], suiviRows, [2], "compact");
        }
        h2 += "</section>";
        pages.push(h2);
      }
    })();

    // ---- 9) Objectifs -----------------------------------------------------
    (function () {
      var objs = arr(data.objectifs);
      if (!objs.length) return;
      var html = '<section class="page">' + head("6", "Objectifs", "Objectifs hiérarchisés");
      html += '<p class="intro">Priorités patrimoniales retenues avec le foyer, ordonnées par importance, qui guident les préconisations et le plan d\'action.</p>';
      html += "<ol>" + objs.map(function (o) { return "<li><strong>" + esc(o.title) + "</strong>" + (o.detail ? " — " + esc(o.detail) : "") + "</li>"; }).join("") + "</ol>";
      html += "</section>";
      pages.push(html);
    })();

    // ---- 10) Préconisations ----------------------------------------------
    (function () {
      var html = '<section class="page">' + head("7", "Préconisations", "Préconisations — arbitrages &amp; plafonds");
      html += '<p class="intro">Réallocation proposée du patrimoine, en cohérence avec les objectifs, et suivi des marges disponibles sur chaque enveloppe.</p>';

      // Arbitrage immobilier & mobilier
      var aa = (K && K.arbitrageActifs) ? safe(function () { return K.arbitrageActifs(data); }) : null;
      if (aa) {
        var immoL = arr(aa.lignes).filter(function (l) { return l.isImmo && pNum(l.montant) > 0; });
        var mobL = arr(aa.lignes).filter(function (l) { return !l.isImmo && pNum(l.montant) > 0; });
        if (immoL.length) {
          html += "<h3>Arbitrage — immobilier</h3>";
          var immoRows = immoL.map(function (l) {
            return { cells: [l.designation || "—", l.detail || "—", { v: fEur(l.valeurNette), num: true }, fDate(l.dateAcquisition), { v: fEur(l.montant), num: true }] };
          });
          immoRows.push({ _tote: true, cells: ["Total arbitré (immobilier)", "", "", "", fEur(aa.totalImmo)] });
          html += table(["Bien", "Classe", "Valeur nette", "Acquisition", "Montant arbitré"], immoRows, [2, 4], "compact");

          // Plus-value de cession par bien cédé (art. 150 U) : IR 19 % + PS 17,2 % +
          // surtaxe 1609 nonies G, après abattements de durée. Données manquantes →
          // warning explicite (jamais omis).
          var pv = (K && K.plusValueImmo) ? safe(function () { return K.plusValueImmo(data); }) : null;
          if (pv && pv.count) {
            html += "<h3>Fiscalité de cession — plus-values immobilières</h3>";
            var pvRows = arr(pv.lignes).map(function (l) {
              if (l.exonere) return { cells: [l.designation || "—", "—", "—", "—", "—", "—", "—", "Exonérée (résidence principale)"] };
              if (l.warning) return { cells: [l.designation || "—", "—", "—", "—", "—", "—", "—", "À renseigner : " + l.manque] };
              return { cells: [l.designation || "—", { v: fEur(l.prixAcqCorrige), num: true }, { v: fEur(l.pvBrute), num: true }, l.duree + " ans", { v: fEur(l.ir), num: true }, { v: fEur(l.ps), num: true }, { v: fEur(l.surtaxe), num: true }, { v: fEur(l.impot), num: true }] };
            });
            if (pv.totalImpot > 0) pvRows.push({ _tote: true, cells: ["Impôt total estimé sur les cessions", "", "", "", "", "", "", fEur(pv.totalImpot)] });
            html += table(["Bien cédé", "Prix d'acq. corrigé", "PV imposable", "Détention", "IR 19 %", "PS 17,2 %", "Surtaxe", "Impôt estimé"], pvRows, [1, 2, 4, 5, 6, 7], "compact");
            if (pv.hasWarning) html += '<p class="note">⚠ Plus-value non chiffrable pour certains biens : renseignez le prix et la date d\'acquisition (formulaire — patrimoine immobilier). À défaut, la fiscalité de cession est sous-estimée et le capital net reste sous réserve.</p>';
            html += '<p class="note">Prix d\'acquisition corrigé (art. 150 VB) : frais d\'acquisition réels ou forfait 7,5 %, travaux réels ou forfait 15 % de plein droit si détention &gt; 5 ans — l\'option la plus favorable est retenue' + (pv.forfaits ? "" : " (forfaits désactivés)") + '. Frais de cession à la charge du vendeur déduits du prix de cession s\'ils sont saisis. Barème : IR 19 % + prélèvements sociaux 17,2 % après abattements pour durée de détention (art. 150 VC — exonération d\'IR à 22 ans, de PS à 30 ans) ; surtaxe de 2 à 6 % au-delà de 50 000 € de PV imposable (art. 1609 nonies G). Résidence principale exonérée (art. 150 U II).</p>';
          }
        }
        if (mobL.length) {
          html += "<h3>Arbitrage — patrimoine mobilier</h3>";
          var mobRows = mobL.map(function (l) {
            return { cells: [l.designation || "—", l.detail || "—", { v: fEur(l.valeurNette), num: true }, { v: fEur(l.montant), num: true }] };
          });
          mobRows.push({ _tote: true, cells: ["Total désinvesti (mobilier)", "", "", fEur(aa.totalMobilier)] });
          html += table(["Actif", "Type", "Valeur", "Montant à désinvestir"], mobRows, [2, 3]);
        }
        if (immoL.length || mobL.length) {
          var pvA = (K && K.plusValueImmo) ? safe(function () { return K.plusValueImmo(data); }) : null;
          var pvT = pvA ? pNum(pvA.totalImpot) : 0;
          html += '<p><strong>Capital dégagé (brut) :</strong> ' + esc(fEur(aa.disponibleApres))
            + (pvT > 0 ? " — fiscalité de cession estimée −" + esc(fEur(pvT)) + " → <strong>capital net réellement disponible ≈ " + esc(fEur(aa.disponibleApres - pvT)) + "</strong>" : "")
            + ((pvA && pvA.hasWarning) ? " <em>(capital net sous réserve de la fiscalité de cession non chiffrée)</em>" : "") + ".</p>";
          // IFI post-arbitrage : le gain phare de la stratégie (objectif n° 1).
          var ipa = (K && K.ifiPostArbitrage && immoL.length) ? safe(function () { return K.ifiPostArbitrage(data); }) : null;
          if (ipa && ipa.gain > 0) {
            html += '<p><strong>IFI :</strong> ' + esc(fEur(ipa.avant.montant)) + " actuel → <strong>IFI post-arbitrage " + esc(fEur(ipa.apres.montant)) + "</strong>"
              + " — gain annuel ≈ " + esc(fEur(ipa.gain))
              + (ipa.apres.assujetti ? " (assiette nette résiduelle " + esc(fEur(ipa.apres.nette)) + ")" : " (assiette nette résiduelle " + esc(fEur(ipa.apres.nette)) + ", sous le seuil d'assujettissement de 1 300 000 €)") + ".</p>";
          }
        }
      }

      // Suivi des plafonds & marges
      html += "<h3>Suivi des plafonds &amp; marges</h3><ul>";
      if (K && K.peaCapacity) {
        var cap = safe(function () { return K.peaCapacity(data.actif || {}); });
        if (cap && (cap.hasPEA || cap.hasPME)) {
          html += "<li><strong>PEA / PEA-PME :</strong> " + esc(fEur(cap.restePEA)) + " disponible sur le PEA (plafond " + esc(fEur(cap.plafondPEA))
            + "), " + esc(fEur(cap.resteGlobal)) + " sur l'enveloppe commune (plafond " + esc(fEur(cap.plafondGlobal)) + ").</li>";
        }
      }
      var er = data.epargneRetraite || {};
      function plafTot(o) { o = o || {}; return pNum(o.N1) + pNum(o.N2) + pNum(o.N3) + pNum(o.N4); }
      var plM = plafTot(er.perPlafondMonsieur), plMme = plafTot(er.perPlafondMadame);
      if (plM || plMme) {
        var mut = (er.perMutualisation === "Oui" || er.perMutualisation === true);
        html += "<li><strong>PER (plafonds, report N-1 à N-4) :</strong> Monsieur " + esc(fEur(plM)) + " · Madame " + esc(fEur(plMme))
          + ". Total : " + esc(fEur(plM + plMme)) + (mut ? " (mutualisé entre conjoints)" : "") + ".</li>";
      }
      var fi2 = (K && K.ifi) ? safe(function () { return K.ifi(data); }) : null;
      if (fi2) {
        var ipa2 = (K && K.ifiPostArbitrage) ? safe(function () { return K.ifiPostArbitrage(data); }) : null;
        html += "<li><strong>IFI :</strong> " + (fi2.assujetti ? "assujetti, IFI estimé ≈ " + esc(fEur(fi2.montant)) : "non assujetti")
          + ((ipa2 && ipa2.gain > 0) ? " — après arbitrage : ≈ " + esc(fEur(ipa2.apres.montant)) + "/an (gain ≈ " + esc(fEur(ipa2.gain)) + ")" : "") + ".</li>";
      }
      var capa2 = (S && S.donationCapacite) ? safe(function () { return S.donationCapacite(data); }) : null;
      if (capa2) {
        var capaT = 0; arr(capa2.parents).forEach(function (p) { capaT += pNum(p.totalDisponible); });
        if (capaT > 0) html += "<li><strong>Capacité de donation en franchise :</strong> " + esc(fEur(capaT)) + " mobilisables immédiatement.</li>";
      }
      html += "</ul>";
      html += "</section>";
      pages.push(html);

      // Stratégie de donation + réinvestissement + cascade + préconisations
      var html2 = '<section class="page">' + head("7", "Préconisations", "Donation, réinvestissement &amp; cascade");

      // SCHÉMA 5 : cascade Arbitrage → Donations → Réinvesti → Reste.
      var ds = (K && K.donationStrategie) ? safe(function () { return K.donationStrategie(data); }) : null;
      var rt = (K && K.reinvestTotals) ? safe(function () { return K.reinvestTotals(data); }) : null;
      if (rt) {
        var disponible = pNum(rt.disponible);
        var impotPV = pNum(rt.impotPV);
        var dispoNet = pNum(rt.disponibleNet);
        var donne = pNum(rt.donne);
        var reinvesti = pNum(rt.total);
        var reste = pNum(rt.reste);
        if (disponible > 0 || donne > 0 || reinvesti > 0) {
          html2 += "<h3>De l'arbitrage au réinvestissement</h3>";
          var stages = [{ label: "Capital dégagé (brut)", value: disponible, sub: "Arbitrages", color: C.petrol }];
          if (impotPV > 0) {
            stages.push({ label: "Fiscalité de cession", value: impotPV, sub: "Plus-values (150 U)", color: C.red });
            stages.push({ label: "Capital net disponible", value: dispoNet, sub: "Après impôt de PV", color: C.petrolLt });
          }
          stages.push({ label: "Donations", value: donne, sub: "Transmission", color: C.gold });
          stages.push({ label: "Réinvesti", value: reinvesti, sub: "Enveloppes", color: C.petrolLt });
          stages.push({ label: "Reste", value: Math.max(0, reste), sub: "À allouer", color: C.slate });
          html2 += cascade(stages, fEur);
          if (rt.pvNonChiffree) html2 += '<p class="note">⚠ Capital net sous réserve de la fiscalité de cession non chiffrée (prix / date d\'acquisition manquants pour certains biens cédés).</p>';
        }
      }

      if (ds && arr(ds.lignes).length) {
        html2 += "<h3>Stratégie de donation</h3>";
        var dsRows = arr(ds.lignes).map(function (l) {
          return { cells: [l.donateur || "—", (l.beneficiaire || "—") + (l.beneficiaireMineur ? " ⚠" : ""), l.lien || "—", { v: fEur(l.montant), num: true }, { v: fEur(l.abattement), num: true }, { v: fEur(l.enFranchise), num: true }, { v: fEur(l.droits), num: true }] };
        });
        dsRows.push({ _tote: true, cells: ["Total", "", "", fEur(ds.totalMontant), "", fEur(ds.totalFranchise), fEur(ds.totalDroits)] });
        html2 += table(["Donateur", "Bénéficiaire", "Lien", "Montant", "Abattement disp.", "En franchise", "Coût (droits)"], dsRows, [3, 4, 5, 6], "compact");
        if (arr(ds.beneficiairesMineurs).length) {
          html2 += '<p class="note">⚠ ' + esc(arr(ds.beneficiairesMineurs).join(", ")) + " — "
            + esc((K && K.ALERTE_DONATION_MINEUR) || "Bénéficiaire mineur : acceptation et gestion des fonds sous administration légale (art. 382 s. C. civ.).") + "</p>";
        }
      }

      if (rt && arr(rt.parEnveloppe).length) {
        html2 += "<h3>Réinvestissement par enveloppe</h3>";
        html2 += "<p>Capital dégagé (brut) : " + esc(fEur(rt.disponible))
          + (pNum(rt.impotPV) > 0 ? " · Fiscalité de cession : −" + esc(fEur(rt.impotPV)) + " · Capital net : <strong>" + esc(fEur(rt.disponibleNet)) + "</strong>" : "")
          + " · Donations : " + esc(fEur(rt.donne)) + " · À réinvestir : <strong>" + esc(fEur(rt.aAllouer)) + "</strong>"
          + (rt.pvNonChiffree ? " <em>(capital net sous réserve de la fiscalité de cession non chiffrée)</em>" : "") + ".</p>";
        var rtRows = arr(rt.parEnveloppe).map(function (e) {
          return { cells: [e.enveloppe || "—", { v: fEur(e.montant), num: true }, { v: rt.aAllouer ? fPctV(e.montant / rt.aAllouer * 100) : "—", num: true }] };
        });
        rtRows.push({ _tote: true, cells: ["Total réinvesti", fEur(rt.total), ""] });
        html2 += table(["Enveloppe", "Montant réinvesti", "Part"], rtRows, [1, 2]);
        if (rt.reste > 0) html2 += '<p class="note">Solde non encore réinvesti : ' + esc(fEur(rt.reste)) + ".</p>";
      }

      var precos = (K && K.preconisations) ? safe(function () { return K.preconisations(data); }) : [];
      if (arr(precos).length) {
        html2 += "<h3>Préconisations personnalisées</h3>" + ulTitled(precos);
      }
      html2 += "</section>";
      pages.push(html2);
    })();

    // ---- 11) Solutions / contenants --------------------------------------
    (function () {
      var blocks = [];

      // -- PER : flux pédagogique versement → capitalisation → sortie --------
      if (modOn("per") && EDU.per) {
        var per = EDU.per;
        var perSchema = "<h4>Le cycle du PER</h4>" + stepsFlow([
          { label: "Versement déduit", desc: "Économie d'IR à votre TMI", accent: "" },
          { label: "Capitalisation", desc: "Épargne investie, bloquée jusqu'à la retraite", accent: "teal" },
          { label: "Sortie capital / rente", desc: "Imposée à la sortie", accent: "gold" }
        ]) + '<p class="schema-cap">Versements déduits : l\'imposition est différée à la sortie (capital au barème IR, gains au PFU 31,4 % ; rente comme pension).</p>';
        blocks.push(essentiel(
          "PER — Plan Épargne Retraite",
          per.fonctionnement, (per.entree || []).concat(per.sortie || []),
          "Idéal pour les TMI élevées : déduction des versements, report des plafonds sur les années N-1 à N-4.",
          { tag: "Retraite", sert: "Préparer la retraite en réduisant l'impôt aujourd'hui (versements déductibles).", qui: "Foyers à TMI élevée (30 % et plus) ayant un horizon long.", schema: perSchema }
        ));
      }

      // -- Assurance-vie française : schéma transmission avant / après 70 ans -
      if (modOn("assuranceVie") && (EDU.avFr || EDU.av)) {
        var avf = EDU.avFr || EDU.av;
        var avT = (EDU.av) || {};
        var avSchema = "<h4>Transmission : le pivot des 70 ans</h4>" + avSplit70(avT.avant70, avT.apres70);
        blocks.push(essentiel(
          "Assurance-vie française",
          avf.fonctionnement || (EDU.av && EDU.av.fonctionnement), (EDU.avFr && EDU.avFr.fiscalite) || (EDU.av && EDU.av.fiscalite) || [],
          "Transmission : abattement de 152 500 € par bénéficiaire (art. 990 I, primes versées avant 70 ans).",
          { tag: "Polyvalent", sert: "Faire fructifier une épargne disponible et transmettre hors succession.", qui: "Tous les profils : épargne de précaution, projets et transmission.", schema: avSchema }
        ));
      }

      // -- Assurance-vie luxembourgeoise -------------------------------------
      if (modOn("assuranceVieLux") && EDU.av) {
        blocks.push(essentiel(
          "Assurance-vie luxembourgeoise",
          EDU.av.fonctionnement, EDU.av.fiscalite,
          "Triangle de sécurité (super-privilège) et neutralité fiscale luxembourgeoise.",
          { tag: "International", sert: "Sécuriser et structurer un patrimoine financier important, avec portabilité internationale.", qui: "Patrimoines élevés et profils mobiles (expatriation possible)." }
        ));
      }

      // -- SCPI : carte enrichie (À quoi ça sert / Pour qui + intro) ----------
      if (modOn("scpi") && EDU.scpi) {
        var sc = EDU.scpi;
        var bannerScpi = arr(sc.kpis).length ? (sc.kpis[0].v + " — " + sc.kpis[0].l) : "";
        var html = '<div class="essentiel"><h3>SCPI — Pierre-papier <span class="tag">Revenus</span></h3>';
        html += usageLine(
          "Percevoir des revenus immobiliers réguliers sans gestion locative.",
          "Investisseurs recherchant du rendement et de la diversification, horizon 8-10 ans."
        );
        if (sc.intro) html += '<p class="note">' + esc(sc.intro) + "</p>";
        html += '<div class="cols2"><div><h4>Atouts</h4>' + ul(arr(sc.avantages).slice(0, 4)) + "</div>";
        html += "<div><h4>Points de vigilance</h4>" + ul(arr(sc.vigilance).slice(0, 4)) + "</div></div>";
        if (bannerScpi) html += '<p class="note"><strong>' + esc(bannerScpi) + "</strong></p>";
        html += "</div>";
        blocks.push(html);
      }

      // -- PEA : timeline < 5 ans / ≥ 5 ans ----------------------------------
      if (modOn("pea") && EDU.pea) {
        var peaSchema = "<h4>L'avantage des 5 ans</h4>" + stepsFlow([
          { label: "< 5 ans", desc: "Tout retrait = clôture. Gains imposés au PFU 31,4 %.", accent: "" },
          { label: "≥ 5 ans", desc: "Gains exonérés d'IR. Seuls les PS (18,6 %) restent dus.", accent: "teal" }
        ]) + '<p class="schema-cap">Plafond de versement : 150 000 € (300 000 € pour un couple).</p>';
        blocks.push(essentiel(
          "PEA — Plan d'Épargne en Actions",
          EDU.pea.fonctionnement, EDU.pea.fiscalite,
          "Gains exonérés d'IR après 5 ans (hors prélèvements sociaux). Plafond 150 000 €.",
          { tag: "Actions", sert: "Investir en actions européennes dans un cadre fiscal exonéré après 5 ans.", qui: "Épargnants acceptant le risque actions sur un horizon long (5 ans min.).", schema: peaSchema }
        ));
      }

      // -- PEA-PME -----------------------------------------------------------
      if (modOn("peapme") && EDU.peapme) blocks.push(essentiel(
        "PEA-PME", EDU.peapme.fonctionnement, EDU.peapme.fiscalite,
        "Enveloppe commune avec le PEA : 225 000 €. Finance les PME / ETI européennes.",
        { tag: "PME / ETI", sert: "Financer les PME et ETI européennes avec la fiscalité du PEA.", qui: "Investisseurs avertis cherchant un potentiel élevé sur les petites valeurs." }
      ));

      // -- FCPR --------------------------------------------------------------
      if (modOn("fcpr") && EDU.fcpr) blocks.push(essentiel(
        "FCPR — Capital-investissement", EDU.fcpr.fonctionnement, EDU.fcpr.fiscalite,
        "Plus-values exonérées d'IR après 5 ans (FCPR fiscal). Réservé aux investisseurs avertis.",
        { tag: "Non coté", sert: "Diversifier vers le non coté en visant une plus-value à terme.", qui: "Investisseurs avertis acceptant un blocage de 8-10 ans et un risque élevé." }
      ));

      // -- SCI à l'IS : carte enrichie ---------------------------------------
      if (modOn("sciIs") && EDU.sci) {
        var sci = EDU.sci;
        var html3 = '<div class="essentiel"><h3>Immeuble de rapport en SCI à l\'IS <span class="tag">Transmission</span></h3>';
        html3 += usageLine(
          "Détenir et transmettre de l'immobilier locatif tout en conservant le contrôle.",
          "Patrimoines immobiliers significatifs (> 800 K€) avec objectif de transmission."
        );
        html3 += '<div class="cols2"><div><h4>Montage</h4>' + ul(arr(sci.montage).slice(0, 4)) + "</div>";
        html3 += "<div><h4>Atouts</h4>" + ulTitled(arr(sci.avantages).slice(0, 4).map(function (r) { return { title: r.crit, detail: r.av }; })) + "</div></div>";
        html3 += '<p class="note"><strong>Transmission : donation de la nue-propriété des parts (valeur réduite, art. 669 CGI).</strong></p></div>';
        blocks.push(html3);
      }

      if (!blocks.length) return;

      // -- Page d'ouverture : intro pédagogique + matrice de synthèse --------
      var intro = '<section class="page">' + head("8", "Solutions", "Solutions &amp; contenants")
        + '<p class="intro">Un <strong>contenant</strong> (ou « enveloppe ») est le cadre juridique et fiscal dans lequel on loge l\'épargne : assurance-vie, PER, PEA, SCPI, SCI… Il ne s\'agit pas d\'un placement en soi, mais de la structure qui détermine la fiscalité, les conditions de sortie et les modalités de transmission. Le bon contenant dépend de votre <strong>objectif</strong> : horizon, fiscalité recherchée, transmission, et besoin de liquidité.</p>';
      // Matrice « Quel contenant pour quel objectif ? » — repères factuels.
      // Cellules : ✓ adapté · ~ partiel/sous conditions · — peu/pas adapté.
      var YES = '<span class="yes">&#10003;</span>', MAY = '<span class="may">~</span>', NO = '<span class="no">&minus;</span>';
      // Colonnes filtrées selon les contenants SÉLECTIONNÉS dans le formulaire (modOn) :
      // la matrice ne montre que les enveloppes activées. Repères par objectif dans l'ordre
      // [Réduire l'IR, Transmettre, Diversifier, Liquidité, Long terme / retraite].
      var objLabels = ["Réduire l'IR", "Transmettre", "Diversifier", "Liquidité", "Long terme / retraite"];
      var matCols = [
        { head: "PER", on: modOn("per"), col: [YES, NO, MAY, NO, YES] },
        { head: "AV", on: modOn("assuranceVie") || modOn("assuranceVieLux"), col: [MAY, YES, YES, YES, YES] },
        { head: "PEA / PME", on: modOn("pea") || modOn("peapme"), col: [NO, NO, YES, MAY, YES] },
        { head: "SCPI", on: modOn("scpi"), col: [MAY, MAY, YES, NO, YES] },
        { head: "FCPR", on: modOn("fcpr"), col: [MAY, NO, YES, NO, YES] },
        { head: "SCI à l'IS", on: modOn("sciIs"), col: [MAY, YES, MAY, NO, YES] }
      ].filter(function (c) { return c.on; });
      if (matCols.length) {
        intro += "<h3>Quel contenant pour quel objectif ?</h3>";
        intro += '<table class="matrix"><thead><tr><th class="obj">Objectif</th>'
          + matCols.map(function (c) { return "<th>" + esc(c.head) + "</th>"; }).join("")
          + "</tr></thead><tbody>"
          + objLabels.map(function (lab, r) {
            return '<tr><td class="obj">' + esc(lab) + "</td>"
              + matCols.map(function (c) { return "<td>" + c.col[r] + "</td>"; }).join("") + "</tr>";
          }).join("")
          + "</tbody></table>";
        intro += '<p class="note"><span class="yes">&#10003;</span> adapté&nbsp;&nbsp;·&nbsp;&nbsp;<span class="may">~</span> partiel ou sous conditions&nbsp;&nbsp;·&nbsp;&nbsp;<span class="no">&minus;</span> peu ou pas adapté. AV = assurance-vie ; PEA / PME = PEA et PEA-PME (enveloppe commune 225 000 €).</p>';
      }
      intro += "</section>";
      pages.push(intro);

      // -- Contenants détaillés : au plus 2 par page (mise en page aérée) ----
      for (var i = 0; i < blocks.length; i += 2) {
        var slice = blocks.slice(i, i + 2);
        pages.push('<section class="page">' + slice.join("") + "</section>");
      }
    })();

    // ---- 12) Plan d'action ------------------------------------------------
    (function () {
      var steps = (K && K.feuilleDeRoute) ? safe(function () { return K.feuilleDeRoute(data); }) : [];
      var html = '<section class="page">' + head("9", "Plan d'action", "Plan d'action");
      html += '<p class="intro">Feuille de route opérationnelle : étapes ordonnées pour mettre en œuvre la stratégie, de l\'arbitrage au réinvestissement.</p>';

      // SCHÉMA 5 (rappel) : cascade synthétique en tête du plan.
      var rt = (K && K.reinvestTotals) ? safe(function () { return K.reinvestTotals(data); }) : null;
      if (rt) {
        var disponible = pNum(rt.disponible), donne = pNum(rt.donne), reinvesti = pNum(rt.total), reste = pNum(rt.reste);
        if (disponible > 0 || donne > 0 || reinvesti > 0) {
          html += cascade([
            { label: "Capital dégagé", value: disponible, sub: "Arbitrages", color: C.petrol },
            { label: "Donations", value: donne, sub: "Transmission", color: C.gold },
            { label: "Réinvesti", value: reinvesti, sub: "Enveloppes", color: C.petrolLt },
            { label: "Reste", value: Math.max(0, reste), sub: "À allouer", color: C.slate }
          ], fEur);
        }
      }

      if (arr(steps).length) {
        var rows = arr(steps).map(function (s, i) {
          return { cells: [String(i + 1), s.title || "—", s.objectif || "—", s.proposition || "—"] };
        });
        html += table(["#", "Étape", "Objectif", "Proposition"], rows, [], "compact");
      } else {
        html += "<p>Renseignez les arbitrages, donations envisagées et réinvestissements pour générer la feuille de route.</p>";
      }
      html += "</section>";
      pages.push(html);
    })();

    // ---- 13) Mentions & avertissements -----------------------------------
    (function () {
      var ctx = data.contexte || {};
      var meth = EDU.methodologie || {};
      var html = '<section class="page">' + head("10", "Mentions", "Mentions &amp; avertissements");
      if (ctx.intro) html += "<p>" + esc(ctx.intro) + "</p>";
      if (ctx.avertissement) html += '<div class="card warn">' + esc(ctx.avertissement) + "</div>";
      if (meth.cadre) html += "<h3>Cadre de l'étude</h3><p>" + esc(meth.cadre) + "</p>";
      if (meth.perimetre) html += '<p class="note">' + esc(meth.perimetre) + "</p>";
      var who = (doc.advisorName || "") + (doc.advisorFirm ? " — " + doc.advisorFirm : "");
      html += '<p class="foot-note">Document établi par ' + esc(who || "Hexa Patrimoine") + ". "
        + (doc.advisorOrias ? "Orias " + esc(doc.advisorOrias) + ". " : "")
        + "© Propriété exclusive de Seine Gestion Privée. Les simulations sont fondées sur la réglementation en vigueur et les données communiquées ; elles ne se substituent pas à une consultation juridique ou fiscale.</p>";
      html += "</section>";
      pages.push(html);
    })();

    // ---- Assemblage du document complet -----------------------------------
    // Aucun en-tête/pied courant fixe : voir note dans printCss() (évite les
    // chevauchements à l'impression PDF).
    return "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\">"
      + "<title>Étude patrimoniale — " + esc(doc.client || "") + "</title>"
      + "<style>" + printCss() + "</style></head><body>"
      + '<div class="noprint"><button type="button" onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>'
      + pages.join("\n")
      + "</body></html>";
  }

  // ===========================================================================
  // open(data) — point d'entrée (ouvre la fenêtre + lance l'impression)
  // ===========================================================================
  function open(data) {
    var html = buildHtml(data);
    var w = window.open("", "_blank");
    if (!w) { alert("Veuillez autoriser les fenêtres pop-up pour générer le livret."); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 400);
  }

  window.HexaPrint = { open: open, buildHtml: buildHtml };
})();
