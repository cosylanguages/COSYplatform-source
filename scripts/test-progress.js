const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function runProgressTests() {
  console.log('🧪 Running Student Progress Module Unit & Integration Tests (scripts/test-progress.js)...');

  const rootDir = path.join(__dirname, '..');
  const progressJsCode = fs.readFileSync(path.join(rootDir, 'shared', 'js', 'progress.js'), 'utf8');

  // Test 1: Unit testing CosyProgress in JSDOM
  console.log('\n🔹 Test 1: CosyProgress Unit API & Debounce Tests...');
  const dom1 = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'http://localhost/student.html',
    runScripts: 'outside-only'
  });

  const win1 = dom1.window;
  let upsertCalled = false;
  let upsertPayload = null;

  win1.CosyAuth = {
    client: {
      auth: {
        getSession: async () => ({
          data: { session: { user: { id: 'test-student-uuid-123' } } }
        })
      },
      from: (tableName) => {
        if (tableName === 'lesson_answers') {
          return {
            upsert: async (records, options) => {
              upsertCalled = true;
              upsertPayload = records;
              return { data: records, error: null };
            },
            select: () => ({
              eq: (col1, val1) => ({
                eq: (col2, val2) => Promise.resolve({
                  data: [
                    { field_key: 'blank_1', value: 'hello', is_correct: true, updated_at: '2025-01-01T00:00:00.000Z' }
                  ],
                  error: null
                })
              })
            })
          };
        }
        return {};
      }
    }
  };

  win1.eval(progressJsCode);

  if (!win1.CosyProgress || typeof win1.CosyProgress.saveAnswer !== 'function') {
    throw new Error('FAIL: window.CosyProgress.saveAnswer is not defined.');
  }
  if (typeof win1.CosyProgress.loadAnswers !== 'function' || typeof win1.CosyProgress.flush !== 'function') {
    throw new Error('FAIL: window.CosyProgress loadAnswers or flush is missing.');
  }
  console.log('  ✅ PASS: CosyProgress API methods exist.');

  // Test saveAnswer local storage caching
  win1.CosyProgress.saveAnswer('lessons/test.json', 'field_1', 'val_1');
  const localCache = JSON.parse(win1.localStorage.getItem('cosy_ans_lessons/test.json') || '{}');
  if (localCache.field_1 !== 'val_1') {
    throw new Error(`FAIL: LocalStorage cache expected 'val_1', got '${localCache.field_1}'`);
  }
  console.log('  ✅ PASS: saveAnswer updates local storage cache immediately.');

  // Test flush immediately sends answer to Supabase
  const flushRes = await win1.CosyProgress.flush();
  if (!flushRes.success || !upsertCalled) {
    throw new Error('FAIL: CosyProgress.flush failed to upsert to Supabase.');
  }
  if (!upsertPayload || upsertPayload[0].student_id !== 'test-student-uuid-123' || upsertPayload[0].lesson_id !== 'lessons/test.json' || upsertPayload[0].field_key !== 'field_1' || upsertPayload[0].value !== 'val_1') {
    throw new Error(`FAIL: Upsert payload incorrect: ${JSON.stringify(upsertPayload)}`);
  }
  console.log('  ✅ PASS: flush correctly upserts payload to lesson_answers.');

  // Test loadAnswers merges server answers into cache
  const loaded = await win1.CosyProgress.loadAnswers('lessons/test.json');
  if (loaded.blank_1 !== 'hello') {
    throw new Error(`FAIL: loadAnswers expected 'hello', got '${loaded.blank_1}'`);
  }
  console.log('  ✅ PASS: loadAnswers returns and merges server answers.');

  // Test 2: Classroom Active View Role Restrictions (Teacher view vs Student view)
  console.log('\n🔹 Test 2: Classroom Active View Role Integration Tests...');
  const classroomHtmlContent = fs.readFileSync(path.join(rootDir, 'classroom.html'), 'utf8');

  // Extract inline script tags from classroom.html
  const scriptMatches = [...classroomHtmlContent.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
  const classroomInlineScript = scriptMatches.map(m => m[1]).join('\n;\n');

  const dom2 = new JSDOM(classroomHtmlContent, {
    url: 'http://localhost/classroom.html',
    runScripts: 'outside-only'
  });
  const win2 = dom2.window;

  // Mock global environment for classroom scripts
  win2.COSY_CONFIG = { SUPABASE_URL: 'https://mock.supabase.co', SUPABASE_ANON_KEY: 'mock-key' };
  win2.CosyAuth = {
    getAuthAndProfile: async () => ({
      session: { user: { id: 'founder-user-id' } },
      profile: { role: 'founder' }
    }),
    client: {}
  };

  win2.eval(progressJsCode);

  let progressSavedCalls = [];
  win2.CosyProgress.saveAnswer = (lessonId, fieldKey, val) => {
    progressSavedCalls.push({ lessonId, fieldKey, val });
  };

  win2.eval(classroomInlineScript);

  if (typeof win2.handleBlankInput !== 'function') {
    throw new Error('FAIL: handleBlankInput function not found on classroom window.');
  }

  // Set teacher role in classroom
  win2.switchRole('teacher');
  win2.eval(`currentLessonPath = 'lessons/test.json';`);
  win2.handleBlankInput('blank-1', 'teacher_input');
  if (progressSavedCalls.length !== 0) {
    throw new Error(`FAIL: Teacher active view wrote answer to CosyProgress: ${JSON.stringify(progressSavedCalls)}`);
  }
  console.log('  ✅ PASS: In teacher active view, handleBlankInput does NOT save answers to lesson_answers.');

  // Switch to student view
  win2.switchRole('student');
  win2.eval(`currentLessonPath = 'lessons/test.json';`);
  win2.handleBlankInput('blank-1', 'student_input');
  if (progressSavedCalls.length !== 1 || progressSavedCalls[0].val !== 'student_input') {
    throw new Error(`FAIL: Student active view failed to save answer to CosyProgress: ${JSON.stringify(progressSavedCalls)}`);
  }
  console.log('  ✅ PASS: In student active view, handleBlankInput saves answer via CosyProgress.saveAnswer.');

  console.log('\n---------------------------------------------------');
  console.log('✨ All Student Progress Module tests passed successfully!\n');
}

runProgressTests().catch(err => {
  console.error('❌ Progress Module tests failed:', err);
  process.exit(1);
});
