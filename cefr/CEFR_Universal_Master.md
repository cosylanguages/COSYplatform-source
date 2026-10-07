# CEFR Universal Master Reference (A0–A1 band to C2)

**Version:** 1.1 · **Date:** 2026-09-30 · **Home:** `COSYplatform/cefr/` (canonical; all other repos use read-only mirrors) · **Scope:** language-neutral layer for all 14 project languages (English, French, Italian, Russian, Greek, German, Portuguese, Spanish, Tatar, Bashkir, Chuvash, Breton, Armenian, Georgian)

**Purpose:** one source of truth for (a) tagging vocabulary, grammar, manuals, sessions, events, games and courses by level; (b) teachers verifying and recording student levels; (c) learners self-assessing.

---

## 0. How to read and use this file

### 0.1 Provenance tags
| Tag | Meaning |
|---|---|
| **[CoE-2001]** | Official Council of Europe wording (2001 framework), copied from the earlier project file. |
| **[CoE-aligned]** | Descriptor written in project wording, following the structure, scale names and level logic of the CEFR (2001) and the Companion Volume (CV, 2020). It is NOT a verbatim quote. Before public release, compare each scale with the official CV text (see section 10). |
| **[Gen]** | Pedagogical convention added by the project (task banks, decision rules, timings, topic lists). Not part of the CoE framework. |

### 0.2 Level codes
**There is no separate A0 level.** A0 is the starter part of the combined **A0–A1** band. The CEFR levels stored in data are `A1` · `A2` · `B1` · `B2` · `C1` · `C2`.

| Field | Values | Meaning |
|---|---|---|
| `level` | `A1`, `A2`, `B1`, `B2`, `C1`, `C2` | Canonical CEFR level. The A0–A1 band is stored as `A1`. |
| `sublevel` | `null`, `start`, `p` | `start` = the A0 starter part of the A0–A1 band (alphabet, first words, rehearsed phrases; CEFR "Pre-A1"). `p` = plus level (`A2p`, `B1p`, `B2p`). |
| `band` (display/folder name only) | `A0-A1` | Label for the combined band, e.g. the folder `a0_a1`. Never store it as a `level` value. |

In this file the starter descriptors use the code **`A1s`** (A1, `sublevel: start`). Descriptors coded `A1` describe the core A1 level. Plus levels: `A2p`, `B1p`, `B2p` (see 1.3).

### 0.3 Descriptor IDs
Every descriptor has an implicit ID: **SCALE-LEVEL**, written **in lowercase in data**, e.g. `in-conv-b1`, `cmp-grm-a2`, `lis-ov-a1s`. Headings in this file use uppercase for readability only. In other repos, reference an ID as `cefr:in-conv-b1`. A missing level in a scale means the CEFR does not expect that ability at that level (or it is not yet described). Do not invent one.

### 0.4 Skills vs modes
- Classic 5 skills: Listening `LIS`, Reading `RD`, Spoken interaction `IN`, Spoken production `SP`, Writing `WR`.
- CV modes: Reception, Production, Interaction, **Mediation** (new in CV).
- In this file, scale codes: `LIS/AV/RD` = reception, `SP/WR` = production, `IN/WI/ON` = interaction, `MED` = mediation, `STR` = strategies, `CMP` = competences.
- For teacher records use 5 skills (section 7); mediation is recorded as an optional 6th column.

---

## 1. Levels

### 1.1 Groups and profiles
| Group | Level | Nickname | One-line profile |
|---|---|---|---|
| Basic user | **A1s** | Starter (the A0 part of the A0–A1 band; CEFR "Pre-A1") | Recognises and produces a few words and rehearsed phrases; alphabet, sounds, gestures and pictures do the work. |
| Basic user | **A1** | Breakthrough | Familiar words and formulae about self and immediate needs, slow clear speech, heavy reliance on the partner. |
| Basic user | **A2** | Waystage | Routine exchanges, simple description of background and environment, short past and future references; cannot sustain conversation alone. |
| Independent user | **B1** | Threshold | Copes independently with familiar and travel situations, narrates, gives brief reasons and opinions. |
| Independent user | **B2** | Vantage | Fluent, spontaneous, argues a viewpoint, handles abstract topics and technical talk in own field. |
| Proficient user | **C1** | Effective operational proficiency | Flexible, precise, implicit meaning, social/academic/professional use with little searching. |
| Proficient user | **C2** | Mastery | Effortless and nuanced; summarises and reconstructs arguments; distinguishes fine shades of meaning. |

French names for groups: *utilisateur élémentaire / indépendant / expérimenté*.

### 1.2 Global scale [CoE-2001]
- **C2** — Can understand with ease virtually everything heard or read. Can summarise information from different spoken and written sources, reconstructing arguments and accounts in a coherent presentation. Can express him/herself spontaneously, very fluently and precisely, differentiating finer shades of meaning even in more complex situations.
- **C1** — Can understand a wide range of demanding, longer texts, and recognise implicit meaning. Can express him/herself fluently and spontaneously without much obvious searching for expressions. Can use language flexibly and effectively for social, academic and professional purposes. Can produce clear, well-structured, detailed text on complex subjects, showing controlled use of organisational patterns, connectors and cohesive devices.
- **B2** — Can understand the main ideas of complex text on both concrete and abstract topics, including technical discussions in his/her field of specialisation. Can interact with a degree of fluency and spontaneity that makes regular interaction with native speakers quite possible without strain for either party. Can produce clear, detailed text on a wide range of subjects and explain a viewpoint on a topical issue giving the advantages and disadvantages of various options.
- **B1** — Can understand the main points of clear standard input on familiar matters regularly encountered in work, school, leisure, etc. Can deal with most situations likely to arise whilst travelling in an area where the language is spoken. Can produce simple connected text on topics which are familiar or of personal interest. Can describe experiences and events, dreams, hopes and ambitions and briefly give reasons and explanations for opinions and plans.
- **A2** — Can understand sentences and frequently used expressions related to areas of most immediate relevance (e.g. very basic personal and family information, shopping, local geography, employment). Can communicate in simple and routine tasks requiring a simple and direct exchange of information on familiar and routine matters. Can describe in simple terms aspects of his/her background, immediate environment and matters in areas of immediate need.
- **A1** — Can understand and use familiar everyday expressions and very basic phrases aimed at the satisfaction of needs of a concrete type. Can introduce him/herself and others and can ask and answer questions about personal details such as where he/she lives, people he/she knows and things he/she has. Can interact in a simple way provided the other person talks slowly and clearly and is prepared to help.
- **A1s** [CoE-aligned; corresponds to the CV's Pre-A1, stored as A1 with `sublevel: start`] — Can recognise a few very familiar words and short formulae (own name, greetings, numbers) and respond with gestures, single words or copied text, when the other person speaks very slowly, repeats and supports with pictures or gestures.

### 1.3 Plus levels [CoE-aligned + Gen]
`A2p`, `B1p`, `B2p` mark a **strong** level: the learner performs solidly at the level and regularly meets some (roughly half or more) descriptors of the next one, but not consistently enough for it. Use them for teacher records and course sub-steps, not for certificate claims. Add C1p only internally if needed.

### 1.4 Levels are cumulative and profiles are spiky
A level assumes everything below. Learners rarely have one level: reading usually runs ahead of listening, listening ahead of speaking, speaking ahead of accurate writing. **Always store a level per skill** and derive a single label only when needed (section 7.6).

---

## 2. The model behind the scales

### 2.1 Communicative language activities
| Mode | Activities | Scale codes |
|---|---|---|
| Reception | Listening (conversation, talks, announcements, media), audiovisual, reading (correspondence, orientation, information/argument, instructions, leisure) | `LIS-*`, `AV-*`, `RD-*` |
| Production | Spoken (monologue: experience, putting a case, announcements, addressing audiences), written (creative, reports/essays) | `SP-*`, `WR-*` |
| Interaction | Spoken (understanding, conversation, discussions, cooperation, transactions, information, interviews), written (correspondence, notes), online | `IN-*`, `WI-*`, `ON-*` |
| Mediation | Of texts (relay, summarise, note-take, respond to/analyse creative texts), of concepts (collaborate, lead, explain), of communication (bridge cultures, act as intermediary, defuse conflict) | `MED-*` |

### 2.2 Communicative language strategies
Planning, compensating, monitoring and repair, taking the floor, cooperating, asking for clarification: `STR-*`.

### 2.3 Communicative language competences
- **Linguistic:** range, vocabulary range/control, grammar, phonology, orthography: `CMP-RNG, CMP-VOC-R, CMP-VOC-C, CMP-GRM, CMP-PHO, CMP-ORT`.
- **Sociolinguistic:** `CMP-SOC`.
- **Pragmatic:** flexibility, thematic development, coherence/cohesion, propositional precision, fluency: `CMP-FLEX, CMP-THEM, CMP-COH, CMP-PREC, CMP-FLU`.
- **Plurilingual/pluricultural:** `CMP-PLURI`, `MED-COM-BRIDGE`.

### 2.4 Use domains (`use_domain`)
| `use_domain` | Typical settings |
|---|---|
| Personal | Home, family, friends, hobbies, personal correspondence, own online life |
| Public | Shops, services, transport, health, authorities, media, events |
| Occupational | Workplace, meetings, clients, professional documents |
| Educational | Classroom, study, lectures, exams, research |

Every session, lesson and task should be tagged with one `use_domain`. Do not confuse it with the repos' `domain` field, which means course track(s) (`general`, `spoken`, `exam` …).

---|---|
| Personal | Home, family, friends, hobbies, personal correspondence, own online life |
| Public | Shops, services, transport, health, authorities, media, events |
| Occupational | Workplace, meetings, clients, professional documents |
| Educational | Classroom, study, lectures, exams, research |

Every session, lesson and task in the platform should be tagged with one domain.

---

## 3. Can-do scales

Format: `- **LEVEL** — descriptor`. All descriptors are [CoE-aligned] unless marked. "Can" is implied at the start of every line.

### 3.1 RECEPTION

#### LIS-OV — Overall listening comprehension
- **A1s** — recognise a few very familiar words and names (own name, greetings, numbers) when said slowly and repeated, with gestures or pictures.
- **A1** — follow slow, carefully articulated speech with long pauses; understand simple questions, instructions and short phrases about self, family and surroundings.
- **A2** — understand enough to meet concrete needs when speech is clear and slow; catch the gist of short simple messages and everyday conversation on familiar topics.
- **B1** — understand the main points and some detail of clear standard speech on familiar work, school and leisure topics, including short narratives, if the accent is familiar.
- **B2** — understand extended speech and follow complex arguments on reasonably familiar topics; grasp most of what is said even with background noise; notice speaker attitude and mood.
- **C1** — follow extended speech that is loosely structured or where connections are only implied; understand idiom, colloquial language and register shifts with little effort.
- **C2** — understand any spoken language, live or broadcast, at native speed, including unfamiliar accents once briefly adjusted; pick up irony, subtext and cultural allusion.

#### LIS-CONV — Understanding conversation between other people
- **A1** — pick out isolated words and phrases from a slow, clear exchange on a very familiar topic (greetings, prices, times).
- **A2** — identify the topic of a slow, clear conversation and follow its main point when it concerns everyday matters.
- **B1** — follow the main points of a lively conversation between native speakers on familiar topics in standard speech, though details may be missed.
- **B2** — follow most of an animated discussion and identify speakers' attitudes and viewpoints; fast idiomatic speech still needs effort.
- **C1** — follow abstract, complex, unfamiliar topics in group discussion, even with fast speech and mixed registers.
- **C2** — follow any conversation, including overlapping talk, slang, humour and cultural reference, without difficulty.

#### LIS-AUD — Listening as a member of a live audience (talks, lectures)
- **A2** — understand the main point of a very short, simple talk on a familiar topic if delivered slowly with visuals.
- **B1** — follow a straightforward, clearly structured talk on a familiar topic in standard speech, with visual support.
- **B2** — follow the thread of a lecture or presentation, including complex argument, in own field; take notes on key points.
- **C1** — follow lectures and reports on specialised topics with little effort, including implicit structure, humour and digressions.
- **C2** — follow any lecture or presentation, including unfamiliar specialised material and very idiomatic delivery.

#### LIS-ANN — Listening to announcements and instructions
- **A1s** — react with gestures to simple spoken commands ("sit", "open", "stop").
- **A1** — follow short, simple directions and catch numbers and times in slow, clear announcements.
- **A2** — catch the main point of short, clear announcements (transport, shop, school) and follow simple directions.
- **B1** — follow detailed directions and understand announcements and instructions in clear standard speech.
- **B2** — understand announcements and messages on concrete and abstract topics in standard speech at normal speed.
- **C1** — extract specific information from poor-quality public announcements with noise and distortion.

#### LIS-MED — Listening to audio media and recordings
- **A1** — understand very short recorded messages with names, numbers, times, if repeated.
- **A2** — extract specific, predictable information from short simple recordings, voicemail and slow radio items.
- **B1** — understand the main information of radio news and simple recorded material on familiar topics.
- **B2** — understand most radio documentaries and recordings in standard speech; identify mood and tone.
- **C1** — understand a wide range of recorded and broadcast audio, including non-standard speech; identify fine detail of attitude and implied relationships.
- **C2** — understand all kinds of recorded and broadcast audio, whatever register or speed.

#### AV-TV — Watching TV, film and video
- **A1** — understand short videos where images and simple words clearly carry the meaning.
- **A2** — identify the main point of TV news items on familiar topics when pictures support the commentary.
- **B1** — understand many programmes on familiar topics and the plot of clearly structured films when speech is clear.
- **B2** — understand most TV news, current-affairs programmes and the majority of films in standard language.
- **C1** — follow films with slang, idiom and non-standard usage with little effort.
- **C2** — understand all films, series and broadcasts, including dialect, wordplay and allusion.

#### RD-OV — Overall reading comprehension
- **A1s** — recognise familiar letters or characters, own name and a few very common words or signs with visual support.
- **A1** — understand familiar names, words and very simple sentences on notices, posters and cards.
- **A2** — understand short simple texts on familiar concrete matters in high-frequency vocabulary; find specific information in everyday material.
- **B1** — read straightforward factual texts on subjects of interest with satisfactory understanding; understand descriptions of events, feelings and wishes.
- **B2** — read with considerable independence, adapting style and speed; wide reading vocabulary though rare idioms may cause difficulty.
- **C1** — understand in detail long, complex texts inside or outside own field; appreciate style and implicit meaning.
- **C2** — understand and critically interpret virtually all written texts, including abstract, structurally complex, highly colloquial or literary works.

#### RD-COR — Reading correspondence
- **A1** — understand short simple messages on postcards and texts (greetings, dates, invitations).
- **A2** — understand standard short letters and messages on familiar topics (requests, appointments, thanks).
- **B1** — understand descriptions of events, feelings and wishes in personal letters well enough to correspond regularly.
- **B2** — read correspondence in own field and grasp the essentials; understand formal letters and emails.
- **C1** — understand virtually any correspondence, including formal, with the occasional dictionary.
- **C2** — understand all correspondence, including implicit tone and stylistic nuance.

#### RD-ORI — Reading for orientation
- **A1** — recognise familiar names and basic phrases on signs, menus and notices in everyday situations.
- **A2** — find specific, predictable information in timetables, menus, adverts, brochures.
- **B1** — scan longer texts for what is needed; gather information from different parts of a text or from several texts.
- **B2** — scan quickly through long, complex texts, locate relevant detail and judge whether a text is worth closer study.

#### RD-INF — Reading for information and argument
- **A1** — get the idea of simple informational material with pictures and short simple sentences.
- **A2** — identify specific information in simple written material (letters, brochures, short articles).
- **B1** — recognise significant points in straightforward newspaper articles; identify the main conclusions of clearly signalled argument.
- **B2** — obtain information, ideas and opinions from specialised sources in own field; understand articles on contemporary problems with particular viewpoints.
- **C1** — understand in detail a wide range of long, complex texts, identifying fine points of attitude and opinion.
- **C2** — critically interpret and evaluate any complex text, distinguishing implicit and explicit stance.

#### RD-INS — Reading instructions
- **A1** — follow short simple written directions (route, picture recipe).
- **A2** — understand simple regulations (safety) and basic instructions for equipment.
- **B1** — understand clearly written, straightforward instructions for a piece of equipment.
- **B2** — understand lengthy, complex instructions in own field, including conditions and warnings.
- **C1** — understand in detail complex instructions for unfamiliar machines or procedures outside own field.

#### RD-LEI — Reading as a leisure activity
- **A1** — follow short simple stories with pictures using familiar words.
- **A2** — understand short simple stories, graded readers, simple blogs and song texts.
- **B1** — understand the plot of clearly structured stories and simple novels and the important episodes.
- **B2** — read contemporary fiction and non-fiction, following plot, character and viewpoint, with enjoyment.
- **C1** — appreciate literary texts of different periods, styles and language varieties.
- **C2** — read all literature, including experimental and dialectal works, appreciating style, subtext and allusion.

### 3.2 PRODUCTION

#### SP-OV — Overall spoken production
- **A1s** — say own name and a few isolated words on familiar topics, repeating a model.
- **A1** — produce simple isolated phrases about people and places.
- **A2** — give a simple description or presentation of people, living conditions, routine, likes and dislikes as a short list-like series of simple sentences.
- **B1** — sustain a straightforward description of a range of subjects in own field of interest as a linear sequence of points.
- **B2** — give clear, systematically developed descriptions and presentations, highlighting significant points and relevant detail.
- **C1** — give clear, detailed descriptions and presentations on complex subjects, integrating sub-themes, developing points and finishing with an appropriate conclusion.
- **C2** — produce clear, smoothly flowing, well-structured speech with a logic that helps the listener notice the key points.

#### SP-EXP — Sustained monologue: describing experience
- **A1** — describe self, family, home and simple objects with isolated words and set phrases.
- **A2** — describe daily routine, past activities, personal experience and plans in a simple series of sentences.
- **B1** — narrate a story or the plot of a book or film; describe experiences, dreams, hopes and ambitions, with brief reasons.
- **B2** — give clear, detailed descriptions and narratives, developing sub-themes and points with relevant detail.
- **C1** — give clear, well-structured, detailed descriptions and narratives on complex topics, with flexible tone.
- **C2** — give elaborate descriptions and narratives, integrating themes and rounding off with a conclusion, in a style suited to the context.

#### SP-CASE — Sustained monologue: putting a case (argument)
- **A2** — give simple reasons for likes and dislikes ("because") on familiar subjects.
- **B1** — develop an argument that can mostly be followed without difficulty; briefly give reasons for opinions, plans and actions.
- **B2** — develop a clear argument, supporting points of view with relevant examples; weigh advantages and disadvantages of options.
- **C1** — develop a well-structured argument on complex issues, expanding and supporting points with subsidiary points, reasons and examples.
- **C2** — present a complex argument smoothly and persuasively, anticipating counter-arguments and adapting rhetoric to the audience.

#### SP-ANN — Public announcements
- **A2** — deliver very short rehearsed announcements with predictable content.
- **B1** — deliver brief prepared announcements on a familiar topic that are clear enough to follow.
- **B2** — deliver announcements fluently, with natural stress and intonation.
- **C1** — deliver announcements clearly, with stress and intonation adapted to the message.

#### SP-AUD — Addressing audiences
- **A1** — read out or recite a very short rehearsed statement (introduction, toast).
- **A2** — give a short, rehearsed, basic presentation on a familiar subject and answer simple follow-up questions.
- **B1** — give a prepared, straightforward presentation on a familiar topic, mostly clear; handle follow-up questions.
- **B2** — give a clear prepared presentation highlighting significant points; depart from the script to follow up interesting points.
- **C1** — give a clear, well-structured presentation on complex subjects, with appropriate emphasis.
- **C2** — deliver speeches with rhetorical effect, adapt to the audience, and handle hostile questions with tact.

#### WR-OV — Overall written production
- **A1s** — copy letters and words; write own name and a few memorised words.
- **A1** — write simple isolated phrases and sentences.
- **A2** — write a series of simple sentences linked with "and", "but", "because".
- **B1** — write straightforward connected text on familiar subjects, linking shorter elements into a linear sequence.
- **B2** — write clear, detailed text on a variety of subjects, synthesising and evaluating information from several sources.
- **C1** — write clear, well-structured text on complex subjects, underlining salient issues and supporting views at length.
- **C2** — write clear, smoothly flowing, complex text in an effective style, with a logical structure that guides the reader.

#### WR-CRE — Creative writing
- **A1** — write simple phrases and sentences about people and places.
- **A2** — write about everyday aspects of the environment and very short, basic descriptions of events, past activities and personal experience; simple imaginary biographies and poems.
- **B1** — write accounts of experiences describing feelings; describe a real or imagined event; narrate a story.
- **B2** — write clear, detailed descriptions of real or imaginary events, marking relations between ideas and following genre conventions.
- **C1** — write well-structured, developed descriptions and imaginative texts in an assured, natural, personal style.
- **C2** — write engaging stories and descriptive texts in a confident, fluent style suited to the genre.

#### WR-REP — Reports and essays
- **A2** — write very short, basic descriptions of familiar events; short simple notes.
- **B1** — write short simple essays on topics of interest; summarise and report factual information on familiar matters and give an opinion.
- **B2** — write an essay or report that develops an argument systematically, highlights key points and supports them with detail; evaluate ideas.
- **C1** — write clear, well-structured expositions of complex subjects, underlining salient issues and supporting them with points and examples.
- **C2** — produce clear, smoothly flowing, complex reports, articles and essays that present a case or critical appreciation with an effective logical structure.

### 3.3 INTERACTION

#### IN-OV — Overall spoken interaction
- **A1s** — respond to greetings and yes/no questions with gestures, single words or rehearsed words.
- **A1** — ask and answer simple questions on very familiar topics; depends on repetition, rephrasing and slower speech from the partner.
- **A2** — handle short social exchanges and simple routine tasks; exchange information on familiar topics; cannot usually keep the conversation going alone.
- **B1** — cope with most travel situations; enter unprepared into conversation on familiar or personal topics; exchange, check and confirm information; explain a problem.
- **B2** — interact with fluency and spontaneity so that regular interaction with native speakers is possible without strain; take an active part in discussion, account for and sustain views.
- **C1** — express self fluently and spontaneously, almost effortlessly; overcome gaps readily with circumlocution.
- **C2** — convey finer shades of meaning precisely, use idiom, allusion and humour; backtrack and restructure so smoothly that others hardly notice.

#### IN-UND — Understanding an interlocutor
- **A1** — understand carefully and slowly addressed questions and instructions; follow short simple directions.
- **A2** — understand enough to manage simple routine exchanges if the partner is clear and slow.
- **B1** — follow clearly articulated speech directed at them, sometimes asking for repetition of particular words.
- **B2** — understand in detail what is said in standard language, even in a noisy environment.
- **C1** — follow extended speech on abstract and complex topics beyond own field.
- **C2** — understand any interlocutor, including implicit intentions and non-standard varieties given a little time.

#### IN-CONV — Conversation
- **A1** — ask and answer questions about personal details; greet, introduce, thank; needs help to keep going.
- **A2** — establish social contact (greet, take leave, introduce, thank); make and answer invitations, suggestions and apologies; say what they like and dislike.
- **B1** — start, maintain and close a simple face-to-face conversation on familiar topics; express and respond to feelings (surprise, joy, sadness, interest, indifference).
- **B2** — engage in extended conversation on most general topics in a clearly participatory way, even in noise; sustain relationships with native speakers without unintended amusement or irritation.
- **C1** — use language flexibly and effectively for social purposes, including emotional, allusive and joking use.
- **C2** — converse comfortably and appropriately on any topic, without linguistic limitation.

#### IN-DISC-I — Informal discussion (with friends)
- **A2** — discuss what to do and where to go, make arrangements; give simple opinions.
- **B1** — follow much of the general conversation around them if idiom is limited; give and ask for personal views; compare alternatives.
- **B2** — keep up with animated discussion, identify arguments for and against; express ideas, give and respond to hypotheses.
- **C1** — keep up with debate on abstract, complex, unfamiliar topics; argue a position convincingly.
- **C2** — handle informal debate with full control of humour and nuance.

#### IN-DISC-F — Formal discussion and meetings
- **A2** — follow changes of topic in slow formal discussion; give a simple opinion on a practical question when asked directly.
- **B1** — follow much of what is said in discussion in own field; put a point of view clearly, but has difficulty joining debate.
- **B2** — keep up with animated formal discussion; contribute well-structured arguments and answer counter-arguments.
- **C1** — argue a formal position convincingly and respond to questions and comments with fluent, spontaneous, appropriate arguments.
- **C2** — hold their own in formal discussion of complex, sensitive issues, negotiating and defending a position with tact.

#### IN-COOP — Goal-oriented cooperation
- **A1** — understand and give simple instructions while working with others ("take this", "here").
- **A2** — communicate in simple practical tasks: ask for and give things, make and answer suggestions.
- **B1** — follow what is said in a practical joint task, check understanding, give simple instructions and discuss next steps.
- **B2** — understand detailed instructions reliably; help the work along by inviting others in; outline an issue or problem clearly.
- **C1** — adjust to changing direction, style and emphasis; lead team tasks with tact.

#### IN-TRANS — Obtaining goods and services
- **A1** — ask for and give everyday objects and prices; order food and drink with simple phrases.
- **A2** — manage simple transactions in shops, post offices, banks, restaurants; state what they want and ask the price; order a meal.
- **B1** — deal with most transactions when travelling, arranging transport or accommodation; cope with less routine situations; explain a problem and make a complaint.
- **B2** — cope with less common transactions and unexpected difficulties; negotiate a solution to a dispute; describe a problem in detail.
- **C1** — handle complex negotiation and delicate services with appropriate register.

#### IN-INFO — Information exchange
- **A1** — ask and answer questions about personal details; ask for and give directions using a map; tell the time; use numbers.
- **A2** — exchange limited information on familiar, routine matters; ask and answer about habits and past activities; give and follow simple directions.
- **B1** — exchange, check and confirm factual information on familiar routine and non-routine matters; describe how to do something; give detailed instructions.
- **B2** — give detailed information reliably; pass on complex information; summarise and comment on a story, article, talk, discussion or interview.
- **C1** — exchange complex information and advice on the full range of matters related to their role.
- **C2** — exchange information precisely and with nuance.

#### IN-INTV — Interviewing and being interviewed
- **A1** — answer simple personal questions; ask with prepared questions.
- **A2** — make themselves understood in a short interview, answering and asking simple questions when talk is slow and clear.
- **B1** — give the concrete information needed in an interview, with limited precision; take some initiative with prepared questions.
- **B2** — carry out an effective, fluent interview, departing from prepared questions and following up interesting answers.
- **C1** — take part fully as interviewer or interviewee, developing points with little support.

#### WI-COR — Written correspondence
- **A1** — write a postcard or short message with greetings and personal details.
- **A2** — write very simple personal letters and emails expressing thanks or apology; simple invitations.
- **B1** — write personal letters and emails giving news and thoughts on concrete and some abstract or cultural topics.
- **B2** — write letters conveying degrees of emotion, highlighting the personal significance of events and commenting on the correspondent's news.
- **C1** — express themselves with clarity and precision in personal correspondence, using language flexibly, including emotional, allusive and joking use.

#### WI-NOTE — Notes, messages and forms
- **A1** — fill in forms with personal details (name, address, nationality); write numbers and dates.
- **A2** — take a short simple message; write short notes about immediate needs.
- **B1** — write notes conveying simple information to friends, service people, teachers.
- **B2** — take messages communicating enquiries and explaining problems.
- **C1** — write formal messages and notes with detail and appropriate register.

#### ON-CONV — Online conversation and discussion
- **A1** — post short simple messages online (greeting, thanks, congratulation) using set phrases and emoji.
- **A2** — make short comments and answer short simple posts using a few well-known conventions.
- **B1** — engage in online exchange, respond to and build on others' contributions; post a personal opinion, in simple terms.
- **B2** — take part in real-time online exchanges with several participants, understanding intentions and negotiating shared understanding.
- **C1** — take part in online discussion with irony, sarcasm and social tone, in real-time and asynchronous formats.

#### ON-TRANS — Online transactions and collaboration
- **A1** — fill in simple online forms with personal details.
- **A2** — follow simple instructions and complete routine online transactions such as ordering.
- **B1** — handle online transactions and collaborative work, report and solve simple problems, ask for clarification.
- **B2** — contribute to online collaborative tasks, give and follow detailed instructions, handle unexpected problems in transactions.
- **C1** — lead complex online collaboration, coordinating work and adapting language to platform norms.

### 3.4 MEDIATION

#### MED-TXT-REL — Relaying specific information
- **A1** — pass on simple, predictable information (times, prices, names) from a short notice or message.
- **A2** — relay specific information from short simple texts or announcements (e.g. a timetable) on a familiar topic.
- **B1** — relay the main points of clearly structured spoken or written texts, and relevant detail when predictable.
- **B2** — relay detailed information from complex texts, selecting and organising relevant points for the recipient.
- **C1** — relay information from demanding sources, restructuring and changing register appropriately.
- **C2** — relay subtle information and stance accurately in any register.

#### MED-TXT-PROC — Processing text (summarising)
- **A2** — copy out short texts or extract key words.
- **B1** — summarise the main points of a short text on a familiar topic; collect information from several sources.
- **B2** — summarise long, complex texts and combine several sources into a coherent summary.
- **C1** — condense very long, demanding texts into a concise summary preserving structure and nuance.
- **C2** — summarise and rework any text critically, reconstructing its arguments.

#### MED-TXT-NOTE — Note-taking (lectures, meetings)
- **A2** — write down key words from a slow, clear, short talk.
- **B1** — take notes during a straightforward lecture on a familiar topic, capturing key points and names.
- **B2** — take detailed notes at a lecture or meeting, enough to write up later.
- **C1** — take selective notes, reformulating and reordering complex lectures.

#### MED-TXT-EXP — Expressing a personal response to creative texts
- **A2** — say what they like or dislike about a story or film in simple words.
- **B1** — describe feelings and reactions to a story, film or text, with brief reasons.
- **B2** — explain why a creative text affected them, relating it to own experience.
- **C1** — give a developed personal interpretation with detail and evaluative language.

#### MED-TXT-ANL — Analysis and criticism of creative texts
- **B1** — compare characters or themes in simple ways.
- **B2** — analyse plot, characters, theme and technique, with supporting examples.
- **C1** — critique with reference to style, genre, context and cultural convention.
- **C2** — offer sophisticated critical evaluation, situating the work in a tradition.

#### MED-CON-COL — Collaborating in a group
- **A2** — contribute ideas in a simple way in a group task, using short phrases and gestures.
- **B1** — contribute to group work, ask for others' views and check agreement.
- **B2** — collaborate effectively, keep the group focused, suggest next steps, summarise conclusions.
- **C1** — guide the group with tact, reconciling different opinions.

#### MED-CON-LEAD — Managing interaction in a group
- **B1** — invite others to speak; ask simple questions to keep interaction going.
- **B2** — manage a discussion: control turns, keep focus, include quieter members.
- **C1** — manage complex discussion, clarify positions, redirect tactfully.

#### MED-CON-EXPL — Explaining concepts
- **A1** — explain a simple word or object with gesture and a basic phrase.
- **A2** — explain simple concepts with examples in short sentences.
- **B1** — explain a concept with a simple definition and example; check understanding.
- **B2** — explain technical or abstract concepts in own field using analogy and examples, adapting to the audience.
- **C1** — explain complex ideas clearly to non-specialists, restructuring them into accessible form.
- **C2** — explain any complex concept fluently in any register.

#### MED-COM-BRIDGE — Facilitating a pluricultural space
- **A1** — welcome people from other cultures; use simple greetings in their language.
- **A2** — recognise obvious cultural differences (greetings, food, time) and handle them politely.
- **B1** — explain simple cultural conventions and point out differences; avoid giving offence.
- **B2** — interpret cultural behaviour for others, deal with misunderstanding, act as a cultural bridge.
- **C1** — mediate sensitively between different cultural perspectives.
- **C2** — mediate subtle cultural distance with tact and nuance.

#### MED-COM-ACT — Acting as intermediary in informal situations
- **A1** — help a friend with a simple word or phrase.
- **A2** — interpret simple everyday exchanges for friends or family (shopping, directions) if speakers are clear.
- **B1** — interpret simple exchanges in familiar situations, pausing to plan.
- **B2** — interpret fluently in social and professional situations, conveying meaning and tone.
- **C1** — interpret subtle content, tone and register between people accurately.

#### MED-COM-CONF — Facilitating communication in delicate situations and disagreement
- **B1** — reformulate something more neutrally or politely.
- **B2** — calm tension, restate views neutrally, propose compromises.
- **C1** — defuse conflict tactfully, negotiating solutions between parties.
- **C2** — resolve complex disagreements with sensitivity to all sides.

### 3.5 STRATEGIES

#### STR-PLAN — Planning
- **A2** — rehearse and use memorised phrases.
- **B1** — rehearse and try out new expressions; think about what to say beforehand.
- **B2** — plan what to say and how, considering the effect on the audience.
- **C1** — plan and adapt the message to audience and purpose while speaking.

#### STR-COMP — Compensating
- **A1s** — point, mime or show a picture to get the meaning across.
- **A1** — use words from other languages and mime to convey meaning.
- **A2** — use a simple word for a concept and ask for the right word.
- **B1** — paraphrase or use a simple circumlocution for a missing word.
- **B2** — use circumlocution and paraphrase to cover gaps in vocabulary and structure.
- **C1** — backtrack and restructure around a difficulty so smoothly that others hardly notice.

#### STR-MON — Monitoring and repair
- **A1** — needs help from the partner to repair a message.
- **A2** — correct some slips once pointed out.
- **B1** — correct slips and errors they notice; check meaning is understood.
- **B2** — correct mistakes that led to misunderstanding; notice and avoid habitual errors.
- **C1** — self-correct almost imperceptibly.

#### STR-TURN — Taking the floor
- **A1** — attract attention with a simple expression.
- **A2** — use simple techniques to start, maintain and end a short conversation.
- **B1** — start, maintain and close conversation; intervene with a suitable phrase.
- **B2** — intervene appropriately, using set phrases to gain time and keep the floor.
- **C1** — choose suitable discourse functions to get or keep the floor.

#### STR-COOP — Cooperating
- **A2** — indicate when they are following.
- **B1** — repeat part of what someone said to confirm mutual understanding.
- **B2** — relate own contribution to others' and summarise to check understanding.
- **C1** — relate contributions skilfully to those of others.

#### STR-CLAR — Asking for clarification
- **A1s** — show non-understanding by gesture or a single word.
- **A1** — ask for repetition or slower speech.
- **A2** — ask for simple clarification ("What does … mean?").
- **B1** — ask for clarification of key words or ideas.
- **B2** — ask follow-up questions to check they have understood.
- **C1** — ask precise questions to resolve ambiguity.

### 3.6 COMPETENCES

#### CMP-RNG — General linguistic range
- **A1s** — a handful of words and formulae.
- **A1** — a basic repertoire of words and simple phrases about personal details and concrete situations.
- **A2** — basic sentence patterns with memorised phrases for limited information in simple everyday situations.
- **B1** — enough language to get by on familiar topics, with some hesitation and circumlocution.
- **B2** — enough range to give clear descriptions and views on most general topics without much visible searching.
- **C1** — broad range that allows choosing a fitting formulation without restricting what to say.
- **C2** — great flexibility in reformulating ideas to differentiate shades of meaning; good command of idiom and colloquial language.

#### CMP-VOC-R — Vocabulary range
- **A1** — single words and phrases for concrete needs.
- **A2** — enough vocabulary for routine everyday transactions and familiar situations.
- **B1** — enough vocabulary to talk about most everyday topics, with some circumlocution.
- **B2** — good range in own field and on most general topics; varies wording to avoid repetition.
- **C1** — broad lexical repertoire with idiomatic and colloquial expressions.
- **C2** — very broad repertoire, including connotation and fine shades of meaning.

#### CMP-VOC-C — Vocabulary control
- **A2** — controls a narrow repertoire for concrete everyday needs.
- **B1** — good control of elementary vocabulary; major errors appear when expressing complex ideas.
- **B2** — generally high accuracy, with some confusion and wrong word choice that does not block communication.
- **C1** — occasional minor slips, no significant vocabulary errors.
- **C2** — appropriate, consistent and precise use.

#### CMP-GRM — Grammatical accuracy
- **A1** — limited control of a few simple structures in a memorised repertoire.
- **A2** — some simple structures correct but still makes basic mistakes systematically.
- **B1** — reasonably accurate in familiar contexts; occasional errors do not hinder understanding.
- **B2** — good control; no mistakes that cause misunderstanding; corrects many of own errors.
- **C1** — consistently high accuracy; errors rare and hard to spot.
- **C2** — consistent control of complex language even while attention is elsewhere.

#### CMP-PHO — Phonological control (articulation, prosody, intelligibility)
- **A1s** — a few words are intelligible to a sympathetic listener used to learners.
- **A1** — a very limited set of memorised words and phrases can be understood with effort.
- **A2** — generally clear enough despite a noticeable accent; partners occasionally ask for repetition.
- **B1** — clearly intelligible although a foreign accent is sometimes evident; occasional mispronunciation.
- **B2** — clear, natural pronunciation and intonation.
- **C1** — vary intonation and place stress correctly to express finer shades of meaning.
- **C2** — natural, effortless control of sounds, stress and intonation for all purposes.

#### CMP-ORT — Orthographic control
- **A1s** — copy familiar letters and words.
- **A1** — copy short familiar words; spell own name and address.
- **A2** — copy short sentences; spell short words from memory, with some phonetic spelling.
- **B1** — spelling, punctuation and layout accurate enough to be followed most of the time.
- **B2** — continuous writing generally intelligible; spelling and punctuation reasonably accurate.
- **C1** — consistent, helpful layout, paragraphing and punctuation; spelling accurate except for rare slips.
- **C2** — orthographically free of error.

#### CMP-SOC — Sociolinguistic appropriateness
- **A1** — basic social contact using the simplest polite forms (greetings, farewells, introductions).
- **A2** — very short social exchanges using everyday polite forms.
- **B1** — a wide range of functions in a neutral register; aware of key politeness conventions.
- **B2** — express self appropriately in a variety of situations; avoids gross errors of formulation.
- **C1** — recognise a wide range of idiom and colloquialism; appreciate register shifts.
- **C2** — good command of idiom; appreciate sociolinguistic and sociocultural implications.

#### CMP-FLU — Spoken fluency
- **A1** — very short, isolated utterances with much pausing.
- **A2** — understandable in very short utterances; pauses, false starts and reformulation are evident.
- **B1** — keeps going comprehensibly; pauses for planning and repair, especially in longer stretches.
- **B2** — fairly even tempo; few noticeably long pauses.
- **C1** — fluent and spontaneous, almost effortless.
- **C2** — natural colloquial flow at length.

#### CMP-COH — Coherence and cohesion
- **A1** — link words with very basic connectors ("and", "then").
- **A2** — link groups of words with "and", "but", "because".
- **B1** — link shorter elements into a connected linear sequence.
- **B2** — use a limited range of cohesive devices to build clear discourse, with some jumpiness in long turns.
- **C1** — clear, smooth, well-structured discourse with controlled organisational patterns and connectors.
- **C2** — coherent, cohesive discourse using varied organisational patterns and a wide range of connectors.

#### CMP-THEM — Thematic development
- **A2** — tell a story or describe something as a simple list of points.
- **B1** — relate a narrative or description as a linear sequence.
- **B2** — develop a description or narrative, expanding main points with supporting detail and examples.
- **C1** — develop particular points and finish with an appropriate conclusion.
- **C2** — develop themes skilfully, with structure that serves the audience.

#### CMP-PREC — Propositional precision
- **A2** — communicate what they want to say in a simple, direct exchange of limited information.
- **B1** — convey the main point comprehensibly; explain the main points of an idea or problem with reasonable precision.
- **B2** — pass on detailed information reliably.
- **C1** — qualify opinions and statements precisely in relation to degrees of certainty.
- **C2** — convey fine shades of meaning using a wide range of modification devices.

#### CMP-FLEX — Flexibility
- **A2** — adapt well-rehearsed phrases to the situation.
- **B1** — adapt to changes of direction and style with some effort.
- **B2** — adjust to changes of direction, style and emphasis.
- **C1** — adapt contributions fluently to changed circumstances.
- **C2** — rephrase with great flexibility.

#### CMP-PLURI — Plurilingual comprehension and use of repertoire
- **A1** — recognise international words (taxi, hotel, coffee).
- **A2** — use similar words in other known languages to understand.
- **B1** — use knowledge of other languages to guess meaning; switch language to help a partner.
- **B2** — use transfer, cognates and deliberate code-switching.
- **C1** — exploit a plurilingual repertoire to mediate between people.
- **C2** — flexible use of all languages known.

---

## 4. Themes (thematic syllabus) [Gen, aligned with CEFR domains]

Cumulative: a topic listed at a level continues to be used above it. Use these as `theme` tags for vocabulary, sessions, manuals and games. Depth grows: A-levels = concrete and personal; B-levels = experience, opinion, society; C-levels = abstract, specialised, critical.

| Theme | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|
| 1. Identity and personal details | name, age, nationality, address, phone | appearance, character, background | personality, life story, aspirations | identity, self-image, stereotypes | identity and belonging, multiculturalism | philosophy of self, nuanced social identity |
| 2. Family and relationships | family members, friends | relatives, social life, invitations | relationships, dating, conflict, generations | gender roles, social change, family models | intergenerational and cultural norms | sociology of family and community |
| 3. Home and living | rooms, furniture, address | house/flat, rent, neighbourhood | housing problems, moving, city vs countryside | housing market, urban planning | architecture, urbanism | heritage, urban theory |
| 4. Daily routine and time | days, months, time, weekdays | routines, schedules, frequency | work-life balance, habits | time management, lifestyle | quality of life, wellbeing | culture of time, critique of modern life |
| 5. Food and drink | basic food, ordering, likes | recipes, quantities, restaurant | diets, food customs, cooking | food industry, health, ethics | gastronomy, food culture | food politics, sensory language |
| 6. Shopping and money | prices, buying, coins/notes | clothes, sizes, payments, banks | consumer rights, returns, budgeting | consumer society, personal finance | economics of consumption | financial systems, ethics of markets |
| 7. Clothing and appearance | basic clothes, colours | fashion, sizes, describing people | style, image, trends | fashion industry, image and society | fashion as culture | aesthetics of dress |
| 8. Health and body | body parts, simple symptoms | doctor visit, medicine, accidents | healthy lifestyle, health services | health systems, mental health | bioethics, public health debates | medical and scientific discourse |
| 9. Weather, nature, animals | weather, seasons, pets | landscapes, climate, animals | natural events, holidays outdoors | climate change, biodiversity | sustainability, conservation policy | philosophy of nature |
| 10. Travel and transport | ticket, bus, train, hotel | booking, timetables, directions | trip problems, culture shock, tourism | tourism impact, migration | mobility, globalisation | geopolitics of movement |
| 11. Places and directions | town places, left/right | maps, asking the way | describing regions and cities | urban/rural development | regional identity | cultural geography |
| 12. Education and learning | classroom objects, subjects | school life, study plans | education paths, training, exams | education systems and reform | educational theory, lifelong learning | research and pedagogy |
| 13. Work and careers | jobs, workplace basics | job descriptions, CV, workday | interviews, workplace rules, meetings | career, leadership, negotiation | organisational culture, ethics | strategy, professional discourse |
| 14. Leisure, hobbies, sport | hobbies, sports, music | events, invitations, weekends | entertainment, sport culture, going out | leisure industry, extreme sports, sponsorship | sport and society, ethics | cultural analysis of leisure |
| 15. Media and technology | phone, computer, TV | internet, messages, social media | news habits, digital life | media influence, privacy | disinformation, AI, digital society | philosophy of technology |
| 16. Culture, arts, literature | music, films, festivals | museums, books, cinema | reviews, plots, traditions | literary analysis, arts debate | art, architecture, style | criticism, intertextuality |
| 17. Society, politics, law | rules, signs | community, simple laws | civic life, rights, elections | political systems, justice, immigration | civil disobedience, policy debate | political theory, rhetoric |
| 18. Economy and business | shop, price | basic company, jobs | business basics, marketing | trade, economy, entrepreneurship | corporate responsibility, macroeconomics | financial analysis, strategy |
| 19. Environment and sustainability | recycling, weather | pollution, energy basics | environmental problems, personal action | policy, climate debate | ecological policy, trade-offs | global governance of environment |
| 20. Science and ideas | simple facts | how things work | inventions, discoveries, experiments | scientific debate, technology impact | research methods, ethics of science | epistemology, technical discourse |
| 21. Values, ethics, beliefs | likes/dislikes | holidays, customs | values, opinions, dilemmas | ethics, religion, tolerance | moral philosophy, social norms | abstract philosophy |
| 22. Language and communication | greetings, "How do you say…?" | learning languages, simple politeness | communication styles, misunderstandings | register, politeness, intercultural | humour, irony, rhetoric | language and power, stylistics |

---

## 5. Functions and speech acts by level [Gen, aligned with Threshold-style notional-functional lists]

Cumulative. Use as `function` tags for phrases, dialogues, games and lesson objectives.

| Level | Functions |
|---|---|
| **A1s** | Greet; say name; say yes/no; point and name; count to ten. |
| **A1** | Introduce self and others; ask and give personal information; thank; apologise; ask for repetition; ask and give time, price, place; order and request; simple likes/dislikes; simple directions; spell; accept and refuse; invite simply. |
| **A2** | Describe people, places, routines; narrate simple past events; express plans and intentions; make suggestions, offers, promises; ask for and give simple advice; compare; express obligation and necessity in simple terms; simple opinion ("I think"); make appointments; phone basics; write short messages; express feelings and needs. |
| **B1** | Narrate and sequence events; describe experiences; express opinion with reasons; agree, disagree politely; express hope, wish, regret, surprise; give advice and warnings; make predictions and hypotheses (simple); complain and explain problems; report what others said; summarise a story or article; talk about the future; handle small talk; ask for clarification. |
| **B2** | Argue and counter-argue; speculate and hypothesise (conditional, unreal); evaluate advantages and disadvantages; persuade and negotiate; express degrees of certainty; give and take criticism; paraphrase and summarise complex text; reformulate for another; express emotion and stance; hedge and emphasise; formal and informal register switching. |
| **C1** | Nuance attitude and irony; qualify precisely; develop complex arguments with concession; manage and steer discussions; interpret implicit meaning; use idiom and humour; write formal and analytical text; mediate between positions; give critical evaluation; persuade rhetorically; adjust register to audience. |
| **C2** | Convey finest shades; play with language; reconstruct and synthesise sources; speak and write with stylistic mastery; handle any social, professional or academic situation with cultural sensitivity; resolve delicate disagreement. |

---

## 6. Conversational and monologue abilities by level

Indicative lengths and behaviours are [Gen] conventions for teacher expectations, not CEFR.

### 6.1 Conversation (spoken interaction)
| Level | What the learner can do in conversation | Support needed from partner | Typical turn |
|---|---|---|---|
| **A1s** | Greet, react with gestures/single words, answer yes/no | Constant: pictures, gestures, repetition | 1 word |
| **A1** | Ask and answer simple questions on personal topics; make simple requests; keep to memorised exchanges | Slow speech, repetition, rephrasing, help finding words | 1 short sentence |
| **A2** | Manage short social exchanges, routines, shopping, directions; ask basic follow-ups; accept, refuse, invite | Clear speech; often needs help to continue; cannot sustain unaided | 1–2 sentences |
| **B1** | Start, maintain and close conversation on familiar topics; exchange opinions; check understanding; deal with travel problems | Occasional repetition; may lose thread on unfamiliar topics | 2–4 sentences, some hesitation |
| **B2** | Take an active part; account for and defend views; react to hypotheses; keep conversation going naturally with native speakers | Rarely; struggles only with very fast, idiomatic or highly specialised talk | Extended turns, few long pauses |
| **C1** | Follow and steer complex, abstract talk; use humour and allusion; choose register; take the floor smoothly | None practical | Flexible, spontaneous |
| **C2** | Converse on any topic with nuance, irony and cultural fluency | None | Effortless |

### 6.2 Monologue (spoken production)
| Level | Monologue ability | Typical length [Gen] | Structure |
|---|---|---|---|
| **A1s** | Say name and single words | 1–2 words | none |
| **A1** | Describe self, family, home in isolated sentences | 3–5 short sentences | list |
| **A2** | Describe routine, past weekend, plans, likes; give simple reasons with "because" | 30–60 sec (5–8 sentences) | list with simple connectors |
| **B1** | Narrate an event or story; describe an experience; give an opinion with reasons; simple presentation | 1–2 min | linear sequence, some connectors |
| **B2** | Clear, detailed presentation or argument; weigh options; hypothesise | 2–4 min | introduction, developed points, conclusion |
| **C1** | Complex, well-structured presentation integrating sub-themes; expand and support points | 4–6+ min | organised, controlled cohesive devices |
| **C2** | Sophisticated, persuasive speech; adapt to audience; reconstruct arguments | Unlimited | rhetorically shaped |

---

## 7. Teacher toolkit: verifying a student's level [Gen, built on the scales above]

### 7.1 Principles
1. Assess **each skill separately**: Listening, Reading, Spoken interaction, Spoken production, Writing (and Mediation optionally).
2. Use **at least two tasks per skill** and, where possible, two different days, because one performance can mislead.
3. Judge on **what the learner does without unplanned help**, not on what they recognise when helped.
4. Test the level **above** the suspected one. The learner's level is the highest level at which they perform consistently; failing the next one confirms the ceiling.
5. Record evidence (note, recording, text sample) with date, task and descriptor IDs.

### 7.2 Quick level indicators (speaking)
| Level | Pauses and hesitation | Sentence complexity | Errors | Vocabulary | Typical failure |
|---|---|---|---|---|---|
| A1 | Very frequent, long | Isolated words, memorised chunks | Constant | Concrete basics | Cannot go beyond memorised set |
| A2 | Frequent, false starts | Simple sentences + "and/but/because" | Basic, systematic (tense, agreement) | Everyday, narrow | Cannot narrate or sustain talk |
| B1 | Noticeable in planning | Some subordination, simple past/future | Frequent but meaning clear | Enough with circumlocution | Struggles with abstract topics, complex tenses/moods |
| B2 | Few long pauses | Wide range of complex sentences | Occasional, rarely block meaning | Wide in general topics, some in field | Loses nuance, idiom, register control |
| C1 | Almost none | Flexible, varied, controlled | Rare | Broad, idiomatic | Slips in rare idiom or highly abstract subtlety |
| C2 | None | Natural, elegant | Almost none | Very broad, precise | (No practical limitation) |

### 7.3 Oral assessment criteria
Rate each criterion separately, using the descriptors in section 3.6:

| Criterion | Scale |
|---|---|
| Range | `CMP-RNG`, `CMP-VOC-R` |
| Accuracy | `CMP-GRM`, `CMP-VOC-C` |
| Fluency | `CMP-FLU` |
| Interaction | `IN-CONV`, `STR-TURN`, `STR-COOP`, `STR-CLAR` |
| Coherence | `CMP-COH`, `CMP-THEM` |
| Phonology | `CMP-PHO` |
| Sociolinguistic | `CMP-SOC` |

### 7.4 Written assessment criteria
| Criterion | Scale |
|---|---|
| Task achievement / content | `WR-OV`, `WR-CRE`, `WR-REP`, `WI-COR`, `WI-NOTE` |
| Range | `CMP-RNG`, `CMP-VOC-R` |
| Accuracy | `CMP-GRM`, `CMP-VOC-C`, `CMP-ORT` |
| Coherence and organisation | `CMP-COH`, `CMP-THEM` |
| Register and appropriacy | `CMP-SOC` |

### 7.5 Diagnostic task bank
Suggested tasks; each is scored against the scales named.

| Level | Spoken interaction | Monologue | Listening | Reading | Writing |
|---|---|---|---|---|---|
| **A1s** | Greet, say name, point to and name 5 objects | Say name and count to ten | Follow 3 commands with gestures | Recognise own name, 5 signs | Copy name and 3 words |
| **A1** | Role-play: introduce yourself and order a coffee | Describe your family in 4 sentences | Short dialogue: catch time/price/name | Read a menu or notice; answer 3 questions | Fill a form; write a postcard (20–30 words) |
| **A2** | Role-play: buy a ticket / ask directions / invite a friend | Tell what you did last weekend and what you will do tomorrow | Short announcement or voicemail; extract 3 details | Read a timetable, ad or short letter; answer questions | Short informal email (40–60 words) about weekend or invitation |
| **B1** | Unprepared conversation about work/hobbies; solve a travel problem (lost luggage) | Narrate a memorable event or the plot of a film with reasons (1–2 min) | Radio item on familiar topic; identify main points and some details | Newspaper article or blog; main conclusions and details | Personal letter or story (100–150 words) describing experience and feelings |
| **B2** | Discussion of a topical issue (advantages/disadvantages); negotiate a solution | Prepared 3-min presentation; defend a viewpoint with examples | Lecture or interview; follow argument and speaker attitude | Longer article with a viewpoint; infer attitude, summarise | Essay or report (200–250 words) with argument for/against |
| **C1** | Abstract debate; role-play a delicate negotiation | 5-min structured talk on complex topic with Q&A | Unstructured discussion or documentary with implicit meaning | Long literary or specialist text; style and implication | Structured, formal essay/report (250–350 words), appropriate register |
| **C2** | Chair a debate; argue subtle positions with irony and allusion | Improvised persuasive speech; defend against hostile questions | Fast native speech, mixed accents, humour | Complex/abstract/literary text; critical evaluation | Synthesis of multiple sources into a polished article; review or critique |

### 7.6 Decision rules [Gen]
1. **Per-skill level:** the highest level at which the learner meets **most (about 70% or more)** of the sampled descriptors across tasks without unplanned help, and does **not** meet most of the next level.
2. **Plus:** meets most descriptors at level L and about half of level L+1 → `Lp` (A2p, B1p, B2p).
3. **Accuracy check:** if range or fluency is one level above accuracy, record the level from accuracy and add a note ("wide but inaccurate").
4. **Overall label (only if needed):** the level reached in at least **three of the four core skills** (listening, reading, speaking [interaction + production combined], writing), with no core skill more than **one level below**. Otherwise report the profile, not a single label.
5. **Re-test:** every 60–120 guided hours, or at end of a course level.
6. **Placement shortcut:** start at the suspected level, go up one level after success, down one after failure, stop when a level is passed and the next is failed.

### 7.7 Frequent misjudgement traps
- Reading and listening ahead of speaking: do not raise speaking level because of good reading.
- Recognition is not production: a learner may understand B1 texts but write A2.
- Familiar topics hide the B1 → B2 "abstraction wall": always test an abstract topic at B1+.
- Memorised chunks inflate A1–A2: use unprepared questions.
- Native-language transfer can make grammar look higher or lower than real (e.g. Romance-language speakers learning Italian/Spanish).
- Non-alphabetic or new-script languages: reading/writing may lag far behind speaking at A1s–A2.

### 7.8 Learner self-check ("I can", original wording) [CoE-aligned]
| | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|
| **Listening** | I recognise familiar words and phrases if people speak slowly. | I understand short clear messages and the main point of everyday talk. | I follow the main points of clear speech on familiar topics. | I follow long talks, most news and most films. | I follow long, unstructured speech and TV without effort. | I understand any spoken language. |
| **Reading** | I understand names, words and simple sentences on signs and cards. | I read short simple texts and find specific information. | I read factual texts and personal letters about familiar topics. | I read articles with viewpoints and modern fiction. | I read long, complex texts and notice style. | I read virtually everything with ease. |
| **Spoken interaction** | I ask and answer simple questions if the person helps me. | I handle short routine exchanges. | I cope with most travel situations and join in conversation on familiar topics. | I speak with enough fluency to talk with native speakers regularly. | I express myself fluently and flexibly in social and professional life. | I take part effortlessly in any conversation and convey fine shades of meaning. |
| **Spoken production** | I use simple phrases to say where I live and who I know. | I describe my family, my daily life and my job in simple terms. | I tell stories, describe experiences and give reasons for opinions. | I give detailed presentations and explain a viewpoint. | I give clear, structured presentations on complex subjects. | I give smooth, well-organised speeches or arguments for any audience. |
| **Writing** | I write a postcard and fill in forms. | I write short notes and simple personal letters. | I write connected texts on familiar topics and personal letters. | I write detailed texts, essays and reports. | I write well-structured texts on complex subjects. | I write polished, stylistically appropriate texts of any kind. |

The official 2001 Table 2 (self-assessment grid) and Table 3 (qualitative aspects of spoken language use) remain in the earlier project file; carry them over in Appendix A.

### 7.9 Student profile record (template)
```
student_id, language, date, assessor
listening:           {level, sublevel, evidence, descriptors_met[], next_target}
reading:             {...}
spoken_interaction:  {...}
spoken_production:   {...}
writing:             {...}
mediation (optional):{...}
strengths[], gaps[], recommended_focus[], recommended_course_level
```

---

## 8. Language-specific layer (what each language must add)

The universal layer above is identical for all 14 languages. Each language needs its own file that adds:

| Component | Content |
|---|---|
| **Script and sounds (A1s)** | Alphabet, letter-sound map, key pronunciation contrasts, stress/intonation basics |
| **Grammar milestones per level** | Which structures appear at which level (tenses, cases, moods, particles), ordered by the language's own logic |
| **Vocabulary lists per level and theme** | Use the theme tags from section 4 |
| **Phrases per function** | Use function tags from section 5 |
| **Typical learner errors** | By L1 background where known |
| **Register and culture notes** | Politeness, formal/informal, dialects |
| **Exams and certificates** | Only with source and `verified_date` |
| **Realistic top level and materials** | Especially for minority languages |
| **Adaptations to scales** | Script- or language-specific notes (e.g. `CMP-ORT` for non-Latin scripts, `CMP-PHO` for tonal/tense-vowel systems) |

### 8.1 Coverage status (snapshot of the repos, 2026-09-30)
| Language | Universal layer | Vocabulary entries (COSYdata) | General curriculum levels (COSYplatform) |
|---|---|---|---|
| English | full | 11,419 (A0–A1 to C2) | A1–C2 |
| French | full | 1,881 | A1–C2 |
| Russian | full | 1,721 | A1–C2 |
| Italian | full | 2,279 | A1 |
| Greek | full | 1,067 | A1 |
| German, Spanish, Portuguese | full | 492–510 | A1, C1 |
| Armenian, Georgian, Bashkir, Breton, Tatar | full | 393–414 | A1, C1 |
| Chuvash | full | 445 | none |

Store `coverage: full | partial | universal-only` per language and level, and show only what is verified.

### 8.2 Language-family notes affecting the scales [Gen, to be verified by experts]
- **Cyrillic-script languages (Russian, Tatar, Bashkir, Chuvash):** A1s includes alphabet and stress.
- **Greek, Armenian, Georgian:** own scripts; A1s = script and sounds.
- **Case-rich languages (Russian, Greek, Georgian, Armenian, German):** grammar accuracy (`CMP-GRM`) expectations rise with case mastery; teacher must decide which cases belong to which level.
- **Turkic languages (Tatar, Bashkir, Chuvash):** agglutinative morphology and vowel harmony affect `CMP-GRM` and `CMP-PHO`.
- **Breton:** mutations affect `CMP-GRM`; dialect choice affects `CMP-PHO`.
- **Armenian:** Eastern/Western decision; **Portuguese:** European/Brazilian decision.

---

## 9. Applying this file in the project repositories

### 9.1 Tags to use everywhere
`language` · `level` (A1–C2) · `sublevel` (`start` / `p` / null) · `skill` (lis, rd, in, sp, wr, med) · `scale` (e.g. `in-conv`) · `descriptor_ids[]` (e.g. `cefr:in-conv-b1`) · `theme_id` (t01–t22) · `function_ids[]` (section 5) · `use_domain` (personal / public / occupational / educational) · `source` · `verified_date`.

The repos' existing `domain` (course track), `theme` (lexical field) and `sub_theme` fields stay as they are.

### 9.2 Repo map
| Repo | Use |
|---|---|
| **cosyplatform** | **Canonical home of this file and its JSON version (`cefr/`).** Courses by language + level; lesson objectives = descriptor IDs; placement/diagnostic (7.5); student profile (7.9); access by language, course, level. |
| **cosydata** | Read-only mirror of the CEFR JSON. Vocabulary and phrase lists tagged by level, theme, function; existing `theme` fields unchanged. |
| **cosylanguages** | Level explainer pages, self-check ("I can" grid), practice filters by level/skill/theme, blog articles on levels; course-type catalog pages with level labels. |
| **cosytools** | Verbs, verbs + prepositions and grammar entries tagged by level of introduction; interactive practice filtered by level. |
| **cosymanuals** | Manual skeletons per language and level: chapters organised by theme, function and can-do; grammar sequence from the language layer. |
| **cosyevents** | Sessions tagged with level range, theme, use_domain, skill focus; converted into lessons with same tags; vocabulary duplicated to cosydata under correct level folder. |
| **cosygames** | Games tagged by level, skill, theme, function so teachers can filter (e.g. "B1 listening, travel"). |

### 9.3 Suggested data model
```json
{
  "scale": {"id": "in-conv", "name": "Conversation", "mode": "interaction", "skill": "IN"},
  "descriptor": {
    "id": "in-conv-b1", "scale": "in-conv", "level": "B1", "sublevel": null, "use_domain": null,
    "text": "...", "source_tag": "CoE-aligned", "source_version": "2001/2020",
    "verified_date": null
  },
  "theme": {"id": "t08", "name": "Health and body", "levels": {"A1": "...", "A2": "..."}},
  "function": {"id": "f-advice", "levels": ["A2", "B1"]},
  "language_layer": {"language": "fr", "coverage": "partial",
    "grammar_milestones": [], "exams": [], "requirements": []}
}
```
Rules: `level` never holds `A0` or `A0-A1`; starter content is `level: A1` + `sublevel: start`. Events may use `level_from` / `level_to`. `verified_date` is mandatory for anything that can change (exams, requirements, hours); hide unverified items on public sites.

### 9.4 Versioning
Version this file (`1.0`, `1.1` …). Every repo stores the version of the CEFR master it was tagged against, so re-tagging can be done when the master changes.

---

## 10. Verification and open items (do before public release)

1. **Compare [CoE-aligned] wording with the official CV (2020) text** for each scale and replace with the official wording where the project wants canonical citations. This file follows the structure and logic, but the descriptors are the project's phrasing. Confirm the Council of Europe's reuse conditions for publishing descriptors.
2. **Plus-level descriptors per scale** are not written here; the CV has them (A2+, B1+, B2+). Add them from the official text if you want scale-level plus descriptors.
3. **A1s (starter) descriptors** here are project-written; the CV provides official Pre-A1 wording for some scales.
4. **Missing/partial scales:** some CV scales are not included or condensed (e.g. detailed mediation strategy scales, further online interaction, sign languages). Add if needed.
5. **Official translations** of descriptors exist for many languages; check availability for the project languages before writing UI translations.
6. **Themes (section 4) and functions (section 5)** are project conventions, not CoE; adjust with teachers.
7. **Timings, lengths, thresholds (70%, 1–2 min, etc.)** in sections 6–7 are conventions; calibrate with real student data.
8. Language layers for the 8 empty languages still need to be written.

---

## Appendix A: Official 2001 tables (to be carried over)

Paste here, unchanged, from the earlier reference file:
- **Table 2** — self-assessment grid (section 3 of the earlier file)
- **Table 3** — qualitative aspects of spoken language use (section 4 of the earlier file)

These are the [CoE-2001] canonical layers and should stay verbatim.

---

## Appendix B: Theme crosswalk (master themes ↔ repo fields) [Gen]

The repos' `theme` field (COSYdata) names lexical fields and word classes; the master's `theme_id` names communicative topics. Keep both.

| Master theme | COSYdata canonical theme(s) | Platform A1 module |
|---|---|---|
| t01 Identity | descriptors, communication, geography | 1 First contact & identity |
| t02 Family & relationships | family, emotions | 2 People & relationships |
| t03 Home | housing, objects | 3 Objects; 4 Home |
| t04 Daily routine & time | time, actions, activities, numbers | 4, 21 |
| t05 Food & drink | food | 5 |
| t06 Shopping & money | shopping | 6 |
| t07 Clothing | clothing, colors | 7 |
| t08 Health | health | 8 |
| t09 Weather, nature, animals | weather, nature, animals | 13 |
| t10 Travel & transport | travel | 11 |
| t11 Places & directions | navigation, geography | 12 |
| t12 Education | education | 9 |
| t13 Work | work | 9 |
| t14 Leisure | leisure, activities | 14 |
| t15 Media & technology | technology | 15 |
| t16 Culture & arts | none in the 30 (live data: culture) | 16 |
| t17 Society, politics, law | none (live data: politics, society, law) | 20 (basic) |
| t18 Economy & business | none (live data: business, economy) | 6 (basic) |
| t19 Environment | nature (live data: environment) | 13 |
| t20 Science & ideas | none (live data: science) | n/a |
| t21 Values & ethics | philosophy (live data: ethics) | n/a |
| t22 Language & communication | communication | 10, 20 |

Gap: t16–t21 have no canonical COSYdata theme yet.
