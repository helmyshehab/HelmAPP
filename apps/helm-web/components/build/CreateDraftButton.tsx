"use client";

import { useTransition } from "react";
import { createTripDraftAction } from "@/app/actions/build";
import { canStartMutation } from "@/lib/build/draft-form";

export function CreateDraftButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="build-button build-button-secondary"
      disabled={!canStartMutation(pending)}
      onClick={() => {
        if (!canStartMutation(pending)) return;
        startTransition(async () => {
          await createTripDraftAction();
        });
      }}
    >
      {pending ? "Creating…" : "New draft"}
    </button>
  );
}
