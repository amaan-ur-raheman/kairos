type Op = "select" | "insert" | "update" | "delete";

export interface DbCall {
  op: Op;
  table: unknown;
  payload?: unknown;
  returning?: boolean;
}

interface MockState {
  /** Queue of result sets per table; each SELECT consumes the next entry, repeating the last one when exhausted. */
  selectQueue: Map<unknown, unknown[][]>;
  returningResults: Map<unknown, unknown[]>;
  batchOverrides: unknown[][];
  calls: DbCall[];
}

function createState(): MockState {
  return {
    selectQueue: new Map(),
    returningResults: new Map(),
    batchOverrides: [],
    calls: [],
  };
}

const state = createState();

/**
 * Rows returned when awaiting SELECTs against this table. Each call registers
 * one result set; successive SELECTs consume them in order, reusing the last
 * registration once exhausted (covers check-then-write patterns).
 */
export function onSelect(table: unknown, ...rowsPerCall: unknown[][]) {
  const queue = state.selectQueue.get(table) ?? [];
  queue.push(...rowsPerCall);
  state.selectQueue.set(table, queue);
}

/** Rows returned by `.returning()` after INSERT/UPDATE/DELETE on this table. */
export function onReturning(table: unknown, rows: unknown[]) {
  state.returningResults.set(table, rows);
}

/**
 * Override what successive db.batch([...]) calls resolve to.
 * First registered override is consumed by the first batch call, etc.
 */
export function onBatch(...resultsPerCall: unknown[][]): void {
  state.batchOverrides.push(...resultsPerCall);
}

export function getCalls(): readonly DbCall[] {
  return state.calls;
}

export function getCallsByOp(op: Op): DbCall[] {
  return state.calls.filter((c) => c.op === op);
}

export function resetDbMock() {
  state.selectQueue.clear();
  state.returningResults.clear();
  state.batchOverrides.length = 0;
  state.calls.length = 0;
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function tableNameOf(table: unknown): string {
  if (table && typeof table === "object") {
    const t = table as Record<string, unknown>;
    for (const sym of Object.getOwnPropertySymbols(t)) {
      const desc = String(sym);
      if (desc.includes("Name") && typeof t[sym] === "string") return t[sym] as string;
    }
  }
  return String(table);
}

function resolveResult(op: Op, table: unknown, payload: unknown, returning: boolean): unknown {
  if (op === "select") {
    const queue = state.selectQueue.get(table);
    if (!queue || queue.length === 0) {
      // Fail loudly on un-stubbed selects so tests never pass by accident.
      throw new Error(
        `db-mock: SELECT on unconfigured table ${tableNameOf(table)}. Call onSelect(table, rows) first.`,
      );
    }
    // Consume registrations in order; the last one repeats once exhausted.
    return clone(queue.length > 1 ? queue.shift() : queue[0]);
  }
  if (returning) {
    const configured = state.returningResults.get(table);
    if (configured) return clone(configured);
  }
  if (op === "insert") {
    // Sensible default: echo inserted values back as rows (routers already set ids).
    return Array.isArray(payload) ? clone(payload) : [clone(payload)];
  }
  // UPDATE/DELETE default to "no matching row".
  return [];
}

// biome-ignore lint/suspicious/noExplicitAny: test mock mirrors drizzle's loose builder API
function makeBuilder(op: Op, initialTable?: unknown): Record<string, any> & PromiseLike<unknown> {
  let table: unknown = initialTable ?? null;
  let payload: unknown;
  let returning = false;

  if (initialTable !== undefined) {
    // insert/update/delete receive their table eagerly
  }

  // biome-ignore lint/suspicious/noExplicitAny: test mock mirrors drizzle's loose builder API
  const builder = {} as Record<string, any> & PromiseLike<unknown>;

  builder.from = ((t: unknown) => {
    table = t;
    state.calls.push({ op: "select", table: t });
    return builder;
  }) as never;
  for (const method of [
    "where",
    "orderBy",
    "limit",
    "offset",
    "leftJoin",
    "innerJoin",
    "onConflictDoUpdate",
    "onConflictDoNothing",
  ] as const) {
    builder[method] = (() => builder) as never;
  }
  builder.values = ((v: unknown) => {
    payload = v;
    return builder;
  }) as never;
  builder.set = ((v: unknown) => {
    payload = v;
    return builder;
  }) as never;
  builder.returning = (() => {
    returning = true;
    return builder;
  }) as never;

  // biome-ignore lint/suspicious/noThenProperty: intentionally thenable so `await db.select()...` works
  builder.then = (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => {
    if (op !== "select") {
      state.calls.push({ op, table, payload, returning });
    }
    return Promise.resolve(resolveResult(op, table, payload, returning)).then(
      onFulfilled,
      onRejected,
    );
  };
  builder.catch = ((onRejected: (e: unknown) => unknown) =>
    Promise.resolve(builder).catch(onRejected)) as never;

  return builder;
}

// biome-ignore lint/suspicious/noExplicitAny: test mock proxies arbitrary drizzle builder methods
const dbProxy: Record<string, any> = new Proxy(
  {},
  {
    get(_target, prop) {
      switch (prop) {
        case "batch":
          return (queries: PromiseLike<unknown>[]) => {
            const override = state.batchOverrides.shift();
            if (override !== undefined) return Promise.resolve(clone(override));
            return Promise.all(queries.map((q) => Promise.resolve(q)));
          };
        case "select":
          return (_projection?: unknown) => makeBuilder("select");
        case "insert":
        case "update":
        case "delete":
          return (table: unknown) => makeBuilder(prop as Op, table);
        default:
          throw new Error(`db-mock: unsupported method "${String(prop)}"`);
      }
    },
  },
);

/**
 * Returns the mocked drizzle `db`. Use inside a vi.mock factory:
 *
 *   vi.mock("@kairos/db", async () => {
 *     const { getMockedDb } = await import("./helpers/db-mock");
 *     return { db: getMockedDb() };
 *   });
 */
export function getMockedDb() {
  return dbProxy;
}
