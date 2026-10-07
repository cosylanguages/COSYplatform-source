# CEFR Universal Master vs. the Real Repos: Comparison Report

**Date:** 2026-09-30 · **Compared:** `CEFR_Universal_Master.md` (v1.0) against the `main` branches of COSYdata, COSYevents, COSYplatform, COSYmanuals.

> **Decisions taken after this report (2026-09-30)**
> 1. The CEFR master lives in **COSYplatform** (`cefr/`). Other repos use read-only mirrors. This replaces the recommendation to use COSYdata.
> 2. **There is no separate A0 level.** A0 is the starter part of the combined A0–A1 band. Data stores `level: A1` plus `sublevel: start`; `A0-A1` is only a folder/display label. This replaces the recommendation in section 2.1 to keep `A0` as a repo code; read every "A0" recommendation below with this in mind.
> 3. The master's `domain` field is renamed **`use_domain`**; the repos' `domain` (course track) stays as is.

## 0. What was checked, and limits

I downloaded full snapshots of the four repos and read READMEs, docs, schemas and data, then counted entries and files with scripts. I did not review lesson or manual text for quality, and I did not open COSYlanguages, COSYtools or COSYgames. Numbers below are a snapshot of today's `main`; the repos change quickly.

**Correction to my earlier assumption:** the GitHub pages I first fetched showed COSYevents and COSYmanuals as nearly empty. That was stale. The real repos hold 645 event sessions (COSYevents) and about 5,400 files (COSYmanuals). This report uses the real contents.

---

## 1. Headline findings

1. **The repos already have a CEFR skeleton, but no shared descriptor layer.** Every repo tags by level, yet nothing links a lesson, word, session or manual to a can-do descriptor. Platform lessons have free-text `cando` strings, not IDs.
2. **Level labels disagree.** Vocabulary, platform and events use `A0` (or `A0-A1`); the CEFR name is Pre-A1; the platform and manuals curriculum schemas accept only `A1`–`C2`, so they cannot validate A0 files.
3. **Coverage is very uneven.** English is near-complete; French and Russian are strong in the platform; the other 11 languages are mostly A1 only.
4. **Three theme systems exist** (COSYdata themes, platform modules/units, event clubs), plus the master's 22. They describe different things and need a crosswalk.
5. **The `domain` field means something different in the repos** (course track) than in the master (personal/public/occupational/educational). Rename the master field.
6. **Authority statements conflict across repos.** Each of four documents names a different "source of truth". This must be settled before wiring in a new canonical layer.
7. **Several gaps match what the master provides:** empty `curriculum/en/` and empty `teacher-guides/assessment-tools/` and `progress-trackers/` folders, 51% of event sessions with no level, and no C2 events.

---

## 2. Cross-cutting comparison

### 2.1 Level codes
| Where | What it uses | Issue |
|---|---|---|
| Master | `PA1, A1 … C2`, plus `A2p, B1p, B2p` | |
| COSYdata vocabulary / phrases / competency schema | enum `A0, A1, A2, B1, B2, C1, C2`; folder `a0_a1` merges A0+A1 | EN a0_a1 holds 266 `A0` and 1,374 `A1` entries in one folder |
| COSYplatform | `A0` roadmaps; curriculum files `A1`–`C2`; diagnostic roadmap `A0-A1` | Curriculum schema enum has no `A0`; coverage report lists A0 missing for all languages |
| COSYmanuals | `A0` in README, folders `a1`–`c2`; curriculum schema `A1`–`C2` | Same gap |
| COSYevents | `A0-A1`, `A1`…`C1` (no `C2`); vocabulary-export doc says `A1–C2` | Range value not in any enum |

**Recommendation:** keep `A0` as the repo code and declare `A0 = Pre-A1` (CEFR name) in one place. Add `A0` to both curriculum schemas. Allow ranges (`A0-A1`) only in events, as explicit `level_from` / `level_to`. Store plus levels in a separate `sublevel` field.

Minor data glitch: in EN vocabulary, 12 entries sit in a folder that doesn't match their `level` field (9 `B1` in `a2/`, 1 `B2` and 1 `A2` in `b1/`, 1 `B1` in `b2/`). Some may be deliberate (see `levels` array); worth a check.

### 2.2 `domain` naming collision
- **Repos:** `domain` = course track(s), comma-separated, `general` first (e.g. `general, spoken, exam`). Matches platform `course_type` / manuals tracks.
- **Master:** `domain` = personal / public / occupational / educational.
**Recommendation:** rename the master field to `use_domain`. Keep repo `domain` as is.

### 2.3 Themes: crosswalk
COSYdata has 30 canonical themes (`shared/themes.json`, grouped into macro-domains SELF, HOME, DAILY_LIFE, FOOD, SOCIETY, WORLD, LEISURE, …), written for A0–A1. The live English data above A1 uses **251 distinct theme values** (e.g. politics 300, business 252, society 228, concepts 201, ethics 145), most outside the 30. Platform A1 has 22 modules; B1 has 10 thematic units.

Several COSYdata themes are lexical or grammatical categories (`grammar`, `actions`, `descriptors`, `numbers`, `shapes`, `measurement`, `general`), not communicative topics. So the two systems are different axes. Keep both; add the master `theme_id` as a separate field.

| Master theme | COSYdata canonical theme(s) | Platform A1 module |
|---|---|---|
| T01 Identity | descriptors, communication, geography (nationalities) | 1 First contact & identity |
| T02 Family & relationships | family, emotions | 2 People & relationships |
| T03 Home | housing, objects | 3 Objects; 4 Home |
| T04 Daily routine & time | time, actions, activities, numbers | 4, 21 |
| T05 Food & drink | food | 5 |
| T06 Shopping & money | shopping | 6 |
| T07 Clothing | clothing, colors | 7 |
| T08 Health | health | 8 |
| T09 Weather, nature, animals | weather, nature, animals | 13 |
| T10 Travel & transport | travel | 11 |
| T11 Places & directions | navigation, geography | 12 |
| T12 Education | education | 9 |
| T13 Work | work | 9 |
| T14 Leisure | leisure, activities | 14 |
| T15 Media & technology | technology | 15 |
| T16 Culture & arts | *(none in the 30; live data: culture)* | 16 |
| T17 Society, politics, law | *(none; live data: politics, society, law)* | 20 (basic) |
| T18 Economy & business | *(none; live data: business, economy)* | 6 (basic) |
| T19 Environment | nature *(live data: environment)* | 13 |
| T20 Science & ideas | *(none; live data: science)* | n/a |
| T21 Values & ethics | philosophy *(live data: ethics)* | n/a |
| T22 Language & communication | communication | 10, 20 |

**Gap:** T16–T21 have no canonical COSYdata theme. Either extend `themes.json` beyond A1 or map the live B1+ values to these.

### 2.4 IDs
Repo patterns are lowercase: vocabulary `<lang>:<slug>:<form>`; functional phrase `<lang>:<domain>:<situation>:<slug>`; competency `<lang>:<domain>:competency:<slug>` (regex `[a-z0-9-]`). The master's `IN-CONV-B1` uses uppercase.
**Recommendation:** lowercase the IDs: `in-conv-b1`, and reference them as `cefr:in-conv-b1`. Use lowercase scale codes everywhere.

### 2.5 Authority conflicts
| Document | Claim |
|---|---|
| COSYdata README | Single source of truth for vocabulary |
| COSYmanuals `CANON_SOURCE_OF_TRUTH.md` | COSYlanguages holds the sole writable vocabulary (A0–A1) and general-curriculum master; others are read-only mirrors |
| COSYplatform README / manuals README | Platform is the "canonical curriculum authority" |
| COSYmanuals `CONTENT_ARCHITECTURE.md` | Manuals are "primary content authority" for manuals and grammar topics |
| Your brief | COSYdata principal for data; manuals content drawn from platform |

**Recommendation:** decide where the CEFR master lives (I suggest COSYdata, in a `cefr/` folder) and declare every other repo a read-only consumer of it. Update `CANON_SOURCE_OF_TRUTH.md` accordingly.

---

## 3. Repo-by-repo

### 3.1 COSYdata
**What exists:** `vocabulary/<lang>/<level>/*.json` for all 14 languages; `functional-phrases/`; `schemas/` including `vocabulary`, `functional-phrase`, `lesson` and **`curriculum-competency`** schemas; `docs/theme-taxonomy.md`; `shared/themes.json`; and an empty `curriculum/en/` (only `.gitkeep`).

**Vocabulary entries by language and level folder:**
| Lang | A0–A1 | A2 | B1 | B2 | C1 | C2 | Total |
|---|---|---|---|---|---|---|---|
| en | 1,640 | 2,101 | 3,080 | 2,047 | 1,612 | 939 | 11,419 |
| it | 1,108 | 743 | 384 | 9 | 21 | 14 | 2,279 |
| fr | 1,089 | 748 | 0 | 9 | 21 | 14 | 1,881 |
| ru | 906 | 771 | 0 | 9 | 21 | 14 | 1,721 |
| el | 788 | 235 | 0 | 9 | 21 | 14 | 1,067 |
| de | 494 | 16 | 0 | 0 | 0 | 0 | 510 |
| es, pt, cv, br, hy, ka, ba, tt | 377–498 | 0–16 | 0 | 0 | 0 | 0 | 393–498 |

The identical 9 / 21 / 14 counts at B2/C1/C2 in fr, it, ru, el look like a shared seed set; worth checking whether they are real content.

**Functional phrases:** EN A1 118, A2 36, B1 29, B2 44, C1–C2 15. FR, IT, RU, EL have A1 only (118 each). They are organised by *situation* (e.g. `food-and-ordering`), not by communicative function.

**Fit with the master**
| Master element | Status in COSYdata |
|---|---|
| Level field | Present (`A0`–`C2`), single plus optional `levels` array |
| Themes | Partly: 30 canonical, A1-oriented (see 2.3) |
| Functions (master §5) | Missing. Phrases have `situation`, not `function` |
| Can-do / descriptors | Missing; `curriculum-competency` schema is close but built for learning objectives (requires `stage`, `audience`) |
| Skill tags | Missing |
| Register / exam / scenario | Present (`register`, `exam_board`, `exam_level`, `scenario`): good, keep |

**Recommended actions**
1. Add `cefr/` with descriptors, scales, themes crosswalk and functions as JSON, plus a new `cefr-descriptor.schema.json`.
2. Add optional fields to the vocabulary and phrase schemas: `theme_id`, `function_ids`, `descriptor_ids`.
3. Reuse `curriculum/en/` (currently empty) for competency entries that point to descriptor IDs.
4. Extend `themes.json` for T16–T21 (see 2.3).

### 3.2 COSYplatform
**What exists:** curriculums for 13 languages by track (`general`, `spoken`, `exam`, `professional`, `pronunciation`, `travelling`, `relocation`, `discussion`), roadmaps, lessons in XML/JSON, schemas, `docs/level-coverage-report.md`, and a Supabase-gated lesson model.

**General curriculum coverage (levels present):**
| Language | Levels present |
|---|---|
| en | A1–C2 |
| fr, ru | A1–C2 |
| ba, br, de, es, hy, ka, pt, tt | A1, C1 |
| el, it | A1 only |
| cv | none |

No language has an `A0` curriculum file, though `general-en-a0` and `grammar-en-a0` roadmaps exist.

**Lesson counts (general track):**
| | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|
| en | 257 | 141 | 120 | 121 | 94 | 20 |
| fr, ru | 142 | 50 | 50 | 50 | 21 | 20 |

Notes: the five A1 curricula of ba, br, hy, ka, tt are identical in shape (6 units / 55 lessons), and every C1 is 7 units / 21 lessons; this looks like a shared scaffold. C2 has far fewer lessons than C1 in English (20 vs 94). Check these against the hour ranges in section 6 of the earlier reference file.

**Can-do in lessons today:** only English general/spoken have `cando`, as free text, often inside the `teacher_notes` string. Coverage:
| EN track | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|
| general | 128/257 | 20/141 | 20/120 | 20/121 | 21/94 | 20/20 |
| spoken | 30/52 | 30/98 | 30/109 | 30/63 | 30/60 | 30/30 |

Wording styles differ ("I can…" vs "Can…"). 108 A1 lessons also carry per-skill fields (`speaking`, `listening`, `reading`, `writing`, `task`), which map well onto the master's skills.

**Diagnostic:** the introductory roadmap plans six level diagnostics (A0-A1, A2, B1, B2, C1, C2); only B1 has a lesson file. The master's task bank (§7.5) can supply the rest.

**Schema:** lesson types are `vocab, grammar, gv, spoken, srev, exam, pronunciation, pron`. No field for descriptors, functions or themes.

**Recommended actions**
1. Add `A0` to the curriculum schema enum and create the missing A0 files.
2. Add `descriptor_ids[]` to lessons; migrate existing `cando` text to descriptors (keep the text as a display string).
3. Fill the five missing diagnostics from the master task bank.
4. Decide whether the repeated scaffold curricula are placeholders; mark them `status: scaffold` if so.
5. Note the platform is monolingual English (zero L1); keep master descriptors English-only at the source, with translations as a separate UI layer.

### 3.3 COSYevents
**What exists:** 645 sessions in `data/sessions.json` (EN 560, FR 44, RU 41), 19 scheduled events, taxonomy of 12 clubs/formats, public/gated model, and two export specs (vocabulary to COSYdata, session to platform lesson).

**Level metadata is weak:**
| Level | Sessions |
|---|---|
| none | 327 (51%) |
| B1 | 195 |
| C1 | 31 |
| A0-A1 | 30 (all Basic Speaking Club) |
| B2 | 29 |
| A2 | 25 |
| A1 | 8 |
| C2 | 0 |

All 142 Karaoke and 4 Long Read sessions, and 85 of 113 Cinema sessions, have no level. Italian (7) and Greek (9) sessions are mentioned in the audit but are not in `sessions.json`.

**Fit with the master:** events carry one level and no skill, theme or function tags. Each speaking club could be tagged with the master's interaction/production scales and themes (for example, *If You Were* → hypothetical language, B1–B2; *Debatable & Relatable* → `sp-case`, `in-disc-i`, B2+).

**Interchange mismatch to fix:** `vocabulary-export.json` uses `term`, `pos`, `definition`, `example`, `translation`, `tags`. COSYdata requires `id`, `word`, `language` (2-letter code), `form`, `transcription`, `definitions[]`, `examples[]`, `level`, `domain`, `theme`. The export also uses `"language": "English"` and its doc names a target path `COSYdata/en/B2/vocabulary/` that doesn't match the real `vocabulary/en/b2/*.json`. COSYdata already has `scripts/import-events-vocab.cjs` and a `reports/events-import-needs-review.json`; check what that script expects before changing the export.

**Recommended actions**
1. Replace single `level` with `level_from` / `level_to` (events often span levels) and fill the 327 missing ones; Cinema and Karaoke can be levelled by content difficulty.
2. Add `skills[]`, `theme_id`, `function_ids[]`, `descriptor_ids[]` to `sessions.json`, the session-export spec and the vocabulary export.
3. Align the vocabulary export with the COSYdata schema (language codes, IPA transcription, array fields).
4. Consider a C2 track, since none exists.

### 3.4 COSYmanuals
**What exists:** `catalog/` (public metadata), `manuals/<lang>/<module>/<level>/` HTML pages, `data/grammar/confusions_*.json`, `student-workbooks/`, `teacher-guides/`, `marathons/`, and its own `curriculums/`.

**Manual file counts (includes index and part pages, so not topic counts):**
| Lang | grammar | vocabulary | communication | general |
|---|---|---|---|---|
| en | 319 | 294 | 195 | 48 |
| fr | 1,134 | 126 | 138 | 48 |
| ru | 326 | 93 | 140 | 48 |
| el | 89 | 39 | 39 | 48 |
| it | 81 | 43 | 39 | 48 |
| others (de, es, pt, hy, ka, ba, br, tt, cv) | 29–51 | 23–43 | 0 | 0–16 |

Other findings:
- The public `catalog/manifest.json` lists **5 manuals** while thousands of files exist.
- Chuvash (`cv`) has 39 grammar and 23 vocabulary files, though the README calls it "planned".
- `teacher-guides/assessment-tools/` and `student-workbooks/progress-trackers/` are empty (`.gitkeep`). This is exactly where the master's verification toolkit belongs.
- The grammar/communication page standards already include a **Self-Assessment Checklist** per topic: the natural place to attach descriptor IDs.
- `curriculums/_schema` here differs from the platform's (no `discussion`, `pronunciation`, `pron`, age adaptation, `growingTask`), which risks drift.

**Recommended actions**
1. Add `descriptor_ids` to the topic metadata and link each checklist item to a descriptor.
2. Put the teacher toolkit (master §7) into `teacher-guides/assessment-tools/` and the profile template (§7.9) into `progress-trackers/`.
3. Generate `catalog/manifest.json` from the real manual tree.
4. Use one curriculum schema across repos (mirror the platform's).

---

## 4. Changes to make in the CEFR master (v1.1)
1. Add the level-code table with `A0 = Pre-A1` and the `sublevel` rule (2.1).
2. Rename `domain` → `use_domain` (2.2).
3. Lowercase all IDs and scale codes (2.4).
4. Add Appendix B: the theme crosswalk (2.3), plus the extended theme list for T16–T21.
5. Add the platform `type` values and the events `level_from/level_to` convention to the data model (§9.3).
6. Add `function_id` and `skills[]` to the tag list (§9.1).
7. Replace §8.1 coverage table with the real numbers from this report.
8. Add a repo-specific implementation checklist per repo (sections 3.1–3.4 above).

---

## 5. Suggested order of work
1. **Decisions:** home of the master; `A0` vs `PA1` naming; `use_domain` rename; one curriculum schema (sections 2.1, 2.2, 2.5).
2. **COSYdata:** build `cefr/` and the descriptor schema; extend `themes.json`.
3. **COSYplatform:** add `A0` to the schema, `descriptor_ids` to lessons, migrate `cando`.
4. **COSYevents:** level ranges and tags; fix the vocabulary export.
5. **COSYmanuals:** toolkit into `assessment-tools`, descriptor links in checklists, regenerate the catalog.
6. **Fill coverage gaps**, starting with the languages you teach most.
