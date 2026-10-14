import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), find: vi.fn(), send: vi.fn(), sign: vi.fn(), insert: vi.fn(), update: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/uploads/videos", () => ({ findOwnedVideo: mocks.find }));
vi.mock("@/lib/aws/s3", () => ({ storage: () => ({ bucket: "test-bucket", client: { send: mocks.send } }) }));
vi.mock("@aws-sdk/s3-presigned-post", () => ({ createPresignedPost: mocks.sign }));
vi.mock("@/lib/db", () => ({ db: {
  insert: () => ({ values: mocks.insert }),
  update: () => ({ set: () => ({ where: mocks.update }) }),
} }));

import { POST as presign } from "@/app/api/uploads/presigned-post/route";
import { POST as complete } from "@/app/api/uploads/complete/route";

const id = "5ec7295f-76d9-4f79-93f1-8010993bfa2a";
const row = { id, userId: "alice", s3Key: `videos/alice/${id}.mp4`, sizeBytes: 100, contentType: "video/mp4", status: "uploading" };
const input = { originalName: "serve.mp4", contentType: "video/mp4", sizeBytes: 100 };
function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/uploads/test", { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "alice" });
  mocks.find.mockResolvedValue(row);
  mocks.send.mockResolvedValue({ ContentLength: 100, ContentType: "video/mp4" });
  mocks.sign.mockResolvedValue({ url: "https://storage.example.com", fields: {} });
});

describe("upload API boundaries", () => {
  it("returns 401 before signing, database or storage access", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await presign(request(input))).status).toBe(401);
    expect((await complete(request({ videoId: id }))).status).toBe(401);
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects cross-origin mutation and invalid payloads", async () => {
    expect((await presign(request(input, "https://other.example"))).status).toBe(403);
    expect((await presign(request({ ...input, sizeBytes: 0 }))).status).toBe(400);
    expect((await complete(request({ videoId: "invalid" }))).status).toBe(400);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("persists an uploading row with a server-selected owner and key", async () => {
    const response = await presign(request(input));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ ...input, id: body.videoId, userId: "alice", status: "uploading", s3Key: `videos/alice/${body.videoId}.mp4` }));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("returns 404 for other owners and missing rows without touching S3", async () => {
    for (const value of [null, { ...row, userId: "bob" }]) {
      mocks.find.mockResolvedValue(value);
      expect((await complete(request({ videoId: id }))).status).toBe(404);
    }
    expect(mocks.find).toHaveBeenCalledWith(id, "alice");
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not publish missing or mismatched objects", async () => {
    mocks.send.mockRejectedValueOnce(new Error("NotFound"));
    expect((await complete(request({ videoId: id }))).status).toBe(503);
    mocks.send.mockResolvedValue({ ContentLength: 99, ContentType: "video/mp4" });
    expect((await complete(request({ videoId: id }))).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("verifies the stored key before marking ready", async () => {
    expect((await complete(request({ videoId: id }))).status).toBe(200);
    expect(mocks.send.mock.calls[0][0].input).toEqual({ Bucket: "test-bucket", Key: row.s3Key });
    expect(mocks.update).toHaveBeenCalledOnce();
  });
});
