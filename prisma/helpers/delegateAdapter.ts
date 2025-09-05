// prisma/helpers/delegateAdapter.ts
type UnknownFn<R = unknown> = (...args: unknown[]) => Promise<R>;

export type BasicDelegate<
  TRow extends Record<string, unknown> = Record<string, unknown>,
> = {
  count: (args?: unknown) => Promise<number>;
  deleteMany: (args?: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<TRow[]>;
};

export function asBasicDelegate<TRow extends Record<string, unknown>>(
  delegate: unknown,
): BasicDelegate<TRow> {
  const d = delegate as {
    count: UnknownFn<number>;
    deleteMany: UnknownFn<unknown>;
    findMany: UnknownFn<TRow[]>;
  };

  return {
    count: (args?: unknown) => d.count(args),
    deleteMany: (args?: unknown) => d.deleteMany(args),
    findMany: (args: unknown) => d.findMany(args),
  };
}

// (optional but handy)
export type IdLike = number | string;
