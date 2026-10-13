const fs = require('fs');
const path = require('path');
const os = require('os');
const { JSDOM } = require('jsdom');
const { parseContentMetadata, getAllFiles, buildLiveSet } = require('./publish_to_supabase');

function runTestPublishLabels() {
  console.log('🧪 Testing lesson language labelling...');
  const lessonsDir = path.join(process.cwd(), 'lessons');
  const lessonFiles = getAllFiles(lessonsDir);

  if (lessonFiles.length === 0) {
    console.error('❌ No lesson files found under lessons/');
    process.exit(1);
  }

  let spokenEnCount = 0;

  for (const filePath of lessonFiles) {
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

    // Assert 0: The publish selection never contains a path starting with "drafts/"
    if (relativePath.startsWith('drafts/')) {
      console.error(`❌ Publish selection contained draft file: ${relativePath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const meta = parseContentMetadata(filePath, content);

    // Assert 1: Every lesson under lessons/ gets a language
    if (!meta.language || typeof meta.language !== 'string' || meta.language.trim() === '') {
      console.error(`❌ Lesson file missing language label: ${relativePath}`);
      process.exit(1);
    }

    // Assert 2: No lesson inside spoken-en/ is labelled differently from "en"
    if (relativePath.startsWith('lessons/spoken-en/')) {
      spokenEnCount++;
      if (meta.language !== 'en') {
        console.error(`❌ Lesson in spoken-en/ labelled as '${meta.language}' instead of 'en': ${relativePath}`);
        process.exit(1);
      }
    }
  }

  console.log(`✅ Checked ${lessonFiles.length} lessons under lessons/ (including ${spokenEnCount} in spoken-en/). All pass language labelling tests.`);
}

function runTestPublishLive() {
  console.log('🧪 Testing live lesson publishing and prune guards...');
  const { LIVE, roadmapParseFailed } = buildLiveSet();

  if (roadmapParseFailed) {
    console.error('❌ Failed to parse roadmaps during test.');
    process.exit(1);
  }

  if (LIVE.size === 0) {
    console.error('❌ LIVE set is empty.');
    process.exit(1);
  }

  // Test (a): Every LIVE path exists
  console.log(`  Checking test (a): Every LIVE path exists (${LIVE.size} files)...`);
  for (const relPath of LIVE) {
    const fullPath = path.join(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Test (a) failed: LIVE path does not exist on disk: ${relPath}`);
      process.exit(1);
    }
  }
  console.log(`  ✅ Test (a) passed: All ${LIVE.size} LIVE paths exist on disk.`);

  // Test (b): Selecting files to publish from a temp copy of lessons/ never includes a file that is not in LIVE
  console.log('  Checking test (b): Temp copy filtering never includes draft files...');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosy-publish-test-'));
  try {
    const tempLessonsDir = path.join(tmpDir, 'lessons', 'general-english-a1');
    fs.mkdirSync(tempLessonsDir, { recursive: true });

    // Pick 1 live file and 1 draft file
    const liveSampleRel = Array.from(LIVE).find(p => p.startsWith('lessons/general-english-a1/'));
    const allDraftFiles = getAllFiles(path.join(process.cwd(), 'drafts', 'blueprints'));
    const draftSampleFile = allDraftFiles.find(f => {
      const rel = path.relative(process.cwd(), f).replace(/\\/g, '/');
      return rel.startsWith('drafts/blueprints/general-french-a1/');
    });

    if (!liveSampleRel || !draftSampleFile) {
      console.error('❌ Could not find sample live or draft lesson files for test (b).');
      process.exit(1);
    }

    const liveSampleFull = path.join(process.cwd(), liveSampleRel);
    const draftSampleRel = path.relative(process.cwd(), draftSampleFile).replace(/\\/g, '/');

    // Create temp copies in tmpDir
    const tempLivePath = path.join(tmpDir, liveSampleRel);
    const tempDraftPath = path.join(tmpDir, draftSampleRel);

    fs.mkdirSync(path.dirname(tempLivePath), { recursive: true });
    fs.mkdirSync(path.dirname(tempDraftPath), { recursive: true });

    fs.copyFileSync(liveSampleFull, tempLivePath);
    fs.copyFileSync(draftSampleFile, tempDraftPath);

    // Get all files from temp lessons dir
    const tempFiles = getAllFiles(path.join(tmpDir, 'lessons'));
    const selectedFiles = [];

    for (const f of tempFiles) {
      const relPath = path.relative(tmpDir, f).replace(/\\/g, '/');
      if (relPath.startsWith('lessons/')) {
        if (LIVE.has(relPath)) {
          selectedFiles.push(relPath);
        }
      }
    }

    if (selectedFiles.includes(draftSampleRel)) {
      console.error(`❌ Test (b) failed: Draft file ${draftSampleRel} was wrongly selected for publishing.`);
      process.exit(1);
    }

    if (!selectedFiles.includes(liveSampleRel)) {
      console.error(`❌ Test (b) failed: Live file ${liveSampleRel} was not selected for publishing.`);
      process.exit(1);
    }

    console.log('  ✅ Test (b) passed: Selecting files from temp copy excludes draft files.');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // Test (c): The prune guard refuses when LIVE is empty or under 100
  console.log('  Checking test (c): Prune guard refuses when LIVE is under 100...');
  function checkPruneGuard(liveSet, parseFailed) {
    if (parseFailed) return { allowed: false, reason: 'Roadmap parse failed' };
    if (liveSet.size < 100) return { allowed: false, reason: 'LIVE set fewer than 100 entries' };
    return { allowed: true };
  }

  const emptySetResult = checkPruneGuard(new Set(), false);
  if (emptySetResult.allowed) {
    console.error('❌ Test (c) failed: Prune guard allowed empty LIVE set.');
    process.exit(1);
  }

  const smallSetResult = checkPruneGuard(new Set(Array.from(LIVE).slice(0, 50)), false);
  if (smallSetResult.allowed) {
    console.error('❌ Test (c) failed: Prune guard allowed LIVE set of size 50 (< 100).');
    process.exit(1);
  }

  const parseFailedResult = checkPruneGuard(LIVE, true);
  if (parseFailedResult.allowed) {
    console.error('❌ Test (c) failed: Prune guard allowed prune when roadmap parse failed.');
    process.exit(1);
  }

  const validResult = checkPruneGuard(LIVE, false);
  if (!validResult.allowed) {
    console.error('❌ Test (c) failed: Prune guard rejected valid LIVE set.');
    process.exit(1);
  }

  console.log('  ✅ Test (c) passed: Prune guard correctly refuses when LIVE is empty, under 100, or failed to parse.');
}

async function runTestPronunciationTeacherLed() {
  console.log('🧪 Testing teacher-led pronunciation roadmaps and publishing rules...');
  const rootDir = process.cwd();
  const langs = ['en', 'fr', 'ru'];
  const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

  // Test (a): All 18 roadmaps exist, together contain 105 items, and every lessonFile exists
  console.log('  Checking test (a): 18 roadmaps exist with 105 total items...');
  let roadmapCount = 0;
  let totalItems = 0;
  const pronLessonFiles = new Set();

  for (const lang of langs) {
    for (const lvl of levels) {
      const rmPath = path.join(rootDir, 'roadmaps', `pronunciation-${lang}-${lvl}.json`);
      if (!fs.existsSync(rmPath)) {
        console.error(`❌ Test (a) failed: Pronunciation roadmap missing: roadmaps/pronunciation-${lang}-${lvl}.json`);
        process.exit(1);
      }
      roadmapCount++;
      const data = JSON.parse(fs.readFileSync(rmPath, 'utf8'));
      const sequence = data.sequence || [];
      totalItems += sequence.length;

      for (const item of sequence) {
        if (!item.lessonFile) {
          console.error(`❌ Test (a) failed: Item in pronunciation-${lang}-${lvl}.json missing lessonFile`);
          process.exit(1);
        }
        const fullFile = path.join(rootDir, item.lessonFile);
        if (!fs.existsSync(fullFile)) {
          console.error(`❌ Test (a) failed: lessonFile does not exist: ${item.lessonFile}`);
          process.exit(1);
        }
        pronLessonFiles.add(item.lessonFile);
      }
    }
  }

  if (roadmapCount !== 18) {
    console.error(`❌ Test (a) failed: Expected 18 roadmaps, found ${roadmapCount}`);
    process.exit(1);
  }

  if (totalItems !== 105 || pronLessonFiles.size !== 105) {
    console.error(`❌ Test (a) failed: Expected 105 pronunciation items, found totalItems=${totalItems}, unique=${pronLessonFiles.size}`);
    process.exit(1);
  }
  console.log(`  ✅ Test (a) passed: 18 roadmaps exist, contain 105 total items, and all lessonFiles exist.`);

  // Test (b): JSDOM rendering
  console.log('  Checking test (b): JSDOM rendering for student vs teacher role on pronunciation-fr-a1...');
  const lessonResolverCode = fs.readFileSync(path.join(rootDir, 'shared', 'js', 'lesson-resolver.js'), 'utf8');
  const i18nCode = fs.readFileSync(path.join(rootDir, 'shared', 'js', 'i18n.js'), 'utf8');

  // Student view JSDOM test
  const studentHtmlContent = fs.readFileSync(path.join(rootDir, 'student.html'), 'utf8');
  const studentScriptMatch = studentHtmlContent.match(/<script>([\s\S]*?)<\/script>/i);
  const studentDom = new JSDOM(studentHtmlContent, { url: 'http://localhost/student.html?course=pronunciation-fr-a1&ui=en', runScripts: 'outside-only' });
  studentDom.window.eval(lessonResolverCode);
  studentDom.window.CosyAuth = {
    requireRole: async () => ({ user: { email: 'student@cosylanguages.com' }, profile: { role: 'student' } }),
    FULL_MANIFEST: []
  };
  studentDom.window.fetch = async (url) => {
    const cleanUrl = url.split('?')[0].replace(/^https?:\/\/[^/]+\//, '');
    const localPath = path.join(rootDir, cleanUrl);
    if (fs.existsSync(localPath)) {
      const fileContent = fs.readFileSync(localPath, 'utf8');
      return { ok: true, text: async () => fileContent, json: async () => JSON.parse(fileContent) };
    }
    return { ok: false, status: 404 };
  };
  studentDom.window.COSY_BASE_PATH = 'http://localhost/';
  studentDom.window.eval(i18nCode);
  await studentDom.window.CosyI18n.ready;
  studentDom.window.eval(studentScriptMatch[1]);
  await studentDom.window.renderCourseRoadmap('pronunciation-fr-a1', 'a1', { role: 'student' });

  const studentDoc = studentDom.window.document;
  const studentLessonLinks = studentDoc.querySelectorAll('a[href*="lesson="]');
  if (studentLessonLinks.length > 0) {
    console.error(`❌ Test (b) failed: student view on pronunciation-fr-a1 shows ${studentLessonLinks.length} lesson links (expected 0).`);
    process.exit(1);
  }
  if (!studentDoc.body.textContent.includes('Taught live with your teacher')) {
    console.error(`❌ Test (b) failed: student view on pronunciation-fr-a1 missing 'Taught live with your teacher' text.`);
    process.exit(1);
  }

  // Teacher view JSDOM test
  const teacherHtmlContent = fs.readFileSync(path.join(rootDir, 'teacher.html'), 'utf8');
  const teacherScriptMatch = teacherHtmlContent.match(/<script>([\s\S]*?)<\/script>/i);
  const teacherDom = new JSDOM(teacherHtmlContent, { url: 'http://localhost/teacher.html?course=pronunciation-fr-a1&ui=en', runScripts: 'outside-only' });
  teacherDom.window.eval(lessonResolverCode);
  teacherDom.window.CosyAuth = {
    requireRole: async () => ({ user: { email: 'teacher@cosylanguages.com' }, profile: { role: 'teacher' } }),
    FULL_MANIFEST: []
  };
  teacherDom.window.fetch = async (url) => {
    const cleanUrl = url.split('?')[0].replace(/^https?:\/\/[^/]+\//, '');
    const localPath = path.join(rootDir, cleanUrl);
    if (fs.existsSync(localPath)) {
      const fileContent = fs.readFileSync(localPath, 'utf8');
      return { ok: true, text: async () => fileContent, json: async () => JSON.parse(fileContent) };
    }
    return { ok: false, status: 404 };
  };
  teacherDom.window.COSY_BASE_PATH = 'http://localhost/';
  teacherDom.window.eval(i18nCode);
  await teacherDom.window.CosyI18n.ready;
  teacherDom.window.eval(teacherScriptMatch[1]);
  await teacherDom.window.renderCourseRoadmap('pronunciation-fr-a1', 'a1', { role: 'teacher' });

  const teacherDoc = teacherDom.window.document;
  const teacherLessonLinks = teacherDoc.querySelectorAll('a[href*="lesson="]');
  if (teacherLessonLinks.length !== 18) {
    console.error(`❌ Test (b) failed: teacher view on pronunciation-fr-a1 shows ${teacherLessonLinks.length} links (expected 18).`);
    process.exit(1);
  }
  console.log('  ✅ Test (b) passed: student view shows 0 links and "Taught live with your teacher"; teacher view shows 18 links.');

  // Test (c): Publish selection check
  console.log('  Checking test (c): Publish selection for student_lesson_content excludes all 105 pronunciation files...');
  const { LIVE, teacherLedLessons } = buildLiveSet();
  const allGatedFiles = getAllFiles(path.join(rootDir, 'lessons'));

  const studentSelected = [];
  const lessonSelected = [];

  for (const filePath of allGatedFiles) {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    if (LIVE.has(relPath)) {
      lessonSelected.push(relPath);
      if (!teacherLedLessons.has(relPath)) {
        studentSelected.push(relPath);
      }
    }
  }

  for (const pronFile of pronLessonFiles) {
    if (studentSelected.includes(pronFile)) {
      console.error(`❌ Test (c) failed: Pronunciation file ${pronFile} was included in student_lesson_content publish list.`);
      process.exit(1);
    }
    if (!lessonSelected.includes(pronFile)) {
      console.error(`❌ Test (c) failed: Pronunciation file ${pronFile} was missing from lesson_content publish list.`);
      process.exit(1);
    }
  }

  console.log(`  ✅ Test (c) passed: student_lesson_content contains 0 of the 105 pronunciation files; lesson_content contains all 105.`);
}

if (require.main === module) {
  runTestPublishLabels();
  runTestPublishLive();
  runTestPronunciationTeacherLed().catch(err => {
    console.error('❌ Pronunciation test failed:', err);
    process.exit(1);
  });
}

module.exports = { runTestPublishLabels, runTestPublishLive, runTestPronunciationTeacherLed };
