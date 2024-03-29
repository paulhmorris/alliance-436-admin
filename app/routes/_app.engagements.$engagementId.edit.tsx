import { UserRole } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { type MetaFunction } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { ValidatedForm, setFormDefaults, validationError } from "remix-validated-form";
import invariant from "tiny-invariant";
import { z } from "zod";
dayjs.extend(utc);

import { ContactDropdown } from "~/components/contacts/contact-dropdown";
import { PageContainer } from "~/components/page-container";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { FormField, FormSelect, FormTextarea } from "~/components/ui/form";
import { SubmitButton } from "~/components/ui/submit-button";
import { prisma } from "~/integrations/prisma.server";
import { ContactType, EngagementType } from "~/lib/constants";
import { notFound } from "~/lib/responses.server";
import { toast } from "~/lib/toast.server";
import { ContactService } from "~/services/ContactService.server";
import { SessionService } from "~/services/SessionService.server";

const validator = withZod(
  z.object({
    id: z.coerce.number(),
    date: z.coerce.date(),
    description: z.string().optional(),
    typeId: z.coerce.number().pipe(z.nativeEnum(EngagementType)),
    contactId: z.string().cuid({ message: "Contact required" }),
  }),
);

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const user = await SessionService.requireUser(request);
  invariant(params.engagementId, "engagementId not found");

  const [contacts, contactTypes, engagement, engagementTypes] = await Promise.all([
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
    prisma.engagement.findUnique({
      where: { id: Number(params.engagementId) },
    }),
    prisma.engagementType.findMany(),
  ]);

  if (!engagement) {
    throw notFound("Engagement not found");
  }

  return typedjson({
    engagement,
    engagementTypes,
    contacts,
    contactTypes,
    ...setFormDefaults("engagement-form", { ...engagement, typeId: engagement.typeId.toString() }),
  });
};

export const meta: MetaFunction = () => [{ title: "Edit Account | Alliance 436" }];

export const action = async ({ request }: ActionFunctionArgs) => {
  await SessionService.requireUser(request);
  const result = await validator.validate(await request.formData());
  if (result.error) {
    return validationError(result.error);
  }

  const engagement = await prisma.engagement.update({
    where: { id: result.data.id },
    data: result.data,
  });

  return toast.redirect(request, `/engagements/${engagement.id}`, {
    type: "success",
    title: "Engagement updated",
  });
};

export default function EditEngagementPage() {
  const { engagement, engagementTypes, contacts, contactTypes } = useTypedLoaderData<typeof loader>();

  return (
    <>
      <PageHeader title="Edit Engagement" />
      <PageContainer>
        <ValidatedForm id="engagement-form" method="post" validator={validator} className="space-y-4 sm:max-w-md">
          <input type="hidden" name="id" value={engagement.id} />
          <div className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
            <FormField
              required
              name="date"
              label="Date"
              type="date"
              defaultValue={dayjs(engagement.date).utc().format("YYYY-MM-DD")}
            />
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
          <FormTextarea name="description" label="Description" rows={8} />
          <ButtonGroup>
            <SubmitButton>Save</SubmitButton>
            <Button variant="outline" type="reset">
              Reset
            </Button>
          </ButtonGroup>
        </ValidatedForm>
      </PageContainer>
    </>
  );
}
