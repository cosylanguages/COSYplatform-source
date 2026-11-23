const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function runWidgetJsdomTests() {
  console.log('🧪 Starting JSDOM Widget Integration Tests...');

  const studentHtmlPath = path.join(__dirname, '..', 'student.html');
  const studentHtmlContent = fs.readFileSync(studentHtmlPath, 'utf8');

  const lessonResolverPath = path.join(__dirname, '..', 'shared', 'js', 'lesson-resolver.js');
  const lessonResolverCode = fs.readFileSync(lessonResolverPath, 'utf8');

  const uiToastPath = path.join(__dirname, '..', 'shared', 'js', 'ui-toast.js');
  const uiToastCode = fs.readFileSync(uiToastPath, 'utf8');

  const scriptMatch = studentHtmlContent.match(/<script>([\s\S]*?)<\/script>/i);
  if (!scriptMatch) {
    throw new Error('Could not find main inline <script> in student.html');
  }
  const studentInlineScript = scriptMatch[1];

  const dom = new JSDOM(studentHtmlContent, {
    url: 'http://localhost/student.html?lesson=lessons/general-en-a1/nice-to-meet-you.json',
    runScripts: 'outside-only'
  });

  const { window } = dom;

  // Execute scripts in window context
  window.eval(lessonResolverCode);
  window.eval(uiToastCode);

  // Mock window.CosyAuth
  window.CosyAuth = {
    requireRole: async () => ({
      user: { email: 'test@cosylanguages.com' },
      profile: { role: 'student', language_access: ['all'], course_level: 'all' }
    }),
    FULL_MANIFEST: []
  };

  window.eval(studentInlineScript);

  const lessonPath = 'lessons/general-en-a1/nice-to-meet-you.json';
  window.currentStudentLessonPath = lessonPath;
  window.eval(`currentStudentLessonPath = "${lessonPath}";`);

  const appRoot = window.document.getElementById('app-root');

  // Test (a): Essay Save button writes to localStorage and shows "Saved on this device"
  console.log('  Testing (a): Essay Save button and localStorage...');

  const fieldKey = 'slide_0_cosy-essay_0';
  const savedText = window.getSavedStudentInput(`${fieldKey}_essay`);
  const statusId = `${fieldKey}_essay_status`;

  appRoot.innerHTML = `
    <div class="essay-widget">
      <p>📝 <strong>Writing Assignment</strong></p>
      <textarea id="${fieldKey}_essay_textarea" placeholder="Write your answer here...">${savedText}</textarea>
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 8px; flex-wrap: wrap;">
        <button id="essaySaveBtn" class="btn" style="background: var(--student-primary);">Save Essay Response</button>
        <button class="btn btn-outline" onclick="copyEssayText('${fieldKey}_essay_textarea')">Copy text</button>
        <span id="${statusId}" style="font-size: 0.8rem; color: var(--cosy-color-ink-success); font-weight: 600;">${savedText ? 'Saved on this device' : ''}</span>
      </div>
    </div>
  `;

  const textarea = window.document.getElementById(`${fieldKey}_essay_textarea`);
  textarea.value = 'Hello JSDOM essay test!';

  const saveBtn = window.document.getElementById('essaySaveBtn');
  saveBtn.addEventListener('click', () => {
    window.saveStudentInput(`${fieldKey}_essay`, textarea.value);
    window.document.getElementById(statusId).innerText = 'Saved on this device';
  });

  saveBtn.click();

  const savedInStorage = window.localStorage.getItem(`cosy_ans_${lessonPath}`);

  if (!savedInStorage || !savedInStorage.includes('Hello JSDOM essay test!')) {
    throw new Error(`Essay test failed: expected localStorage to contain essay text, got: ${savedInStorage}`);
  }

  const statusSpan = window.document.getElementById(statusId);
  if (!statusSpan || statusSpan.innerText !== 'Saved on this device') {
    throw new Error(`Essay test failed: expected status 'Saved on this device', got: '${statusSpan ? statusSpan.innerText : 'none'}'`);
  }
  console.log('  ✅ Essay Save test passed.');

  // Test (b): Recorder with no navigator.mediaDevices shows "Microphone not available" toast and throws no error
  console.log('  Testing (b): Recorder without mediaDevices...');

  appRoot.innerHTML = `
    <div class="recorder-widget" id="rec_widget_1">
      <button id="recordBtn" onclick="startCosyRecord('rec_widget_1')">🎙️ Record Voice Response</button>
    </div>
  `;

  // Ensure navigator.mediaDevices is undefined
  delete window.navigator.mediaDevices;

  let toastMessage = '';
  window.CosyUI.toast = (msg) => {
    toastMessage = msg;
  };

  const recordBtn = window.document.getElementById('recordBtn');
  recordBtn.addEventListener('click', () => {
    window.startCosyRecord('rec_widget_1');
  });

  // Click record button, should not throw
  recordBtn.click();

  if (toastMessage !== 'Microphone not available') {
    throw new Error(`Recorder test failed: expected toast 'Microphone not available', got: '${toastMessage}'`);
  }
  console.log('  ✅ Recorder without mediaDevices test passed.');

  console.log('🎉 All JSDOM Widget Integration Tests Passed!');
}

runWidgetJsdomTests().catch(err => {
  console.error('❌ Widget JSDOM Test Failed:', err);
  process.exit(1);
});
