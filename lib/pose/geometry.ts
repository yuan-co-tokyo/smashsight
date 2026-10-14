export type Landmark = { x: number; y: number; z: number; visibility?: number; presence?: number };
// Media time, not the inference clock. No accumulation or persistence here.
export type PoseSample = { timestampMs: number; landmarks: Landmark[] };
export function poseSample(timestampMs: number, landmarks: readonly Landmark[] | undefined): PoseSample {
  return { timestampMs, landmarks: landmarks?.map(({ x, y, z, visibility, presence }) => ({ x, y, z, visibility, presence })) ?? [] };
}
export const CONNECTIONS: readonly (readonly [number, number])[] = [
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],
  [11,12],[11,13],[13,15],[15,17],[15,19],[15,21],[17,19],
  [12,14],[14,16],[16,18],[16,20],[16,22],[18,20],
  [11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28],
  [27,29],[28,30],[29,31],[30,32],[27,31],[28,32],
];
export function drawable(point: Landmark | undefined): point is Landmark {
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1 && (point.visibility ?? 1) >= 0.5 && (point.presence ?? 1) >= 0.5;
}
export function containRect(width: number, height: number, videoWidth: number, videoHeight: number) {
  if (![width, height, videoWidth, videoHeight].every((n) => Number.isFinite(n) && n > 0)) return null;
  const scale = Math.min(width / videoWidth, height / videoHeight);
  return { x: (width - videoWidth * scale) / 2, y: (height - videoHeight * scale) / 2, width: videoWidth * scale, height: videoHeight * scale };
}
export function skeleton(points: readonly Landmark[], rect: NonNullable<ReturnType<typeof containRect>>) {
  const positions = points.map((p) => drawable(p) ? { x: rect.x + p.x * rect.width, y: rect.y + p.y * rect.height } : null);
  return {
    points: positions.filter((p) => p !== null),
    lines: CONNECTIONS.flatMap(([a, b]) => positions[a] && positions[b] ? [[positions[a], positions[b]] as const] : []),
  };
}
export function isCurrentSample(sample: PoseSample, mediaTimeMs: number, generation: number, currentGeneration: number) {
  return generation === currentGeneration && Math.abs(mediaTimeMs - sample.timestampMs) < 150;
}
