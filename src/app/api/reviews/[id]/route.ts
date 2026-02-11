export const dynamic = "force-dynamic";

import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { deleteReview, updateReview } from "@/lib/server/data";

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(120).nullable().optional(),
  content: z.string().min(1).max(5000).optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  reviewerName: z.string().max(80).nullable().optional(),
  reviewerRole: z.string().max(80).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const parsed = updateReviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiException(400, 400, parsed.error.issues[0]?.message ?? "invalid payload");
    }

    const data = await updateReview(params.id, parsed.data);
    if (!data) {
      throw new ApiException(404, 404, "review not found");
    }
    return apiSuccess(data, "updated");
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const data = await deleteReview(params.id);
    if (!data) {
      throw new ApiException(404, 404, "review not found");
    }
    return apiSuccess(data, "deleted");
  });
}
