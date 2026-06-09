# Générateur d'étude patrimoniale — Hexa Patrimoine

Application **100 % navigateur** (aucun serveur) qui produit une présentation
PowerPoint (`.pptx`) d'**étude patrimoniale** à partir de données saisies dans un
formulaire. Elle reproduit la trame du modèle Hexa Patrimoine : découverte,
diagnostic, audit successoral, objectifs, préconisations, dispositifs
(PER, assurance‑vie, PEA, PEA‑PME, FCPR, SCPI, SCI à l'IS) et plan d'action.

## Utilisation

1. Ouvrir l'application dans un navigateur (voir « Mise en ligne » ci‑dessous, ou
   ouvrir directement `docs/index.html` en local).
2. **Renseigner les données du client** dans le formulaire (sections dépliables).
   L'exemple « Monsieur et Madame X » est pré‑chargé : il sert de modèle, il
   suffit de remplacer les valeurs.
3. **Choisir les modules** à inclure (pages pédagogiques et dispositifs) via les
   cases à cocher. Les pages personnalisées sont toujours générées.
4. Cliquer sur **« Générer le PowerPoint »** : le fichier `.pptx` est téléchargé.
5. Ouvrir le fichier dans PowerPoint / Keynote / Google Slides pour les dernières
   retouches.

### Sauvegarde des dossiers clients

- Les saisies sont **enregistrées automatiquement** dans le navigateur
  (`localStorage`) — rien n'est envoyé sur un serveur.
- **Exporter les données** télécharge un fichier `.json` que vous pouvez archiver
  par client et **réimporter** plus tard (bouton *Importer des données*).
- **Réinitialiser** recharge l'exemple par défaut.

## Mise en ligne sur GitHub Pages

Deux options.

### Option A — déploiement automatique (recommandé)

Le workflow [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)
publie le dossier `docs/` à chaque push sur `main`.

1. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
2. Fusionner cette branche dans `main` (ou pousser sur `main`).
3. L'URL publique s'affiche dans l'onglet **Actions** puis dans **Settings → Pages**.

### Option B — déploiement depuis une branche (sans Actions)

1. **Settings → Pages → Source : Deploy from a branch**.
2. Choisir la branche puis le dossier **`/docs`**, et sauvegarder.
3. Le site est servi sur `https://<utilisateur>.github.io/<dépôt>/`.

## Architecture

```
docs/
├── index.html              Interface (formulaire + plan du document)
├── css/style.css           Charte graphique de l'interface
└── js/
    ├── logo-data.js        Logo encodé en base64 (en-tête, favicon + .pptx généré)
    ├── hexa-brand.js       Couleurs, polices, helpers de mise en page
    ├── hexa-succession.js  Moteur de calcul des droits de succession (pur, testable)
    ├── hexa-compute.js     Calculs automatiques (totaux, %, indicateurs dérivés)
    ├── hexa-content.js     Données par défaut + contenu pédagogique
    ├── hexa-slides.js      Générateur des 58 → 55 slides (PptxGenJS)
    ├── hexa-form.js        Formulaire dynamique (édition des données)
    └── app.js              État, génération, import/export, aperçu du plan
```

La bibliothèque **PptxGenJS 3.12** est chargée depuis le CDN jsdelivr (repli
automatique sur unpkg). Tous les scripts applicatifs sont en `<script>` classiques
(pas de modules ES), ce qui permet aussi d'ouvrir `index.html` en `file://`. Une
connexion internet est requise (CDN de la bibliothèque et des polices) — ce qui est
le cas par nature pour une application hébergée sur GitHub Pages.

## Personnaliser le contenu

- **Données client par défaut** : `js/hexa-content.js` → `HEXA_DEFAULT`.
- **Textes pédagogiques** (PER, AV, PEA, FCPR, SCPI, SCI…) : `js/hexa-content.js` → `HEXA_EDU`.
- **Modules disponibles** (cases à cocher) : `js/hexa-content.js` → `HEXA_MODULES`.
- **Mise en page / couleurs** : `js/hexa-brand.js` (palette pétrole `#005159` + or `#D4AF37`).
- **Composition des slides** : `js/hexa-slides.js`.

## Sections calculées automatiquement

À partir des seules données saisies (foyer, actif, budget), l'application dérive :

- **Composition du patrimoine** : totaux, part immobilière, endettement, et — pour les
  **PEA / PEA-PME** — la **capacité de versement restante** d'après les plafonds
  (PEA 150 000 € ; enveloppe commune PEA + PEA-PME 225 000 €). Saisir le **montant
  des versements** dans la colonne dédiée.
- **Assurance-vie** : champs **Assuré** et **Bénéficiaires** (colonnes affichées
  uniquement pour les lignes de type « Assurance-vie »).
- **Cartographie des risques** : niveaux (Élevé / Moyen / Modéré) et descriptions
  déduits automatiquement (concentration, IFI, transmission, liquidité, diversification…).
- **Audit successoral** : droits + **observation** (option la plus favorable) générés
  par le moteur ci-dessous.
- **Synthèse exécutive** : diagnostic en bref + recommandations clés alimentés par les
  résultats précédents.

- **Composition du patrimoine** : le **commentaire** est généré automatiquement (patrimoine
  net, concentration immobilière, endettement, points d'attention).
- **Audit successoral — donations consenties** : tableau des donations (donateur,
  bénéficiaire, valeur, type — avance successorale / hors part / donation-partage —, date)
  avec **suivi du délai des 15 ans** (art. 784 CGI) ; les donations < 15 ans réduisent
  automatiquement l'abattement disponible au décès.
- **Préconisations — arbitrage** : propositions conditionnelles déduites des données —
  (1) **donner en franchise de droits** si l'abattement est disponible, (2) **alimenter
  l'assurance-vie avant 70 ans** si un conjoint a moins de 70 ans, (3) **utiliser les
  enveloppes PEA/PEA-PME** si la capacité de versement est positive, (4) **céder un bien
  locatif** si détenu en direct par un détenteur de plus de 65 ans ou avec une **TMI ≥ 30 %**
  (champ *TMI* dans la composition du foyer) — plus les rappels de plafonds, abattements
  d'assurance-vie et l'intérêt de la société civile démembrée.
- Une slide **schématise la réserve héréditaire et la quotité disponible** selon le
  nombre d'enfants du client (art. 912-913 C. civ.).

Les **Objectifs hiérarchisés** restent saisis librement par le conseiller.

## Moteur de calcul successoral (automatique)

L'audit successoral n'est plus saisi à la main : les droits sont **recalculés
automatiquement** à partir du patrimoine, du foyer et de quelques hypothèses
(`js/hexa-succession.js`), puis injectés dans l'aperçu et dans le `.pptx`.

Pour chaque ordre de décès (Monsieur / Madame) et chacune des trois options du
conjoint (art. 1094-1 C. civ.) — **100 % usufruit**, **1/4 PP + 3/4 US**,
**quotité disponible** — le moteur enchaîne :

1. **Liquidation du régime** (communauté légale) : 50 % des biens communs
   reviennent au survivant et sortent de la succession.
2. **Dévolution** selon l'option : nue-propriété des enfants valorisée à l'âge
   du survivant (barème **art. 669 CGI**) ; conjoint exonéré (loi TEPA 2007).
3. **Imposition des enfants** : abattement **100 000 €** par enfant et par parent
   (art. 779), puis barème progressif en ligne directe 2026, strictement par
   tranches. Au 2nd décès, l'extinction de l'usufruit n'est **pas** taxée
   (art. 1133 CGI).

**Hypothèses ajustables** dans le formulaire (section « Audit successoral »
→ *Hypothèses de calcul*, persistées dans `successionParams`) :

| Paramètre | Effet | Défaut |
|---|---|---|
| Assurance-vie hors succession (990 I) | `Oui` : l'AV est traitée hors barème ; `Non` : intégrée à l'assiette | `Oui` |
| Donation NP par parent (valeur PP) | montant donné en nue-propriété avant décès (réduit l'assiette) ; vide = à hauteur des abattements | vide |
| Année de référence | année d'évaluation des âges ; vide = déduite de la date du document | vide |

**Tests unitaires** (barème, usufruit 669, réserve/QD, cohérence inter-options,
calcul complet sur le cas « Monsieur et Madame X ») :

```
node tests/succession.test.js
```

> ℹ️ Les montants calculés peuvent différer d'une étude antérieure si celle-ci
> reposait sur des hypothèses non reproductibles (p. ex. des biens propres
> supplémentaires non saisis, ou l'assurance-vie intégrée au barème). Le moteur
> calcule de façon **cohérente** à partir des seules données saisies.

## Polices

La présentation utilise **Montserrat** (titres) et **Open Sans** (texte), polices
Google gratuites. Si elles ne sont pas installées sur le poste, PowerPoint leur
substitue une police proche. Pour un rendu optimal, installer ces deux polices.

## Mesure d'audience (savoir si l'outil est utilisé)

L'application étant 100 % navigateur, une mesure d'audience optionnelle **GoatCounter**
(gratuite, **sans cookie**, sans bandeau RGPD) est intégrée, **désactivée par défaut**.

Pour l'activer :
1. Créez un compte gratuit sur <https://www.goatcounter.com/> et choisissez un code (ex. `moncabinet`).
2. Dans `docs/index.html`, repérez (vers la fin) la ligne `window.HEXA_GOATCOUNTER = "";`
   et mettez votre code entre les guillemets : `window.HEXA_GOATCOUNTER = "moncabinet";`.
3. Republiez sur GitHub Pages. Votre tableau de bord sera sur `https://moncabinet.goatcounter.com`.

Sont mesurés : le nombre de **visites / visiteurs** et un événement **« PowerPoint généré »**
à chaque génération. Aucune donnée client saisie n'est transmise — uniquement des
statistiques de page anonymes.

## Notes

- Tout le calcul se fait dans le navigateur : aucune donnée client ne transite par
  un serveur.
- La présentation générée est une **étude personnalisée** et ne se substitue pas à
  une consultation juridique ou fiscale (notaire, avocat fiscaliste,
  expert‑comptable).
