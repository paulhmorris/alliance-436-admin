import { UserRole } from "@prisma/client";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";

import { ContactsTable } from "~/components/contacts/contacts-table";
import { ErrorComponent } from "~/components/error-component";
import { PageContainer } from "~/components/page-container";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { prisma } from "~/integrations/prisma.server";
import { requireUser } from "~/lib/session.server";

export const meta: MetaFunction = () => [{ title: "Contacts • Alliance 436" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  // Only show a user's donors to them
  if (user.role === UserRole.USER) {
    const contacts = await prisma.contact.findMany({
      where: {
        transactions: {
          some: {
            account: {
              userId: user.id,
            },
          },
        },
      },
      include: { type: true },
    });
    return typedjson({ contacts });
  }

  const contacts = await prisma.contact.findMany({
    include: { type: true },
    orderBy: { createdAt: "desc" },
  });
  return typedjson({ contacts });
}

export default function ContactIndexPage() {
  const { contacts } = useTypedLoaderData<typeof loader>();

  return (
    <>
      <PageHeader title="Contacts">
        <Button asChild>
          <Link to="/contacts/new">New Contact</Link>
        </Button>
      </PageHeader>

      <PageContainer>
        <ContactsTable data={contacts} />
      </PageContainer>
    </>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}