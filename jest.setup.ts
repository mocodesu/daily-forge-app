// ─────────────────────────────────────────────────────────────
// jest.setup.ts
//
// Runs after the test framework is installed in the environment but
// before the test file itself is evaluated.
//
// Critical ordering note:
//   1. jest.mock("react-native-worklets", ...) MUST be registered
//      before require("react-native-reanimated") is evaluated.
//      Reanimated 4 delegates to Worklets, and setUpTests() triggers
//      the native import chain. If the mock isn't in place, Jest
//      crashes with "Cannot read properties of undefined
//      (reading 'loadUnpackers')".
//   2. Every jest.mock() factory below is deliberately free of type
//      aliases and generic type arguments. Babel's jest-hoist plugin
//      analyzes the factory AST *before* TypeScript types are
//      stripped, so `type Foo = ...` or `Map<string, Foo>` inside a
//      factory is reported as "Invalid variable access: Foo".
//      Keep factory bodies plain JS.
//
// References:
//   https://docs.swmansion.com/react-native-worklets/docs/guides/testing
//   https://docs.swmansion.com/react-native-reanimated/docs/guides/testing
// ─────────────────────────────────────────────────────────────

// ── React act environment ───────────────────────────────────
//
// React 19 checks this flag to decide whether to silence
// "not wrapped in act(...)" warnings. RNTL sets it during
// renderHook, but declaring it here makes the environment correct
// from the first render and removes a class of flakiness in hook
// tests where state updates fire from microtasks.
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// ── 1. Worklets mock — MUST be first ────────────────────────
//
// Replaces the native Worklets runtime with a pure-JS stub so
// setUpTests() below can run without touching the native bridge.
jest.mock("react-native-worklets", () =>
  require("react-native-worklets/src/mock"),
);

// ── 2. Reanimated test helpers ──────────────────────────────
//
// Enables the reanimated matchers (toHaveAnimatedStyle, etc.) and
// sets up the JS-side animation runtime so useAnimatedStyle /
// withTiming / withSpring resolve synchronously in tests.
require("react-native-reanimated").setUpTests();

// ── 3. Console noise ────────────────────────────────────────
//
// Reanimated and Unistyles emit informational warnings that are
// harmless in tests but drown out real signal. Silence them here;
// everything else still prints.
const suppressedPrefixes = ["[unistyles]", "[Reanimated]", "[freeze]"];

const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

console.warn = (...args) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (suppressedPrefixes.some((p) => first.startsWith(p))) return;
  originalWarn(...args);
};

console.error = (...args) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (suppressedPrefixes.some((p) => first.startsWith(p))) return;
  originalError(...args);
};

// ── 4. MMKV ─────────────────────────────────────────────────
//
// react-native-mmkv v4 is a Nitro module — it needs a native
// runtime that Jest doesn't have. Substitute an in-memory Map
// with the same surface area used by src/store/storage.ts.
//
// Instances are keyed by `id` so createMMKV("a") and
// createMMKV("b") get independent stores, matching the real
// library's behavior.
//
// NOTE: no type aliases or generics inside the factory. See the
// header comment for why.
jest.mock("react-native-mmkv", () => {
  const instances = new Map();

  const createMMKV = (config) => {
    const id = config && config.id ? config.id : "default";
    if (!instances.has(id)) instances.set(id, new Map());
    const store = instances.get(id);

    return {
      set: (key, value) => {
        store.set(key, value);
      },
      getString: (key) => {
        const v = store.get(key);
        return typeof v === "string" ? v : undefined;
      },
      getNumber: (key) => {
        const v = store.get(key);
        return typeof v === "number" ? v : undefined;
      },
      getBoolean: (key) => {
        const v = store.get(key);
        return typeof v === "boolean" ? v : undefined;
      },
      contains: (key) => store.has(key),
      remove: (key) => {
        store.delete(key);
      },
      clearAll: () => {
        store.clear();
      },
      getAllKeys: () => Array.from(store.keys()),
    };
  };

  return { createMMKV };
});

// ── 5. expo-crypto ──────────────────────────────────────────
//
// expo-crypto is a native module. day-key.ts re-exports its
// randomUUID. The re-export is a value import, so it loads at
// module evaluation time. Provide a deterministic stub — tests
// that care about the exact UUID value should mock it locally.
jest.mock("expo-crypto", () => {
  let counter = 0;
  return {
    randomUUID: () => {
      counter += 1;
      return `00000000-0000-0000-0000-${String(counter).padStart(12, "0")}`;
    },
  };
});
// ── 6. expo-file-system ─────────────────────────────────────
//
// backup.ts imports { File, Paths } at the top level. Phase 2
// tests only exercise parseBackupJson / summarizeBackup, which
// never touch the file system — but the import itself must not
// throw. Stub enough surface for the import to succeed.
jest.mock("expo-file-system", () => {
  const files = new Map();

  function MockFile(dir, name) {
    this.uri = `${dir}/${name}`;
    this.exists = files.has(this.uri);
  }
  MockFile.prototype.delete = function () {
    files.delete(this.uri);
    this.exists = false;
  };
  MockFile.prototype.create = function () {
    files.set(this.uri, "");
    this.exists = true;
  };
  MockFile.prototype.write = function (content) {
    files.set(this.uri, content);
  };

  return {
    File: MockFile,
    Paths: {
      document: "file:///mock/document",
      cache: "file:///mock/cache",
    },
  };
});

// ── 7. expo-sqlite ──────────────────────────────────────────
//
// useSQLiteContext is mocked to return whatever DB the current
// test registered via setCurrentTestDb(). Test files call it in
// beforeEach after initializeDatabase() has run. If a hook runs
// without a DB set, we throw a helpful error rather than crash
// on a null property.
//
// The factory requires @/testing/db-state at call time (not at
// module scope) — the jest-hoist plugin forbids referencing
// outer variables, but a require() inside the factory is fine.
jest.mock("expo-sqlite", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const state = require("@/testing/db-state");
  return {
    useSQLiteContext: () => {
      const db = state.getCurrentTestDb();
      if (!db) {
        throw new Error(
          "[testing] No test DB is set. In your beforeEach, call:\n" +
            "  const db = createTestDb();\n" +
            "  await initializeDatabase(db);\n" +
            "  setCurrentTestDb(db);",
        );
      }
      return db;
    },
  };
});

// ── 8. expo-router ─────────────────────────────────────────
//
// We only need useFocusEffect for hook tests. Run the callback
// once on mount, honoring any cleanup it returns.
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require("react");
    React.useEffect(() => {
      const cleanup = cb();
      return typeof cleanup === "function" ? cleanup : undefined;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  },
}));
