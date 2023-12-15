import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import type { MetaFunction } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { useState } from "react";
import { typedjson } from "remix-typedjson";
import { ValidatedForm, validationError } from "remix-validated-form";

import { ErrorComponent } from "~/components/error-component";
import { PageContainer } from "~/components/page-container";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { FormField } from "~/components/ui/form";
import { Separator } from "~/components/ui/separator";
import { SubmitButton } from "~/components/ui/submit-button";
import { prisma } from "~/integrations/prisma.server";
import { ContactType } from "~/lib/constants";
import { NewContactSchema } from "~/lib/schemas";
import { requireUser } from "~/lib/session.server";
import { toast } from "~/lib/toast.server";

const NewContactValidator = withZod(NewContactSchema);

export const meta: MetaFunction = () => [{ title: "New Contact • Alliance 436" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireUser(request);
  return typedjson({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireUser(request);
  const result = await NewContactValidator.validate(await request.formData());
  if (result.error) return validationError(result.error);

  const { address, ...formData } = result.data;

  const existingContact = await prisma.contact.findFirst({
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
    },
  });

  return toast.redirect(request, `/contacts/${contact.id}`, {
    title: "Contact created",
    description: `${contact.firstName} ${contact.lastName} was created successfully.`,
  });
};

export default function NewContactPage() {
  const [addressEnabled, setAddressEnabled] = useState(false);

  return (
    <>
      <PageHeader title="New Contact" />
      <PageContainer>
        <ValidatedForm validator={NewContactValidator} method="post" className="space-y-4 sm:max-w-md">
          <div className="flex items-center gap-2">
            <FormField label="First name" id="firstName" name="firstName" required />
            <FormField label="Last name" id="lastName" name="lastName" />
          </div>
          <FormField label="Email" id="email" name="email" required />
          <FormField label="Phone" id="phone" name="phone" inputMode="numeric" maxLength={10} />
          <input type="hidden" name="typeId" value={ContactType.Donor} />

          {!addressEnabled ? (
            <Button variant="outline" onClick={() => setAddressEnabled(true)}>
              Add Address
            </Button>
          ) : (
            <fieldset className="space-y-4">
              <FormField label="Street 1" id="street" placeholder="1234 Main St." name="address.street" required />
              <div className="flex items-center gap-2">
                <FormField label="Street 2" id="street" placeholder="Apt 4" name="address.street2" />
                <FormField label="City" id="city" placeholder="Richardson" name="address.city" required />
              </div>
              <div className="flex items-center gap-2">
                <FormField label="State" id="state" placeholder="TX" name="address.state" required />
                <FormField label="Zip" id="zip" placeholder="75080" name="address.zip" required />
                <FormField
                  label="Country"
                  id="zip"
                  placeholder="US"
                  name="address.country"
                  required
                  defaultValue="US"
                />
              </div>
            </fieldset>
          )}
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