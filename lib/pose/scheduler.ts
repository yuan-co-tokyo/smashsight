// One inference in flight across both players; a waiting peer gets priority.
export function createPoseScheduler() {
  let busy: object | null = null;
  let last: object | null = null;
  const waiting = new Set<object>();
  return {
    acquire(owner: object) {
      waiting.add(owner);
      if (busy || (last === owner && [...waiting].some((peer) => peer !== owner))) return false;
      busy = owner; waiting.delete(owner); return true;
    },
    release(owner: object) { if (busy === owner) { busy = null; last = owner; } },
    leave(owner: object) { waiting.delete(owner); if (busy === owner) busy = null; },
  };
}
export type PoseScheduler = ReturnType<typeof createPoseScheduler>;
