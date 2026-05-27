import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const HOST = '127.0.0.1';
const PREVIEW_PORT = Number(process.env.SAMPLE_SMOKE_PREVIEW_PORT ?? 4173);
const CHROME_PORT = Number(process.env.SAMPLE_SMOKE_CHROME_PORT ?? 9223);
const BASE_URL = process.env.SAMPLE_SMOKE_BASE_URL ?? `http://${HOST}:${PREVIEW_PORT}`;
const CHROME_BIN =
  process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOULD_LAUNCH_PREVIEW = process.env.SAMPLE_SMOKE_LAUNCH_PREVIEW !== '0';
const INJECT_BROWSER_EVENT =
  process.env.SAMPLE_SMOKE_INJECT_BROWSER_EVENT ?? process.env.SAMPLE_SMOKE_INJECT_CONSOLE_EVENT;
const ROUTE_TIMEOUT_MS = 10_000;
const SERVER_TIMEOUT_MS = 20_000;
const BROWSER_EVENT_SETTLE_MS = 100;

const BROWSER_FAILURE_EVENT_METHODS = [
  'Runtime.consoleAPICalled',
  'Runtime.exceptionThrown',
  'Log.entryAdded',
];
const pagesAccordionLabel = ['Pages', '페이지'];

const smokeRoutes = [
  {
    path: '/sample/dashboard',
    expectedText: ['Dashboard', '대시보드'],
    expandedAccordions: [pagesAccordionLabel],
  },
  {
    path: '/sample/auth/sign-in',
    expectedText: ['Sign in', '로그인'],
  },
  {
    path: '/sample/auth/sign-in-2-column',
    expectedText: ['Sign in to your account', '계정에 로그인'],
  },
  {
    path: '/sample/auth/sign-up',
    expectedText: ['Create an account', '계정 만들기'],
  },
  {
    path: '/sample/auth/forgot-password',
    expectedText: ['Forgot password?', '비밀번호를 잊으셨나요?'],
  },
  {
    path: '/sample/auth/otp',
    expectedText: ['Two-factor authentication', '2단계 인증'],
  },
  {
    path: '/sample/auth/login',
    expectedText: ['Sign in', '로그인'],
  },
  {
    path: '/sample/auth/sign-in-2',
    expectedText: ['Sign in to your account', '계정에 로그인'],
  },
  {
    path: '/sample/auth/signup',
    expectedText: ['Create an account', '계정 만들기'],
  },
  {
    path: '/sample/errors/unauthorized',
    expectedText: 'Unauthorized',
  },
  {
    path: '/sample/errors/forbidden',
    expectedText: 'Forbidden',
  },
  {
    path: '/sample/errors/not-found',
    expectedText: 'Not Found',
  },
  {
    path: '/sample/errors/internal-server-error',
    expectedText: 'Internal Server Error',
  },
  {
    path: '/sample/errors/maintenance',
    expectedText: 'Maintenance Error',
  },
  {
    path: '/sample/errors/401',
    expectedText: 'Unauthorized',
  },
  {
    path: '/sample/errors/403',
    expectedText: 'Forbidden',
  },
  {
    path: '/sample/errors/404',
    expectedText: 'Not Found',
  },
  {
    path: '/sample/errors/500',
    expectedText: 'Internal Server Error',
  },
  {
    path: '/sample/errors/503',
    expectedText: 'Maintenance Error',
  },
];

const childProcesses = [];
let chromeProfileDirectory;

process.on('exit', () => {
  for (const childProcess of childProcesses) {
    childProcess.kill('SIGTERM');
  }
});

async function runSmokeChecks() {
  let previewProcess;

  if (SHOULD_LAUNCH_PREVIEW) {
    previewProcess = spawnTracked(
      'pnpm',
      ['preview', '--host', HOST, '--port', String(PREVIEW_PORT)],
      {
        cwd: PROJECT_ROOT,
        label: 'vite-preview',
      }
    );
  }

  await waitForHttp(`${BASE_URL}/sample/auth/sign-in`, SERVER_TIMEOUT_MS, 'Vite preview server');

  chromeProfileDirectory = await mkdtemp(join(tmpdir(), 'sample-browser-smoke-'));
  const chromeProcess = spawnTracked(
    CHROME_BIN,
    [
      '--headless=new',
      `--remote-debugging-port=${CHROME_PORT}`,
      `--user-data-dir=${chromeProfileDirectory}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-extensions',
      'about:blank',
    ],
    { label: 'chrome' }
  );

  chromeProcess.once('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`Chrome exited early with code ${code}.`);
    }

    if (signal) {
      console.error(`Chrome exited early from signal ${signal}.`);
    }
  });

  const browserWebSocketUrl = await waitForBrowserWebSocketUrl(CHROME_PORT, SERVER_TIMEOUT_MS);
  const client = await CdpClient.connect(browserWebSocketUrl);

  try {
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await client.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });

    await client.send('Runtime.enable', {}, sessionId);
    await client.send('Page.enable', {}, sessionId);
    await client.send('Log.enable', {}, sessionId);

    for (const route of smokeRoutes) {
      await smokeRoute(client, sessionId, route);
      console.log(`PASS ${route.path}`);
    }
  } finally {
    client.close();
    previewProcess?.kill('SIGTERM');
  }
}

async function smokeRoute(client, sessionId, route) {
  await withBrowserFailureGuard(client, sessionId, route.path, async () => {
    const url = new URL(route.path, BASE_URL).toString();
    await navigateTo(client, sessionId, url);
    await waitForAnyPageText(client, sessionId, route.expectedText, ROUTE_TIMEOUT_MS);

    if (route.expandedAccordions?.length > 0) {
      await assertExpandedAccordions(client, sessionId, route.expandedAccordions, route.path);
    }

    await injectBrowserEvent(client, sessionId, INJECT_BROWSER_EVENT);
  });
}

async function withBrowserFailureGuard(client, sessionId, path, callback) {
  const browserEvents = [];
  const cleanupListeners = [
    client.on('Runtime.consoleAPICalled', (event) => {
      if (event.sessionId !== sessionId) {
        return;
      }

      const type = event.params?.type;
      if (type === 'warning' || type === 'error') {
        browserEvents.push({
          kind: `console.${type}`,
          message: formatConsoleArguments(event.params.args),
        });
      }
    }),
    client.on('Runtime.exceptionThrown', (event) => {
      if (event.sessionId !== sessionId) {
        return;
      }

      browserEvents.push({
        kind: 'page.exception',
        message:
          event.params?.exceptionDetails?.exception?.description ??
          event.params?.exceptionDetails?.text ??
          'Unspecified page exception',
      });
    }),
    client.on('Log.entryAdded', (event) => {
      if (event.sessionId !== sessionId) {
        return;
      }

      const level = event.params?.entry?.level;
      if (level === 'warning' || level === 'error') {
        browserEvents.push({
          kind: `log.${level}`,
          message: event.params.entry.text,
        });
      }
    }),
  ];

  try {
    await callback();
    await delay(BROWSER_EVENT_SETTLE_MS);

    if (browserEvents.length > 0) {
      throw new Error(formatBrowserEventFailure(path, browserEvents));
    }
  } finally {
    for (const cleanupListener of cleanupListeners) {
      cleanupListener();
    }

    assertBrowserFailureGuardListenersDisposed(client, path);
  }
}

function assertBrowserFailureGuardListenersDisposed(client, path) {
  const activeFailureListeners = BROWSER_FAILURE_EVENT_METHODS.flatMap((method) => {
    const listenerCount = client.listenerCount(method);

    return listenerCount > 0 ? [`${method}: ${listenerCount}`] : [];
  });

  if (activeFailureListeners.length > 0) {
    throw new Error(
      `Route ${path} leaked browser failure guard listeners: ${activeFailureListeners.join(', ')}`
    );
  }
}

async function navigateTo(client, sessionId, url) {
  const loadEventPromise = client.waitForEvent(
    'Page.loadEventFired',
    (event) => event.sessionId === sessionId,
    ROUTE_TIMEOUT_MS
  );

  await client.send('Page.navigate', { url }, sessionId);
  await loadEventPromise;
}

async function waitForAnyPageText(client, sessionId, expectedText, timeoutMs) {
  const expectedTexts = toTextOptions(expectedText);

  await waitUntil(
    async () => {
      const result = await client.send(
        'Runtime.evaluate',
        {
          expression: `(${JSON.stringify(expectedTexts)}).some((expectedText) => document.body?.innerText.includes(expectedText))`,
          returnByValue: true,
        },
        sessionId
      );

      return result.result?.value === true;
    },
    timeoutMs,
    `Timed out waiting for any page text: ${expectedTexts.join(' | ')}`
  );
}

async function assertExpandedAccordions(client, sessionId, expectedLabels, path) {
  const result = await client.send(
    'Runtime.evaluate',
    {
      expression: String.raw`Array.from(document.querySelectorAll('[data-slot="accordion-trigger"]')).filter((element) => element.getAttribute('aria-expanded') === 'true' || element.hasAttribute('data-open')).map((element) => element.innerText)`,
      returnByValue: true,
    },
    sessionId
  );
  const expandedLabels = result.result?.value ?? [];
  const missingLabels = expectedLabels.filter((expectedLabel) => {
    const labelOptions = toTextOptions(expectedLabel);

    return !expandedLabels.some((actualLabel) =>
      labelOptions.some((labelOption) => actualLabel.includes(labelOption))
    );
  });

  if (missingLabels.length > 0) {
    throw new Error(
      `Route ${path} did not open expected accordion groups ${missingLabels.map((label) => toTextOptions(label).join('/')).join(', ')}. Open groups: ${expandedLabels.join(' | ')}`
    );
  }
}

async function injectBrowserEvent(client, sessionId, eventType) {
  const browserEventExpressions = {
    error: 'console.error("sample smoke injected error")',
    exception: 'setTimeout(() => { throw new Error("sample smoke injected page exception"); }, 0)',
    'page-exception':
      'setTimeout(() => { throw new Error("sample smoke injected page exception"); }, 0)',
    'unhandled-rejection': 'Promise.reject(new Error("sample smoke injected unhandled rejection"))',
    warning: 'console.warn("sample smoke injected warning")',
  };

  if (!eventType) {
    return;
  }

  const expression = browserEventExpressions[eventType];
  if (!expression) {
    throw new Error(
      `Unknown SAMPLE_SMOKE_INJECT_BROWSER_EVENT value "${eventType}". Expected one of: ${Object.keys(browserEventExpressions).join(', ')}`
    );
  }

  await client.send('Runtime.evaluate', { expression }, sessionId);
}

function toTextOptions(text) {
  return Array.isArray(text) ? text : [text];
}

function formatBrowserEventFailure(path, browserEvents) {
  const details = browserEvents.map((event) => `- ${event.kind}: ${event.message}`).join('\n');

  return `Route ${path} emitted browser warning/error events:\n${details}`;
}

function formatConsoleArguments(args = []) {
  return args
    .map((arg) => arg.value ?? arg.description ?? arg.unserializableValue ?? '<unserializable>')
    .join(' ');
}

function spawnTracked(command, args, { cwd, label }) {
  const childProcess = spawn(command, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  childProcesses.push(childProcess);
  childProcess.stdout.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  childProcess.stderr.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`));

  return childProcess;
}

async function waitForBrowserWebSocketUrl(port, timeoutMs) {
  await waitForHttp(
    `http://${HOST}:${port}/json/version`,
    timeoutMs,
    'Chrome remote debugging endpoint'
  );

  const response = await fetch(`http://${HOST}:${port}/json/version`);
  const version = await response.json();

  if (typeof version.webSocketDebuggerUrl !== 'string') {
    throw new Error('Chrome remote debugging endpoint did not provide a WebSocket URL.');
  }

  return version.webSocketDebuggerUrl;
}

async function waitForHttp(url, timeoutMs, label) {
  await waitUntil(
    async () => {
      try {
        const response = await fetch(url);
        return response.ok;
      } catch {
        return false;
      }
    },
    timeoutMs,
    `Timed out waiting for ${label} at ${url}`
  );
}

async function waitUntil(predicate, timeoutMs, timeoutMessage) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }

    await delay(100);
  }

  throw new Error(timeoutMessage);
}

class CdpClient {
  static connect(webSocketUrl) {
    const socket = new WebSocket(webSocketUrl);
    const client = new CdpClient(socket);

    return new Promise((resolve, reject) => {
      socket.addEventListener('open', () => resolve(client), { once: true });
      socket.addEventListener(
        'error',
        () => reject(new Error('Failed to connect to Chrome DevTools.')),
        {
          once: true,
        }
      );
    });
  }

  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pendingCommands = new Map();
    this.listeners = new Map();

    this.socket.addEventListener('message', (event) => this.handleMessage(event));
  }

  send(method, params, sessionId) {
    const id = this.nextId;
    this.nextId += 1;

    const message = { id, method, params };
    if (sessionId) {
      message.sessionId = sessionId;
    }

    return new Promise((resolve, reject) => {
      this.pendingCommands.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify(message));
    });
  }

  on(method, listener) {
    const methodListeners = this.listeners.get(method) ?? new Set();
    methodListeners.add(listener);
    this.listeners.set(method, methodListeners);

    return () => {
      methodListeners.delete(listener);

      if (methodListeners.size === 0 && this.listeners.get(method) === methodListeners) {
        this.listeners.delete(method);
      }
    };
  }

  listenerCount(method) {
    return this.listeners.get(method)?.size ?? 0;
  }

  waitForEvent(method, predicate, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for CDP event ${method}.`));
      }, timeoutMs);
      const cleanup = this.on(method, (event) => {
        if (!predicate(event)) {
          return;
        }

        clearTimeout(timeout);
        cleanup();
        resolve(event);
      });
    });
  }

  close() {
    this.socket.close();
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);

    if (typeof message.id === 'number') {
      const pendingCommand = this.pendingCommands.get(message.id);
      if (!pendingCommand) {
        return;
      }

      this.pendingCommands.delete(message.id);

      if (message.error) {
        pendingCommand.reject(
          new Error(
            `${pendingCommand.method} failed: ${message.error.message ?? 'Unknown CDP error'}`
          )
        );
        return;
      }

      pendingCommand.resolve(message.result ?? {});
      return;
    }

    const methodListeners = this.listeners.get(message.method);
    if (!methodListeners) {
      return;
    }

    for (const listener of methodListeners) {
      listener(message);
    }
  }
}

try {
  await runSmokeChecks();
  console.log(`Sample browser smoke passed for ${smokeRoutes.length} routes.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  for (const childProcess of childProcesses) {
    childProcess.kill('SIGTERM');
  }

  if (chromeProfileDirectory) {
    await rm(chromeProfileDirectory, { recursive: true, force: true });
  }
}
