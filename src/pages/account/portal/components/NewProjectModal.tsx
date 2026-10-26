import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateEventModal from "../../components/CreateEventModal";
import { usePortal } from "../PortalContext";
import { isCoordinator } from "../types";
import { Modal } from "../ui";

/**
 * "New Project" has three real paths: hire the studio (inquiry), build it
 * yourself (self-serve site builder), or link a project the studio already
 * set up for you (invite code). And "Add a client", for anyone planning for someone else
 * (theirs to hand over; supabase/coordinator-desk.sql): first for coordinators, last for others.
 */
export default function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { profile, projects } = usePortal();
  const [selfServe, setSelfServe] = useState<false | "own" | "client">(false);

  if (selfServe)
    return (
      <CreateEventModal
        forClient={selfServe === "client"}
        onClose={() => {
          setSelfServe(false);
          onClose();
        }}
      />
    );

  // Anyone can plan for someone else: coordinators see it first, everyone else last.
  const coordinator = isCoordinator(profile, projects);
  const addClient = (
    <Choice icon="ri-user-add-line" title="Add a client" body="Planning for someone else? Set up their event, then hand it over when they’re ready." onClick={() => setSelfServe("client")} />
  );
  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <Modal open={open} onClose={onClose} title="Start a new event" width={560}>
      <div className="grid gap-3">
        {coordinator ? addClient : null}
        <Choice
          icon="ri-sparkling-2-line"
          title="Work with our studio"
          body="Tell us about your celebration and we’ll design it with you, start to finish."
          onClick={() => go("/enquire#start")}
        />
        <Choice
          icon="ri-layout-masonry-line"
          title="Build it yourself"
          body="Pick a template, add your details, and publish your event site today."
          onClick={() => setSelfServe("own")}
        />
        <Choice
          icon="ri-key-2-line"
          title="I have an invite code"
          body="Link an event our team already set up for you."
          onClick={() => go("/account/onboarding")}
        />
        {coordinator ? null : addClient}
      </div>
    </Modal>
  );
}

export function Choice({ icon, title, body, onClick }: { icon: string; title: string; body: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 rounded-2xl border border-[var(--line)] p-4 text-left transition-colors hover:border-[var(--ink)]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--paper)] text-xl text-[var(--ink)]">
        <i className={icon} />
      </span>
      <span>
        <span className="block font-semibold text-[var(--ink)]">{title}</span>
        <span className="mt-0.5 block text-[14px] text-[var(--slate)]">{body}</span>
      </span>
      <i className="ri-arrow-right-line ml-auto self-center text-lg text-[var(--slate)]" />
    </button>
  );
}
