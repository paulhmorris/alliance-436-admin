import { UserRole } from "@prisma/client";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { typedjson, useTypedLoaderData } from "remix-typedjson";

import { ErrorComponent } from "~/components/error-component";
import { PageContainer } from "~/components/page-container";
import { PageHeader } from "~/components/page-header";
import { TransactionsTable } from "~/components/transactions/transactions-table";
import { prisma } from "~/integrations/prisma.server";
import { SessionService } from "~/services/SessionService.server";

export const meta: MetaFunction = () => [{ title: "Transactions | Alliance 436" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await SessionService.requireUser(request);
  const transactions = await prisma.transaction.findMany({
    where:
      user.role === UserRole.USER
        ? {
            account: {
              user: {
                id: user.id,
              },
            },
          }
        : {},
    include: {
      contact: true,
      account: true,
    },
    orderBy: [{ date: "desc" }, { account: { code: "asc" } }],
  });
  return typedjson({ transactions });
}

export default function TransactionsIndexPage() {
  const { transactions } = useTypedLoaderData<typeof loader>();
  return (
    <>
      <PageHeader title="Transactions" />
      <PageContainer>
        <TransactionsTable data={transactions} />
      </PageContainer>
    </>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
