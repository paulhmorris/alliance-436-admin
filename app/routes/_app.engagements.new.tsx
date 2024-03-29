import { UserRole } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useSearchParams, type MetaFunction } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { ValidatedForm, validationError } from "remix-validated-form";
import { z } from "zod";

import { ContactDropdown } from "~/components/contacts/contact-dropdown";
import { ErrorComponent } from "~/components/error-component";
import { PageContainer } from "~/components/page-container";
import { PageHeader } from "~/components/page-header";
import { FormField, FormSelect, FormTextarea } from "~/components/ui/form";
import { SubmitButton } from "~/components/ui/submit-button";
import { prisma } from "~/integrations/prisma.server";
import { ContactType, EngagementType } from "~/lib/constants";
import { toast } from "~/lib/toast.server";
import { getToday } from "~/lib/utils";
import { ContactService } from "~/services/ContactService.server";
import { SessionService } from "~/services/SessionService.server";

const validator = withZod(
  z.object({
    date: z.coerce.date(),
    description: z.string().optional(),
    typeId: z.coerce.number().pipe(z.nativeEnum(EngagementType)),
    contactId: z.string().cuid({ message: "Contact required" }),
  }),
);

export const meta: MetaFunction = () => [{ title: "Add Engagement | Alliance 436" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await SessionService.requireUser(request);
  const [contacts, contactTypes, engagementTypes] = await Promise.all([
    prisma.contact.findMany({
      where: {
        assignedUsers:
          user.role === UserRole.USER
            ? {
                some: {
                  userId: user.id,
                },
              }
            : undefined,
        typeId: { notIn: [ContactType.Staff] },
      },
    }),
    ContactService.getContactTypes(),
    prisma.engagementType.findMany(),
  ]);

  return typedjson({
    contacts,
    contactTypes,
    engagementTypes,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await SessionService.requireUser(request);
  const result = await validator.validate(await request.formData());
  if (result.error) {
    return validationError(result.error);
  }

  const engagement = await prisma.engagement.create({
    data: {
      ...result.data,
      userId: user.id,
    },
  });

  return toast.redirect(request, `/engagements/${engagement.id}`, {
    type: "success",
    title: "Success",
    description: `Engagement recorded.`,
  });
};

export default function NewEngagementPage() {
  const { contacts, contactTypes, engagementTypes } = useTypedLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  return (
    <>
      <PageHeader title="Add Engagement" />
      <PageContainer>
        <ValidatedForm
          defaultValues={{ contactId: searchParams.get("contactId") ?? undefined }}
          method="post"
          validator={validator}
          className="space-y-4 sm:max-w-md"
        >
          <div className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
            <FormField required name="date" label="Date" type="date" defaultValue={getToday()} />
            <FormSelect
              required
              name="typeId"
              label="Type"
              placeholder="Select type"
              options={engagementTypes.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
            />
          </div>
          <ContactDropdown types={contactTypes} contacts={contacts} name="contactId" label="Contact" required />
          <FormTextarea name="description" label="Description" />
          <SubmitButton>Submit</SubmitButton>
        </ValidatedForm>
      </PageContainer>
    </>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
