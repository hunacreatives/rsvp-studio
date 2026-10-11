import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { downloadGuestCsv } from "../../components/GuestTable";
import { usePortal } from "../PortalContext";
import * as api from "../api";
import type { Project } from "../types";
import { PillButton } from "../ui";

// Bottom of a project's Website tab. The owner of a DIY site can delete it
// (hidden at once, removed for good after 30 days — supabase/project-lifecycle.sql);
// a co-host can leave instead. Studio projects are deleted by staff, from Studio.

type Step = { kind: "idle" } | { kind: "confirm"; paid: number } | { kind: "working" } | { kind: "error"; text: string };

export default function ProjectDangerZone({ project }: { project: Project }) {
  const { refresh, demo } = usePortal();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const owner = project.role === "Owner";
  const diy = project.managed_by_studio === false;
  if (demo || (owner && !diy)) return null;

  const peso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);

  const askDelete = async () => {
    // A paid site gets a "not refunded" line, with what they actually paid.
    const { data } = await supabase.from("payments").select("amount_centavos").eq("event_id", project.id).eq("kind", "site_publish").eq("status", "paid");
    const paid = (data ?? []).reduce((n, p) => n + (p.amount_centavos as number), 0) / 100;
    setStep({ kind: "confirm", paid });
  };
  const exportGuests = async () => downloadGuestCsv(await api.loadGuests(project), undefined, `${project.name.replace(/[^\w-]+/g, "-")}-guests.csv`);
  const run = async (fn: () => Promise<void>) => {
    setStep({ kind: "working" });
    try {
      await fn();
      await refresh();
      navigate("/account/projects");
    } catch (e) {
      setStep({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong — please try again." });
    }
  };

  return (
    <section className="mt-10 rounded-[22px] border border-[var(--line)] p-5 sm:p-6">
      {step.kind === "confirm" || step.kind === "working" ? (
        owner ? (
          <>
            <p className="text-[16px] font-semibold text-[var(--ink)]">Delete {project.name}?</p>
            <p className="mt-1 max-w-[60ch] text-[14px] text-[var(--slate)]">
              Your website goes offline right away, and its guest RSVPs and photos are removed after 30 days.
              {step.kind === "confirm" && step.paid > 0 ? ` The ${peso(step.paid)} isn’t refunded.` : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <PillButton onClick={exportGuests} disabled={step.kind === "working"}>
                <i className="ri-download-2-line" /> Download guest list
              </PillButton>
              <PillButton tone="danger" onClick={() => run(() => api.deleteProject(project.id))} disabled={step.kind === "working"}>
                {step.kind === "working" ? "Deleting…" : "Delete project"}
              </PillButton>
              <PillButton onClick={() => setStep({ kind: "idle" })} disabled={step.kind === "working"}>
                Cancel
              </PillButton>
            </div>
          </>
        ) : (
          <>
            <p className="text-[16px] font-semibold text-[var(--ink)]">Leave {project.name}?</p>
            <p className="mt-1 text-[14px] text-[var(--slate)]">You won’t see it in your dashboard anymore. The owner keeps it.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <PillButton tone="danger" onClick={() => run(() => api.leaveProject(project.id))} disabled={step.kind === "working"}>
                {step.kind === "working" ? "Leaving…" : "Leave project"}
              </PillButton>
              <PillButton onClick={() => setStep({ kind: "idle" })} disabled={step.kind === "working"}>
                Cancel
              </PillButton>
            </div>
          </>
        )
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-[var(--ink)]">{owner ? "Delete this project" : "Leave this project"}</p>
            <p className="text-[14px] text-[var(--slate)] md:text-[13px]">
              {owner ? "Takes your website offline. Guest RSVPs and photos are removed after 30 days." : "Removes it from your dashboard. The owner keeps it."}
            </p>
            {step.kind === "error" ? <p className="mt-1 text-[13px] text-[#c2412d]">{step.text}</p> : null}
          </div>
          <PillButton tone="danger" onClick={owner ? askDelete : () => setStep({ kind: "confirm", paid: 0 })}>
            {owner ? "Delete project" : "Leave project"}
          </PillButton>
        </div>
      )}
    </section>
  );
}
