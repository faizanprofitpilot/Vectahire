/** Heuristic starter questions for new jobs (same count as AI-generated sets: 10). */
export function buildInterviewPreviewQuestions(
  title: string,
  description: string,
  successCriteria: string,
): string[] {
  const blob = `${title} ${description} ${successCriteria}`.toLowerCase();

  const sales =
    blob.includes("sales") ||
    blob.includes("sdr") ||
    blob.includes("account executive") ||
    blob.includes("pipeline");
  const design =
    blob.includes("design") ||
    blob.includes("figma") ||
    blob.includes("ux") ||
    blob.includes("product designer");
  const support =
    blob.includes("support") ||
    blob.includes("zendesk") ||
    blob.includes("customer support");

  if (sales) {
    return [
      "Walk me through how you approach a new territory or segment. How do you decide who to reach out to first?",
      "Tell me about a deal or meeting you helped book where the handoff to the AE mattered. What did you do to make it stick?",
      "When you are behind on quota or reply rates drop, how do you diagnose the problem and change your approach?",
      "Describe how you research a prospect or account before the first real conversation. What signals do you trust?",
      "Tell me about a time you lost a deal or got ghosted. What did you learn and what did you change next time?",
      "How do you balance volume outreach with quality personalization when the pipeline needs to move?",
      "What is your framework for qualifying whether a lead is worth continued investment?",
      "Describe a situation where you had to coordinate with marketing or product to improve conversion. What was your role?",
      "How do you stay organized across tools, sequences, and follow-ups without dropping the ball?",
      "What would you want to achieve in your first 90 days in this role, and how would you measure it?",
    ];
  }
  if (design) {
    return [
      "Describe a product change you shipped where you had to balance user needs, business goals, and technical constraints.",
      "How do you validate a design before engineering invests heavily, especially on a B2B workflow?",
      "Tell me about a time you received hard feedback on your work. What did you change?",
      "Walk me through how you partner with PM and engineering when scope or timelines shift mid-flight.",
      "Describe a design system or pattern decision you owned. How did you balance consistency with speed?",
      "Tell me about a usability or accessibility problem you uncovered and how you prioritized fixing it.",
      "How do you use research or data when stakeholders disagree about what users need?",
      "Describe a trade-off between visual polish and shipping. How did you decide?",
      "Tell me about a time you had to design for a complex edge case or power user behavior.",
      "What does success in this role look like to you in the first few months on the team?",
    ];
  }
  if (support) {
    return [
      "Walk me through a difficult customer issue you resolved. What was ambiguous, and how did you get to closure?",
      "How do you decide when to escalate versus solve at the front line?",
      "When product limitations frustrate customers, how do you protect the relationship and still be honest?",
      "Describe how you handle an angry or escalated customer while keeping the interaction productive.",
      "Tell me about a time you spotted a recurring issue and helped fix the root cause, not just the ticket.",
      "How do you prioritize when the queue is long and every ticket feels urgent?",
      "What is your approach to documenting solutions so the next person or customer benefits?",
      "Describe how you collaborate with product or engineering when a bug blocks a good customer outcome.",
      "How do you stay calm and accurate when policies or SLAs conflict with what the customer wants?",
      "What would you focus on in your first 90 days to raise the quality bar for customers in this role?",
    ];
  }

  return [
    "Tell me about a meaningful project you owned end-to-end. What was your role, and what outcome did you drive?",
    "Describe a time you had to align stakeholders who disagreed. How did you move forward?",
    "When you are under a tight deadline, how do you trade off quality, speed, and communication?",
    "Tell me about a time you had to learn something new quickly for work. How did you get up to speed?",
    "Describe a mistake or miss you owned. What happened next and what did you change?",
    "How do you prioritize when multiple projects or stakeholders all say they are number one?",
    "Tell me about a piece of feedback you disagreed with at first. What did you do with it?",
    "Describe how you work with cross-functional partners like design, product, or ops when goals conflict.",
    "What is something you are proud of from the last year, and what made it hard?",
    "Why this role, and what would success look like for you in the first 90 days?",
  ];
}
