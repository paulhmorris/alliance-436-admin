import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, type MetaFunction } from "@remix-run/react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { setFormDefaults } from "remix-validated-form";
import invariant from "tiny-invariant";

import { AccountTransactionsTable } from "~/components/accounts/account-transactions-table";
import { ErrorComponent } from "~/components/error-component";
import { PageContainer } from "~/components/page-container";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { AccountBalanceCard } from "~/components/users/balance-card";
import { prisma } from "~/integrations/prisma.server";
import { notFound } from "~/lib/responses.server";
import { requireUser } from "~/lib/session.server";

export const meta: MetaFunction = () => [{ title: "Account • Alliance 436" }];

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  await requireUser(request, ["ADMIN"]);
  invariant(params.accountId, "accountId not found");

  const account = await prisma.account.findUnique({
    where: { id: params.accountId },
    include: {
      organization: true,
      transactions: {
        include: {
          contact: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!account) throw notFound({ message: "Account not found" });

  const total = await prisma.transaction.aggregate({
    where: { accountId: account.id },
    _sum: { amountInCents: true },
  });

  return typedjson({
    total: total._sum.amountInCents,
    account,
    ...setFormDefaults("account-form", { ...account }),
  });
};

export default function AccountDetailsPage() {
  const { total, account } = useTypedLoaderData<typeof loader>();

  return (
    <>
      <PageHeader title={account.code} description={account.description}>
        <Button variant="outline" asChild>
          <Link to={`/accounts/${account.id}/edit`}>Edit</Link>
        </Button>
      </PageHeader>
      <PageContainer>
        <div className="max-w-xs">
          <AccountBalanceCard totalCents={total} />
        </div>
        <div className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold">Transactions</h2>
          <AccountTransactionsTable data={account.transactions} />
        </div>
      </PageContainer>
    </>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
