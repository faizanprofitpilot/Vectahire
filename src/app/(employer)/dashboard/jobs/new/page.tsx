import { CreateJobForm } from "@/components/jobs/create-job-form";
import {
  parseTemplateId,
  STARTER_JOB_TEMPLATES,
} from "@/lib/jobs/starter-templates";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  const templateId = parseTemplateId(template);
  const templateDefaults = templateId ? STARTER_JOB_TEMPLATES[templateId] : null;
  return <CreateJobForm templateDefaults={templateDefaults} />;
}
