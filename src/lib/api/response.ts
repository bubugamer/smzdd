import { NextResponse } from "next/server";

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

export function apiSuccess<T>(data: T, message = "ok", code = 0, status = 200) {
  return NextResponse.json<ApiEnvelope<T>>({ code, message, data }, { status });
}

export function apiError(message: string, status = 500, code = status, data: Record<string, never> = {}) {
  return NextResponse.json<ApiEnvelope<Record<string, never>>>({ code, message, data }, { status });
}
