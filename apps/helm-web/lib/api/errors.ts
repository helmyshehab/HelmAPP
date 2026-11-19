/** Parse errors thrown by the generated Helm client (`path failed: status`). */
export class HelmApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(status: number, path: string) {
    super(`${path} failed: ${status}`);
    this.name = "HelmApiError";
    this.status = status;
    this.path = path;
  }
}

export function asHelmApiError(err: unknown): HelmApiError | null {
  if (err instanceof HelmApiError) return err;
  if (!(err instanceof Error)) return null;
  const match = /^(.+?) failed: (\d+)$/.exec(err.message);
  if (!match) return null;
  return new HelmApiError(Number(match[2]), match[1]);
}

export function isNotFoundError(err: unknown): boolean {
  return asHelmApiError(err)?.status === 404;
}
