import type { PickedFile } from "./components/FileDrop";
import { visitSource } from "@/lib/signupRef";

const FORM_ENDPOINT = "/api/enquire";

type Values = Record<string, string | string[]>;

/** What the server reports back: `omitted` lists files it couldn't attach. */
export type InquiryResult = { ok?: boolean; omitted?: string[] };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function post(body: unknown) {
  const res = await fetch(FORM_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as InquiryResult & { error?: string };
  return { res, data };
}

export async function submitInquiry(
  values: Values,
  files: PickedFile[] = [],
  meta: Record<string, string> = {},
): Promise<InquiryResult> {
  const attachments = await Promise.all(
    files.map(async (p) => ({
      filename: p.file.name,
      size: p.file.size,
      content: await fileToBase64(p.file),
    })),
  );
  const website = meta.website ?? "";
  // Where they came from (Studio → Leads and planner commissions). A code typed
  // into the form wins over a planner's link.
  const v = visitSource();
  const typed = String(values.partner_code ?? "").trim().toUpperCase();
  values = {
    ...values,
    source: typed ? "partner" : v?.source ?? "direct",
    ...(v?.detail && !typed ? { source_detail: v.detail } : {}),
    ...(typed || v?.partner ? { partner_code: typed || v!.partner } : {}),
  };

  let { res, data } = await post({ form: meta.form, values, attachments, website });

  // The host rejects request bodies over ~4.5 MB before our API sees them (413). The
  // picker keeps uploads well under that, but never lose the inquiry over its files:
  // send it again without them, and say which files didn't make it.
  if (res.status === 413 && attachments.length) {
    const names = attachments.map((a) => a.filename);
    ({ res, data } = await post({
      form: meta.form,
      values: { ...values, files_not_attached: names.join(", ") },
      attachments: [],
      website,
    }));
    if (res.ok) return { ...data, omitted: names };
  }

  if (!res.ok) throw new Error(data.error ?? "Failed to submit inquiry");
  return data;
}
