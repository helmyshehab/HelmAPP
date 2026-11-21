import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TripDraft } from "@helm/api-client-ts";
import {
  buildUpdateTripDraftRequest,
  canStartMutation,
  formValuesFromDraft,
} from "../lib/build/draft-form";

const BASE_DRAFT: TripDraft = {
  id: "11111111-1111-1111-1111-111111111111",
  destinationId: "22222222-2222-2222-2222-222222222222",
  title: "Bali week",
  constraints: { party: 2, pace: "slow" },
  status: "draft",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("buildUpdateTripDraftRequest", () => {
  it("omits unchanged fields", () => {
    const form = formValuesFromDraft(BASE_DRAFT);
    const result = buildUpdateTripDraftRequest(BASE_DRAFT, form);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.body, {});
  });

  it("sends explicit null when clearing nullable fields", () => {
    const form = formValuesFromDraft(BASE_DRAFT);
    form.title = "   ";
    form.destinationId = "";
    const result = buildUpdateTripDraftRequest(BASE_DRAFT, form);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.body, {
      title: null,
      destinationId: null,
    });
  });

  it("includes only changed title", () => {
    const form = formValuesFromDraft(BASE_DRAFT);
    form.title = "Ubud escape";
    const result = buildUpdateTripDraftRequest(BASE_DRAFT, form);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.body, { title: "Ubud escape" });
  });

  it("replaces constraints when the JSON object changes", () => {
    const form = formValuesFromDraft(BASE_DRAFT);
    form.constraintsText = JSON.stringify({ party: 4 }, null, 2);
    const result = buildUpdateTripDraftRequest(BASE_DRAFT, form);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.body, { constraints: { party: 4 } });
  });

  it("rejects invalid constraints JSON and preserves caller form values", () => {
    const form = formValuesFromDraft(BASE_DRAFT);
    form.constraintsText = "{not-json";
    const result = buildUpdateTripDraftRequest(BASE_DRAFT, form);
    assert.deepEqual(result, {
      ok: false,
      message: "Constraints must be valid JSON.",
    });
    assert.equal(form.constraintsText, "{not-json");
  });

  it("rejects non-object constraints", () => {
    const form = formValuesFromDraft(BASE_DRAFT);
    form.constraintsText = "[]";
    const result = buildUpdateTripDraftRequest(BASE_DRAFT, form);
    assert.deepEqual(result, {
      ok: false,
      message: "Constraints must be a JSON object.",
    });
  });
});

describe("destinationId PATCH keep / change / clear", () => {
  it("keeps destinationId omitted when unchanged", () => {
    const form = formValuesFromDraft(BASE_DRAFT);
    form.title = "Bali week";
    const result = buildUpdateTripDraftRequest(BASE_DRAFT, form);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal("destinationId" in result.body, false);
    assert.deepEqual(result.body, {});
  });

  it("sends the selected destinationId when changed", () => {
    const form = formValuesFromDraft(BASE_DRAFT);
    form.destinationId = "33333333-3333-3333-3333-333333333333";
    const result = buildUpdateTripDraftRequest(BASE_DRAFT, form);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.body, {
      destinationId: "33333333-3333-3333-3333-333333333333",
    });
  });

  it("sends null only when destinationId is explicitly cleared", () => {
    const form = formValuesFromDraft(BASE_DRAFT);
    form.destinationId = "";
    const result = buildUpdateTripDraftRequest(BASE_DRAFT, form);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.body, { destinationId: null });
  });
});

describe("canStartMutation", () => {
  it("blocks duplicate submissions while in flight", () => {
    assert.equal(canStartMutation(false), true);
    assert.equal(canStartMutation(true), false);
  });
});
