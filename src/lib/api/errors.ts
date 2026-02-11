export class ApiException extends Error {
  constructor(
    public readonly status: number,
    public readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiException";
  }
}

export function isApiException(error: unknown): error is ApiException {
  return error instanceof ApiException;
}
