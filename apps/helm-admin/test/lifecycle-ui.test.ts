import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowedTransitionTargets,
  canEditDestinationFields,
  isPublishedSlugImmutable,
  transitionNeedsStrongConfirm,
  transitionRequiresReason,
} from "../lib/destinations/lifecycle-ui";

describe("destination lifecycle UI matrix", () => {
  it("exposes operator-safe targets from draft", () => {
    assert.deepEqual(allowedTransitionTargets("draft", false).sort(), [
      "pending_verification",
      "rejected",
    ]);
  });

  it("allows administrators to archive and publish on allowed edges", () => {
    assert.ok(allowedTransitionTargets("draft", true).includes("archived"));
    assert.ok(allowedTransitionTargets("approved", true).includes("published"));
    assert.ok(allowedTransitionTargets("published", true).includes("archived"));
  });

  it("hides admin-only targets from operators", () => {
    const fromApproved = allowedTransitionTargets("approved", false);
    assert.equal(fromApproved.includes("published"), false);
    assert.equal(fromApproved.includes("archived"), false);
    assert.ok(fromApproved.includes("rejected"));
  });

  it("allows operators to restore archived → draft (mirrors Nest)", () => {
    assert.deepEqual(allowedTransitionTargets("archived", false), ["draft"]);
  });

  it("gates field edits by curatability for operators", () => {
    assert.equal(canEditDestinationFields("draft", false), true);
    assert.equal(canEditDestinationFields("published", false), false);
    assert.equal(canEditDestinationFields("published", true), true);
  });

  it("marks published slugs immutable", () => {
    assert.equal(isPublishedSlugImmutable("published"), true);
    assert.equal(isPublishedSlugImmutable("approved"), false);
  });

  it("requires rejection reason and strong confirm for publish/archive", () => {
    assert.equal(transitionRequiresReason("rejected"), true);
    assert.equal(transitionRequiresReason("published"), false);
    assert.equal(transitionNeedsStrongConfirm("published"), true);
    assert.equal(transitionNeedsStrongConfirm("archived"), true);
  });
});
