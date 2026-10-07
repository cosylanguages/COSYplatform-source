# COSYplatform External Data Dependencies & Integration Architecture

This document details the external data integrations wired into **COSYplatform**. Per ecosystem rules, COSYplatform extracts data from all principal repositories in the CosyLanguages ecosystem.

---

## Data Dependency Overview

```
                          ┌───────────────────────────┐
                          │   COSYplatform (Main)     │
                          └─────────────┬─────────────┘
                                        │
      ┌──────────────────┬──────────────┴──────────────┬──────────────────┐
      ▼                  ▼                             ▼                  ▼
┌───────────┐      ┌───────────┐                 ┌───────────┐      ┌───────────┐
│ COSYdata  │      │ COSYtools │                 │COSYmanuals│      │COSYevents │
│(Vocab)    │      │(Grammar)  │                 │(Manuals)  │      │(Sessions) │
└───────────┘      └───────────┘                 └───────────┘      └───────────┘
```

---

## 1. Vocabulary → COSYdata

- **Source Repository**: `cosylanguages/COSYdata`
- **Integration Client**: `shared/vocab-resolver.js` and `shared/js/vocab-resolver.js`
- **Client Helper**: `CosyVocabResolver` (`resolveWord(term, lang)`, `search(query, lang)`)
- **Data Resolution Mechanism**:
  1. Primary resolution checks local index loaded in browser (`window.CosyVocabIndex` from `shared/js/vocab-index.js`).
  2. Fallback resolution fetches live term definitions directly from `https://raw.githubusercontent.com/cosylanguages/COSYdata/main/vocabulary/{lang}/index.json`.
- **Usage in Platform**:
  - Powers word searches in student & teacher workspace utility rails.
  - Linked in lesson markup via `<cosy-vocabulary>` tags and `links.vocabulary` arrays in lesson JSON files.

---

## 2. Grammar Reference & Interactive Practice → COSYtools

- **Source Repository**: `cosylanguages/COSYtools`
- **Integration Client**: `shared/js/tools-resolver.js`
- **Client Helper**: `CosyToolsResolver` (`getGrammarRefUrl(topicId, lang, level)`, `getPracticeEmbedUrl(practiceRef, lang)`)
- **Data Resolution Mechanism**:
  - Links to grammar reference material (`https://cosylanguages.github.io/COSYtools/grammar/{lang}/{level}/{topicId}.html`).
  - Embeds interactive practice exercises (`<cosy-grammar-material>` / `<iframe src="...">`) directly into lesson slides.
- **Integration Note**: Where live cross-origin fetching is restricted in offline/local environments, links are rendered as direct portal references.

---

## 3. Grammar Manuals → COSYmanuals

- **Source Repository**: `cosylanguages/COSYmanuals`
- **Integration Client**: `shared/js/manuals-resolver.js`
- **Client Helper**: `CosyManualsResolver` (`getManualUrl(category, lang, level, topic)`, `fetchManualData(...)`)
- **Data Resolution Mechanism**:
  - Sources pedagogical grammar manuals and functional phrase guides as data.
  - URL pattern: `https://cosylanguages.github.io/COSYmanuals/manuals/{lang}/{category}/{level}/topics/{topic}.html`.
- **Usage in Platform**:
  - Links in lesson metadata (`links.grammar` and `links.communication`) resolve to canonical reference topics in COSYmanuals.

---

## 4. Past Event Sessions → COSYevents

- **Source Repository**: `cosylanguages/COSYevents`
- **Conversion Pipeline**: `scripts/convert-session-to-lesson.py`
- **Data Resolution Mechanism**:
  - Converts past speaking club sessions and event materials into permanent interactive platform lessons (`lessons/<course>/<lesson-id>.xml` or `.json`).
  - Automatically structures sessions into 8 standardized live slides (warm-up, 2 discussion rounds, interactive task, error correction) and registers the lesson entry into the corresponding roadmap in `roadmaps/`.
