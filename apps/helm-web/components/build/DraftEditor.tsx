"use client";

import {
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { TripDraft } from "@helm/api-client-ts";
import { saveTripDraftAction } from "@/app/actions/build";
import {
  canStartMutation,
  emptyDraftFormValues,
  formValuesFromDraft,
  type DraftFormValues,
} from "@/lib/build/draft-form";
import type { PublishedDestinationCatalog } from "@/lib/destinations/list-published";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { DestinationPicker } from "./DestinationPicker";

type DraftEditorProps = {
  ownerUserId: string;
  draft: TripDraft;
  destinationCatalog: PublishedDestinationCatalog;
};

export function DraftEditor({
  ownerUserId,
  draft,
  destinationCatalog,
}: DraftEditorProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(draft);
  const [form, setForm] = useState<DraftFormValues>(() =>
    formValuesFromDraft(draft),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSaved(draft);
    setForm(formValuesFromDraft(draft));
    setMessage(null);
    setError(null);
  }, [draft]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      if (nextUserId !== ownerUserId) {
        setSaved(draft);
        setForm(emptyDraftFormValues());
        setMessage(null);
        setError(null);
        router.replace("/build");
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [ownerUserId, draft, router]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canStartMutation(pending)) return;

    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await saveTripDraftAction({
        draftId: saved.id,
        form,
        saved,
      });

      if (!result.ok) {
        // Keep unsaved form values after a failed save.
        setError(result.message);
        if (result.signedOut) {
          router.replace(`/login?next=/build/${saved.id}`);
          router.refresh();
        }
        return;
      }

      setSaved(result.draft);
      setForm(formValuesFromDraft(result.draft));
      setMessage("Draft saved.");
      router.refresh();
    });
  }

  return (
    <form className="build-form" onSubmit={onSubmit} noValidate>
      <label className="build-field">
        <span>Title</span>
        <input
          className="build-input"
          name="title"
          maxLength={200}
          value={form.title}
          onChange={(e) =>
            setForm((current) => ({ ...current, title: e.target.value }))
          }
          disabled={pending}
          placeholder="Untitled draft"
        />
      </label>

      <DestinationPicker
        savedDestinationId={saved.destinationId}
        value={form.destinationId}
        catalog={destinationCatalog}
        disabled={pending}
        onChange={(destinationId) =>
          setForm((current) => ({ ...current, destinationId }))
        }
      />

      <label className="build-field">
        <span>Constraints (JSON object)</span>
        <textarea
          className="build-input build-textarea"
          name="constraints"
          rows={8}
          value={form.constraintsText}
          onChange={(e) =>
            setForm((current) => ({
              ...current,
              constraintsText: e.target.value,
            }))
          }
          disabled={pending}
          spellCheck={false}
        />
      </label>

      {error ? (
        <p className="build-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="build-success" role="status">
          {message}
        </p>
      ) : null}

      <button
        className="build-button"
        type="submit"
        disabled={!canStartMutation(pending)}
      >
        {pending ? "Saving…" : "Save draft"}
      </button>
    </form>
  );
}
