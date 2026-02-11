export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { createReview, listReviews } from "@/lib/server/data";

const createReviewSchema = z.object({
  providerId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  content: z.string().min(1).max(5000),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  reviewerName: z.string().max(80).optional(),
  reviewerRole: z.string().max(80).optional(),
});

export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const searchParams = request.nextUrl.searchParams;
    const data = await listReviews({
      providerId: searchParams.get("providerId") ?? undefined,
      minRating: searchParams.get("minRating")
        ? Number(searchParams.get("minRating"))
        : undefined,
      maxRating: searchParams.get("maxRating")
        ? Number(searchParams.get("maxRating"))
        : undefined,
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
    });
    return apiSuccess(data);
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const parsed = createReviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiException(400, 400, parsed.error.issues[0]?.message ?? "invalid payload");
    }

    const data = await createReview(parsed.data);
    return apiSuccess(data, "created", 0, 201);
  });
}
