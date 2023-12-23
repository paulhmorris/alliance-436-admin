import { cronTrigger } from "@trigger.dev/sdk";

import { prisma } from "~/integrations/prisma.server";
import { trigger, triggerResend } from "~/integrations/trigger.server";
import { formatCentsAsDollars, isArray } from "~/lib/utils";

export const donationSummaryJob = trigger.defineJob({
  id: "donation-summary",
  name: "Weekly Donation Summary",
  version: "0.0.1",
  trigger: cronTrigger({
    // Every Saturday at 3pm UTC
    cron: "0 15 * * SAT",
  }),
  integrations: {
    resend: triggerResend,
  },
  run: async (_, io) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const accounts = await prisma.account.findMany({
      where: {
        transactions: {
          some: {
            createdAt: {
              gte: sevenDaysAgo,
            },
          },
        },
      },
      select: {
        code: true,
        transactions: true,
        activityRecipients: true,
      },
    });

    const emails = accounts
      .filter((a) => a.activityRecipients && isArray(a.activityRecipients) && a.activityRecipients.length > 0)
      .map((a) => {
        const totalInCents = a.transactions.reduce((acc, transaction) => acc + transaction.amountInCents, 0);

        return {
          from: "no-reply@getcosmic.dev",
          to: a.activityRecipients as Array<string>,
          subject: "Alliance 436 - Weekly Donation summary",
          html: `You have received ${formatCentsAsDollars(totalInCents)} to account ${
            a.code
          } this week. Log in to see more details.`,
        };
      });

    await io.resend.batch.send("send-emails", [...emails]);

    return {
      success: true,
      count: emails.length,
    };
  },
});