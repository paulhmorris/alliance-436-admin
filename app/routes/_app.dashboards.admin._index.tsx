import { ReimbursementRequestStatus, UserRole } from "@prisma/client";
import { type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { redirect, typedjson, useTypedLoaderData } from "remix-typedjson";
dayjs.extend(utc);

import { AnnouncementCard } from "~/components/admin/announcement-card";
import { ReimbursementRequestsList } from "~/components/admin/reimbursement-requests-list";
import { ErrorComponent } from "~/components/error-component";
import { AnnouncementModal } from "~/components/modals/announcement-modal";
import { PageContainer } from "~/components/page-container";
import { PageHeader } from "~/components/page-header";
import { AccountBalanceCard } from "~/components/users/balance-card";
import { prisma } from "~/integrations/prisma.server";
import { AccountType } from "~/lib/constants";
import { SessionService } from "~/services/SessionService.server";

export const meta: MetaFunction = () => [{ title: "Home | Alliance 436" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await SessionService.requireUser(request);
  if (user.role === UserRole.USER) {
    return redirect("/dashboards/staff");
  }

  const [accounts, reimbursementRequests, announcement] = await Promise.all([
    prisma.account.findMany({
      where: {
        typeId: AccountType.Operating,
      },
      include: {
        transactions: true,
      },
      orderBy: { code: "asc" },
    }),

    prisma.reimbursementRequest.findMany({
      where: {
        status: ReimbursementRequestStatus.PENDING,
      },
      include: {
        account: true,
        user: {
          include: { contact: true },
        },
      },
    }),
    prisma.announcement.findFirst({
      where: {
        OR: [
          {
            expiresAt: { gt: dayjs().utc().toDate() },
          },
          { expiresAt: null },
        ],
      },
      orderBy: {
        id: "desc",
      },
    }),
  ]);

  return typedjson({ accounts, reimbursementRequests, announcement });
}

export default function Index() {
  const { accounts, reimbursementRequests, announcement } = useTypedLoaderData<typeof loader>();

  return (
    <>
      <PageHeader title="Home" />
      <PageContainer className="max-w-4xl">
        <div className="mb-4">
          {announcement ? <AnnouncementCard announcement={announcement} /> : <AnnouncementModal intent="create" />}
        </div>
        <div className="space-y-4">
          <div className="grid auto-rows-fr grid-cols-1 gap-4 lg:grid-cols-2">
            {accounts.map((a) => {
              const total = a.transactions.reduce((acc, t) => acc + t.amountInCents, 0);
              return (
                <div key={a.id} className="h-full">
                  <AccountBalanceCard title={a.description} totalCents={total} code={a.code} />
                </div>
              );
            })}
          </div>
          {reimbursementRequests.length > 0 ? <ReimbursementRequestsList requests={reimbursementRequests} /> : null}
        </div>
      </PageContainer>
    </>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
