import { ActionFunctionArgs } from "@remix-run/node";
import { typedjson } from "remix-typedjson";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

import { prisma } from "~/integrations/prisma.server";
import { SessionService } from "~/services/SessionService.server";

export async function action({ request }: ActionFunctionArgs) {
  const userId = await SessionService.requireUserId(request);

  switch (request.method) {
    case "POST": {
      const validator = z.object({ s3Key: z.string(), title: z.string() });
      const result = validator.safeParse(await request.json());
      if (!result.success) {
        return new Response(fromZodError(result.error).toString(), { status: 400 });
      }

      const receipt = await prisma.receipt.create({
        data: {
          ...result.data,
          userId,
        },
      });

      return typedjson({ receipt });
    }
    default: {
      return new Response("Method not allowed", { status: 405 });
    }
  }
}
