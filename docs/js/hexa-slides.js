/* =============================================================================
 * hexa-slides.js — Générateur de la présentation .pptx
 * -----------------------------------------------------------------------------
 * Consomme les données (HEXA_DEFAULT fusionné avec la saisie) + HEXA_EDU et
 * produit l'objet PptxGenJS complet via les helpers de hexa-brand.js.
 * Expose window.HexaDeck.generate(data) -> pptx.
 * ========================================================================== */
(function () {
  "use strict";

  var C, F, page, K;

  // ------------------------------------------------------------------ helpers
  function dataTable(slide, o) {
    var rows = [];
    if (o.headers) {
      rows.push(o.headers.map(function (h, i) {
        return { text: h, options: {
          fill: { color: o.headFill || C.PETROL }, color: "FFFFFF", bold: true,
          fontFace: F.HEAD, fontSize: o.headSize || 10.5,
          align: (o.align && o.align[i]) || "left", valign: "middle"
        } };
      }));
    }
    o.rows.forEach(function (r, ri) {
      var isTotal = o.totalRows && o.totalRows.indexOf(ri) >= 0;
      rows.push(r.map(function (cell, i) {
        var opt = {
          fontFace: F.BODY, fontSize: o.size || 10,
          color: isTotal ? C.PETROL : C.SLATE,
          align: (o.align && o.align[i]) || "left", valign: "middle",
          bold: isTotal || (o.boldCols && o.boldCols.indexOf(i) >= 0),
          fill: { color: isTotal ? C.TEAL_PALE : (ri % 2 ? C.MIST : "FFFFFF") }
        };
        if (o.deltaCol === i) opt.color = C.GREEN;
        return { text: String(cell), options: opt };
      }));
    });
    slide.addTable(rows, {
      x: o.x, y: o.y, w: o.w, colW: o.colW, rowH: o.rowH || 0.4,
      border: { type: "solid", color: C.LINE, pt: 0.75 },
      valign: "middle", margin: [2, 6, 2, 6], autoPage: false
    });
  }

  // Liste à marqueurs colorés (✓ / ⚠ / •)
  function markerList(slide, region, items, marker, markerColor, opts) {
    opts = opts || {};
    var runs = [];
    items.forEach(function (it) {
      runs.push({ text: marker + "  ", options: { color: markerColor, bold: true, fontFace: F.HEAD, fontSize: opts.size || 11.5 } });
      runs.push({ text: it, options: { color: C.SLATE, fontFace: F.BODY, fontSize: opts.size || 11.5, breakLine: true, paraSpaceAfter: opts.gap == null ? 9 : opts.gap } });
    });
    slide.addText(runs, { x: region.x, y: region.y, w: region.w, h: region.h, valign: "top", lineSpacingMultiple: 1.04 });
  }

  // Badge circulaire numéroté
  function numberBadge(slide, x, y, d, n, fill) {
    slide.addShape("ellipse", { x: x, y: y, w: d, h: d, fill: { color: fill || C.GOLD }, line: { type: "none" } });
    slide.addText(String(n), { x: x, y: y, w: d, h: d, align: "center", valign: "middle", fontFace: F.HEAD, fontSize: d > 0.6 ? 18 : 13, bold: true, color: "FFFFFF" });
  }

  // Lignes numérotées pleine largeur (objectifs, suivi)
  function numberedRows(slide, region, items, opts) {
    opts = opts || {};
    var gap = 0.18;
    var h = (region.h - gap * (items.length - 1)) / items.length;
    items.forEach(function (it, i) {
      var y = region.y + i * (h + gap);
      HEXA.card(slide, region.x, y, region.w, h, { fill: i % 2 ? C.MIST : C.PAPER, line: C.LINE });
      var d = Math.min(h - 0.18, 0.62);
      numberBadge(slide, region.x + 0.22, y + (h - d) / 2, d, it.n != null ? it.n : (i + 1), opts.badge || C.PETROL);
      var tx = region.x + 0.22 + d + 0.3;
      slide.addText(it.t || it.title, { x: tx, y: y + 0.08, w: region.w - (tx - region.x) - 0.3, h: h * 0.5, fontFace: F.HEAD, fontSize: opts.titleSize || 14, bold: true, color: C.PETROL, valign: "middle" });
      slide.addText(it.d || it.detail || "", { x: tx, y: y + h * 0.48, w: region.w - (tx - region.x) - 0.3, h: h * 0.46, fontFace: F.BODY, fontSize: opts.detailSize || 10.5, color: C.SLATE_LT, valign: "top" });
    });
  }

  // Cartes numérotées en grille (méthodologie)
  function numberedCards(slide, region, items, cols, opts) {
    opts = opts || {};
    var rows = Math.ceil(items.length / cols), gap = 0.2;
    var cw = (region.w - gap * (cols - 1)) / cols;
    var ch = (region.h - gap * (rows - 1)) / rows;
    items.forEach(function (it, i) {
      var r = Math.floor(i / cols), col = i % cols;
      var x = region.x + col * (cw + gap), y = region.y + r * (ch + gap);
      HEXA.card(slide, x, y, cw, ch, { fill: C.MIST, line: C.LINE });
      numberBadge(slide, x + 0.2, y + 0.2, 0.5, it.n, C.GOLD);
      slide.addText(it.t, { x: x + 0.85, y: y + 0.18, w: cw - 1.0, h: 0.5, fontFace: F.HEAD, fontSize: 13.5, bold: true, color: C.PETROL, valign: "middle" });
      slide.addText(it.d, { x: x + 0.22, y: y + 0.78, w: cw - 0.44, h: ch - 0.9, fontFace: F.BODY, fontSize: 10.5, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.05 });
    });
  }

  // Deux colonnes "panneau" titrées (entrée/sortie, avant/après, vie/transmission)
  function twoPanels(slide, region, left, right) {
    var gap = 0.3, w = (region.w - gap) / 2;
    [[region.x, left], [region.x + w + gap, right]].forEach(function (pair) {
      var x = pair[0], d = pair[1];
      HEXA.card(slide, x, region.y, w, region.h, { fill: C.PAPER, line: C.LINE });
      slide.addShape("roundRect", { x: x, y: region.y, w: w, h: 0.62, fill: { color: d.color || C.PETROL }, line: { type: "none" }, rectRadius: 0.09 });
      slide.addShape("rect", { x: x, y: region.y + 0.4, w: w, h: 0.22, fill: { color: d.color || C.PETROL }, line: { type: "none" } });
      slide.addText(d.title, { x: x + 0.25, y: region.y, w: w - 0.5, h: 0.62, fontFace: F.HEAD, fontSize: 14, bold: true, color: "FFFFFF", valign: "middle" });
      if (d.items) {
        markerList(slide, { x: x + 0.28, y: region.y + 0.82, w: w - 0.56, h: region.h - 1.0 }, d.items, "▸", d.color || C.PETROL, { size: 11, gap: 8 });
      } else if (d.cards) {
        HEXA.cardGrid(slide, { x: x + 0.22, y: region.y + 0.78, w: w - 0.44, h: region.h - 0.98 }, d.cards, { cols: 1, titleSize: 12, bodySize: 10, gap: 0.16 });
      }
    });
  }

  function dispositifDivider(pptx, title, subtitle) {
    return HEXA.divider(pptx, { kicker: "Dispositif patrimonial", title: title, subtitle: subtitle });
  }

  // ====================================================================== SLIDES

  function cover(pptx, data) {
    var s = pptx.addSlide();
    s.background = { color: C.PETROL };
    HEXA.fill(s, C.PETROL);
    s.addShape("ellipse", { x: -2.2, y: 4.2, w: 6.5, h: 6.5, fill: { color: C.PETROL_DK }, line: { type: "none" } });
    s.addShape("ellipse", { x: 9.8, y: -2.6, w: 7, h: 7, fill: { color: C.PETROL_LT }, line: { type: "none" } });
    HEXA.rule(s, 0, 0, HEXA.PAGE.W, 0.16, C.GOLD);
    HEXA.rule(s, 0, HEXA.PAGE.H - 0.16, HEXA.PAGE.W, 0.16, C.GOLD);
    HEXA.logoTopRight(s, { dark: true });
    s.addText("ÉTUDE PATRIMONIALE", { x: 1, y: 2.7, w: 11.3, h: 0.45, align: "center", fontFace: F.HEAD, fontSize: 15, bold: true, color: C.GOLD, charSpacing: 4 });
    s.addText(data.doc.title, { x: 1, y: 3.1, w: 11.3, h: 1.1, align: "center", fontFace: F.HEAD, fontSize: 46, bold: true, color: "FFFFFF" });
    s.addShape("rect", { x: HEXA.PAGE.W / 2 - 0.9, y: 4.28, w: 1.8, h: 0.045, fill: { color: C.GOLD }, line: { type: "none" } });
    s.addText(data.doc.client, { x: 1, y: 4.5, w: 11.3, h: 0.7, align: "center", fontFace: F.SERIF, fontSize: 28, italic: true, color: "FFFFFF" });
    s.addText(data.doc.date, { x: 1, y: 5.3, w: 11.3, h: 0.5, align: "center", fontFace: F.HEAD, fontSize: 16, color: C.TEAL_PALE, charSpacing: 2 });
    s.addText(data.doc.location, { x: 1, y: 6.5, w: 11.3, h: 0.4, align: "center", fontFace: F.BODY, fontSize: 12, color: "9FD0D6" });
    s.addText(HEXA.COPYRIGHT, { x: 1, y: 6.95, w: 11.3, h: 0.3, align: "center", fontFace: F.BODY, fontSize: 9, color: "7FBFC8" });
  }

  function advisor(pptx, data) {
    var s = pptx.addSlide();
    s.background = { color: C.PETROL };
    HEXA.fill(s, C.PETROL);
    s.addShape("ellipse", { x: 9.5, y: 3.8, w: 7, h: 7, fill: { color: C.PETROL_DK }, line: { type: "none" } });
    HEXA.logoTopRight(s, { dark: true });
    HEXA.rule(s, HEXA.M, 1.0, 0.09, 2.0, C.GOLD);
    s.addText("VOTRE", { x: HEXA.M + 0.32, y: 1.0, w: 6, h: 0.6, fontFace: F.HEAD, fontSize: 30, bold: true, color: "FFFFFF" });
    s.addText("CONSEILLER", { x: HEXA.M + 0.32, y: 1.6, w: 8, h: 0.7, fontFace: F.HEAD, fontSize: 36, bold: true, color: C.GOLD });
    // carte contact
    var cx = 7.0, cw = HEXA.PAGE.W - cx - HEXA.M;
    HEXA.card(s, cx, 1.0, cw, 5.2, { fill: "FFFFFF", line: null });
    var lines = [
      { t: data.doc.advisorName, big: true },
      { t: data.doc.advisorFirm, muted: true },
      { sep: true },
      { label: "Email", t: data.doc.advisorEmail },
      { label: "Téléphone", t: data.doc.advisorPhone },
      { label: "Numéro Orias", t: data.doc.advisorOrias },
      { sep: true },
      { t: data.doc.advisorMembership, small: true },
      { t: data.doc.advisorCPI, small: true }
    ];
    var yy = 1.4;
    lines.forEach(function (l) {
      if (l.sep) { HEXA.rule(s, cx + 0.4, yy + 0.05, cw - 0.8, 0.012, C.LINE); yy += 0.2; return; }
      if (l.big) { s.addText(l.t, { x: cx + 0.4, y: yy, w: cw - 0.8, h: 0.55, fontFace: F.HEAD, fontSize: 26, bold: true, color: C.PETROL }); yy += 0.6; return; }
      if (l.muted) { s.addText(l.t, { x: cx + 0.4, y: yy, w: cw - 0.8, h: 0.4, fontFace: F.HEAD, fontSize: 14, color: C.GOLD_DK }); yy += 0.5; return; }
      if (l.small) { s.addText(l.t, { x: cx + 0.4, y: yy, w: cw - 0.8, h: 0.4, fontFace: F.BODY, fontSize: 9.5, color: C.SLATE_LT }); yy += 0.36; return; }
      s.addText([
        { text: l.label + "   ", options: { fontFace: F.HEAD, fontSize: 11, bold: true, color: C.PETROL_LT } },
        { text: l.t, options: { fontFace: F.BODY, fontSize: 13, color: C.SLATE } }
      ], { x: cx + 0.4, y: yy, w: cw - 0.8, h: 0.42, valign: "middle" });
      yy += 0.5;
    });
    s.addText(data.doc.location, { x: HEXA.M + 0.32, y: 6.35, w: 6, h: 0.4, fontFace: F.BODY, fontSize: 12, color: "9FD0D6" });
    s.addText(HEXA.COPYRIGHT, { x: HEXA.M + 0.32, y: 6.78, w: 9, h: 0.3, fontFace: F.BODY, fontSize: 8.5, color: "7FBFC8" });
  }

  function methodologie(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "Démarche", title: "Méthodologie & périmètre de l'audit" });
    var ed = HEXA_EDU.methodologie;
    numberedCards(o.slide, { x: o.body.x, y: o.body.y, w: o.body.w, h: 3.0 }, ed.steps, 3);
    var ny = o.body.y + 3.2, nh = o.body.h - 3.2, gap = 0.3, hw = (o.body.w - gap) / 2;
    [[o.body.x, "Cadre & limites", ed.cadre], [o.body.x + hw + gap, "Périmètre & sources", ed.perimetre]].forEach(function (p) {
      HEXA.card(o.slide, p[0], ny, hw, nh, { fill: C.TEAL_PALE, line: null });
      o.slide.addText(p[1], { x: p[0] + 0.25, y: ny + 0.12, w: hw - 0.5, h: 0.4, fontFace: F.HEAD, fontSize: 12.5, bold: true, color: C.PETROL });
      o.slide.addText(p[2], { x: p[0] + 0.25, y: ny + 0.56, w: hw - 0.5, h: nh - 0.7, fontFace: F.BODY, fontSize: 9.8, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.05 });
    });
  }

  function contexte(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "Contexte de rendez-vous", title: "Restitution d'une stratégie patrimoniale" });
    HEXA.card(o.slide, o.body.x, o.body.y, o.body.w, 1.5, { fill: C.MIST, line: C.LINE });
    o.slide.addText(data.contexte.intro, { x: o.body.x + 0.3, y: o.body.y + 0.2, w: o.body.w - 0.6, h: 1.1, fontFace: F.BODY, fontSize: 13, color: C.SLATE, valign: "middle", lineSpacingMultiple: 1.1 });
    var ay = o.body.y + 1.75;
    HEXA.card(o.slide, o.body.x, ay, o.body.w, o.body.h - 1.75, { fill: C.PAPER, line: C.GOLD, lineW: 1.5 });
    o.slide.addShape("rect", { x: o.body.x, y: ay, w: 0.12, h: o.body.h - 1.75, fill: { color: C.GOLD }, line: { type: "none" } });
    o.slide.addText("Avertissement", { x: o.body.x + 0.35, y: ay + 0.18, w: o.body.w - 0.7, h: 0.4, fontFace: F.HEAD, fontSize: 13, bold: true, color: C.GOLD_DK });
    o.slide.addText(data.contexte.avertissement, { x: o.body.x + 0.35, y: ay + 0.6, w: o.body.w - 0.7, h: o.body.h - 1.75 - 0.75, fontFace: F.BODY, fontSize: 10.5, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.08 });
  }

  function synthese(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "Synthèse exécutive", title: "L'essentiel du diagnostic et des recommandations" });
    var gap = 0.3, w = (o.body.w - gap) / 2;
    // Diagnostic
    HEXA.card(o.slide, o.body.x, o.body.y, w, o.body.h, { fill: C.MIST, line: C.LINE });
    o.slide.addShape("roundRect", { x: o.body.x, y: o.body.y, w: w, h: 0.6, fill: { color: C.PETROL }, line: { type: "none" }, rectRadius: 0.09 });
    o.slide.addShape("rect", { x: o.body.x, y: o.body.y + 0.38, w: w, h: 0.22, fill: { color: C.PETROL }, line: { type: "none" } });
    o.slide.addText("Diagnostic en bref", { x: o.body.x + 0.25, y: o.body.y, w: w - 0.5, h: 0.6, fontFace: F.HEAD, fontSize: 15, bold: true, color: "FFFFFF", valign: "middle" });
    var diag = [K.patrimoineBullet(data)].concat(data.synthese.diagnostic || []);
    markerList(o.slide, { x: o.body.x + 0.3, y: o.body.y + 0.8, w: w - 0.6, h: o.body.h - 1.0 }, diag, "▸", C.PETROL_LT, { size: 11.5, gap: 9 });
    // Recommandations
    var rx = o.body.x + w + gap;
    HEXA.card(o.slide, rx, o.body.y, w, o.body.h, { fill: "FBF7EA", line: C.GOLD, lineW: 1.2 });
    o.slide.addShape("roundRect", { x: rx, y: o.body.y, w: w, h: 0.6, fill: { color: C.GOLD_DK }, line: { type: "none" }, rectRadius: 0.09 });
    o.slide.addShape("rect", { x: rx, y: o.body.y + 0.38, w: w, h: 0.22, fill: { color: C.GOLD_DK }, line: { type: "none" } });
    o.slide.addText("Recommandations clés", { x: rx + 0.25, y: o.body.y, w: w - 0.5, h: 0.6, fontFace: F.HEAD, fontSize: 15, bold: true, color: "FFFFFF", valign: "middle" });
    var ry = o.body.y + 0.82, rh = (o.body.h - 0.95) / data.synthese.recommandations.length;
    data.synthese.recommandations.forEach(function (rec, i) {
      var yy = ry + i * rh;
      numberBadge(o.slide, rx + 0.3, yy + 0.06, 0.4, i + 1, C.GOLD_DK);
      o.slide.addText([
        { text: rec.title + "\n", options: { fontFace: F.HEAD, fontSize: 12, bold: true, color: C.PETROL } },
        { text: rec.detail, options: { fontFace: F.BODY, fontSize: 9.8, color: C.SLATE } }
      ], { x: rx + 0.85, y: yy, w: w - 1.1, h: rh - 0.05, valign: "top", lineSpacingMultiple: 1.02 });
    });
  }

  function profil(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "1 · Découverte", title: "Composition du foyer" });
    var f = data.foyer || {}, bw = o.body.w;
    var members = f.membres || [], n = Math.max(members.length, 1);
    // Tableau transposé : membres en colonnes, caractéristiques en lignes
    var headers = [""].concat(members.map(function (m) { return ((m.qualite || "") + " " + (m.prenom || "")).trim() || "Membre"; }));
    var labelFrac = 0.2, memFrac = (1 - labelFrac) / n;
    var colW = [bw * labelFrac].concat(members.map(function () { return bw * memFrac; }));
    var align = ["left"].concat(members.map(function () { return "center"; }));
    var defs = [
      ["Nom", function (m) { return m.nom; }],
      ["Date de naissance", function (m) { return K.formatDateFR(m.naissance); }],
      ["Lieu de naissance", function (m) { return m.lieuNaissance; }],
      ["Capacité juridique", function (m) { return m.capacite; }],
      ["Handicap", function (m) { return m.handicap || "Non"; }],
      ["Situation maritale", function (m) { return m.situationMaritale || "—"; }],
      ["Régime", function (m) { return m.regime || "—"; }],
      ["Enfant de", function (m) { return m.qualite === "Enfant" ? (m.filiation || "—") : "—"; }],
      ["Activité pro.", function (m) { return [m.activitePro, m.statut, m.contrat].filter(Boolean).join(" · ") || "—"; }]
    ];
    var rowH = 0.35;
    var rows = defs.map(function (d) { return [d[0]].concat(members.map(function (m) { return d[1](m) || ""; })); });
    dataTable(o.slide, { x: o.body.x, y: o.body.y, w: bw, headers: headers, colW: colW, align: align, rows: rows, boldCols: [0], rowH: rowH, size: 9.5, headSize: 10 });
    var ty = o.body.y + (rows.length + 1) * rowH + 0.26;
    // Attributs du foyer (résidence + activité dérivée)
    var attrs = [
      ["Résidence fiscale", f.residence], ["Activité & revenus", K.activiteFromBudget(data.budget)]
    ];
    var gap = 0.22, cw = (bw - gap) / 2, ch = 0.66;
    attrs.forEach(function (a, i) {
      var r = Math.floor(i / 2), c = i % 2;
      var x = o.body.x + c * (cw + gap), y = ty + r * (ch + 0.14);
      HEXA.card(o.slide, x, y, cw, ch, { fill: i % 2 ? C.MIST : C.PAPER, line: C.LINE, shadow: false });
      o.slide.addShape("rect", { x: x, y: y, w: 0.09, h: ch, fill: { color: C.PETROL }, line: { type: "none" } });
      o.slide.addText(String(a[0]).toUpperCase(), { x: x + 0.22, y: y + 0.06, w: cw - 0.35, h: 0.22, fontFace: F.HEAD, fontSize: 9, bold: true, color: C.GOLD_DK, charSpacing: 0.5 });
      o.slide.addText(a[1] || "—", { x: x + 0.22, y: y + 0.27, w: cw - 0.35, h: ch - 0.31, fontFace: F.BODY, fontSize: 10.5, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.0 });
    });
    var ny = ty + Math.ceil(attrs.length / 2) * (ch + 0.14) + 0.06;
    o.slide.addText("ℹ  " + (data.foyerNote || ""), { x: o.body.x, y: Math.min(ny, HEXA.FOOT_Y - 0.38), w: o.body.w, h: 0.33, fontFace: F.BODY, fontSize: 9, italic: true, color: C.SLATE_LT, valign: "middle" });
  }

  function actif(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "1 · Découverte", title: "Composition du patrimoine brut consolidé" });
    var a = data.actif, t = K.assetTotals(a);
    // KPIs entièrement calculés (brut, passif, net, part immobilière, endettement)
    var kpis = [
      { v: K.formatEur(t.brut), l: "Actif brut", fill: C.PETROL },
      { v: K.formatEur(t.passif), l: "Passif", fill: C.PETROL_LT },
      { v: K.formatEur(t.net), l: "Actif net", fill: C.PETROL },
      { v: K.formatPctVal(t.partImmoPct), l: "Part immobilière", fill: C.GOLD_DK },
      { v: K.formatPctVal(t.endettementPct), l: "Taux d'endettement", fill: C.GOLD_DK }
    ];
    var gap = 0.2, kw = (o.body.w - gap * 4) / 5, kh = 1.1;
    kpis.forEach(function (k, i) { HEXA.kpi(o.slide, o.body.x + i * (kw + gap), o.body.y, kw, kh, k.v, k.l, { fill: k.fill, valueSize: 17, labelSize: 8 }); });
    var cy = o.body.y + kh + 0.25, chH = o.body.h - kh - 0.25;
    // Répartition croisée : un empilement par détenteur, ventilé par type d'actif.
    var abt = K.assetByHolderType(a);
    var PALETTE = [C.PETROL, C.GOLD_DK, C.PETROL_LT, C.AMBER, C.GREEN, C.SLATE_LT];
    var chartData = abt.categories.map(function (c) {
      return { name: c, labels: abt.holders, values: abt.holders.map(function (h) { return (abt.matrix[h] || {})[c] || 0; }) };
    });
    var chW = o.body.w * 0.58;
    o.slide.addChart(pptx.ChartType.bar, chartData, {
      x: o.body.x, y: cy, w: chW, h: chH - 0.35, barDir: "bar", barGrouping: "stacked",
      chartColors: PALETTE.slice(0, chartData.length), showLegend: true, legendPos: "b", legendFontSize: 7.5, legendFontFace: F.BODY, legendColor: C.SLATE,
      showValue: false, catAxisLabelFontSize: 8, catAxisLabelFontFace: F.BODY, catAxisLabelColor: C.SLATE,
      valAxisLabelFontSize: 8, valAxisLabelFormatCode: "#,##0", valAxisLabelColor: C.SLATE_LT,
      showTitle: true, title: "Patrimoine par détenteur et type d'actif (€)", titleFontSize: 11, titleFontFace: F.HEAD, titleColor: C.PETROL,
      dataBorder: { pt: 1, color: "FFFFFF" }
    });
    o.slide.addText([
      { text: "Total — ", options: { fontFace: F.HEAD, fontSize: 9.5, bold: true, color: C.PETROL } },
      { text: "Immobilier : " + K.formatEur(t.immo) + "   ·   Autres : " + K.formatEur(t.autres) + "   ·   Brut : " + K.formatEur(t.brut), options: { fontFace: F.BODY, fontSize: 9.5, color: C.SLATE } }
    ], { x: o.body.x, y: cy + chH - 0.32, w: chW, h: 0.3, align: "center", valign: "middle" });
    // Colonne droite : lecture (haut) + passif/prêts (bas)
    var rx = o.body.x + chW + 0.3, rw = o.body.w - chW - 0.3, commentH = 1.35;
    HEXA.card(o.slide, rx, cy, rw, commentH, { fill: C.TEAL_PALE, line: null });
    o.slide.addText("Lecture", { x: rx + 0.22, y: cy + 0.1, w: rw - 0.4, h: 0.3, fontFace: F.HEAD, fontSize: 11.5, bold: true, color: C.PETROL });
    o.slide.addText("→  " + a.comment, { x: rx + 0.22, y: cy + 0.42, w: rw - 0.4, h: commentH - 0.5, fontFace: F.BODY, fontSize: 10.5, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.06 });
    var ly = cy + commentH + 0.18, lh = chH - commentH - 0.18;
    HEXA.card(o.slide, rx, ly, rw, lh, { fill: C.PAPER, line: C.LINE });
    o.slide.addShape("roundRect", { x: rx, y: ly, w: rw, h: 0.42, fill: { color: C.PETROL_LT }, line: { type: "none" }, rectRadius: 0.06 });
    o.slide.addShape("rect", { x: rx, y: ly + 0.22, w: rw, h: 0.2, fill: { color: C.PETROL_LT }, line: { type: "none" } });
    o.slide.addText([
      { text: "Passif — prêts en cours     ", options: { fontFace: F.HEAD, fontSize: 11, bold: true, color: "FFFFFF" } },
      { text: "CRD total " + K.formatEur(t.passif), options: { fontFace: F.BODY, fontSize: 9.5, color: "FFFFFF" } }
    ], { x: rx + 0.2, y: ly, w: rw - 0.4, h: 0.42, valign: "middle" });
    var loans = a.passifs || [], runs = [];
    if (!loans.length) runs.push({ text: "Aucun prêt en cours.", options: { fontFace: F.BODY, fontSize: 10, italic: true, color: C.SLATE_LT } });
    loans.forEach(function (l) {
      runs.push({ text: "• " + (l.designation || "Prêt") + (l.typeCredit ? " (" + l.typeCredit + ")" : "") + "  ", options: { fontFace: F.HEAD, fontSize: 9.5, bold: true, color: C.PETROL } });
      runs.push({ text: "CRD " + K.formatEur(K.parseNum(l.crd)) + (l.taux ? "  ·  " + l.taux : "") + (l.mensualite ? "  ·  " + K.formatEur(K.parseNum(l.mensualite)) + "/mois" : "") + (l.dateFin ? "  ·  fin " + K.formatDateFR(l.dateFin) : "") + (l.rattachement ? "  ·  " + l.rattachement : ""), options: { fontFace: F.BODY, fontSize: 9, color: C.SLATE, breakLine: true, paraSpaceAfter: 4 } });
    });
    o.slide.addText(runs, { x: rx + 0.22, y: ly + 0.55, w: rw - 0.44, h: lh - 0.65, valign: "top", lineSpacingMultiple: 1.02 });
  }

  function immobilierSlide(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "1 · Découverte", title: "Patrimoine immobilier" });
    var im = (data.actif && data.actif.immobilier) || [], bw = o.body.w;
    function droitTxt(a) { return a.droit === "NP" && a.ageUsufruitier ? "NP (usuf. " + a.ageUsufruitier + " ans)" : (a.droit || "PP"); }
    var total = 0; im.forEach(function (a) { total += K.parseNum(a.valeur); });
    var rows = im.map(function (a) {
      return [a.designation || "—", a.classe || "", a.type || "", K.formatEur(K.parseNum(a.valeur)), a.proprietaire || "", (a.quote ? a.quote + " %" : ""), droitTxt(a)];
    });
    rows.push(["TOTAL IMMOBILIER", "", "", K.formatEur(total), "", "", ""]);
    dataTable(o.slide, {
      x: o.body.x, y: o.body.y, w: bw,
      headers: ["Désignation", "Classe", "Type", "Valeur", "Propriétaire", "Quote-part", "Droit"],
      colW: [bw * 0.20, bw * 0.14, bw * 0.13, bw * 0.13, bw * 0.15, bw * 0.12, bw * 0.13],
      align: ["left", "left", "left", "right", "left", "center", "center"],
      rows: rows, totalRows: [rows.length - 1], boldCols: [0], rowH: 0.46, size: 10, headSize: 9.5
    });
    var ny = o.body.y + (rows.length + 1) * 0.46 + 0.3;
    HEXA.card(o.slide, o.body.x, ny, o.body.w, 0.95, { fill: C.TEAL_PALE, line: null });
    o.slide.addText("Lecture des droits", { x: o.body.x + 0.25, y: ny + 0.1, w: o.body.w - 0.5, h: 0.3, fontFace: F.HEAD, fontSize: 11.5, bold: true, color: C.PETROL });
    o.slide.addText("PP = pleine propriété · NP = nue-propriété · UF = usufruit. En cas de démembrement (NP), l'âge de l'usufruitier conditionne la valeur fiscale de la nue-propriété (barème de l'article 669 du CGI).", { x: o.body.x + 0.25, y: ny + 0.42, w: o.body.w - 0.5, h: 0.5, fontFace: F.BODY, fontSize: 10, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.05 });
  }

  function budget(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "1 · Découverte", title: "Analyse budgétaire — revenus & charges" });
    var b = data.budget, bt = K.budgetTotals(b), bw = o.body.w, gap = 0.3, w = (bw - gap) / 2;
    var rev = bt.totalRevenus;
    function montantCell(m) { return K.isBlank(m) ? "—" : K.formatNum(K.parseNum(m)); }
    function pctOf(amount) { return rev ? K.formatPct(amount, rev) : "—"; }
    // --- Revenus : matrice (colonnes = personnes ayant un revenu) ---
    var persons = K.personLabels(data), lines = b.revenus || [];
    var active = persons; // toutes les personnes du foyer (+ Foyer), y compris les membres sans revenu
    var rHead = ["Revenu"].concat(active).concat(["Total"]);
    var rRows = lines.map(function (l) {
      return [l.poste + (l.libelle ? " — " + l.libelle : "")]
        .concat(active.map(function (p) { return montantCell((l.montants || {})[p]); }))
        .concat([K.formatNum(K.lineTotal(l))]);
    });
    rRows.push(["TOTAL REVENUS"].concat(active.map(function (p) {
      var s = 0; lines.forEach(function (l) { s += K.parseNum((l.montants || {})[p]); }); return K.formatNum(s);
    })).concat([K.formatNum(rev)]));
    var nCols = rHead.length, firstW = bw * 0.26, restW = (bw - firstW) / (nCols - 1);
    var rColW = [firstW], rAlign = ["left"]; for (var ci = 1; ci < nCols; ci++) { rColW.push(restW); rAlign.push("right"); }
    var rH = 0.36;
    dataTable(o.slide, { x: o.body.x, y: o.body.y, w: bw, headers: rHead, colW: rColW, align: rAlign, rows: rRows, totalRows: [rRows.length - 1], rowH: rH, size: 9.5, headSize: 9 });
    var midY = o.body.y + (rRows.length + 1) * rH + 0.22;
    // --- Charges (gauche) ---
    function chargeT(r) { return (r && r.montants) ? K.lineTotal(r) : K.parseNum(r && r.montant); }
    var cRows = (b.charges || []).map(function (r) { var rt = chargeT(r); return [r.poste + (r.libelle ? " — " + r.libelle : ""), montantCell(rt), pctOf(rt)]; });
    cRows.push(["TOTAL CHARGES", K.formatNum(bt.totalCharges), pctOf(bt.totalCharges)]);
    var chH = (cRows.length + 1) * 0.32;
    dataTable(o.slide, { x: o.body.x, y: midY, w: w, headers: ["Charges", "Montant", "% Rev."], colW: [w - 2.7, 1.5, 1.2], align: ["left", "right", "right"], rows: cRows, totalRows: [cRows.length - 1], rowH: 0.32, size: 9.5, headSize: 9 });
    // --- Éléments exceptionnels (droite) ---
    var ex = b.exceptionnels || { revenus: [], charges: [] };
    HEXA.card(o.slide, o.body.x + w + gap, midY, w, chH, { fill: C.MIST, line: C.LINE });
    o.slide.addText("ÉLÉMENTS EXCEPTIONNELS · hors disponible", { x: o.body.x + w + gap + 0.2, y: midY + 0.08, w: w - 0.4, h: 0.26, fontFace: F.HEAD, fontSize: 9.5, bold: true, color: C.GOLD_DK });
    function exRuns(list, lab) {
      var runs = [{ text: lab + " : ", options: { fontFace: F.HEAD, fontSize: 9, bold: true, color: C.PETROL_LT } }];
      if (!list || !list.length) { runs.push({ text: "—", options: { fontSize: 9, color: C.SLATE_LT, breakLine: true } }); return runs; }
      list.forEach(function (r, idx) { runs.push({ text: (r.libelle || r.poste || "") + " " + K.formatEur(K.parseNum(r.montant)) + (idx < list.length - 1 ? " · " : ""), options: { fontSize: 9, color: C.SLATE, breakLine: idx === list.length - 1 } }); });
      return runs;
    }
    o.slide.addText(exRuns(ex.revenus, "Revenus exc.").concat(exRuns(ex.charges, "Charges exc.")), { x: o.body.x + w + gap + 0.2, y: midY + 0.36, w: w - 0.4, h: chH - 0.44, valign: "top", lineSpacingMultiple: 1.15 });
    // --- Budget disponible ---
    var dy = midY + chH + 0.16, dh = 0.56;
    HEXA.card(o.slide, o.body.x, dy, bw, dh, { fill: C.PETROL, line: null });
    o.slide.addText([
      { text: "BUDGET DISPONIBLE", options: { fontFace: F.HEAD, fontSize: 13, bold: true, color: "FFFFFF" } },
      { text: "  (hors except.)   ", options: { fontFace: F.BODY, fontSize: 10, color: C.TEAL_PALE } },
      { text: K.formatEur(bt.disponible) + "   ", options: { fontFace: F.HEAD, fontSize: 17, bold: true, color: C.GOLD } },
      { text: K.formatPct(bt.disponible, rev) + " des revenus   ·   ~" + K.formatEur(bt.epargneMensuelle) + " / mois", options: { fontFace: F.BODY, fontSize: 10.5, color: C.TEAL_PALE } }
    ], { x: o.body.x + 0.3, y: dy, w: bw - 0.6, h: dh, valign: "middle" });
    var ny = dy + dh + 0.12;
    // Unique note de bas de page : synthèse générée depuis les totaux calculés (bt).
    // b.note n'est volontairement PAS affiché (en données réelles il peut contenir
    // d'anciens chiffres erronés, et non un commentaire qualitatif).
    var autoNote = "Revenus " + K.formatEur(bt.totalRevenus) + "   ·   Charges " + K.formatEur(bt.totalCharges)
      + "   ·   Disponible " + K.formatEur(bt.disponible) + " (" + K.formatPct(bt.disponible, bt.totalRevenus) + ")"
      + "   ·   Taux d'endettement " + K.formatPctVal(bt.tauxEffortPct)
      + "   ·   Pression fiscale " + K.formatPctVal(bt.pressionFiscalePct) + ".";
    o.slide.addText(autoNote, { x: o.body.x, y: ny, w: bw, h: Math.min(0.3, HEXA.FOOT_Y - ny - 0.06), fontFace: F.BODY, fontSize: 9, italic: true, color: C.SLATE_LT, valign: "top", lineSpacingMultiple: 1.04 });
  }

  function diagnostic(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "2 · Diagnostic", title: "Diagnostic patrimonial — forces & points de vigilance" });
    var dg = K.diagnostic(data);
    var gap = 0.3, w = (o.body.w - gap) / 2;
    HEXA.card(o.slide, o.body.x, o.body.y, w, o.body.h, { fill: C.GREEN_BG, line: null });
    o.slide.addText("✓  FORCES", { x: o.body.x + 0.3, y: o.body.y + 0.18, w: w - 0.6, h: 0.45, fontFace: F.HEAD, fontSize: 15, bold: true, color: C.GREEN });
    markerList(o.slide, { x: o.body.x + 0.3, y: o.body.y + 0.75, w: w - 0.6, h: o.body.h - 0.95 }, dg.forces, "✓", C.GREEN, { size: 11.5, gap: 10 });
    var rx = o.body.x + w + gap;
    HEXA.card(o.slide, rx, o.body.y, w, o.body.h, { fill: C.RED_BG, line: null });
    o.slide.addText("⚠  POINTS DE VIGILANCE", { x: rx + 0.3, y: o.body.y + 0.18, w: w - 0.6, h: 0.45, fontFace: F.HEAD, fontSize: 15, bold: true, color: C.RED });
    markerList(o.slide, { x: rx + 0.3, y: o.body.y + 0.75, w: w - 0.6, h: o.body.h - 0.95 }, dg.vigilance, "•", C.RED, { size: 11.5, gap: 8 });
  }

  function risques(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "2 · Diagnostic", title: "Cartographie des risques" });
    var items = data.risques, gap = 0.18;
    var h = (o.body.h - gap * (items.length - 1)) / items.length;
    var levelColor = { "Élevé": C.RED, "Moyen": C.AMBER, "Modéré": C.PETROL_LT };
    items.forEach(function (it, i) {
      var y = o.body.y + i * (h + gap), col = levelColor[it.level] || C.PETROL_LT;
      HEXA.card(o.slide, o.body.x, y, o.body.w, h, { fill: C.PAPER, line: C.LINE });
      o.slide.addShape("rect", { x: o.body.x, y: y, w: 0.12, h: h, fill: { color: col }, line: { type: "none" } });
      o.slide.addText(it.risk, { x: o.body.x + 0.35, y: y, w: o.body.w * 0.42, h: h, fontFace: F.HEAD, fontSize: 13, bold: true, color: C.PETROL, valign: "middle" });
      HEXA.pill(o.slide, o.body.x + o.body.w * 0.45, y + (h - 0.34) / 2, 1.35, 0.34, it.level, col, "FFFFFF");
      o.slide.addText(it.desc, { x: o.body.x + o.body.w * 0.45 + 1.5, y: y, w: o.body.w * 0.55 - 1.5, h: h, fontFace: F.BODY, fontSize: 10.5, color: C.SLATE, valign: "middle", lineSpacingMultiple: 1.02 });
    });
  }

  function successionTable(pptx, data, sc, title, kicker) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: kicker, title: title });
    var rows = sc.scenarios.map(function (s) {
      return [s.name, K.formatEur(K.parseNum(s.d1)), K.formatEur(K.parseNum(s.d2)), K.formatEur(K.scenarioTotal(s))];
    });
    dataTable(o.slide, {
      x: o.body.x, y: o.body.y, w: o.body.w,
      headers: ["Scénario", "Droits 1er décès*", "Droits 2nd décès*", "TOTAL"],
      colW: [o.body.w - 3 * 2.6, 2.6, 2.6, 2.6], align: ["left", "right", "right", "right"],
      rows: rows, boldCols: [3], rowH: 0.62, size: 12, headSize: 12
    });
    var oy = o.body.y + (rows.length + 1) * 0.62 + 0.4;
    if (sc.observation) {
      HEXA.card(o.slide, o.body.x, oy, o.body.w, 1.2, { fill: C.TEAL_PALE, line: null });
      o.slide.addText([
        { text: "Observation   ", options: { fontFace: F.HEAD, fontSize: 12, bold: true, color: C.PETROL } },
        { text: sc.observation, options: { fontFace: F.BODY, fontSize: 12, color: C.SLATE } }
      ], { x: o.body.x + 0.3, y: oy + 0.15, w: o.body.w - 0.6, h: 0.9, valign: "middle", lineSpacingMultiple: 1.08 });
    }
    var det = (data.succession && data.succession.details) || {};
    var hypo = "* Droits incombant à vos enfants. Calcul automatique — liquidation par qualité de détention (propres / communs) selon le régime déclaré : " + (det.regime || "non renseigné") + " ; "
      + (det.assuranceVieHorsSuccession === false ? "assurance-vie intégrée à l'assiette" : "assurance-vie hors succession (art. 990 I)")
      + " ; abattement 100 000 €/enfant/parent (art. 779) ; barème ligne directe 2026.";
    o.slide.addText(hypo, { x: o.body.x, y: HEXA.FOOT_Y - 0.42, w: o.body.w, h: 0.3, fontFace: F.BODY, fontSize: 9, italic: true, color: C.SLATE_LT });
  }

  function successionCompare(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "2.1 · Audit successoral", title: "Impact des donations de nue-propriété" });
    var gap = 0.3, w = (o.body.w - gap) / 2, su = data.succession;
    [[o.body.x, su.monsieurDon, su.monsieur, "Si Monsieur décède en premier — avec donation NP"],
     [o.body.x + w + gap, su.madameDon, su.madame, "Si Madame décède en premier — avec donation NP"]].forEach(function (pair) {
      var x = pair[0], sc = pair[1], base = pair[2], stitle = pair[3];
      o.slide.addText(stitle, { x: x, y: o.body.y, w: w, h: 0.4, fontFace: F.HEAD, fontSize: 13, bold: true, color: C.PETROL });
      var rows = sc.scenarios.map(function (s, i) {
        var gain = K.donationGain(base.scenarios, s, i);
        return [s.name, K.formatEur(K.scenarioTotal(s)), gain == null ? "—" : K.formatEurSigned(gain)];
      });
      dataTable(o.slide, {
        x: x, y: o.body.y + 0.5, w: w, headers: ["Scénario", "TOTAL", "Gain"],
        colW: [w - 3.2, 1.9, 1.3], align: ["left", "right", "right"], rows: rows, deltaCol: 2, boldCols: [2], rowH: 0.62, size: 11, headSize: 10.5
      });
    });
    var maxSaving = 0;
    [[su.monsieurDon, su.monsieur], [su.madameDon, su.madame]].forEach(function (p) {
      p[0].scenarios.forEach(function (s, i) { var g = K.donationGain(p[1].scenarios, s, i); if (g != null && -g > maxSaving) maxSaving = -g; });
    });
    var msg = maxSaving > 0
      ? "La donation en nue-propriété réduit le coût successoral global (gain jusqu'à ~" + Math.round(maxSaving / 1000) + " k€ selon le scénario)."
      : "L'impact d'une donation en nue-propriété dépend du scénario retenu (voir les écarts ci-dessus).";
    var ny = o.body.y + 0.5 + 4 * 0.62 + 0.25;
    HEXA.card(o.slide, o.body.x, ny, o.body.w, o.body.h - (ny - o.body.y) - 0.1, { fill: C.GREEN_BG, line: null });
    o.slide.addText(msg, { x: o.body.x + 0.3, y: ny + 0.1, w: o.body.w - 0.6, h: o.body.h - (ny - o.body.y) - 0.3, fontFace: F.BODY, fontSize: 12, color: C.GREEN, valign: "middle", bold: true });
  }

  // Schéma : réserve héréditaire & quotité disponible selon la situation du client.
  function reserveQuotite(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "2.1 · Audit successoral", title: "Réserve héréditaire & quotité disponible" });
    var membres = (data.foyer && data.foyer.membres) || [];
    var n = membres.filter(function (m) { return m.qualite === "Enfant"; }).length;
    var hasConjoint = membres.some(function (m) { return m.qualite === "Monsieur"; }) && membres.some(function (m) { return m.qualite === "Madame"; });
    var reserve, qd, reserveLabel, qdLabel, caption, segLabel = "Réserve héréditaire";
    if (n >= 1) {
      var den = (n + 1 >= 4) ? 4 : n + 1, rNum = (n + 1 >= 4) ? 3 : n;
      reserve = rNum / den; qd = 1 - reserve; reserveLabel = rNum + "/" + den; qdLabel = (den - rNum) + "/" + den;
      var pc = { 1: "1/2", 2: "1/3", 3: "1/4" }[n] || K.formatPctVal(reserve / n * 100);
      caption = n + " enfant" + (n > 1 ? "s" : "") + " → réserve " + reserveLabel + " (soit " + pc + " par enfant), quotité disponible " + qdLabel + ".";
    } else if (hasConjoint) {
      reserve = 0.25; qd = 0.75; reserveLabel = "1/4"; qdLabel = "3/4"; segLabel = "Réserve du conjoint";
      caption = "Aucun enfant, conjoint survivant → le conjoint est réservataire pour 1/4 ; quotité disponible 3/4.";
    } else {
      reserve = 0; qd = 1; reserveLabel = "0"; qdLabel = "totalité"; segLabel = "Réserve";
      caption = "Aucun héritier réservataire → vous transmettez librement la totalité de votre patrimoine.";
    }
    o.slide.addText("La loi protège vos héritiers : une part minimale de la succession — la réserve héréditaire — leur revient obligatoirement (art. 912-913 C. civ.). Le solde, la quotité disponible, se transmet librement (conjoint, tiers, association…).",
      { x: o.body.x, y: o.body.y, w: o.body.w, h: 0.6, fontFace: F.BODY, fontSize: 12, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.05 });
    // Barre empilée réserve / quotité disponible
    var barY = o.body.y + 0.85, barH = 1.15, barW = o.body.w, resW = barW * reserve, qdW = barW * qd;
    if (resW > 0) o.slide.addShape("rect", { x: o.body.x, y: barY, w: resW, h: barH, fill: { color: C.PETROL }, line: { type: "none" } });
    if (qdW > 0) o.slide.addShape("rect", { x: o.body.x + resW, y: barY, w: qdW, h: barH, fill: { color: C.GOLD_DK }, line: { type: "none" } });
    for (var i = 1; i < n; i++) { var sx = o.body.x + resW * (i / n); o.slide.addShape("rect", { x: sx - 0.01, y: barY + 0.1, w: 0.02, h: barH - 0.2, fill: { color: "FFFFFF" }, line: { type: "none" } }); }
    if (resW > 1.3) o.slide.addText([{ text: segLabel + "\n", options: { fontFace: F.HEAD, fontSize: 13, bold: true, color: "FFFFFF" } }, { text: reserveLabel, options: { fontFace: F.HEAD, fontSize: 22, bold: true, color: "FFFFFF" } }], { x: o.body.x, y: barY, w: resW, h: barH, align: "center", valign: "middle" });
    if (qdW > 1.3) o.slide.addText([{ text: "Quotité disponible\n", options: { fontFace: F.HEAD, fontSize: 13, bold: true, color: "FFFFFF" } }, { text: qdLabel, options: { fontFace: F.HEAD, fontSize: 22, bold: true, color: "FFFFFF" } }], { x: o.body.x + resW, y: barY, w: qdW, h: barH, align: "center", valign: "middle" });
    // Situation du client
    var capY = barY + barH + 0.22;
    HEXA.card(o.slide, o.body.x, capY, o.body.w, 0.75, { fill: C.TEAL_PALE, line: null });
    o.slide.addText([{ text: "Votre situation   ", options: { fontFace: F.HEAD, fontSize: 12, bold: true, color: C.PETROL } }, { text: caption, options: { fontFace: F.BODY, fontSize: 12, color: C.SLATE } }], { x: o.body.x + 0.3, y: capY + 0.1, w: o.body.w - 0.6, h: 0.55, valign: "middle", lineSpacingMultiple: 1.05 });
    // Tableau de référence
    var tY = capY + 0.95, rowH = 0.4, rows = [["1 enfant", "1/2", "1/2"], ["2 enfants", "2/3", "1/3"], ["3 enfants et plus", "3/4", "1/4"]];
    dataTable(o.slide, { x: o.body.x, y: tY, w: o.body.w, headers: ["Nombre d'enfants", "Réserve héréditaire", "Quotité disponible"], colW: [o.body.w - 2 * 2.6, 2.6, 2.6], align: ["left", "center", "center"], rows: rows, rowH: rowH, size: 11, headSize: 11 });
    var nonCommun = membres.some(function (m) { return m.qualite === "Enfant" && m.filiation && m.filiation !== "Enfant du couple"; });
    var foot = "Le conjoint survivant dispose en outre d'une option (100 % usufruit, 1/4 PP + 3/4 US, ou quotité disponible) — voir l'audit successoral."
      + (nonCommun ? " Enfant(s) non commun(s) : l'option 100 % usufruit suppose une donation entre époux (sinon conjoint limité au 1/4 en PP, art. 757)." : "");
    // Note placée sous le tableau (hauteur dynamique) pour éviter tout chevauchement.
    var footY = tY + (rows.length + 1) * rowH + 0.14;
    o.slide.addText(foot, { x: o.body.x, y: footY, w: o.body.w, h: Math.max(0.3, HEXA.FOOT_Y - footY - 0.05), fontFace: F.BODY, fontSize: 8.5, italic: true, color: C.SLATE_LT, valign: "top", lineSpacingMultiple: 1.03 });
  }

  // Préconisations personnalisées (conditionnelles) + rappels de référence.
  function preconisationsSlide(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "4 · Préconisations", title: "Préconisations personnalisées" });
    var props = K.preconisations(data), listH = o.body.h * 0.64;
    if (props.length) numberedRows(o.slide, { x: o.body.x, y: o.body.y, w: o.body.w, h: listH }, props, { badge: C.GOLD_DK, titleSize: 13, detailSize: 10.5 });
    else o.slide.addText("Aucune action prioritaire détectée à partir des données saisies.", { x: o.body.x, y: o.body.y, w: o.body.w, h: 0.5, fontFace: F.BODY, fontSize: 12, color: C.SLATE });
    var ry = o.body.y + listH + 0.2, rh = o.body.h - (ry - o.body.y);
    HEXA.card(o.slide, o.body.x, ry, o.body.w, rh, { fill: C.TEAL_PALE, line: null });
    o.slide.addText([
      { text: "Rappels   ", options: { fontFace: F.HEAD, fontSize: 11, bold: true, color: C.PETROL } },
      { text: "PEA : 150 000 € de versements · PEA-PME : enveloppe commune de 225 000 € (PEA inclus).   Assurance-vie : 152 500 €/bénéficiaire avant 70 ans (art. 990 I), 30 500 € global après (art. 757 B).   Société civile démembrée : donner la nue-propriété des parts (valeur réduite, art. 669) en conservant usufruit, revenus et contrôle ; extinction non taxée au décès (art. 1133).", options: { fontFace: F.BODY, fontSize: 10, color: C.SLATE } }
    ], { x: o.body.x + 0.3, y: ry + 0.12, w: o.body.w - 0.6, h: rh - 0.24, valign: "top", lineSpacingMultiple: 1.08 });
  }

  // Donations consenties & suivi du délai des 15 ans (slide conditionnelle).
  function donationsSlide(pptx, data) {
    var suivi = (window.HexaSuccession && window.HexaSuccession.donationsSuivi) ? window.HexaSuccession.donationsSuivi(data) : [];
    if (!suivi.length) return;
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "2.1 · Audit successoral", title: "Donations consenties & délai des 15 ans" });
    var w = o.body.w;
    var rows = suivi.map(function (s) { return [s.donateur, s.beneficiaire, K.formatEur(s.valeur), s.type, K.formatDateFR(s.date), s.statut]; });
    dataTable(o.slide, { x: o.body.x, y: o.body.y, w: w, headers: ["Donateur", "Bénéficiaire", "Valeur", "Type", "Date", "Délai des 15 ans"], colW: [w * 0.14, w * 0.13, w * 0.11, w * 0.20, w * 0.12, w * 0.30], align: ["left", "left", "right", "left", "center", "left"], rows: rows, rowH: 0.55, size: 10.5, headSize: 10.5 });
    o.slide.addText("Rappel fiscal (art. 784 CGI) : une donation de moins de 15 ans réduit l'abattement disponible au décès ; au-delà de 15 ans, l'abattement de 100 000 €/enfant/parent se reconstitue intégralement.", { x: o.body.x, y: HEXA.FOOT_Y - 0.5, w: o.body.w, h: 0.4, fontFace: F.BODY, fontSize: 9.5, italic: true, color: C.SLATE_LT, valign: "top", lineSpacingMultiple: 1.05 });
  }

  function abattements(pptx) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "2.1 · Audit successoral", title: "Abattements de donation & règles associées" });
    var ed = HEXA_EDU.abattements, w = o.body.w * 0.6;
    dataTable(o.slide, { x: o.body.x, y: o.body.y, w: w, headers: ["Lien de parenté", "Abattement", "Fréquence"], colW: [w - 3.0, 1.6, 1.4], align: ["left", "right", "center"], rows: ed.parente, rowH: 0.44 });
    var dy = o.body.y + (ed.parente.length + 1) * 0.44 + 0.2;
    dataTable(o.slide, { x: o.body.x, y: dy, w: w, headers: ["Don de somme d'argent", "Abattement", "Conditions"], colW: [w - 3.7, 1.4, 2.3], align: ["left", "right", "left"], rows: [ed.don], rowH: 0.5, size: 9 });
    var rx = o.body.x + w + 0.3, rw = o.body.w - w - 0.3;
    HEXA.card(o.slide, rx, o.body.y, rw, o.body.h, { fill: C.TEAL_PALE, line: null });
    o.slide.addText("131 865 €", { x: rx + 0.2, y: o.body.y + 0.25, w: rw - 0.4, h: 0.7, fontFace: F.HEAD, fontSize: 30, bold: true, color: C.GOLD_DK, align: "center" });
    o.slide.addText("par parent et par enfant, en franchise de droits", { x: rx + 0.2, y: o.body.y + 0.95, w: rw - 0.4, h: 0.4, fontFace: F.HEAD, fontSize: 10.5, color: C.PETROL, align: "center" });
    o.slide.addText(ed.note, { x: rx + 0.25, y: o.body.y + 1.5, w: rw - 0.5, h: o.body.h - 1.7, fontFace: F.BODY, fontSize: 10, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.08 });
  }

  function demembrement(pptx) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "2.1 · Audit successoral", title: "Le démembrement en 3 étapes clés" });
    o.slide.addText("⚠  " + HEXA_EDU.demembrement.intro, { x: o.body.x, y: o.body.y, w: o.body.w, h: 0.4, fontFace: F.BODY, fontSize: 10.5, italic: true, color: C.GOLD_DK, valign: "middle" });
    var cards = HEXA_EDU.demembrement.steps.map(function (s) { return { title: s.t, body: s.d, accent: C.PETROL }; });
    HEXA.cardGrid(o.slide, { x: o.body.x, y: o.body.y + 0.55, w: o.body.w, h: o.body.h - 0.55 }, cards, { cols: 3, titleSize: 13, bodySize: 10.5 });
    // numéros
    HEXA_EDU.demembrement.steps.forEach(function (s, i) {
      var cw = (o.body.w - 0.44) / 3;
      numberBadge(o.slide, o.body.x + i * (cw + 0.22) + cw - 0.7, o.body.y + 0.72, 0.5, s.n, C.GOLD);
    });
  }

  function baremeUsufruit(pptx) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "2.1 · Audit successoral", title: "Barème fiscal de l'usufruit et de la nue-propriété" });
    var ed = HEXA_EDU.baremeUsufruit, w = o.body.w * 0.52;
    o.slide.addText(ed.intro, { x: o.body.x, y: o.body.y, w: o.body.w, h: 0.55, fontFace: F.BODY, fontSize: 10.5, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.05 });
    dataTable(o.slide, { x: o.body.x, y: o.body.y + 0.65, w: w, headers: ["Âge de l'usufruitier", "Usufruit", "Nue-propriété*"], colW: [w - 3.0, 1.5, 1.5], align: ["left", "center", "center"], rows: ed.rows, rowH: 0.38, size: 10 });
    var rx = o.body.x + w + 0.3, rw = o.body.w - w - 0.3;
    HEXA.card(o.slide, rx, o.body.y + 0.65, rw, 2.0, { fill: C.GOLD, line: null });
    o.slide.addText("Exemple concret", { x: rx + 0.25, y: o.body.y + 0.8, w: rw - 0.5, h: 0.4, fontFace: F.HEAD, fontSize: 13, bold: true, color: "FFFFFF" });
    o.slide.addText(ed.exemple, { x: rx + 0.25, y: o.body.y + 1.25, w: rw - 0.5, h: 1.3, fontFace: F.BODY, fontSize: 11, color: "FFFFFF", valign: "top", lineSpacingMultiple: 1.08 });
    o.slide.addText("* Base taxable des droits de donation — Article 669 du CGI.", { x: rx + 0.1, y: o.body.y + 2.8, w: rw - 0.2, h: 0.4, fontFace: F.BODY, fontSize: 9.5, italic: true, color: C.SLATE_LT });
  }

  function donationExamples(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "2.1 · Audit successoral", title: "Exemples — donation de la nue-propriété aux 2 enfants" });
    var ex = data.donationExamples, gap = 0.3, w = (o.body.w - gap) / 2;
    ex.forEach(function (e, idx) {
      var x = o.body.x + idx * (w + gap);
      o.slide.addText(e.bien, { x: x, y: o.body.y, w: w, h: 0.36, fontFace: F.HEAD, fontSize: 13, bold: true, color: C.PETROL });
      o.slide.addText(e.valeur, { x: x, y: o.body.y + 0.34, w: w, h: 0.3, fontFace: F.BODY, fontSize: 10, italic: true, color: C.SLATE_LT });
      var rows = e.rows.map(function (r) { return [r.parent, r.np, r.valeurNP, r.abattement, r.base, r.droits]; });
      rows.push(["TOTAL DROITS À PAYER", "", "", "", "", e.total]);
      dataTable(o.slide, {
        x: x, y: o.body.y + 0.7, w: w, headers: ["Parent", "% NP", "Valeur NP", "Abatt.", "Base", "Droits"],
        colW: [w * 0.30, w * 0.11, w * 0.17, w * 0.17, w * 0.125, w * 0.115], align: ["left", "center", "right", "right", "right", "right"],
        rows: rows, totalRows: [rows.length - 1], rowH: 0.5, size: 9, headSize: 9
      });
      var ry = o.body.y + 0.7 + (rows.length + 1) * 0.5 + 0.18;
      HEXA.card(o.slide, x, ry, w, 0.6, { fill: C.GREEN_BG, line: null, shadow: false });
      o.slide.addText("✓  " + e.reste, { x: x + 0.2, y: ry, w: w - 0.4, h: 0.6, fontFace: F.HEAD, fontSize: 11, bold: true, color: C.GREEN, valign: "middle" });
    });
    o.slide.addText(data.donationNote, { x: o.body.x, y: HEXA.FOOT_Y - 0.62, w: o.body.w, h: 0.55, fontFace: F.BODY, fontSize: 9, italic: true, color: C.SLATE_LT, valign: "middle", lineSpacingMultiple: 1.02 });
  }

  function strategies(pptx) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "2.1 · Audit successoral", title: "3 stratégies pour éviter l'indivision" });
    var ed = HEXA_EDU.strategies, gap = 0.25, w = (o.body.w - 2 * gap) / 3, h = o.body.h - 0.55;
    ed.forEach(function (st, i) {
      var x = o.body.x + i * (w + gap), accent = C[st.accent] || C.PETROL;
      HEXA.card(o.slide, x, o.body.y, w, h, { fill: C.PAPER, line: C.LINE });
      o.slide.addShape("roundRect", { x: x, y: o.body.y, w: w, h: 0.72, fill: { color: accent }, line: { type: "none" }, rectRadius: 0.09 });
      o.slide.addShape("rect", { x: x, y: o.body.y + 0.45, w: w, h: 0.27, fill: { color: accent }, line: { type: "none" } });
      o.slide.addText(st.t, { x: x + 0.18, y: o.body.y + 0.04, w: w - 0.36, h: 0.68, fontFace: F.HEAD, fontSize: 12, bold: true, color: "FFFFFF", valign: "middle", align: "center" });
      o.slide.addText(st.sub, { x: x + 0.18, y: o.body.y + 0.82, w: w - 0.36, h: 0.85, fontFace: F.BODY, fontSize: 9.3, italic: true, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.0 });
      var ly = o.body.y + 1.72;
      var runs = [];
      st.plus.forEach(function (p) { runs.push({ text: "✓ ", options: { color: C.GREEN, bold: true, fontSize: 8.8 } }); runs.push({ text: p, options: { color: C.SLATE, fontSize: 8.8, breakLine: true, paraSpaceAfter: 2 } }); });
      st.moins.forEach(function (p) { runs.push({ text: "✗ ", options: { color: C.RED, bold: true, fontSize: 8.8 } }); runs.push({ text: p, options: { color: C.SLATE, fontSize: 8.8, breakLine: true, paraSpaceAfter: 2 } }); });
      o.slide.addText(runs, { x: x + 0.18, y: ly, w: w - 0.36, h: h - (ly - o.body.y) - 0.55, fontFace: F.BODY, valign: "top", lineSpacingMultiple: 1.0 });
      o.slide.addShape("roundRect", { x: x + 0.18, y: o.body.y + h - 0.5, w: w - 0.36, h: 0.38, fill: { color: C.MIST }, line: { color: accent, width: 1 }, rectRadius: 0.05 });
      o.slide.addText("→ " + st.verdict, { x: x + 0.2, y: o.body.y + h - 0.5, w: w - 0.4, h: 0.38, fontFace: F.HEAD, fontSize: 8.6, bold: true, color: accent, valign: "middle", align: "center" });
    });
    o.slide.addText("⚠  " + HEXA_EDU.strategiesNote, { x: o.body.x, y: HEXA.FOOT_Y - 0.4, w: o.body.w, h: 0.32, fontFace: F.BODY, fontSize: 9, italic: true, color: C.GOLD_DK, valign: "middle" });
  }

  function objectifs(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "3 · Objectifs", title: "Objectifs hiérarchisés" });
    var transH = (data.transmission ? 0.9 : 0);
    numberedRows(o.slide, { x: o.body.x, y: o.body.y, w: o.body.w, h: o.body.h - (transH ? transH + 0.2 : 0) }, data.objectifs, { badge: C.PETROL, titleSize: 14, detailSize: 10.5 });
    if (transH) {
      var ty = o.body.y + o.body.h - transH;
      HEXA.card(o.slide, o.body.x, ty, o.body.w, transH, { fill: C.GOLD, line: null });
      o.slide.addText([
        { text: "Objectif de transmission     ", options: { fontFace: F.HEAD, fontSize: 13, bold: true, color: "FFFFFF" } },
        { text: data.transmission, options: { fontFace: F.BODY, fontSize: 12.5, color: "FFFFFF" } }
      ], { x: o.body.x + 0.3, y: ty, w: o.body.w - 0.6, h: transH, valign: "middle", lineSpacingMultiple: 1.05 });
    }
  }

  function arbitrageCurrent(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "4 · Préconisations", title: "Arbitrer une partie de l'immobilier détenu en direct" });
    var ar = data.arbitrage;
    o.slide.addText(ar.intro, { x: o.body.x, y: o.body.y, w: o.body.w, h: 0.5, fontFace: F.BODY, fontSize: 12, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.05 });
    var cy = o.body.y + 0.65, ch = o.body.h - 0.65, w = o.body.w * 0.42;
    // Situation actuelle
    HEXA.card(o.slide, o.body.x, cy, w, ch, { fill: C.RED_BG, line: null });
    o.slide.addText("SITUATION ACTUELLE", { x: o.body.x + 0.25, y: cy + 0.15, w: w - 0.5, h: 0.35, fontFace: F.HEAD, fontSize: 12, bold: true, color: C.RED, charSpacing: 1 });
    o.slide.addText("Immobilier locatif détenu en direct", { x: o.body.x + 0.25, y: cy + 0.5, w: w - 0.5, h: 0.3, fontFace: F.BODY, fontSize: 10.5, italic: true, color: C.SLATE });
    o.slide.addText([{ text: ar.current.rendement, options: { fontFace: F.HEAD, fontSize: 26, bold: true, color: C.RED } }, { text: "  " + ar.current.rendementLabel, options: { fontFace: F.BODY, fontSize: 10, color: C.SLATE } }], { x: o.body.x + 0.25, y: cy + 0.85, w: w - 0.5, h: 0.5, valign: "middle" });
    var runs = [];
    ar.current.points.forEach(function (p) {
      runs.push({ text: (p.good ? "✓ " : "✗ "), options: { color: p.good ? C.GREEN : C.RED, bold: true, fontSize: 10.5 } });
      runs.push({ text: p.label + " : ", options: { color: C.PETROL, bold: true, fontSize: 10.5 } });
      runs.push({ text: p.value, options: { color: C.SLATE, fontSize: 10.5, breakLine: true, paraSpaceAfter: 5 } });
    });
    o.slide.addText(runs, { x: o.body.x + 0.25, y: cy + 1.45, w: w - 0.5, h: ch - 2.1, valign: "top", lineSpacingMultiple: 1.02 });
    o.slide.addText("⚠  " + ar.current.note, { x: o.body.x + 0.25, y: cy + ch - 0.6, w: w - 0.5, h: 0.5, fontFace: F.BODY, fontSize: 9, italic: true, color: C.RED, valign: "middle" });
    // Flèche
    o.slide.addText("→", { x: o.body.x + w + 0.05, y: cy, w: o.body.w * 0.08, h: ch, fontFace: F.HEAD, fontSize: 40, bold: true, color: C.GOLD, align: "center", valign: "middle" });
    // Gain global
    var gx = o.body.x + w + o.body.w * 0.08 + 0.1, gw = o.body.w - (gx - o.body.x);
    HEXA.card(o.slide, gx, cy, gw, ch, { fill: C.PETROL, line: null });
    o.slide.addText("STRATÉGIE PROPOSÉE", { x: gx + 0.3, y: cy + 0.2, w: gw - 0.6, h: 0.4, fontFace: F.HEAD, fontSize: 13, bold: true, color: C.GOLD, charSpacing: 1 });
    o.slide.addText("Diversifier ~900 K€ vers des enveloppes financières et une SCI à l'IS", { x: gx + 0.3, y: cy + 0.6, w: gw - 0.6, h: 0.6, fontFace: F.HEAD, fontSize: 14, bold: true, color: "FFFFFF", valign: "top" });
    o.slide.addText(ar.gain, { x: gx + 0.3, y: cy + 1.35, w: gw - 0.6, h: ch - 1.55, fontFace: F.BODY, fontSize: 12, color: C.TEAL_PALE, valign: "top", lineSpacingMultiple: 1.12 });
  }

  function arbitrageStrategies(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "4 · Préconisations", title: "Allocation cible — enveloppes de diversification" });
    var st = data.arbitrage.strategies, gap = 0.22, cols = st.length, w = (o.body.w - gap * (cols - 1)) / cols, h = o.body.h - 0.9;
    st.forEach(function (s, i) {
      var x = o.body.x + i * (w + gap), accent = s.accentGold ? C.GOLD_DK : C.PETROL;
      HEXA.card(o.slide, x, o.body.y, w, h, { fill: C.PAPER, line: C.LINE });
      o.slide.addShape("roundRect", { x: x, y: o.body.y, w: w, h: 0.9, fill: { color: accent }, line: { type: "none" }, rectRadius: 0.09 });
      o.slide.addShape("rect", { x: x, y: o.body.y + 0.5, w: w, h: 0.4, fill: { color: accent }, line: { type: "none" } });
      o.slide.addText(s.title, { x: x + 0.15, y: o.body.y + 0.08, w: w - 0.3, h: 0.55, fontFace: F.HEAD, fontSize: 11.5, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
      o.slide.addText(s.profil, { x: x + 0.15, y: o.body.y + 0.58, w: w - 0.3, h: 0.3, fontFace: F.BODY, fontSize: 9.5, italic: true, color: "FFFFFF", align: "center" });
      o.slide.addText(s.rendement, { x: x + 0.1, y: o.body.y + 1.1, w: w - 0.2, h: 0.6, fontFace: F.HEAD, fontSize: 26, bold: true, color: accent, align: "center" });
      o.slide.addText("TRI / rendement cible*", { x: x + 0.1, y: o.body.y + 1.68, w: w - 0.2, h: 0.3, fontFace: F.BODY, fontSize: 8.5, color: C.SLATE_LT, align: "center" });
      o.slide.addShape("rect", { x: x + 0.3, y: o.body.y + 2.1, w: w - 0.6, h: 0.015, fill: { color: C.LINE }, line: { type: "none" } });
      o.slide.addText([{ text: "Montant\n", options: { fontFace: F.HEAD, fontSize: 9, bold: true, color: C.GOLD_DK } }, { text: K.formatEur(K.parseNum(s.montant)), options: { fontFace: F.HEAD, fontSize: 12, bold: true, color: C.PETROL } }], { x: x + 0.12, y: o.body.y + 2.2, w: w - 0.24, h: 0.85, align: "center", valign: "top", lineSpacingMultiple: 1.0 });
      o.slide.addText(s.fisc, { x: x + 0.18, y: o.body.y + 3.1, w: w - 0.36, h: h - 3.25, fontFace: F.BODY, fontSize: 9.3, color: C.SLATE, valign: "top", align: "center", lineSpacingMultiple: 1.05 });
    });
    // Total alloué + reste disponible
    var at = K.arbitrageTotals(data.arbitrage), by = o.body.y + h + 0.14;
    HEXA.card(o.slide, o.body.x, by, o.body.w, 0.44, { fill: C.PETROL, line: null });
    o.slide.addText([
      { text: "Total alloué : ", options: { fontFace: F.HEAD, fontSize: 12, bold: true, color: "FFFFFF" } },
      { text: K.formatEur(at.total) + "      ", options: { fontFace: F.HEAD, fontSize: 12, bold: true, color: C.GOLD } },
      { text: "Enveloppe à arbitrer : " + K.formatEur(at.enveloppe) + "      Reste disponible : ", options: { fontFace: F.BODY, fontSize: 11, color: C.TEAL_PALE } },
      { text: K.formatEur(at.reste), options: { fontFace: F.HEAD, fontSize: 12, bold: true, color: at.reste < 0 ? "F4B5AE" : C.GOLD } }
    ], { x: o.body.x + 0.3, y: by, w: o.body.w - 0.6, h: 0.44, align: "center", valign: "middle" });
    o.slide.addText("* Rendements/TRI cibles non garantis ; tout investissement comporte un risque de perte en capital. Les enveloppes capitalisent sans frottement fiscal.", { x: o.body.x, y: by + 0.5, w: o.body.w, h: 0.3, fontFace: F.BODY, fontSize: 8.5, italic: true, color: C.SLATE_LT, valign: "middle" });
  }

  // ----- modules pédagogiques génériques -----
  function eduGrid(pptx, kicker, title, cards, opts) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: kicker, title: title });
    opts = opts || {};
    HEXA.cardGrid(o.slide, o.body, cards.map(function (c) { return { title: c.title, body: c.body, accent: opts.accent || C.PETROL }; }), { cols: opts.cols || 3, titleSize: 12.5, bodySize: 10 });
    if (opts.footnote) o.slide.addText(opts.footnote, { x: o.body.x, y: HEXA.FOOT_Y - 0.38, w: o.body.w, h: 0.3, fontFace: F.BODY, fontSize: 8.5, italic: true, color: C.SLATE_LT });
    return o;
  }

  function perModule(pptx) {
    dispositifDivider(pptx, "Plan Épargne Retraite", "Préparer la retraite & optimiser l'impôt");
    var ed = HEXA_EDU.per;
    eduGrid(pptx, "Dispositif · PER", "PER — Fonctionnement", ed.fonctionnement);
    // avantages fiscaux : 2 panneaux
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "Dispositif · PER", title: "PER — Avantages fiscaux (règles 2026)" });
    twoPanels(o.slide, o.body, { title: "À l'entrée — déduction des versements", color: C.PETROL, items: ed.entree }, { title: "À la sortie — capital ou rente", color: C.GOLD_DK, items: ed.sortie });
    // reco avant/après
    var r = HEXA.standardSlide(pptx, { page: page(), kicker: "Dispositif · PER", title: "PER — Piloter la tranche à 30 %" });
    var w = (r.body.w - 1.4) / 2;
    HEXA.kpi(r.slide, r.body.x, r.body.y + 0.6, w, 1.6, ed.reco.avant, "Taux moyen d'imposition actuel", { fill: C.RED, valueSize: 34 });
    r.slide.addText("→", { x: r.body.x + w, y: r.body.y + 0.6, w: 1.4, h: 1.6, fontFace: F.HEAD, fontSize: 44, bold: true, color: C.GOLD, align: "center", valign: "middle" });
    HEXA.kpi(r.slide, r.body.x + w + 1.4, r.body.y + 0.6, w, 1.6, ed.reco.apres, "Taux moyen d'imposition cible", { fill: C.GREEN, valueSize: 34 });
    HEXA.card(r.slide, r.body.x, r.body.y + 2.6, r.body.w, 1.0, { fill: C.GOLD, line: null });
    r.slide.addText([{ text: "Économie réalisée : ", options: { fontFace: F.HEAD, fontSize: 16, bold: true, color: "FFFFFF" } }, { text: ed.reco.eco, options: { fontFace: F.HEAD, fontSize: 22, bold: true, color: "FFFFFF" } }], { x: r.body.x, y: r.body.y + 2.6, w: r.body.w, h: 1.0, align: "center", valign: "middle" });
    r.slide.addText("ℹ  " + ed.reco.note, { x: r.body.x, y: r.body.y + 3.8, w: r.body.w, h: 0.6, fontFace: F.BODY, fontSize: 10.5, italic: true, color: C.SLATE_LT, valign: "middle", align: "center" });
  }

  function avModule(pptx) {
    dispositifDivider(pptx, "Assurance-vie", "Le « couteau suisse » de la gestion patrimoniale");
    var ed = HEXA_EDU.av;
    eduGrid(pptx, "Dispositif · Assurance-vie LUX", "Assurance-vie luxembourgeoise — Fonctionnement", ed.fonctionnement, { accent: C.GOLD_DK });
    eduGrid(pptx, "Dispositif · Assurance-vie LUX", "Assurance-vie luxembourgeoise — Fiscalité (2026)", ed.fiscalite, { accent: C.GOLD_DK });
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "Dispositif · Assurance-vie", title: "L'assurance-vie — un outil patrimonial complet" });
    twoPanels(o.slide, o.body, { title: "En cours de vie — épargne disponible", color: C.PETROL, cards: ed.vie }, { title: "Pour la transmission — outil successoral", color: C.GOLD_DK, cards: ed.transmission });
    // avant / après 70 ans
    var r = HEXA.standardSlide(pptx, { page: page(), kicker: "Dispositif · Assurance-vie", title: "Fiscalité des versements — avant / après 70 ans" });
    var gap = 0.3, w = (r.body.w - gap) / 2;
    [[r.body.x, ed.avant70, "Avant 70 ans", C.PETROL], [r.body.x + w + gap, ed.apres70, "Après 70 ans", C.GOLD_DK]].forEach(function (p) {
      var x = p[0], d = p[1];
      HEXA.card(r.slide, x, r.body.y, w, r.body.h, { fill: C.MIST, line: C.LINE });
      o2head(r.slide, x, r.body.y, w, p[2] + " — " + d.article, p[3]);
      r.slide.addText("Abattement", { x: x + 0.3, y: r.body.y + 0.9, w: w - 0.6, h: 0.3, fontFace: F.HEAD, fontSize: 11, color: C.SLATE_LT });
      r.slide.addText(d.abattement, { x: x + 0.3, y: r.body.y + 1.2, w: w - 0.6, h: 0.7, fontFace: F.HEAD, fontSize: 34, bold: true, color: p[3] });
      r.slide.addText(d.abattementNote, { x: x + 0.3, y: r.body.y + 1.95, w: w - 0.6, h: 0.4, fontFace: F.BODY, fontSize: 10, italic: true, color: C.SLATE });
      r.slide.addText("Fiscalité au-delà : " + d.bareme, { x: x + 0.3, y: r.body.y + 2.5, w: w - 0.6, h: r.body.h - 2.7, fontFace: F.BODY, fontSize: 11, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.08 });
    });
  }

  function o2head(slide, x, y, w, title, color) {
    slide.addShape("roundRect", { x: x, y: y, w: w, h: 0.62, fill: { color: color }, line: { type: "none" }, rectRadius: 0.09 });
    slide.addShape("rect", { x: x, y: y + 0.4, w: w, h: 0.22, fill: { color: color }, line: { type: "none" } });
    slide.addText(title, { x: x + 0.25, y: y, w: w - 0.5, h: 0.62, fontFace: F.HEAD, fontSize: 12.5, bold: true, color: "FFFFFF", valign: "middle" });
  }

  function scpiModule(pptx) {
    var ed = HEXA_EDU.scpi;
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "Dispositif · SCPI", title: "SCPI — investir dans l'immobilier indirectement" });
    o.slide.addText(ed.intro, { x: o.body.x, y: o.body.y, w: o.body.w, h: 0.75, fontFace: F.BODY, fontSize: 11, color: C.SLATE, valign: "top", lineSpacingMultiple: 1.05 });
    var ky = o.body.y + 0.85, kw = (o.body.w - 0.6) / 4;
    ed.kpis.forEach(function (k, i) { HEXA.kpi(o.slide, o.body.x + i * (kw + 0.2), ky, kw, 1.0, k.v, k.l, { fill: i % 2 ? C.GOLD_DK : C.PETROL, valueSize: 18, labelSize: 8 }); });
    var fy = ky + 1.2;
    HEXA.cardGrid(o.slide, { x: o.body.x, y: fy, w: o.body.w, h: 1.25 }, ed.familles.map(function (f) { return { title: f.title, body: f.body, accent: C.PETROL_LT }; }), { cols: 3, titleSize: 11.5, bodySize: 9.5 });
    var vy = fy + 1.45, gap = 0.3, w = (o.body.w - gap) / 2;
    HEXA.card(o.slide, o.body.x, vy, w, o.body.h - (vy - o.body.y), { fill: C.GREEN_BG, line: null });
    o.slide.addText("✓  Pourquoi investir", { x: o.body.x + 0.25, y: vy + 0.1, w: w - 0.5, h: 0.3, fontFace: F.HEAD, fontSize: 11.5, bold: true, color: C.GREEN });
    markerList(o.slide, { x: o.body.x + 0.25, y: vy + 0.45, w: w - 0.5, h: o.body.h - (vy - o.body.y) - 0.55 }, ed.avantages, "✓", C.GREEN, { size: 9.3, gap: 3 });
    var rx = o.body.x + w + gap;
    HEXA.card(o.slide, rx, vy, w, o.body.h - (vy - o.body.y), { fill: C.RED_BG, line: null });
    o.slide.addText("⚠  Points de vigilance", { x: rx + 0.25, y: vy + 0.1, w: w - 0.5, h: 0.3, fontFace: F.HEAD, fontSize: 11.5, bold: true, color: C.RED });
    markerList(o.slide, { x: rx + 0.25, y: vy + 0.45, w: w - 0.5, h: o.body.h - (vy - o.body.y) - 0.55 }, ed.vigilance, "•", C.RED, { size: 9.3, gap: 3 });
  }

  function envelopeModule(pptx, name, ed, accent) {
    dispositifDivider(pptx, name, "Enveloppe à fiscalité privilégiée");
    eduGrid(pptx, "Dispositif · " + name, name + " — Fonctionnement", ed.fonctionnement, { accent: accent });
    eduGrid(pptx, "Dispositif · " + name, name + " — Fiscalité détaillée (2026)", ed.fiscalite, { accent: accent, footnote: "Certaines règles 2026 (taux de PS, plafonds) sont à valider selon les textes définitifs." });
  }

  function sciModule(pptx) {
    dispositifDivider(pptx, "Immeuble de rapport en SCI à l'IS", "Optimiser revenus & transmission");
    var ed = HEXA_EDU.sci;
    // montage + schéma
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "Montage · SCI à l'IS", title: "Détail du montage" });
    var w = o.body.w * 0.6;
    markerList(o.slide, { x: o.body.x, y: o.body.y, w: w, h: o.body.h }, ed.montage, "▸", C.PETROL, { size: 11, gap: 10 });
    var rx = o.body.x + w + 0.3, rw = o.body.w - w - 0.3;
    HEXA.card(o.slide, rx, o.body.y, rw, o.body.h, { fill: C.MIST, line: C.LINE });
    o.slide.addText("Schéma d'ensemble", { x: rx + 0.2, y: o.body.y + 0.15, w: rw - 0.4, h: 0.35, fontFace: F.HEAD, fontSize: 12, bold: true, color: C.PETROL, align: "center" });
    var fy = o.body.y + 0.7, fh = (o.body.h - 0.9) / ed.flow.length;
    ed.flow.forEach(function (f, i) {
      var yy = fy + i * fh;
      HEXA.card(o.slide, rx + 0.4, yy, rw - 0.8, fh - 0.25, { fill: i === 1 ? C.PETROL : C.PAPER, line: C.PETROL_LT });
      o.slide.addText(f, { x: rx + 0.4, y: yy, w: rw - 0.8, h: fh - 0.25, fontFace: F.HEAD, fontSize: 12, bold: true, color: i === 1 ? "FFFFFF" : C.PETROL, align: "center", valign: "middle" });
      if (i < ed.flow.length - 1) o.slide.addText("▼", { x: rx, y: yy + fh - 0.28, w: rw, h: 0.25, fontFace: F.HEAD, fontSize: 12, color: C.GOLD, align: "center" });
    });
    // transmission 3 étapes
    var t = HEXA.standardSlide(pptx, { page: page(), kicker: "Montage · SCI à l'IS", title: "Transmission des parts en nue-propriété" });
    HEXA.cardGrid(t.slide, { x: t.body.x, y: t.body.y, w: t.body.w, h: 2.4 }, ed.transmission.map(function (s) { return { title: s.n + ". " + s.t, body: s.d, accent: C.GOLD_DK }; }), { cols: 3 });
    var sy = t.body.y + 2.65;
    HEXA.card(t.slide, t.body.x, sy, t.body.w, t.body.h - 2.65, { fill: C.PAPER, line: C.LINE });
    t.slide.addText(ed.sortie.intro, { x: t.body.x + 0.25, y: sy + 0.12, w: t.body.w - 0.5, h: 0.3, fontFace: F.BODY, fontSize: 10, italic: true, color: C.SLATE_LT });
    dataTable(t.slide, { x: t.body.x + 0.25, y: sy + 0.45, w: t.body.w * 0.5, rows: ed.sortie.rows, colW: [t.body.w * 0.5 - 1.6, 1.6], align: ["left", "right"], rowH: 0.3, size: 9.5, totalRows: [ed.sortie.rows.length - 1] });
    t.slide.addText("✓  " + ed.sortie.result, { x: t.body.x + t.body.w * 0.5 + 0.5, y: sy + 0.45, w: t.body.w * 0.5 - 0.75, h: t.body.h - 2.65 - 0.6, fontFace: F.BODY, fontSize: 10.5, color: C.GREEN, valign: "top", lineSpacingMultiple: 1.1 });
    // avantages / limites
    var av = HEXA.standardSlide(pptx, { page: page(), kicker: "Montage · SCI à l'IS", title: "Avantages & points de vigilance" });
    dataTable(av.slide, { x: av.body.x, y: av.body.y, w: av.body.w, headers: ["Levier", "Avantages", "Limites / vigilances"], colW: [2.6, (av.body.w - 2.6) / 2, (av.body.w - 2.6) / 2], align: ["left", "left", "left"], rows: ed.avantages.map(function (r) { return [r.crit, r.av, r.lim]; }), rowH: 0.72, size: 9.5, boldCols: [0] });
    // points de vigilance
    eduGrid(pptx, "Montage · SCI à l'IS", "Points de vigilance & conformité", ed.vigilance, { cols: 3, accent: C.PETROL });
    // chronologie
    var ch = HEXA.standardSlide(pptx, { page: page(), kicker: "Montage · SCI à l'IS", title: "Chronologie opérationnelle" });
    dataTable(ch.slide, { x: ch.body.x, y: ch.body.y, w: ch.body.w, headers: ["Étape", "Délai moyen", "Acteur pilote", "Documents clés"], colW: [ch.body.w * 0.34, ch.body.w * 0.18, ch.body.w * 0.22, ch.body.w * 0.26], align: ["left", "center", "left", "left"], rows: ed.chronologie, rowH: 0.56, size: 9.5, boldCols: [0] });
  }

  function planAction(pptx, data) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "5 · Plan d'action", title: "Plan d'action — avancer par étapes" });
    var items = data.planAction, gap = 0.18, cols = 3;
    var rows = Math.ceil(items.length / cols);
    var cw = (o.body.w - gap * (cols - 1)) / cols, ch = (o.body.h - gap * (rows - 1)) / rows;
    items.forEach(function (it, i) {
      var r = Math.floor(i / cols), col = i % cols;
      var x = o.body.x + col * (cw + gap), y = o.body.y + r * (ch + gap);
      HEXA.card(o.slide, x, y, cw, ch, { fill: C.PAPER, line: C.LINE });
      o.slide.addShape("roundRect", { x: x, y: y, w: cw, h: 0.5, fill: { color: C.PETROL }, line: { type: "none" }, rectRadius: 0.09 });
      o.slide.addShape("rect", { x: x, y: y + 0.28, w: cw, h: 0.22, fill: { color: C.PETROL }, line: { type: "none" } });
      o.slide.addText([{ text: it.step + "  ", options: { fontFace: F.HEAD, fontSize: 11, bold: true, color: C.GOLD } }, { text: it.title, options: { fontFace: F.HEAD, fontSize: 11, bold: true, color: "FFFFFF" } }], { x: x + 0.2, y: y, w: cw - 0.4, h: 0.5, valign: "middle" });
      o.slide.addText([{ text: it.objectif + "\n", options: { fontFace: F.BODY, fontSize: 9.5, italic: true, color: C.PETROL_LT } }, { text: it.proposition, options: { fontFace: F.BODY, fontSize: 9.8, color: C.SLATE } }], { x: x + 0.2, y: y + 0.62, w: cw - 0.4, h: ch - 0.75, valign: "top", lineSpacingMultiple: 1.05 });
    });
  }

  function suivi(pptx) {
    var o = HEXA.standardSlide(pptx, { page: page(), kicker: "Suivi", title: "Suivi & prochaines étapes" });
    numberedRows(o.slide, o.body, HEXA_EDU.suivi, { badge: C.GOLD_DK, titleSize: 14, detailSize: 11 });
  }

  function merci(pptx, data) {
    var s = pptx.addSlide();
    s.background = { color: C.PETROL };
    HEXA.fill(s, C.PETROL);
    s.addShape("ellipse", { x: -2.5, y: -2.5, w: 7, h: 7, fill: { color: C.PETROL_LT }, line: { type: "none" } });
    s.addShape("ellipse", { x: 9.5, y: 4, w: 7, h: 7, fill: { color: C.PETROL_DK }, line: { type: "none" } });
    HEXA.logoTopRight(s, { dark: true });
    HEXA.rule(s, HEXA.PAGE.W / 2 - 0.9, 3.0, 1.8, 0.05, C.GOLD);
    s.addText("MERCI", { x: 1, y: 2.2, w: 11.3, h: 1.2, align: "center", fontFace: F.HEAD, fontSize: 72, bold: true, color: C.GOLD });
    s.addText(data.doc.advisorName + "  ·  " + data.doc.advisorFirm, { x: 1, y: 3.4, w: 11.3, h: 0.5, align: "center", fontFace: F.HEAD, fontSize: 18, color: "FFFFFF" });
    s.addText(data.doc.advisorEmail + "   ·   " + data.doc.advisorPhone, { x: 1, y: 3.95, w: 11.3, h: 0.45, align: "center", fontFace: F.BODY, fontSize: 14, color: C.TEAL_PALE });
    s.addText(data.doc.location, { x: 1, y: 6.4, w: 11.3, h: 0.4, align: "center", fontFace: F.BODY, fontSize: 12, color: "9FD0D6" });
    s.addText(HEXA.COPYRIGHT, { x: 1, y: 6.85, w: 11.3, h: 0.3, align: "center", fontFace: F.BODY, fontSize: 9, color: "7FBFC8" });
  }

  // ====================================================================== MAIN
  function generate(data) {
    C = HEXA.COLORS; F = HEXA.FONT; K = window.HexaCompute;
    page = (function () { var n = 0; return function () { return ++n; }; })();

    var pptx = new PptxGenJS();
    pptx.defineLayout({ name: "HEXA16x9", width: 13.333, height: 7.5 });
    pptx.layout = "HEXA16x9";
    pptx.author = "Hexa Patrimoine";
    pptx.company = "Hexa Patrimoine";
    pptx.subject = "Étude patrimoniale";
    pptx.title = data.doc.client || "Étude patrimoniale";

    var m = data.modules || {};

    cover(pptx, data);
    advisor(pptx, data);
    if (m.methodologie) methodologie(pptx, data);
    if (m.contexte) contexte(pptx, data);
    synthese(pptx, data);

    HEXA.divider(pptx, { num: 1, kicker: "Section", title: "Découverte", subtitle: "Situation familiale, patrimoniale et revenus" });
    profil(pptx, data);
    actif(pptx, data);
    immobilierSlide(pptx, data);
    budget(pptx, data);

    HEXA.divider(pptx, { num: 2, kicker: "Section", title: "Diagnostic", subtitle: "Forces, faiblesses et cartographie des risques" });
    diagnostic(pptx, data);
    risques(pptx, data);

    HEXA.divider(pptx, { num: "2.1", kicker: "Section", title: "Audit successoral", subtitle: "Scénarios de transmission & optimisation" });
    successionTable(pptx, data, data.succession.monsieur, "Si Monsieur décède en premier", "2.1 · Audit successoral — 1er décès");
    successionTable(pptx, data, data.succession.madame, "Si Madame décède en premier", "2.1 · Audit successoral — 1er décès");
    successionCompare(pptx, data);
    reserveQuotite(pptx, data);
    donationsSlide(pptx, data);
    if (m.successoral) { abattements(pptx); demembrement(pptx); baremeUsufruit(pptx); }
    donationExamples(pptx, data);
    if (m.successoral) strategies(pptx);

    HEXA.divider(pptx, { num: 3, kicker: "Section", title: "Objectifs", subtitle: "Priorités du foyer reliées au diagnostic" });
    objectifs(pptx, data);

    HEXA.divider(pptx, { num: 4, kicker: "Section", title: "Préconisations", subtitle: "Solutions argumentées & projections chiffrées" });
    arbitrageCurrent(pptx, data);
    arbitrageStrategies(pptx, data);
    preconisationsSlide(pptx, data);

    if (m.per) perModule(pptx);
    if (m.assuranceVie) avModule(pptx);
    if (m.scpi) scpiModule(pptx);
    if (m.pea) envelopeModule(pptx, "PEA", HEXA_EDU.pea, C.PETROL);
    if (m.peapme) envelopeModule(pptx, "PEA-PME", HEXA_EDU.peapme, C.PETROL_LT);
    if (m.fcpr) envelopeModule(pptx, "FCPR", HEXA_EDU.fcpr, C.GOLD_DK);
    if (m.sciIs) sciModule(pptx);

    HEXA.divider(pptx, { num: 5, kicker: "Section", title: "Plan d'action", subtitle: "Recommandations chiffrées & calendrier" });
    planAction(pptx, data);
    if (m.suivi) suivi(pptx);
    merci(pptx, data);

    return pptx;
  }

  window.HexaDeck = { generate: generate };
})();
