// prisma/helpers/purge.ts
import { deleteSafely } from "./index.js";
import type { BasicDelegate, IdLike } from "./delegateAdapter.js";

export async function purgeModelById<TId extends IdLike>(
  label: string,
  delegate: BasicDelegate,
  idField: string,
  options?: {
    pageSize?: number;
    deleteChunkSize?: number;
    selectOnlyId?: boolean;
  },
) {
  const pageSize = options?.pageSize ?? 2000;
  const deleteChunkSize = options?.deleteChunkSize ?? 1000;

  for (;;) {
    const rows = await delegate.findMany({
      select: { [idField]: true },
      orderBy: { [idField]: "asc" },
      take: pageSize,
    } as unknown);

    if (!rows.length) break;

    const ids: TId[] = rows.map((r) => r[idField] as TId);

    for (let i = 0; i < ids.length; i += deleteChunkSize) {
      const slice = ids.slice(i, i + deleteChunkSize);
      await deleteSafely(
        () =>
          delegate.deleteMany({
            where: { [idField]: { in: slice } },
          } as unknown),
        `${label} (${slice.length})`,
      );
    }
  }
}

export async function purgeModelByCompositeKey<
  TRow extends Record<string, IdLike>,
>(
  label: string,
  delegate: BasicDelegate<TRow>,
  keyFields: readonly (keyof TRow & string)[],
  options?: {
    pageSize?: number;
    deleteChunkSize?: number;
    extraOrderBy?: Record<string, "asc" | "desc">;
  },
) {
  const pageSize = options?.pageSize ?? 2000;
  const deleteChunkSize = options?.deleteChunkSize ?? 200;

  const select: Record<string, true> = {};
  keyFields.forEach((k) => (select[k] = true));

  const orderBy: Record<string, "asc" | "desc">[] = [{ [keyFields[0]]: "asc" }];
  if (options?.extraOrderBy) {
    for (const [k, dir] of Object.entries(options.extraOrderBy)) {
      orderBy.push({ [k]: dir });
    }
  }

  for (;;) {
    const rows = await delegate.findMany({
      select,
      orderBy,
      take: pageSize,
    } as unknown);

    if (!rows.length) break;

    for (let i = 0; i < rows.length; i += deleteChunkSize) {
      const chunk = rows.slice(i, i + deleteChunkSize);
      const or = chunk.map((r) => {
        const cond: Record<string, IdLike> = {};
        keyFields.forEach((k) => {
          cond[k] = r[k];
        });
        return cond;
      });

      await deleteSafely(
        () =>
          delegate.deleteMany({
            where: { OR: or },
          } as unknown),
        `${label} (${chunk.length})`,
      );
    }
  }
}
