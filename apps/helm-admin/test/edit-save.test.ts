import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canStartMutation,
  EDIT_SAVE_MESSAGES,
  runEditSaveSequence,
  runTagReplaceRetry,
  type MutationResult,
} from "../lib/destinations/edit-save";

function ok(): MutationResult {
  return { ok: true };
}

function fail(message: string): MutationResult {
  return { ok: false, message };
}

describe("runEditSaveSequence", () => {
  it("does not call PUT when PATCH fails", async () => {
    let putCalls = 0;
    const outcome = await runEditSaveSequence({
      tagSlugs: ["beach", "family"],
      updateFields: async () => fail("validation failed: 400"),
      replaceTags: async () => {
        putCalls += 1;
        return ok();
      },
    });

    assert.equal(putCalls, 0);
    assert.equal(outcome.kind, "fields_failed");
    if (outcome.kind !== "fields_failed") return;
    assert.match(outcome.message, /were not saved/i);
    assert.match(outcome.message, /validation failed: 400/);
  });

  it("reports partial success when PATCH succeeds and PUT fails", async () => {
    let patchCalls = 0;
    let putCalls = 0;
    const intended = ["beach", "island"];
    const outcome = await runEditSaveSequence({
      tagSlugs: intended,
      updateFields: async () => {
        patchCalls += 1;
        return ok();
      },
      replaceTags: async (tagSlugs) => {
        putCalls += 1;
        assert.deepEqual(tagSlugs, intended);
        return fail("tags failed: 500");
      },
    });

    assert.equal(patchCalls, 1);
    assert.equal(putCalls, 1);
    assert.equal(outcome.kind, "partial_tags_failed");
    if (outcome.kind !== "partial_tags_failed") return;
    assert.match(outcome.message, /details were saved/i);
    assert.match(outcome.message, /tags were not/i);
    assert.deepEqual(outcome.intendedTagSlugs, intended);
    // Intended selection survives even if caller mutates the original array later.
    intended.push("mutated");
    assert.deepEqual(outcome.intendedTagSlugs, ["beach", "island"]);
  });

  it("returns full success when both steps succeed", async () => {
    const outcome = await runEditSaveSequence({
      tagSlugs: ["beach"],
      updateFields: async () => ok(),
      replaceTags: async () => ok(),
    });
    assert.deepEqual(outcome, {
      kind: "success",
      message: EDIT_SAVE_MESSAGES.fullSuccess,
    });
  });
});

describe("runTagReplaceRetry", () => {
  it("submits PUT only and preserves intended tags on failure", async () => {
    let putCalls = 0;
    const intended = ["family"];
    const outcome = await runTagReplaceRetry({
      tagSlugs: intended,
      replaceTags: async (tagSlugs) => {
        putCalls += 1;
        assert.deepEqual(tagSlugs, ["family"]);
        return fail("network down");
      },
    });

    assert.equal(putCalls, 1);
    assert.equal(outcome.kind, "tags_failed");
    if (outcome.kind !== "tags_failed") return;
    assert.deepEqual(outcome.intendedTagSlugs, ["family"]);
  });

  it("reports full success after a successful tag retry", async () => {
    const outcome = await runTagReplaceRetry({
      tagSlugs: ["beach", "family"],
      replaceTags: async (tagSlugs) => {
        assert.deepEqual(tagSlugs, ["beach", "family"]);
        return ok();
      },
    });
    assert.deepEqual(outcome, {
      kind: "success",
      message: EDIT_SAVE_MESSAGES.tagsRetrySuccess,
    });
  });
});

describe("duplicate submission guard", () => {
  it("blocks starting another mutation while one is in flight", () => {
    assert.equal(canStartMutation(false), true);
    assert.equal(canStartMutation(true), false);
  });

  it("does not start a second overlapping save sequence concurrently", async () => {
    let active = 0;
    let peak = 0;
    let started = 0;

    async function once() {
      if (!canStartMutation(active > 0)) return "blocked";
      active += 1;
      started += 1;
      peak = Math.max(peak, active);
      try {
        return await runEditSaveSequence({
          tagSlugs: ["beach"],
          updateFields: async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            return ok();
          },
          replaceTags: async () => ok(),
        });
      } finally {
        active -= 1;
      }
    }

    const [first, second] = await Promise.all([once(), once()]);
    assert.equal(started, 1);
    assert.equal(peak, 1);
    assert.equal(second, "blocked");
    assert.equal(typeof first === "object" && first.kind === "success", true);
  });
});
