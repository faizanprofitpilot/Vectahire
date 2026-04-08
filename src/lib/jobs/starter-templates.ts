export type StarterTemplateId = "sdr" | "designer" | "support";

export const STARTER_JOB_TEMPLATES: Record<
  StarterTemplateId,
  {
    label: string;
    blurb: string;
    title: string;
    description: string;
    seniority: string;
    skills: string;
    location: string;
    successPrompt: string;
  }
> = {
  sdr: {
    label: "SDR",
    blurb: "Outbound + pipeline",
    title: "Sales Development Representative",
    description:
      "Own top-of-funnel outreach: research accounts, personalize sequences, book qualified meetings for AEs. You'll work closely with marketing on ICP and messaging, hit activity and pipeline targets, and iterate based on what converts.",
    seniority: "junior",
    skills: "Cold outreach, CRM, discovery calls, writing, resilience",
    location: "Remote, US",
    successPrompt:
      "Consistent qualified meetings, clean handoffs to AEs, and clear notes on fit and pain.",
  },
  designer: {
    label: "Product Designer",
    blurb: "End-to-end product craft",
    title: "Product Designer",
    description:
      "Lead design for a core product surface: discovery with PM and eng, flows and prototypes in Figma, usability validation, and polish through launch. Partner on a design system and accessibility.",
    seniority: "mid",
    skills: "Figma, UX research, design systems, B2B SaaS",
    location: "Hybrid, NYC",
    successPrompt:
      "Shipped improvements that users adopt, measurable lift in task success, and strong collaboration with eng.",
  },
  support: {
    label: "Customer Support",
    blurb: "Customer voice + resolution",
    title: "Customer Support Lead",
    description:
      "Lead a small support pod handling email, chat, and escalations. Own macros and help content, spot product issues for eng, and protect NPS while hitting SLA and quality bars.",
    seniority: "mid",
    skills: "Zendesk, written communication, troubleshooting, empathy",
    location: "Remote",
    successPrompt:
      "Fast, accurate resolutions; clear product feedback; customers feel heard even on hard tickets.",
  },
};

export type JobTemplateDefaults = (typeof STARTER_JOB_TEMPLATES)[StarterTemplateId];

export function parseTemplateId(raw: string | undefined): StarterTemplateId | null {
  if (raw === "sdr" || raw === "designer" || raw === "support") return raw;
  return null;
}
