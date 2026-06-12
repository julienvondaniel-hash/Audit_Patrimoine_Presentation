/* =============================================================================
 * app.js — Glue applicative
 * -----------------------------------------------------------------------------
 * État, rendu du formulaire, génération/téléchargement du .pptx, import/export
 * des données client (JSON), sauvegarde automatique (localStorage) et aperçu du
 * plan du document.
 * ========================================================================== */
(function () {
  "use strict";

  var LS_KEY = "hexa_etude_data_v12";
  var BUILD = "2026-06-11 · ifi-rp-decote";
  var state = { data: null };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function $(id) { return document.getElementById(id); }

  function defaultData() {
    var d = clone(window.HEXA_DEFAULT);
    d.modules = {};
    window.HEXA_MODULES.forEach(function (m) { d.modules[m.id] = m.def; });
    return d;
  }

  // ------- aperçu du plan (doit refléter l'ordre de hexa-slides.js) -------
  var OUTLINE = [
    { t: "Couverture" }, { t: "Votre conseiller" },
    { t: "Méthodologie & périmètre", m: "methodologie" }, { t: "Contexte & avertissement", m: "contexte" },
    { t: "Synthèse exécutive" },
    { t: "▸ Section 1 — Découverte", d: 1 }, { t: "Composition du foyer" }, { t: "Composition du patrimoine" }, { t: "Patrimoine immobilier" }, { t: "Analyse budgétaire" },
    { t: "▸ Section 2 — Diagnostic", d: 1 }, { t: "Diagnostic patrimonial" }, { t: "Cartographie des risques" },
    { t: "▸ Section 2.1 — Audit successoral", d: 1 }, { t: "Abattements de donation", m: "successoral" }, { t: "Réserve & quotité disponible" }, { t: "1er décès — Monsieur" }, { t: "1er décès — Madame" }, { t: "Donations & capacité en franchise", cond: function (d) { var enf = ((d.foyer && d.foyer.membres) || []).some(function (mb) { return mb.qualite === "Enfant"; }); return ((d.donations) || []).length > 0 || enf; } },
    { t: "Démembrement en 3 étapes", m: "successoral" }, { t: "Barème usufruit / NP", m: "successoral" },
    { t: "▸ Section 3 — Objectifs", d: 1 }, { t: "Objectifs hiérarchisés" },
    { t: "▸ Section 4 — Préconisations", d: 1 }, { t: "Arbitrage — Immobilier" }, { t: "Arbitrage — Patrimoine mobilier" }, { t: "Suivi des plafonds & marges" }, { t: "Préconisations personnalisées" }, { t: "Stratégie de donation" }, { t: "Réinvestissement du capital" },
    { t: "PER — l'essentiel", m: "per" },
    { t: "AV française — l'essentiel", m: "assuranceVie" },
    { t: "AV luxembourgeoise — l'essentiel", m: "assuranceVieLux" },
    { t: "SCPI", m: "scpi" },
    { t: "PEA — l'essentiel", m: "pea" },
    { t: "PEA-PME — l'essentiel", m: "peapme" },
    { t: "FCPR — l'essentiel", m: "fcpr" },
    { t: "SCI à l'IS — l'essentiel", m: "sciIs" },
    { t: "▸ Section 5 — Plan d'action", d: 1 }, { t: "Plan d'action" },
    { t: "Suivi & prochaines étapes", m: "suivi" },
    { t: "Merci" }
  ];

  function updateOutline() {
    var mods = state.data.modules || {};
    var host = $("outline");
    host.innerHTML = "";
    var n = 0;
    OUTLINE.forEach(function (o) {
      if (o.m && mods[o.m] === false) return;
      if (o.cond && !o.cond(state.data)) return;
      n++;
      var row = el("div", "outline-row" + (o.d ? " outline-divider" : ""));
      row.appendChild(el("span", "outline-num", String(n)));
      row.appendChild(el("span", "outline-title", o.t));
      host.appendChild(row);
    });
    $("slideCount").textContent = n;
  }

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  // ------- persistance -------
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state.data)); } catch (e) {} }
  function onChange() {
    window.HexaCompute.syncDerived(state.data);
    save(); updateOutline();
    // Si le profil patrimonial a re-rempli les objectifs, redessiner le formulaire.
    if (state.data._objectifsRepopulated) { state.data._objectifsRepopulated = false; rebuild(); }
    else { window.HexaForm.refreshComputed(state.data); }
    flagDirty();
  }
  function flagDirty() { var s = $("saveState"); if (s) { s.textContent = "Enregistré localement ✓"; s.classList.add("saved"); } }

  function rebuild() {
    window.HexaForm.build(state.data, $("form"), onChange);
    window.HexaForm.buildModules(state.data.modules, $("modules"), function () { save(); updateOutline(); });
    updateOutline();
  }

  // Liste des personnes (membres du foyer + « Foyer ») — sert à rafraîchir le
  // formulaire (colonnes « personne » des revenus/charges) quand le foyer change.
  function personsKey() { try { return (window.HexaCompute.personLabels(state.data) || []).join("|"); } catch (e) { return ""; } }
  var lastPersonsKey = "";
  // Reconstruit le formulaire (en préservant les sections ouvertes et le défilement)
  // si la liste des personnes a changé — déclenché à la sortie d'un champ du foyer.
  function rebuildIfPersonsChanged() {
    var k = personsKey();
    if (k === lastPersonsKey) return;
    lastPersonsKey = k;
    var secs = document.querySelectorAll("details.section"), openIdx = [];
    secs.forEach(function (d, i) { if (d.open) openIdx.push(i); });
    var sy = window.scrollY;
    rebuild();
    var ns = document.querySelectorAll("details.section");
    openIdx.forEach(function (i) { if (ns[i]) ns[i].open = true; });
    window.scrollTo(0, sy);
  }

  // ------- génération du .pptx -------
  function sanitize(s) { return String(s || "document").replace(/[^\wÀ-ſ]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60); }

  function generate() {
    var btn = $("btnGenerate");
    btn.disabled = true;
    var prev = btn.textContent;
    btn.textContent = "Génération en cours…";
    $("genMsg").textContent = "";
    // laisse l'UI se rafraîchir avant le calcul
    setTimeout(function () {
      try {
        var pptx = window.HexaDeck.generate(state.data);
        var fname = "Etude_patrimoniale_" + sanitize(state.data.doc.client) + "_" + sanitize(state.data.doc.date) + ".pptx";
        pptx.writeFile({ fileName: fname }).then(function () {
          $("genMsg").innerHTML = '<span class="ok">✓ Présentation générée : <strong>' + fname + "</strong></span>";
          try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "pptx-genere", title: "PowerPoint genere", event: true }); } catch (e) {}
        }).catch(function (e) {
          $("genMsg").innerHTML = '<span class="err">Erreur lors de l\'écriture : ' + (e && e.message || e) + "</span>";
        }).finally(function () { btn.disabled = false; btn.textContent = prev; });
      } catch (e) {
        $("genMsg").innerHTML = '<span class="err">Erreur de génération : ' + (e && e.message || e) + "</span>";
        console.error(e);
        btn.disabled = false; btn.textContent = prev;
      }
    }, 30);
  }

  // ------- livret imprimable A4 (HTML -> window.print) -------
  function openPrintBooklet() {
    window.HexaCompute.syncDerived(state.data); // valeurs dérivées fraîches avant rendu
    window.HexaPrint.open(state.data);
  }

  // ------- import / export JSON -------
  function exportJSON() {
    window.HexaCompute.syncDerived(state.data);
    var blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "donnees_" + sanitize(state.data.doc.client) + ".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function importJSON(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var obj = JSON.parse(reader.result);
        if (!obj.doc) throw new Error("Fichier de données invalide (clé 'doc' manquante).");
        if (!obj.modules) { obj.modules = {}; window.HEXA_MODULES.forEach(function (m) { obj.modules[m.id] = m.def; }); }
        state.data = obj; save(); rebuild();
        $("genMsg").innerHTML = '<span class="ok">✓ Données importées.</span>';
      } catch (e) {
        $("genMsg").innerHTML = '<span class="err">Import impossible : ' + (e && e.message || e) + "</span>";
      }
    };
    reader.readAsText(file);
  }

  function resetDefaults() {
    if (!confirm("Réinitialiser toutes les données avec l'exemple par défaut ? Vos saisies locales seront perdues.")) return;
    state.data = defaultData(); save(); rebuild();
    $("genMsg").textContent = "";
  }

  // ------- init -------
  function init() {
    // logo (en-tête + favicon) servi depuis le data URL embarqué — aucun fichier binaire
    if (window.HEXA_LOGO_DATAURL) {
      var lg = $("appbarLogo"); if (lg) lg.src = window.HEXA_LOGO_DATAURL;
      var fav = document.createElement("link"); fav.rel = "icon"; fav.type = "image/png"; fav.href = window.HEXA_LOGO_DATAURL;
      document.head.appendChild(fav);
    }
    // Indicateur de version visible (confirme qu'on exécute bien la dernière build).
    var verEl = document.querySelector(".appbar-titles p");
    if (verEl) verEl.insertAdjacentHTML("beforeend", ' <span style="opacity:.55;font-size:11px;font-weight:600">— build ' + BUILD + "</span>");
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) {}
    state.data = (saved && saved.doc) ? saved : defaultData();
    if (!state.data.modules) { state.data.modules = {}; window.HEXA_MODULES.forEach(function (m) { state.data.modules[m.id] = m.def; }); }
    window.HexaCompute.syncDerived(state.data);

    rebuild();
    state.data._objectifsRepopulated = false; // déjà rendu par rebuild()
    lastPersonsKey = personsKey();
    // Foyer modifié (nom/qualité d'un membre, ajout/suppression) : à la sortie du
    // champ, on rafraîchit les colonnes « personne » des revenus & charges.
    $("form").addEventListener("change", rebuildIfPersonsChanged);

    $("btnGenerate").addEventListener("click", generate);
    $("btnPrint").addEventListener("click", openPrintBooklet);
    $("btnExport").addEventListener("click", exportJSON);
    $("btnReset").addEventListener("click", resetDefaults);
    $("fileImport").addEventListener("change", function (e) { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ""; });
    $("btnImport").addEventListener("click", function () { $("fileImport").click(); });

    // ouvrir/fermer toutes les sections
    $("btnExpand").addEventListener("click", function () {
      var open = $("btnExpand").dataset.open !== "1";
      document.querySelectorAll("details.section").forEach(function (d) { d.open = open; });
      $("btnExpand").dataset.open = open ? "1" : "0";
      $("btnExpand").textContent = open ? "Tout réduire" : "Tout déplier";
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
