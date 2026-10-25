// Mesa → Room & venue → Read the plan for me.
//
// Claude looks at the venue's floor plan (a photo, a screenshot, a scan) and says where
// the room's walls are, what's in it (stage, dance floor, bar, doors, pillars…), where the
// plan already draws tables, and how big the room is if the plan shows a scale or
// measurements. Everything comes back as fractions of the picture; the browser turns
// that into the plan and the host checks it before anything changes. Data, never code.

export const FLOORPLAN_MODEL = "claude-sonnet-5-5";

export const ITEM_TYPES = ["stage", "dance", "buffet", "dj", "bar", "cake", "photo", "entrance", "exit", "gifts", "lechon", "restroom", "pillar", "custom"] as const;

const box = {
  x0: { type: "number", description: "Left edge, 0–1 of the picture's width" },
  y0: { type: "number", description: "Top edge, 0–1 of the picture's height" },
  x1: { type: "number", description: "Right edge, 0–1 of the picture's width" },
  y1: { type: "number", description: "Bottom edge, 0–1 of the picture's height" },
};

const TOOL = {
  name: "read_floor_plan",
  description: "Report what the venue floor plan shows.",
  input_schema: {
    type: "object",
    properties: {
      room: { type: "object", description: "The inside of the walls of the main event room (the hall guests are seated in), not the whole drawing.", properties: box, required: ["x0", "y0", "x1", "y1"] },
      width_m: { type: ["number", "null"], description: "The room's inside width in metres (left to right in the picture), if the plan shows it. Convert feet to metres." },
      depth_m: { type: ["number", "null"], description: "The room's inside depth in metres (top to bottom in the picture), if the plan shows it." },
      size_from: { type: "string", enum: ["dimensions", "scale bar", "table sizes", "unknown"], description: "Where the size came from. Use table sizes only if tables are drawn and nothing else gives a size: a 10-seat round table top is 1.8 m across." },
      items: {
        type: "array",
        description: "Fixed things in or on the edge of the room. Doors are entrance (the main way in) or exit (others). Leave out tables and chairs, furniture that will be moved, and labels that aren't things.",
        items: {
          type: "object",
          properties: { type: { type: "string", enum: ITEM_TYPES }, label: { type: "string", description: "Short label as it should read on the plan, e.g. Stage, Bar, Fire exit, Pillar" }, ...box },
          required: ["type", "label", "x0", "y0", "x1", "y1"],
        },
      },
      tables: {
        type: "array",
        description: "Guest tables already drawn on the plan (the table tops, not the chairs). Empty if none are drawn.",
        items: {
          type: "object",
          properties: { shape: { type: "string", enum: ["round", "long"] }, seats: { type: ["integer", "null"], description: "Chairs drawn around it, if you can count them" }, ...box },
          required: ["shape", "x0", "y0", "x1", "y1"],
        },
      },
      notes: { type: "array", items: { type: "string" }, description: "Up to 3 short things the host should check, in plain words (e.g. 'The plan shows two halls; I used the bigger one'). None if you are sure." },
    },
    required: ["room", "size_from", "items", "tables", "notes"],
  },
};

const SYSTEM = `You read venue floor plans for a wedding and party seating planner in the Philippines. The picture may be an architect's drawing, a venue's sales sheet, a hand sketch or a phone photo of a printout; it may be rotated, cropped or have text in Filipino or English.

Find the main event room (where guests sit at tables) and give the inside of its walls as a box. Then list the fixed things a host plans around: stage, dance floor, buffet, bar, DJ or sound booth, cake table, photo booth, gift table, lechon station, restrooms, doors (entrance for the main way in, exit for the others), and pillars or columns. Give every box in fractions of the whole picture (0 = left/top, 1 = right/bottom), tight around the thing.

If guest tables are drawn, list each one's table top. Count chairs only when you can see them.

For the size: read written dimensions or a scale bar if there is one, and give the room's inside width (left to right in the picture) and depth (top to bottom) in metres. If nothing shows a size but tables are drawn, estimate from them and say size_from "table sizes". Otherwise leave the size null and say "unknown". Never invent a size.

Call read_floor_plan. If the picture isn't a floor plan, call it with an empty items and tables list and a note saying so.`;

export interface PlanRead {
  room: { x0: number; y0: number; x1: number; y1: number };
  width_m: number | null;
  depth_m: number | null;
  size_from: "dimensions" | "scale bar" | "table sizes" | "unknown";
  items: { type: (typeof ITEM_TYPES)[number]; label: string; x0: number; y0: number; x1: number; y1: number }[];
  tables: { shape: "round" | "long"; seats: number | null; x0: number; y0: number; x1: number; y1: number }[];
  notes: string[];
}

const f = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : NaN);
const norm = (b: Record<string, unknown>) => {
  const x0 = f(b.x0), y0 = f(b.y0), x1 = f(b.x1), y1 = f(b.y1);
  if ([x0, y0, x1, y1].some(Number.isNaN)) return null;
  return { x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) };
};
const size = (v: unknown) => (typeof v === "number" && v >= 3 && v <= 200 ? Math.round(v * 10) / 10 : null);

/** Only what the schema allows, inside the picture, at sensible sizes. */
export function cleanRead(raw: unknown): PlanRead | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const room = r.room && typeof r.room === "object" ? norm(r.room as Record<string, unknown>) : null;
  if (!room || room.x1 - room.x0 < 0.05 || room.y1 - room.y0 < 0.05) return null;
  const items = (Array.isArray(r.items) ? r.items : [])
    .slice(0, 60)
    .map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      const b = norm(o);
      const type = ITEM_TYPES.includes(o.type as never) ? (o.type as PlanRead["items"][number]["type"]) : "custom";
      return b ? { type, label: String(o.label ?? "").trim().slice(0, 40) || type, ...b } : null;
    })
    .filter((x): x is PlanRead["items"][number] => !!x);
  const tables = (Array.isArray(r.tables) ? r.tables : [])
    .slice(0, 150)
    .map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      const b = norm(o);
      const seats = typeof o.seats === "number" && o.seats >= 2 && o.seats <= 30 ? Math.round(o.seats) : null;
      return b ? { shape: o.shape === "long" ? ("long" as const) : ("round" as const), seats, ...b } : null;
    })
    .filter((x): x is PlanRead["tables"][number] => !!x);
  const from = ["dimensions", "scale bar", "table sizes"].includes(r.size_from as string) ? (r.size_from as PlanRead["size_from"]) : "unknown";
  return {
    room,
    width_m: size(r.width_m),
    depth_m: size(r.depth_m),
    size_from: from,
    items,
    tables,
    notes: (Array.isArray(r.notes) ? r.notes : []).slice(0, 3).map((n) => String(n).slice(0, 200)),
  };
}

/** The Claude call (separate from auth and limits so it can be tried directly). */
export async function readFloorPlan(image: string, mediaType = "image/jpeg", model = FLOORPLAN_MODEL): Promise<{ read: PlanRead } | { error: string; status: number }> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      ...(process.env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: image } }, { type: "text", text: "Here is the venue's floor plan. Call read_floor_plan." }] }],
    }),
  });
  const out = (await r.json().catch(() => null)) as { content?: { type: string; input?: unknown }[]; error?: { message?: string } } | null;
  if (!r.ok || !out) return { error: `The plan couldn’t be read just now (${out?.error?.message ?? r.status}).`, status: 502 };
  const read = cleanRead(out.content?.find((c) => c.type === "tool_use")?.input);
  if (!read) return { error: "We couldn’t find a room in that picture. Try a clearer photo or screenshot of the floor plan.", status: 422 };
  return { read };
}
