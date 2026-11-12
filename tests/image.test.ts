import { describe, expect, it, vi } from "vitest";
import { ImageCallError, generateImage, type FalQueue } from "../apps/backend/src/lib/image";

/** generateImage against a fake fal queue: what is billed, what isn't, and that a timed-out job is cancelled (F2). No network. */
const MODEL = { name: "Nano Banana Pro", endpoint: "fal-ai/nano-banana-pro", maxRefs: 5, usd: { "4K": 0.3 } };
const opts = { model: MODEL, prompt: "p", aspect: "1:1", resolution: "4K", refs: [] };
const PNG = Buffer.from("png-bytes");

function queue(over: Partial<Record<keyof FalQueue, unknown>> = {}) {
  const q = {
    submit: vi.fn(async () => ({ request_id: "req-1" })),
    status: vi.fn(async () => ({ status: "COMPLETED" })),
    result: vi.fn(async () => ({ data: { images: [{ url: "https://fal.example/out.png" }] } })),
    cancel: vi.fn(async () => {}),
    ...over,
  };
  return q as unknown as FalQueue & typeof q;
}
const download = (ok: boolean, status = 200) => vi.fn(async () => ({ ok, status, arrayBuffer: async () => PNG })) as unknown as typeof fetch;
const fail = async (p: Promise<unknown>) => (await p.then(() => undefined, (e) => e)) as ImageCallError;

describe("generateImage", () => {
  it("returns the picture and fal's request ID", async () => {
    expect(await generateImage(opts, { queue: queue(), fetchUrl: download(true), pollMs: 1 })).toMatchObject({ requestId: "req-1", png: PNG });
  });

  it("a poll timeout cancels the job and is unconfirmed with its request ID: assume billed", async () => {
    const q = queue({ status: vi.fn(async () => ({ status: "IN_PROGRESS" })) });
    const e = await fail(generateImage(opts, { queue: q, timeoutMs: 20, pollMs: 5 }));
    expect(e).toBeInstanceOf(ImageCallError);
    expect(e).toMatchObject({ requestId: "req-1", unconfirmed: true });
    expect(q.cancel).toHaveBeenCalledWith("fal-ai/nano-banana-pro", { requestId: "req-1" });
    expect(e.message).toMatch(/request req-1/);
  });

  it("a failed download of a finished picture is unconfirmed too, and so is a status poll that fails", async () => {
    expect(await fail(generateImage(opts, { queue: queue(), fetchUrl: download(false, 502), pollMs: 1 }))).toMatchObject({ requestId: "req-1", unconfirmed: true });
    const lost = vi.fn(async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    expect(await fail(generateImage(opts, { queue: queue(), fetchUrl: lost, pollMs: 1 }))).toMatchObject({ unconfirmed: true });
    const flaky = queue({ status: vi.fn(async () => { throw new Error("ECONNRESET"); }) });
    expect(await fail(generateImage(opts, { queue: flaky, pollMs: 1 }))).toMatchObject({ requestId: "req-1", unconfirmed: true });
  });

  it("a refused submit, a failed job and an empty result are not billed", async () => {
    const refused = queue({ submit: vi.fn(async () => { throw Object.assign(new Error("422"), { body: { detail: "content policy" } }); }) });
    expect(await fail(generateImage(opts, { queue: refused }))).toMatchObject({ requestId: "", unconfirmed: false });
    const failedJob = queue({ result: vi.fn(async () => { throw new Error("job failed"); }) });
    expect(await fail(generateImage(opts, { queue: failedJob, pollMs: 1 }))).toMatchObject({ unconfirmed: false });
    const empty = queue({ result: vi.fn(async () => ({ data: { images: [] } })) });
    expect(await fail(generateImage(opts, { queue: empty, pollMs: 1 }))).toMatchObject({ unconfirmed: false, message: expect.stringMatching(/no image/) });
  });
});
