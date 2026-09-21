// ─────────────────────────────────────────────────────────────
// jest.setup.ts
// ─────────────────────────────────────────────────────────────

jest.mock("react-native-worklets", () =>
  require("react-native-worklets/src/mock"),
);

require("react-native-reanimated").setUpTests();

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const suppressedPrefixes = ["[unistyles]", "[Reanimated]", "[freeze]"];

const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

console.warn = (...args: unknown[]) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (suppressedPrefixes.some((p) => first.startsWith(p))) return;
  originalWarn(...args);
};

console.error = (...args: unknown[]) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (suppressedPrefixes.some((p) => first.startsWith(p))) return;
  originalError(...args);
};

// ── MMKV ────────────────────────────────────────────────────
jest.mock("react-native-mmkv", () => {
  const instances = new Map<string, Map<string, string | number | boolean>>();

  const createMMKV = (config?: { id?: string }) => {
    const id = config?.id ?? "default";
    if (!instances.has(id)) instances.set(id, new Map());
    const store = instances.get(id)!;

    return {
      set: (key: string, value: string | number | boolean) => {
        store.set(key, value);
      },
      getString: (key: string) => {
        const v = store.get(key);
        return typeof v === "string" ? v : undefined;
      },
      getNumber: (key: string) => {
        const v = store.get(key);
        return typeof v === "number" ? v : undefined;
      },
      getBoolean: (key: string) => {
        const v = store.get(key);
        return typeof v === "boolean" ? v : undefined;
      },
      contains: (key: string) => store.has(key),
      remove: (key: string) => {
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

// ── expo-crypto ─────────────────────────────────────────────
jest.mock("expo-crypto", () => {
  let counter = 0;
  return {
    randomUUID: () => {
      counter += 1;
      return `00000000-0000-0000-0000-${String(counter).padStart(12, "0")}`;
    },
  };
});

// ── expo-file-system ────────────────────────────────────────
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();

  class MockFile {
    uri: string;
    exists: boolean;

    constructor(dir: string, name: string) {
      this.uri = `${dir}/${name}`;
      this.exists = files.has(this.uri);
    }

    delete() {
      files.delete(this.uri);
      this.exists = false;
    }

    create() {
      files.set(this.uri, "");
      this.exists = true;
    }

    write(content: string) {
      files.set(this.uri, content);
    }
  }

  return {
    File: MockFile,
    Paths: {
      document: "file:///mock/document",
      cache: "file:///mock/cache",
    },
  };
});

// ── expo-sqlite ─────────────────────────────────────────────
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

// ── expo-router ─────────────────────────────────────────────
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
