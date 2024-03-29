import { invokeTrigger } from "@trigger.dev/sdk";
import { z } from "zod";

import { trigger, triggerResend } from "~/integrations/trigger.server";

export const notifySubscribersJob = trigger.defineJob({
  id: "notify-user-income",
  name: "Notify user of income",
  version: "0.0.1",
  trigger: invokeTrigger({
    schema: z.object({
      to: z.union([z.string(), z.array(z.string())]),
    }),
  }),
  integrations: {
    resend: triggerResend,
  },
  run: async (payload, io) => {
    const url = new URL("/", process.env.SITE_URL ?? `https://${process.env.VERCEL_URL}`);

    await io.resend.emails.send("send-email", {
      from: "Alliance 436 <no-reply@alliance436.org>",
      to: payload.to,
      subject: "You have new income!",
      html: `You have new income! Check it out on your <a href="${url.toString()}">Dashboard</a>.`,
    });
  },
});
