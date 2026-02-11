import { apiError } from "@/lib/api/response";
import { isApiException } from "@/lib/api/errors";

export async function withApiHandler<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    if (isApiException(error)) {
      return apiError(error.message, error.status, error.code);
    }

    console.error("Unhandled API error", error);
    return apiError("internal server error", 500, 500);
  }
}
