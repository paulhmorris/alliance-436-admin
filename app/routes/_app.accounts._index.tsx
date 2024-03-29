import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { IconPlus } from "@tabler/icons-react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";

import { AccountsTable } from "~/components/accounts/accounts-table";
import { ErrorComponent } from "~/components/error-component";
import { PageContainer } from "~/components/page-container";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { prisma } from "~/integrations/prisma.server";
import { SessionService } from "~/services/SessionService.server";

export const meta: MetaFunction = () => [{ title: "Accounts | Alliance 436" }];

export async function loader({ request }: LoaderFunctionArgs) {
  await SessionService.requireAdmin(request);
  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      code: true,
      description: true,
      transactions: {
        select: {
          amountInCents: true,
        },
      },
      type: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { code: "asc" },
  });

  const accountsWithBalance = accounts.map((account) => {
    const balance = account.transactions.reduce((acc, transaction) => acc + transaction.amountInCents, 0);
    return { ...account, balance };
  });

  return typedjson({ accounts: accountsWithBalance });
}

export default function AccountsIndexPage() {
  const { accounts } = useTypedLoaderData<typeof loader>();
  return (
    <>
      <PageHeader title="Accounts">
        <Button asChild>
          <Link to="/accounts/new">
            <IconPlus className="mr-2 h-5 w-5" />
            <span>New Account</span>
          </Link>
        </Button>
      </PageHeader>

      <PageContainer>
        <AccountsTable data={accounts} />
      </PageContainer>
    </>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
