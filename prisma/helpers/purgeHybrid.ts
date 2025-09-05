// prisma/helpers/purgeHybrid.ts
import { deleteSafely } from "./index.js";
import { purgeModelById, purgeModelByCompositeKey } from "./purge.js";
import type { BasicDelegate, IdLike } from "./delegateAdapter.js";

export async function quickOrPurgeById<TId extends IdLike>(
  label: string,
  delegate: BasicDelegate,
  idField: string,
  opts?: {
    smallThreshold?: number;
    pageSize?: number;
    deleteChunkSize?: number;
  },
) {
  const smallThreshold = opts?.smallThreshold ?? 5_000;
  const total = await delegate.count();
  if (total <= smallThreshold) {
    await deleteSafely(
      () => delegate.deleteMany(),
      `${label} (quick, ${total})`,
    );
    return;
  }
  await purgeModelById<TId>(label, delegate, idField, {
    pageSize: opts?.pageSize ?? 2_000,
    deleteChunkSize: opts?.deleteChunkSize ?? 1_000,
  });
}

export async function quickOrPurgeByCompositeKey<
  TRow extends Record<string, IdLike>,
>(
  label: string,
  delegate: BasicDelegate<TRow>,
  keyFields: readonly (keyof TRow & string)[],
  opts?: {
    smallThreshold?: number;
    pageSize?: number;
    deleteChunkSize?: number;
    extraOrderBy?: Record<string, "asc" | "desc">;
  },
) {
  const smallThreshold = opts?.smallThreshold ?? 5_000;
  const total = await delegate.count();
  if (total <= smallThreshold) {
    await deleteSafely(
      () => delegate.deleteMany(),
      `${label} (quick, ${total})`,
    );
    return;
  }
  await purgeModelByCompositeKey<TRow>(label, delegate, keyFields, {
    pageSize: opts?.pageSize ?? 2_000,
    deleteChunkSize: opts?.deleteChunkSize ?? 200,
    extraOrderBy: opts?.extraOrderBy,
  });
}
