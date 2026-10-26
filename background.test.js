const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const backgroundSource = fs.readFileSync(path.join(__dirname, 'background.js'), 'utf8');
const resultSource = fs.readFileSync(path.join(__dirname, 'result.js'), 'utf8');
const postUrl = 'https://example.com/My_Page?utm_source=LinkedIn&utm_campaign=AI_Launch&x=a%2Fb#Get_Started';
const post = `Learn more: ${postUrl}\n#Azure_AI #Microsoft #M\u00fcnchen #\u062a\u0642\u0646\u064a\u0629`;
const rewrittenPost = `Discover more: ${postUrl}\n#Azure_AI #Microsoft #M\u00fcnchen #\u062a\u0642\u0646\u064a\u0629 #NewTag`;
const preservationError = /changed or removed an existing URL or hashtag/;

function loadBackground(responseText = rewrittenPost, settings = {}) {
  const requests = [];
  let messageListener;
  const context = vm.createContext({
    console,
    chrome: {
      contextMenus: {
        removeAll: (callback) => callback(),
        create() {},
        onClicked: { addListener() {} }
      },
      runtime: {
        onInstalled: { addListener() {} },
        onStartup: { addListener() {} },
        onMessage: { addListener: (listener) => { messageListener = listener; } }
      },
      storage: {
        sync: {
          get: async (keys, callback) => {
            const values = {
              apiKey: 'test-key',
              endpoint: 'https://azure.example',
              deployment: 'test-deployment',
              ...settings
            };
            if (callback) callback(values);
            return values;
          }
        }
      }
    },
    fetch: async (url, options) => {
      requests.push(JSON.parse(options.body));
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: responseText }, finish_reason: 'stop' }]
        })
      };
    }
  });
  vm.runInContext(backgroundSource, context);
  return {
    context,
    requests,
    sendMessage: (request) => new Promise((resolve) => {
      assert.equal(messageListener(request, {}, resolve), true);
    })
  };
}

test('markdown cleanup keeps complete URLs and Unicode hashtags intact', () => {
  const { context } = loadBackground();
  assert.equal(context.stripMarkdown(`**Learn more**: ${postUrl}\n#Azure_AI #M\u00fcnchen #\u062a\u0642\u0646\u064a\u0629`),
    `Learn more: ${postUrl}\n#Azure_AI #M\u00fcnchen #\u062a\u0642\u0646\u064a\u0629`);
});

test('markdown links retain their targets, including balanced parentheses', () => {
  const { context } = loadBackground();
  const url = 'https://example.com/Some_Page_(AI)?utm_source=Social#Section_1';
  const output = context.finalizePost(`[**Read more**](${url}) #Azure_AI`, `${url} #Azure_AI`);
  assert.equal(output, `Read more (${url}) #Azure_AI`);
});

test('markdown emphasis around URLs and hashtags is removed without modifying them', () => {
  const { context } = loadBackground();
  assert.equal(context.finalizePost(`**${postUrl}** __#Azure_AI_Tag__`, `${postUrl} #Azure_AI_Tag`),
    `${postUrl} #Azure_AI_Tag`);
});

test('URL punctuation and URL fragments are not mistaken for hashtags', () => {
  const { context } = loadBackground();
  const source = '(https://example.com/Path_(AI)#Original_Fragment). #Tag';
  const result = 'https://example.com/Path_(AI)#Original_Fragment #Tag #Added';
  assert.equal(context.finalizePost(result, source), result);
});

test('www links and URL wildcard characters survive markdown cleanup', () => {
  const { context } = loadBackground();
  const text = 'www.example.com/a_b_c?filter=*AI*&utm_source=Social #Azure_AI_Tag';
  assert.equal(context.finalizePost(`**Explore** ${text}`, text), `Explore ${text}`);
});

test('cleanup placeholders cannot collide with existing text', () => {
  const { context } = loadBackground();
  const text = `\u00000\u0000 ${postUrl} #Azure_AI_Tag`;
  assert.equal(context.stripMarkdown(text), text);
});

test('ordinary markdown is still converted to plain text', () => {
  const { context } = loadBackground();
  assert.equal(context.stripMarkdown('# Heading\n\n- **Bold** and _italic_\n> `quote`\n\n---'),
    'Heading\nBold and italic\nquote');
});

test('new hashtags are allowed and repeated originals are retained', () => {
  const { context } = loadBackground();
  assert.equal(context.finalizePost('#Azure #New #Azure', '#Azure #Azure'), '#Azure #New #Azure');
  assert.throws(() => context.finalizePost('#Azure #New', '#Azure #Azure'), preservationError);
});

const invalidResults = [
  ['changed hashtag case', rewrittenPost.replace('#Azure_AI', '#azure_AI')],
  ['translated hashtag', rewrittenPost.replace('#Microsoft', '#Translated')],
  ['extended hashtag', rewrittenPost.replace('#Azure_AI', '#Azure_AI_New')],
  ['removed hashtag', rewrittenPost.replace('#Microsoft', '')],
  ['changed Unicode hashtag', rewrittenPost.replace('#M\u00fcnchen', '#Munich')],
  ['changed URL path case', rewrittenPost.replace('My_Page', 'my_Page')],
  ['removed tracking parameter', rewrittenPost.replace('&utm_campaign=AI_Launch', '')],
  ['changed URL fragment', rewrittenPost.replace('#Get_Started', '#Translated')],
  ['extended URL', rewrittenPost.replace('#Get_Started', '#Get_Started_New')],
  ['removed URL', rewrittenPost.replace(postUrl, '')]
];

for (const [description, output] of invalidResults) {
  test(`rejects ${description}`, () => {
    const { context } = loadBackground();
    assert.throws(() => context.finalizePost(output, post), preservationError);
  });
}

const transformations = [
  {
    name: 'initial rewrite with a custom prompt',
    invoke: (context) => context.callAzureAI(post)
  },
  {
    name: 'follow-up optimization',
    invoke: (context) => context.applyOptimizationInstruction(post, 'Make this shorter.')
  },
  {
    name: 'translation',
    invoke: (context) => context.translateText(post, 'German')
  },
  {
    name: 'website copy with a custom prompt and selected quote',
    invoke: (context) => context.callAzureAIForWebsite(postUrl, 'Page title', post, 'Source material')
  }
];

for (const { name, invoke } of transformations) {
  test(`${name} uses mandatory rules and allows additional hashtags`, async () => {
    const { context, requests } = loadBackground(rewrittenPost, {
      initialPrompt: 'Translate all hashtags and shorten all URLs.',
      websitePrompt: 'Translate all hashtags and shorten all URLs.'
    });
    assert.equal(await invoke(context), rewrittenPost);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].messages[0].role, 'system');
    assert.match(requests[0].messages[0].content, /character for character/);
    assert.match(requests[0].messages[0].content, /may add relevant hashtags/);
    assert.ok(requests[0].messages[1].content.includes(postUrl));
  });

  test(`${name} rejects an altered URL or hashtag`, async () => {
    const { context } = loadBackground(rewrittenPost.replace('#Azure_AI', '#Translated'));
    await assert.rejects(invoke(context), preservationError);
  });
}

test('website copy requires the original page URL even without a quote', async () => {
  const { context } = loadBackground('A new post without a page link. #NewTag');
  await assert.rejects(context.callAzureAIForWebsite(postUrl, 'Title', '', ''), preservationError);
});

test('suggestions do not ask to change existing URLs or hashtags', async () => {
  const { context, requests } = loadBackground('Make this shorter.\nAdd emojis.\nAdd a CTA.\nImprove clarity.');
  assert.equal((await context.getOptimizationSuggestions(post)).length, 4);
  assert.match(requests[0].messages[0].content, /Do not suggest changing or removing existing URLs or hashtags/);
});

for (const action of ['applyOptimization', 'translateText']) {
  test(`${action} surfaces preservation failures to the result window`, async () => {
    const { sendMessage } = loadBackground(rewrittenPost.replace('#Microsoft', ''));
    const response = await sendMessage({
      action,
      text: post,
      language: 'German',
      instruction: 'Shorten this.'
    });
    assert.equal(response.ok, false);
    assert.match(response.error, preservationError);
    assert.equal(response.text, undefined);
  });
}

function loadResultPage(response) {
  const elements = new Map();
  const makeElement = () => ({
    textContent: '',
    value: '',
    readOnly: false,
    disabled: false,
    style: {},
    classList: { add() {}, remove() {} },
    handlers: {},
    children: [],
    addEventListener(event, handler) { this.handlers[event] = handler; },
    appendChild(child) { this.children.push(child); },
    querySelectorAll() { return this.children.filter((child) => child.className === 'optimization-card'); }
  });
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, makeElement());
    }
    return elements.get(id);
  };
  const requests = [];
  let messageListener;
  let clipboardText;
  const context = vm.createContext({
    console: { ...console, error() {} },
    document: { getElementById: element, createElement: makeElement },
    navigator: {
      clipboard: { writeText: async (text) => { clipboardText = text; } }
    },
    chrome: {
      runtime: {
        onMessage: { addListener: (listener) => { messageListener = listener; } },
        sendMessage: (request, callback) => {
          requests.push(request);
          if (typeof response === 'function') {
            response(request, callback);
          } else if (request.action === 'getOptimizations') {
            callback({ ok: true, suggestions: [] });
          } else {
            callback(response);
          }
        }
      }
    },
    setTimeout() {}
  });
  vm.runInContext(resultSource, context);
  element('resultDisplay').value = post;
  return {
    context,
    element,
    requests,
    sendEvent: (request) => messageListener(request, {}, () => {}),
    getClipboardText: () => clipboardText
  };
}

test('copying uses the exact displayed post without destructive markdown cleanup', async () => {
  const { element, getClipboardText } = loadResultPage();
  await element('copyBtn').handlers.click();
  assert.equal(getClipboardText(), post);
});

test('a failed optimization keeps the previous post and shows an error', async () => {
  const message = 'The AI response changed or removed an existing URL or hashtag. Please try again.';
  const { context, element } = loadResultPage({ ok: false, error: message });
  const editedPost = `${post}\nA manual addition.`;
  element('resultDisplay').value = editedPost;
  await context.applyOptimization('Shorten this.');
  assert.equal(element('resultDisplay').value, editedPost);
  assert.equal(element('resultDisplay').readOnly, false);
  assert.ok(element('modalText').textContent.includes(message));
});

test('a failed translation keeps the previous post and shows an error', async () => {
  const message = 'The AI response changed or removed an existing URL or hashtag. Please try again.';
  const { context, element } = loadResultPage({ ok: false, error: message });
  const editedPost = `${post}\nA manual addition.`;
  element('resultDisplay').value = editedPost;
  await element('translateSelect').handlers.change({ target: { value: 'German' } });
  assert.equal(element('resultDisplay').value, editedPost);
  assert.equal(element('resultDisplay').readOnly, false);
  assert.ok(element('modalText').textContent.includes(message));
  assert.equal(element('translateSelect').disabled, false);
});

test('receiving a result reveals an editable plain-text field', async () => {
  const { element, sendEvent } = loadResultPage();
  sendEvent({ action: 'setLoading', text: 'Generating...' });
  assert.equal(element('resultDisplay').readOnly, true);
  assert.equal(element('resultDisplay').value, '');
  sendEvent({ action: 'setResult', text: post });
  await Promise.resolve();
  assert.equal(element('resultDisplay').value, post);
  assert.equal(element('resultDisplay').readOnly, false);
  assert.equal(element('resultEditor').style.display, '');
});

test('copying includes manual edits, whitespace, URLs, and hashtags exactly', async () => {
  const { element, getClipboardText, requests } = loadResultPage();
  const editedPost = `  ${post}\n\nAdded: https://example.com/Another_Page?q=My_Value #Added_Tag  `;
  element('resultDisplay').value = editedPost;
  await element('copyBtn').handlers.click();
  assert.equal(getClipboardText(), editedPost);
  assert.equal(requests.length, 0);
});

const textActions = [
  {
    name: 'optimization',
    action: 'applyOptimization',
    invoke: ({ context }) => context.applyOptimization('Shorten this.')
  },
  {
    name: 'translation',
    action: 'translateText',
    invoke: ({ element }) => element('translateSelect').handlers.change({ target: { value: 'German' } })
  }
];

for (const { name, action, invoke } of textActions) {
  test(`${name} uses the current manual edits and displays the successful result`, async () => {
    const addition = '\nAdded: https://example.com/New_Page #Added_Tag';
    const updatedPost = rewrittenPost + addition;
    const resultPage = loadResultPage({ ok: true, text: updatedPost });
    const editedPost = post + addition;
    resultPage.element('resultDisplay').value = editedPost;
    await invoke(resultPage);
    assert.equal(resultPage.requests[0].action, action);
    assert.equal(resultPage.requests[0].text, editedPost);
    assert.equal(resultPage.element('resultDisplay').value, updatedPost);
    assert.equal(resultPage.requests[1].action, 'getOptimizations');
    assert.equal(resultPage.requests[1].text, updatedPost);
    assert.equal(resultPage.element('resultDisplay').readOnly, false);
    assert.equal(resultPage.element('translateSelect').disabled, false);
  });

  test(`${name} locks editing and prevents overlapping text requests until it finishes`, async () => {
    let finishRequest;
    const resultPage = loadResultPage((request, callback) => { finishRequest = callback; });
    const button = { className: 'optimization-card', disabled: false };
    resultPage.element('optimizationCards').appendChild(button);
    const pending = invoke(resultPage);
    assert.equal(resultPage.element('resultDisplay').readOnly, true);
    assert.equal(resultPage.element('translateSelect').disabled, true);
    assert.equal(button.disabled, true);
    await resultPage.context.applyOptimization('Another optimization.');
    await resultPage.element('translateSelect').handlers.change({ target: { value: 'French' } });
    assert.equal(resultPage.requests.length, 1);
    finishRequest({ ok: false, error: 'Request failed.' });
    await pending;
    assert.equal(resultPage.element('resultDisplay').value, post);
    assert.equal(resultPage.element('resultDisplay').readOnly, false);
    assert.equal(resultPage.element('translateSelect').disabled, false);
    assert.equal(button.disabled, false);
  });

  test(`${name} rejects an empty edited post without sending a request`, async () => {
    const resultPage = loadResultPage();
    resultPage.element('resultDisplay').value = '  \n\t';
    await invoke(resultPage);
    assert.equal(resultPage.requests.length, 0);
    assert.match(resultPage.element('modalText').textContent, /Please enter some post text/);
    assert.equal(resultPage.element('resultDisplay').readOnly, false);
  });

  test(`${name} protects manually added URLs and hashtags through the background pipeline`, async () => {
    const background = loadBackground(rewrittenPost);
    const resultPage = loadResultPage((request, callback) => {
      background.sendMessage(request).then(callback);
    });
    const editedPost = `${post}\nAdded: https://example.com/New_Page #Added_Tag`;
    resultPage.element('resultDisplay').value = editedPost;
    await invoke(resultPage);
    assert.equal(resultPage.element('resultDisplay').value, editedPost);
    assert.match(resultPage.element('modalText').textContent, preservationError);
    assert.equal(resultPage.element('resultDisplay').readOnly, false);
  });
}

test('copying an empty edited post shows a warning without clearing the clipboard', async () => {
  const { element, getClipboardText } = loadResultPage();
  await element('copyBtn').handlers.click();
  element('resultDisplay').value = ' \n ';
  await element('copyBtn').handlers.click();
  assert.equal(getClipboardText(), post);
  assert.match(element('modalText').textContent, /Please enter some post text/);
});

test('suggestions arriving during an optimization stay disabled until it finishes', async () => {
  const callbacks = new Map();
  const resultPage = loadResultPage((request, callback) => { callbacks.set(request.action, callback); });
  const suggestions = resultPage.context.loadOptimizations(post);
  const pending = resultPage.context.applyOptimization('Shorten this.');
  callbacks.get('getOptimizations')({ ok: true, suggestions: ['Add emojis.'] });
  await suggestions;
  const [button] = resultPage.element('optimizationCards').querySelectorAll();
  assert.equal(button.disabled, true);
  callbacks.get('applyOptimization')({ ok: false, error: 'Request failed.' });
  await pending;
  assert.equal(button.disabled, false);
});
