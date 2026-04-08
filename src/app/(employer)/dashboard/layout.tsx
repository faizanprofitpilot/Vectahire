import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployer } from "@/lib/services/employer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const employer = await ensureEmployer(user);
  if (!employer.onboarding_completed) redirect("/onboarding");

  return (
    <DashboardShell
      companyName={employer.company_name || "Your company"}
      userEmail={employer.email}
    >
      {children}
    </DashboardShell>
  );
}
