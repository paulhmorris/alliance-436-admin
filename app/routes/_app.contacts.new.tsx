import { UserRole } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import type { MetaFunction } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { useState } from "react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { ValidatedForm, validationError } from "remix-validated-form";

import { AddressForm } from "~/components/contacts/address-fields";
import { ContactFields } from "~/components/contacts/contact-fields";
import { ErrorComponent } from "~/components/error-component";
import { PageContainer } from "~/components/page-container";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { SubmitButton } from "~/components/ui/submit-button";
import { prisma } from "~/integrations/prisma.server";
import { ContactType } from "~/lib/constants";
import { requireUser } from "~/lib/session.server";
import { toast } from "~/lib/toast.server";
import { NewContactSchema } from "~/models/schemas";

const NewContactValidator = withZod(NewContactSchema);

export const meta: MetaFunction = () => [{ title: "New Contact • Alliance 436" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const contactTypes = await prisma.contactType.findMany({
    where:
      user.role === UserRole.USER
        ? {
            id: {
              notIn: [ContactType.Admin, ContactType.Staff],
            },
          }
        : {},
  });
  const usersWhoCanBeAssigned = await prisma.user.findMany({
    where: { role: { in: [UserRole.USER, UserRole.ADMIN] } },
    select: {
      id: true,
      contact: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return typedjson({
    contactTypes,
    usersWhoCanBeAssigned,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireUser(request);
  const result = await NewContactValidator.validate(await request.formData());
  if (result.error) {
    return validationError(result.error);
  }

  const { address, assignedUserIds, ...formData } = result.data;

  const existingContact = await prisma.contact.findUnique({
    where: { email: formData.email },
  });

  if (existingContact) {
    return validationError({
      fieldErrors: {
        email: `A contact with this email already exists - ${existingContact.firstName} ${existingContact.lastName}`,
      },
    });
  }

  const contact = await prisma.contact.create({
    data: {
      ...formData,
      address: {
        create: address,
      },
      assignedUsers: assignedUserIds
        ? {
            createMany: {
              data: assignedUserIds.map((userId) => ({ userId })),
            },
          }
        : undefined,
    },
  });

  return toast.redirect(request, `/contacts/${contact.id}`, {
    title: "Contact created",
    description: `${contact.firstName} ${contact.lastName} was created successfully.`,
  });
};

export default function NewContactPage() {
  const { contactTypes, usersWhoCanBeAssigned } = useTypedLoaderData<typeof loader>();
  const [addressEnabled, setAddressEnabled] = useState(false);

  return (
    <>
      <PageHeader title="New Contact" />
      <PageContainer>
        <ValidatedForm validator={NewContactValidator} method="post" className="space-y-4 sm:max-w-md">
          <ContactFields contactTypes={contactTypes} />
          {!addressEnabled ? (
            <Button variant="outline" onClick={() => setAddressEnabled(true)}>
              Add Address
            </Button>
          ) : (
            <AddressForm />
          )}
          <Separator className="my-4" />
          <fieldset>
            <legend className="mb-4 text-sm text-muted-foreground">
              Assign users to this contact. They will receive regular reminders to engage with this Contact.
            </legend>
            <div className="flex flex-col gap-2">
              {usersWhoCanBeAssigned.map((user) => {
                return (
                  <Label key={user.id} className="inline-flex cursor-pointer items-center gap-2">
                    <Checkbox name="assignedUserIds" value={user.id} />
                    <span>
                      {user.contact.firstName} {user.contact.lastName}
                    </span>
                  </Label>
                );
              })}
            </div>
          </fieldset>
          <Separator className="my-4" />
          <div className="flex items-center gap-2">
            <SubmitButton>Create Contact</SubmitButton>
            <Button type="reset" variant="outline">
              Reset
            </Button>
          </div>
        </ValidatedForm>
      </PageContainer>
    </>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
