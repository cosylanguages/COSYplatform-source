const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const assert = require('assert/strict');
const { sanitizeStudentLessonContent } = require('./sanitize-student-lesson');
const { loadLessonContent } = require('../shared/js/lesson-resolver');
const { buildLiveSet } = require('./publish_to_supabase');

const ROOT_DIR = path.join(__dirname, '..');

function testStudentLessonSanitizer() {
  const json = sanitizeStudentLessonContent('lesson.json', JSON.stringify({
    slides: [{
      teacherNotes: [{ content: 'teacher-only' }],
      elements: [
        { type: 'test', options: ['visible option'], answers: ['secret answer'] },
        { type: 'input', answerKey: 'hidden key' }
      ]
    }]
  }));
  const lesson = JSON.parse(json);
  assert.equal(lesson.slides[0].teacherNotes, undefined);
  assert.deepEqual(lesson.slides[0].elements[0].options, ['visible option']);
  assert.equal(lesson.slides[0].elements[0].answers, undefined);
  assert.equal(lesson.slides[0].elements[1].answerKey, undefined);

  const xml = sanitizeStudentLessonContent('lesson.xml', `
    <cosy-lesson>
      <cosy-slide>
        <cosy-teacher-notes>teacher-only</cosy-teacher-notes>
        <cosy-input><cosy-input-answers><cosy-input-item>secret answer</cosy-input-item></cosy-input-answers></cosy-input>
        <cosy-test><cosy-test-question><cosy-test-question-text>Question</cosy-test-question-text>
          <cosy-test-answers><cosy-test-item correct="true">visible option</cosy-test-item></cosy-test-answers>
        </cosy-test-question></cosy-test>
        <cosy-select><cosy-select-item correct="true"><cosy-select-item-title>visible choice</cosy-select-item-title></cosy-select-item></cosy-select>
      </cosy-slide>
    </cosy-lesson>
  `);
  assert.doesNotMatch(xml, /teacher-only|secret answer|cosy-(input|test|select)-answers|correct=/);
  assert.match(xml, /visible option/);
  assert.match(xml, /visible choice/);
}

testStudentLessonSanitizer();

async function testRoleSpecificLessonReader() {
  const calls = [];
  const client = {
    from(table) {
      return {
        select(column) {
          return {
            eq(field, lessonPath) {
              calls.push({ table, column, field, lessonPath });
              return {
                maybeSingle: async () => ({ data: { [column]: '<cosy-lesson />' }, error: null })
              };
            }
          };
        }
      };
    }
  };

  await loadLessonContent(client, 'lessons/general-english-a1/test.json', 'student');
  await loadLessonContent(client, 'lessons/general-english-a1/test.json', 'teacher');
  assert.deepEqual(calls.map(({ table, column }) => ({ table, column })), [
    { table: 'student_lesson_content', column: 'content' },
    { table: 'lesson_content', column: 'xml_content' }
  ]);
  await assert.rejects(loadLessonContent(client, '../private.json', 'student'));
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    default: return 'text/plain';
  }
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    let cleanPath = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '');
    if (!cleanPath) cleanPath = 'classroom.html';

    const filePath = path.join(ROOT_DIR, cleanPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { 'Content-Type': getContentType(filePath) });
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

function createMockDom(port, userRole = 'teacher', width = 1280) {
  const filePath = path.join(ROOT_DIR, 'classroom.html');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => {
    if (err.message && err.message.includes('Could not load')) return;
    // console.error('JSDOM Error:', err.message);
  });

  let mockPeerInstances = [];

  class MockPeer {
    constructor(id, options) {
      this.id = id || 'mock-peer-id';
      this.options = options;
      this.callbacks = {};
      this.destroyed = false;
      mockPeerInstances.push(this);
      setTimeout(() => {
        if (this.callbacks['open']) this.callbacks['open'](this.id);
      }, 10);
    }
    on(event, cb) {
      this.callbacks[event] = cb;
    }
    connect(peerId, options) {
      const mockConn = new MockDataConnection(peerId, options);
      return mockConn;
    }
    destroy() {
      this.destroyed = true;
    }
  }

  class MockDataConnection {
    constructor(peerId, options) {
      this.peer = peerId;
      this.metadata = options ? options.metadata : null;
      this.callbacks = {};
      this.closed = false;
      this.sentData = [];
      setTimeout(() => {
        if (this.callbacks['open']) this.callbacks['open']();
      }, 10);
    }
    on(event, cb) {
      this.callbacks[event] = cb;
    }
    send(data) {
      this.sentData.push(data);
    }
    close() {
      this.closed = true;
      if (this.callbacks['close']) this.callbacks['close']();
    }
  }

  class MockJitsiMeetExternalAPI {
    constructor(domain, options) {
      this.domain = domain;
      this.options = options;
    }
    executeCommand() {}
    dispose() {}
  }

  const dom = new JSDOM(fileContent, {
    url: `http://127.0.0.1:${port}/classroom.html`,
    runScripts: 'dangerously',
    resources: 'usable',
    virtualConsole,
    beforeParse(window) {
      // Mock window.tailwind
      window.tailwind = { config: {} };

      window.COSY_CONFIG = {
        SUPABASE_URL: 'https://mock.supabase.co',
        SUPABASE_ANON_KEY: 'mock-anon-key'
      };

      // Mock Peer & Jitsi (protected against overwrite by external scripts)
      Object.defineProperty(window, 'Peer', {
        get: () => MockPeer,
        set: () => {},
        configurable: true
      });
      Object.defineProperty(window, 'JitsiMeetExternalAPI', {
        get: () => MockJitsiMeetExternalAPI,
        set: () => {},
        configurable: true
      });

      // Polyfill HTMLCanvasElement getContext
      window.HTMLCanvasElement.prototype.getContext = () => ({
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        closePath: () => {},
        clearRect: () => {},
        drawImage: () => {},
        parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) }
      });

      // Polyfill innerText
      Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
        get() { return this.textContent; },
        set(v) { this.textContent = v; },
        configurable: true
      });

      // Mock CosyAuth.redirectToLogin
      window.CosyAuth = window.CosyAuth || {};
      window.CosyAuth.redirectToLogin = () => {};

      // Mock Supabase client & session
      const mockUser = { id: 'test-user-id', email: 'test@cosylanguages.com' };
      const mockSession = { user: mockUser, access_token: 'mock-token' };
      const mockProfile = {
        id: 'test-user-id',
        role: userRole,
        language_access: ['*'],
        course_level: '*'
      };

      const mockClient = {
        auth: {
          getSession: async () => ({ data: { session: mockSession }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signOut: async () => ({ error: null })
        },
        from: (table) => {
          return {
            select: (cols) => {
              const query = {
                eq: (col, val) => query,
                order: (col, opts) => query,
                single: async () => ({ data: mockProfile, error: null }),
                maybeSingle: async () => ({ data: mockProfile, error: null }),
                then: (onRes, onRej) => Promise.resolve({ data: [mockProfile], error: null }).then(onRes, onRej)
              };
              return query;
            }
          };
        }
      };

      Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: width === 390 ? 844 : width === 768 ? 1024 : 800, writable: true, configurable: true });
      Object.defineProperty(window, 'supabase', {
        get: () => ({ createClient: () => mockClient }),
        configurable: true
      });

      // Mock Local fetch
      window.fetch = async (input) => {
        const reqUrl = typeof input === 'string' ? input : (input.url || '');
        if (reqUrl.includes('peerjs') || reqUrl.includes('external_api.js') || reqUrl.includes('tailwindcss')) {
          return {
            ok: true,
            status: 200,
            text: async () => '// stub',
            json: async () => ({})
          };
        }

        let cleanPath = reqUrl.replace(/^https?:\/\/[^\/]+\//, '').split('?')[0];
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);

        const localPath = path.join(ROOT_DIR, cleanPath);

        if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
          const data = fs.readFileSync(localPath, 'utf8');
          return {
            ok: true,
            status: 200,
            text: async () => data,
            json: async () => JSON.parse(data)
          };
        } else {
          return {
            ok: false,
            status: 404,
            text: async () => '404 Not Found',
            json: async () => { throw new Error('404 Not Found'); }
          };
        }
      };
    }
  });

  return { dom, mockPeerInstances, MockDataConnection };
}

async function runSecurityTests() {
  console.log('🔒 Running Classroom Security Hardening Tests...\n');

  const { server, port } = await startStaticServer();
  let failures = 0;

  try {
    // -------------------------------------------------------------
    // Test (f): isSafeLessonPath accepts valid path, rejects malicious/unsafe paths
    // -------------------------------------------------------------
    console.log('🔹 Test (f): isSafeLessonPath validation...');
    const { dom: domF } = createMockDom(port, 'teacher');
    await new Promise(r => setTimeout(r, 800));

    const isSafe = domF.window.isSafeLessonPath;
    if (typeof isSafe !== 'function') {
      console.error('❌ FAIL: window.isSafeLessonPath is not defined.');
      failures++;
    } else {
      const validPath = 'lessons/general-english-a1/x.json';
      const pathGuard = 'shared/js/auth-guard.js';
      const pathTraversal = '../x.json';
      const pathDoubleSlash = 'lessons//x.json';

      if (!isSafe(validPath)) {
        console.error(`❌ FAIL: isSafeLessonPath incorrectly rejected valid path: ${validPath}`);
        failures++;
      } else if (isSafe(pathGuard)) {
        console.error(`❌ FAIL: isSafeLessonPath allowed non-lesson file: ${pathGuard}`);
        failures++;
      } else if (isSafe(pathTraversal)) {
        console.error(`❌ FAIL: isSafeLessonPath allowed path traversal: ${pathTraversal}`);
        failures++;
      } else if (isSafe(pathDoubleSlash)) {
        console.error(`❌ FAIL: isSafeLessonPath allowed double slashes: ${pathDoubleSlash}`);
        failures++;
      } else {
        console.log('  ✅ PASS: isSafeLessonPath accepts lessons/general-english-a1/x.json and rejects auth-guard.js, ../x.json, lessons//x.json.');
      }
    }

    // -------------------------------------------------------------
    // Test (a): XSS payload in chat sender, message, roomScope creates no <img> element
    // -------------------------------------------------------------
    console.log('\n🔹 Test (a): Output safety in chat (XSS payloads create no <img> element)...');
    const { dom: domA } = createMockDom(port, 'teacher');
    await new Promise(r => setTimeout(r, 800));

    const chatBox = domA.window.document.getElementById('chat-messages');
    const xssPayload = '<img src=x onerror=alert(1)>';

    domA.window.addChatMessage(xssPayload, xssPayload, '12:00', xssPayload);

    const imgEls = chatBox ? chatBox.querySelectorAll('img') : [];
    if (imgEls.length > 0) {
      console.error(`❌ FAIL: Chat box created ${imgEls.length} <img> elements from XSS payload!`);
      failures++;
    } else {
      console.log('  ✅ PASS: Chat packet with XSS payload in sender, message and roomScope created no <img> elements.');
    }

    // -------------------------------------------------------------
    // Test (b): video-link with javascript: or foreign host ignored; https://meet.google.com accepted with rel containing noopener
    // -------------------------------------------------------------
    console.log('\n🔹 Test (b): External video link validation and rel="noopener"...');
    const { dom: domB } = createMockDom(port, 'teacher');
    await new Promise(r => setTimeout(r, 800));

    const placeholderB = domB.window.document.getElementById('jitsi-placeholder');

    // 1. Foreign / Malicious host
    domB.window.renderExternalVideoBanner('custom', 'javascript:alert(1)');
    let links = placeholderB ? placeholderB.querySelectorAll('a') : [];
    if (links.length > 0) {
      console.error('❌ FAIL: renderExternalVideoBanner created link for javascript: URL!');
      failures++;
    }

    domB.window.renderExternalVideoBanner('custom', 'https://malicious.com/meeting');
    links = placeholderB ? placeholderB.querySelectorAll('a') : [];
    if (links.length > 0) {
      console.error('❌ FAIL: renderExternalVideoBanner created link for foreign host!');
      failures++;
    }

    // 2. Valid Google Meet link
    domB.window.renderExternalVideoBanner('google', 'https://meet.google.com/abc-defg-hij');
    links = placeholderB ? placeholderB.querySelectorAll('a') : [];

    if (links.length === 0) {
      console.error('❌ FAIL: Valid https://meet.google.com link was rejected!');
      failures++;
    } else {
      const rel = links[0].getAttribute('rel') || '';
      if (!rel.includes('noopener')) {
        console.error(`❌ FAIL: Link rel attribute missing 'noopener'. Found: "${rel}"`);
        failures++;
      } else {
        console.log('  ✅ PASS: Malicious/foreign video links ignored; https://meet.google.com accepted with rel containing noopener.');
      }
    }

    // -------------------------------------------------------------
    // Test (c): Acting as host, participant packets of restricted types ignored while chat accepted
    // -------------------------------------------------------------
    console.log('\n🔹 Test (c): Host command authorization filtering...');
    const { dom: domC } = createMockDom(port, 'teacher');
    await new Promise(r => setTimeout(r, 800));

    domC.window.initHost();
    await new Promise(r => setTimeout(r, 50));

    let warnMessages = [];
    domC.window.console.warn = (msg) => { warnMessages.push(msg); };

    const chatBoxC = domC.window.document.getElementById('chat-messages');
    const msgCountBefore = chatBoxC ? chatBoxC.children.length : 0;

    // Send restricted packet types on host
    const restrictedTypes = ['load-lesson', 'activity', 'breakout-recall', 'lesson-mode', 'video-link', 'video-provider-switch', 'breakout-assignment'];
    restrictedTypes.forEach(t => {
      domC.window.handleIncomingData({ type: t, lessonPath: 'lessons/general-english-a1/x.json', title: 'test', prompt: 'test' });
    });

    domC.window.handleIncomingData({ type: 'chat', sender: 'Student', message: 'Hello teacher' });
    const msgCountAfter = chatBoxC ? chatBoxC.children.length : 0;

    if (warnMessages.length < restrictedTypes.length) {
      console.error(`❌ FAIL: Host did not log console.warn for all restricted packet types. Warnings logged: ${warnMessages.length}/${restrictedTypes.length}`);
      failures++;
    } else if (msgCountAfter !== msgCountBefore + 1) {
      console.error('❌ FAIL: Host rejected valid chat packet from participant!');
      failures++;
    } else {
      console.log('  ✅ PASS: Host ignored restricted participant packets (load-lesson, activity, breakout-recall, lesson-mode, video-link) while accepting chat.');
    }

    // -------------------------------------------------------------
    // Test (d): Connection with wrong or missing key is closed; correct key is accepted
    // -------------------------------------------------------------
    console.log('\n🔹 Test (d): Connection key handshake authorization...');
    const { dom: domD, MockDataConnection } = createMockDom(port, 'teacher');
    await new Promise(r => setTimeout(r, 800));

    domD.window.initHost();
    await new Promise(r => setTimeout(r, 50));

    const hostPeerInstance = domD.window.peer;
    const hostRoomKey = domD.window.roomKey;

    if (!hostRoomKey || hostRoomKey.length !== 32) {
      console.error(`❌ FAIL: Room key not generated as 32 hex characters. Found: "${hostRoomKey}"`);
      failures++;
    } else if (!hostPeerInstance || !hostPeerInstance.callbacks['connection']) {
      console.error('❌ FAIL: Host peer instance connection listener not found.');
      failures++;
    } else {
      // Test wrong key
      const badConn = new MockDataConnection('student-peer', { metadata: { k: 'wrong-key-123' } });
      hostPeerInstance.callbacks['connection'](badConn);

      if (!badConn.closed) {
        console.error('❌ FAIL: Host did not close connection with wrong room key!');
        failures++;
      }

      // Test correct key
      const goodConn = new MockDataConnection('student-peer', { metadata: { k: hostRoomKey } });
      hostPeerInstance.callbacks['connection'](goodConn);

      if (goodConn.closed) {
        console.error('❌ FAIL: Host closed connection despite correct room key!');
        failures++;
      } else {
        console.log('  ✅ PASS: Connection with wrong/missing key closed by host; correct key accepted.');
      }
    }

    // -------------------------------------------------------------
    // Test (e): Student cannot create a room
    // -------------------------------------------------------------
    console.log('\n🔹 Test (e): Student room creation restriction...');
    const { dom: domE } = createMockDom(port, 'student');
    await new Promise(r => setTimeout(r, 800));

    domE.window.initHost();

    if (domE.window.isHost) {
      console.error('❌ FAIL: Student was able to set isHost = true!');
      failures++;
    } else if (domE.window.peer) {
      console.error('❌ FAIL: Peer host instance created for student profile!');
      failures++;
    } else {
      console.log('  ✅ PASS: Student profile blocked from creating a room (initHost did nothing).');
    }

    // -------------------------------------------------------------
    // Test (a2): Participant chat packet sender spoofing protection on host
    // -------------------------------------------------------------
    console.log('\n🔹 Test (a2): Participant chat packet sender spoofing protection on host...');
    const { dom: domA2 } = createMockDom(port, 'teacher');
    await new Promise(r => setTimeout(r, 800));

    domA2.window.initHost();
    await new Promise(r => setTimeout(r, 50));

    const chatBoxA2 = domA2.window.document.getElementById('chat-messages');
    domA2.window.handleIncomingData({ type: 'chat', sender: 'Teacher', message: 'I am teacher spoof' });

    const lastMsg = chatBoxA2 ? chatBoxA2.lastElementChild : null;
    const senderText = lastMsg ? lastMsg.querySelector('span')?.textContent : '';

    if (!senderText.includes('Student')) {
      console.error(`❌ FAIL: Expected chat sender label to be forced to 'Student', but got: "${senderText}"`);
      failures++;
    } else {
      console.log('  ✅ PASS: Participant chat packet with sender "Teacher" correctly rendered as "Student" on host.');
    }

    // -------------------------------------------------------------
    // Test (b2): Header Portal link href per role and Log Out button
    // -------------------------------------------------------------
    console.log('\n🔹 Test (b2): Header Portal link href per role and Log Out button...');
    for (const testRole of ['student', 'teacher', 'founder']) {
      const { dom: domB2 } = createMockDom(port, testRole);
      await new Promise(r => setTimeout(r, 800));

      const portalLink = domB2.window.document.getElementById('portal-link');
      const expectedHref = `${testRole}.html`;
      const actualHref = portalLink ? portalLink.getAttribute('href') : '';

      if (actualHref !== expectedHref) {
        console.error(`❌ FAIL: For role '${testRole}', portal link expected href='${expectedHref}', got: '${actualHref}'`);
        failures++;
      }
    }

    const { dom: domLogout } = createMockDom(port, 'student');
    await new Promise(r => setTimeout(r, 800));

    let signOutCalledCount = 0;
    if (domLogout.window.CosyAuth && domLogout.window.CosyAuth.client) {
      domLogout.window.CosyAuth.client.auth.signOut = async () => {
        signOutCalledCount++;
        return { error: null };
      };
    }

    const logoutBtn = domLogout.window.document.getElementById('logout-btn');
    if (!logoutBtn) {
      console.error('❌ FAIL: #logout-btn not found in header.');
      failures++;
    } else {
      await domLogout.window.CosyAuth.logout();
      if (signOutCalledCount !== 1) {
        console.error(`❌ FAIL: Expected signOut to be called 1 time, but called ${signOutCalledCount} times.`);
        failures++;
      } else {
        console.log('  ✅ PASS: Header Portal link href correct for student/teacher/founder roles, and Log Out calls signOut once.');
      }
    }

    // -------------------------------------------------------------
    // Test (d2): Assert all options in #quick-lesson-select with value="lessons/..." are published
    // -------------------------------------------------------------
    console.log('\n🔹 Test (d2): Quick lesson select options published check...');
    const { dom: domD2 } = createMockDom(port, 'teacher');
    await new Promise(r => setTimeout(r, 800));

    const quickSelect = domD2.window.document.getElementById('quick-lesson-select');
    const { LIVE } = buildLiveSet();

    if (!quickSelect) {
      console.error('❌ FAIL: #quick-lesson-select not found in classroom.html');
      failures++;
    } else {
      const lessonOptions = Array.from(quickSelect.querySelectorAll('option'))
        .map(opt => opt.value)
        .filter(val => val.startsWith('lessons/'));

      let unpublishedCount = 0;
      lessonOptions.forEach(optVal => {
        if (!LIVE.has(optVal)) {
          console.error(`❌ FAIL: #quick-lesson-select option '${optVal}' is not a published lesson in LIVE set.`);
          failures++;
          unpublishedCount++;
        }
      });

      if (unpublishedCount === 0) {
        console.log(`  ✅ PASS: All ${lessonOptions.length} lesson options in #quick-lesson-select are published lessons.`);
      }
    }

    // -------------------------------------------------------------
    // Test (c2): vocab-index.js on-demand loading
    // -------------------------------------------------------------
    console.log('\n🔹 Test (c2): vocab-index.js on-demand loading...');
    const { dom: domC2 } = createMockDom(port, 'student');
    await new Promise(r => setTimeout(r, 800));

    const headScriptsBefore = domC2.window.document.head.querySelectorAll('script[src*="vocab-index.js"]');
    if (headScriptsBefore.length > 0) {
      console.error('❌ FAIL: vocab-index.js was included in <head> at page load!');
      failures++;
    } else {
      domC2.window.searchCosyDict('family');
      const headScriptsAfter = domC2.window.document.head.querySelectorAll('script[src*="vocab-index.js"]');

      if (headScriptsAfter.length === 0) {
        console.error('❌ FAIL: vocab-index.js script tag was NOT injected into <head> after dictionary search!');
        failures++;
      } else {
        console.log('  ✅ PASS: vocab-index.js is NOT loaded at page load, but is injected into <head> upon first dictionary search.');
      }
    }


    // -------------------------------------------------------------
    // Test (g): Shared Lesson Notes XSS, packet handling, and stale base_version rejection
    // -------------------------------------------------------------
    console.log('\n🔹 Test (g): Shared Lesson Notes security & RPC checks...');
    const { dom: domG } = createMockDom(port, 'teacher');
    await new Promise(r => setTimeout(r, 800));

    // 1. XSS Payload in Notes Textarea
    const notesTextarea = domG.window.document.getElementById('notes-textarea');
    const xssNotesPayload = '<img src=x onerror=alert("notes-xss")><script>alert(1)</script>';

    if (!notesTextarea) {
      console.error('❌ FAIL: #notes-textarea element not found in classroom.html');
      failures++;
    } else {
      domG.window.onNoteInput(xssNotesPayload);
      const createdImgs = domG.window.document.querySelectorAll('img[src="x"]');
      const createdScripts = domG.window.document.querySelectorAll('script');
      let xssScriptFound = false;
      createdScripts.forEach(s => {
        if (s.textContent && s.textContent.includes('alert(1)')) xssScriptFound = true;
      });

      if (createdImgs.length > 0 || xssScriptFound) {
        console.error('❌ FAIL: XSS payload in notes created executable HTML elements!');
        failures++;
      } else {
        console.log('  ✅ PASS: XSS payload in notes textarea handled safely as plain text.');
      }
    }

    // 2. Unauthorised note-sync packet handling on host
    domG.window.initHost();
    await new Promise(r => setTimeout(r, 50));

    let remoteNoteUpdated = false;
    domG.window.applyRemoteNoteUpdate = (content, ver) => {
      remoteNoteUpdated = true;
    };

    // Send malformed / undefined note-sync packet
    domG.window.handleIncomingData({ type: 'note-sync' });
    if (remoteNoteUpdated) {
      console.error('❌ FAIL: Malformed note-sync packet was applied!');
      failures++;
    } else {
      // Send valid note-sync packet
      domG.window.handleIncomingData({ type: 'note-sync', content: 'Synced content', version: 1 });
      if (!remoteNoteUpdated) {
        console.error('❌ FAIL: Valid note-sync packet was rejected on host!');
        failures++;
      } else {
        console.log('  ✅ PASS: Malformed note-sync packet ignored, valid note-sync packet accepted.');
      }
    }

    // 3. Stale base_version conflict handling simulation
    const rpcSaveCalls = [];
    domG.window.CosyAuth.client.rpc = async (fnName, params) => {
      rpcSaveCalls.push({ fnName, params });
      if (fnName === 'save_lesson_note') {
        if (params.base_version !== 5) {
          return { data: { conflict: true, content: 'Remote content line 1', version: 5 }, error: null };
        }
        return { data: { conflict: false, content: params.content, version: 6 }, error: null };
      }
      return { data: [], error: null };
    };

    domG.window.currentNoteRecord = { id: 'test-note-uuid', content: 'My local line 1', version: 1 };
    await domG.window.saveLessonNoteToSupabase();

    if (rpcSaveCalls.length < 2 || rpcSaveCalls[0].params.base_version !== 1 || rpcSaveCalls[1].params.base_version !== 5) {
      console.error('❌ FAIL: save_lesson_note RPC was not invoked with expected base_versions on conflict retry.');
      failures++;
    } else if (domG.window.currentNoteRecord.version !== 6 || !domG.window.currentNoteRecord.content.includes('Remote content line 1')) {
      console.error(`❌ FAIL: Stale base_version conflict was not properly merged. Version=${domG.window.currentNoteRecord.version}`);
      failures++;
    } else {
      console.log('  ✅ PASS: Stale base_version was rejected with conflict flag, merged, and retried successfully.');
    }


    // -------------------------------------------------------------
    // Test (h): PeerJS Video Controls, ICE Config, and Timeout Banner
    // -------------------------------------------------------------
    console.log('\n🔹 Test (h): PeerJS Video Controls, ICE Config, and Timeout Banner...');
    const { dom: domH } = createMockDom(port, 'teacher');
    await new Promise(r => setTimeout(r, 800));

    // 1. ICE Servers in config
    if (!domH.window.COSY_CONFIG || !Array.isArray(domH.window.COSY_CONFIG.ICE_SERVERS)) {
      console.error('❌ FAIL: ICE_SERVERS array missing in window.COSY_CONFIG');
      failures++;
    } else {
      console.log('  ✅ PASS: ICE_SERVERS array is configured in window.COSY_CONFIG.');
    }

    // 2. Video Control Strip buttons existence and aria-labels
    const stripMicBtn = domH.window.document.getElementById('strip-mic-btn');
    const stripCamBtn = domH.window.document.getElementById('strip-cam-btn');
    const stripDeviceBtn = domH.window.document.getElementById('strip-device-btn');
    const stripMirrorBtn = domH.window.document.getElementById('strip-mirror-btn');
    const stripLayoutBtn = domH.window.document.getElementById('strip-layout-btn');

    if (!stripMicBtn || !stripCamBtn || !stripDeviceBtn || !stripMirrorBtn || !stripLayoutBtn) {
      console.error('❌ FAIL: One or more video control strip buttons missing!');
      failures++;
    } else if (stripMicBtn.getAttribute('aria-label') !== 'Toggle microphone' || stripCamBtn.getAttribute('aria-label') !== 'Toggle camera') {
      console.error('❌ FAIL: Video control strip button aria-labels are incorrect!');
      failures++;
    } else {
      console.log('  ✅ PASS: Video control strip buttons render with proper aria-labels and tooltips.');
    }

    // 3. Provider Switching disables control strip with tooltip
    domH.window.changeVideoProvider('jitsi');
    if (!stripMicBtn.disabled || !stripCamBtn.disabled || !stripDeviceBtn.disabled) {
      console.error('❌ FAIL: Control strip buttons were not disabled when provider switched to Jitsi!');
      failures++;
    } else if (!stripMicBtn.title.includes('Jitsi')) {
      console.error(`❌ FAIL: Control strip disabled tooltip incorrect. Got: "${stripMicBtn.title}"`);
      failures++;
    } else {
      domH.window.changeVideoProvider('peerjs-video');
      if (stripMicBtn.disabled) {
        console.error('❌ FAIL: Control strip buttons remained disabled for peerjs-video!');
        failures++;
      } else {
        console.log('  ✅ PASS: Control strip disabled with explanatory tooltip for external providers and re-enabled for PeerJS.');
      }
    }

    // 4. Timeout trouble banner trigger
    domH.window.triggerPeerJsTimeoutBanner();
    const timeoutBanner = domH.window.document.getElementById('peer-timeout-banner');
    if (!timeoutBanner || timeoutBanner.classList.contains('hidden')) {
      console.error('❌ FAIL: Peer timeout trouble banner did not render!');
      failures++;
    } else {
      console.log('  ✅ PASS: 12-second PeerJS timeout trouble banner rendered as expected.');
    }

    // -------------------------------------------------------------
    // Test (e2): Multi-viewport responsive controls check at 1280px, 768px, and 390px
    // -------------------------------------------------------------
    console.log('\n🔹 Test (e2): Multi-viewport responsive controls check (1280px, 768px, 390px)...');
    const viewports = [
      { width: 1280, name: 'Desktop (1280px)', requiredIds: ['desktop-top-bar', 'tab-btn-chat', 'tab-btn-timer', 'tab-btn-dict', 'tab-btn-verbs', 'tab-btn-notes', 'quick-lesson-select', 'logout-btn', 'prev-slide-btn', 'next-slide-btn'] },
      { width: 768, name: 'Tablet (768px)', requiredIds: ['desktop-top-bar', 'tab-btn-tools-menu', 'room-chip-btn', 'connection-status', 'logout-btn'] },
      { width: 390, name: 'Mobile (390px)', requiredIds: ['phone-top-bar', 'phone-bottom-bar', 'more-menu-btn', 'stage-nav-pill', 'prev-slide-btn', 'next-slide-btn'] }
    ];

    for (const vp of viewports) {
      const { dom: domVp } = createMockDom(port, 'teacher', vp.width);
      await new Promise(r => setTimeout(r, 800));

      let missingInVp = 0;
      vp.requiredIds.forEach(id => {
        const el = domVp.window.document.getElementById(id);
        if (!el) {
          console.error(`❌ FAIL: Required control '#${id}' missing in ${vp.name} viewport!`);
          failures++;
          missingInVp++;
        }
      });

      if (missingInVp === 0) {
        console.log(`  ✅ PASS: All ${vp.requiredIds.length} key controls present in ${vp.name} viewport.`);
      }
    }

  } finally {
    server.close();
  }

  console.log('\n---------------------------------------------------');
  if (failures > 0) {
    console.error(`❌ Classroom security tests failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log('✨ All Classroom security tests passed successfully!');
    process.exit(0);
  }
}

testRoleSpecificLessonReader().then(runSecurityTests).catch(err => {
  console.error('❌ Unhandled error in security tests:', err);
  process.exit(1);
});
