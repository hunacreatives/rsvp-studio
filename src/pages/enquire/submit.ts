import type { PickedFile } from "./components/FileDrop";

const FORM_ENDPOINT = "/api/enquire";

type Values = Record<string, string | string[]>;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function submitInquiry(
  values: Values,
  files: PickedFile[] = [],
  meta: Record<string, string> = {},
) {
  const attachments = await Promise.all(
    files.map(async (p) => ({
      filename: p.file.name,
      size: p.file.size,
      content: await fileToBase64(p.file),
    })),
  );

  const res = await fetch(FORM_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ form: meta.form, values, attachments }),
  });

  if (!res.ok) throw new Error("Failed to submit inquiry");
  return res.json();
}
