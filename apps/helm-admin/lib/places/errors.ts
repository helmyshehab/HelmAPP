/**
 * Map generated-client failures (`${path} failed: ${status}`) to staff UX.
 */

export type ApiErrorKind =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unknown";

export type ParsedApiError = {
  kind: ApiErrorKind;
  status: number | null;
  message: string;
};

const STATUS_RE = /failed:\s*(\d{3})\b/i;

export function parsePlaceApiError(error: unknown): ParsedApiError {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unexpected error";

  const match = STATUS_RE.exec(raw);
  const status = match ? Number(match[1]) : null;

  if (status === 400) {
    return {
      kind: "bad_request",
      status,
      message: "The request was invalid. Check the fields and try again.",
    };
  }
  if (status === 401) {
    return {
      kind: "unauthorized",
      status,
      message: "Your session is no longer valid. Sign in again.",
    };
  }
  if (status === 403) {
    return {
      kind: "forbidden",
      status,
      message: "You do not have permission for this action.",
    };
  }
  if (status === 404) {
    return {
      kind: "not_found",
      status,
      message: "Place not found.",
    };
  }
  if (status === 409) {
    return {
      kind: "conflict",
      status,
      message:
        "This place changed concurrently. Refresh and try the action again.",
    };
  }

  return {
    kind: "unknown",
    status,
    message: "Something went wrong talking to the API. Try again.",
  };
}
