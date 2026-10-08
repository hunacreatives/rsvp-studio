import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Studio → Templates → Import design with AI.
//
// The browser has already MEASURED the design (text boxes + colours, by
// diffing a with-text and a text-free export). Claude only makes the
// judgment calls a person would: what each piece of text is (names, date,
// venue, fixed wording), which Google Fonts match, the colour roles, and
// which standard sections follow the design. Its answer is data that the
// Studio turns into a template file and validates — never code.

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const MODEL = "claude-sonnet-5-5";

// Keep in step with src/pages/wedding-sites/spec/bindings.ts (REPEATING).
const REPEATING: Record<string, { max: number; parts: string[] }> = {
  schedule: { max: 8, parts: ["label", "time", "description", "place"] },
  faqs: { max: 8, parts: ["question", "answer"] },
  travel: { max: 6, parts: ["title", "body"] },
  stay: { max: 4, parts: ["name", "address", "notes"] },
  people: { max: 12, parts: ["name", "role"] },
  registry: { max: 4, parts: ["store"] },
  story: { max: 4, parts: ["text"] },
};
const FIELDS = [
  "hosts.names", "hosts.0.name", "hosts.1.name", "eventDate", "venue.name", "venue.address", "venue.nameOrAddress", "story.first",
  ...Object.entries(REPEATING).flatMap(([g, r]) => Array.from({ length: r.max }, (_, i) => r.parts.map((p) => `${g}.${i}.${p}`)).flat()),
];
const VISIBILITY = ["hero", "hostIntro", "schedule", "venue", "gallery", "accommodations", "travelInformation", "registry", "faqs", "rsvp"];
const BLOCKS = ["story", "keyPeople", "schedule", "venue", "gallery", "registry", "faqs", "rsvp", "footer"];
const hexColor = { type: "string", pattern: "^#[0-9a-fA-F]{6}$" };
const font = {
  type: "object",
  required: ["family", "fallback", "weights", "italic"],
  properties: {
    family: { type: "string", description: "Google Fonts family name" },
    fallback: { type: "string", enum: ["serif", "sans-serif", "cursive"] },
    weights: { type: "array", items: { type: "integer" }, maxItems: 4 },
    italic: { type: "boolean" },
    alternatives: { type: "array", items: { type: "string" }, maxItems: 3, description: "Up to 3 other Google Fonts that could also be this face" },
  },
};

const TOOL = {
  name: "build_template",
  description: "Describe how to turn the design into an editable website template.",
  input_schema: {
    type: "object",
    required: ["eventTypes", "paletteLabel", "palette", "fonts", "radius", "layers", "sections", "notes"],
    properties: {
      eventTypes: { type: "array", items: { type: "string", enum: ["wedding", "birthday", "anniversary", "other"] } },
      paletteLabel: { type: "string", description: "2–3 word colour name, e.g. 'Burgundy & Cream'" },
      palette: {
        type: "object",
        required: ["bg", "surface", "ink", "muted", "accent", "onAccent"],
        properties: { bg: hexColor, surface: hexColor, ink: hexColor, muted: hexColor, accent: hexColor, onAccent: hexColor },
      },
      fonts: { type: "object", required: ["display", "body"], properties: { display: font, body: font, accent: font, extra: font } },
      radius: { type: "string", enum: ["none", "soft", "round"] },
      layers: {
        type: "array",
        items: {
          type: "object",
          required: ["boxes", "lines", "role", "font", "weight", "italic", "uppercase", "align", "letterSpacing", "hostCount"],
          properties: {
            boxes: { type: "array", items: { type: "integer" }, description: "Box numbers in this piece of text, top to bottom" },
            lines: { type: "array", items: { type: "string" }, description: "Exact visible text of each box, same order" },
            role: { type: "string", enum: ["field", "static", "ignore"] },
            field: { type: "string", enum: FIELDS },
            format: {
              type: "string",
              description: "hosts.names: joined|stacked|first. eventDate: long|medium|numeric|day|month|monthShort|year|weekday|time|timePadded|time24. schedule.N.time: time|timePadded|time24|medium",
            },
            joiner: { type: "string", description: "hosts.names joined: the word between names, e.g. '&' or 'and'" },
            font: { type: "string", enum: ["display", "body", "accent", "extra"] },
            weight: { type: "integer" },
            italic: { type: "boolean" },
            uppercase: { type: "boolean" },
            align: { type: "string", enum: ["left", "center", "right"] },
            letterSpacing: { type: "number", description: "em; 0 normal, 0.1–0.3 widely tracked caps" },
            hostCount: { type: "string", enum: ["any", "two"] },
            editorHint: { type: "string", description: "Short placeholder for an empty field, e.g. 'First name'" },
          },
        },
      },
      sections: {
        type: "array",
        items: {
          type: "object",
          required: ["block", "band", "divider"],
          properties: {
            block: { type: "string", enum: BLOCKS },
            heading: { type: "string" },
            band: { type: "string", enum: ["bg", "surface"] },
            divider: { type: "string", enum: ["none", "line", "leaf", "dots"] },
          },
        },
      },
      photos: {
        type: "array",
        description: "P-boxes that are photographs customers should replace with their own, most important first",
        items: { type: "object", required: ["p"], properties: { p: { type: "integer" }, hint: { type: "string", description: "e.g. 'Couple photo'" } } },
      },
      bands: {
        type: "array",
        description: "One entry per B-band (long designs only): which part of the website it is",
        items: { type: "object", required: ["b", "key"], properties: { b: { type: "integer" }, key: { type: "string", enum: VISIBILITY } } },
      },
      notes: { type: "array", items: { type: "string" }, maxItems: 6 },
    },
  },
};

const SYSTEM = `You turn an invitation design into a template for The RSVP Studio's "Build Your Website" builder, where customers type their own details into the design.

You see the design with numbered magenta boxes around every piece of text the designer made editable. Their positions, sizes and colours are already measured precisely — you decide what each one IS.

Layers
- Group boxes that form one piece of text (a multi-line address, a heading split across boxes) into one layer. Every box that is text belongs to exactly one layer. List boxes top to bottom with "lines" = the exact visible text of each box.
- A box that isn't text (a dot, a line, a bit of illustration): leave it out of "layers" entirely — it stays part of the artwork.
- role "field" = text that changes for each customer:
  - hosts.names: all names as one piece of text (format joined | stacked | first; joiner "&" or "and").
  - hosts.0.name / hosts.1.name: when the two names are separate pieces of text. Give the "&"/"and" between them its own static layer. Mark these three hostCount "two" (a single-host fallback is added automatically).
  - eventDate: one layer per piece when the date is split (format day | month | monthShort | year | weekday | time | long | medium | numeric). A separate time line is eventDate + time.
  - venue.name, venue.address, venue.nameOrAddress (use this when only one venue line is shown), story.first (a paragraph about the couple/celebrant).
  - Repeating details are numbered from 0, top to bottom / left to right:
    schedule.N.label / .time / .description / .place (a timeline or itinerary row: "Ceremony — 4:00 PM"),
    faqs.N.question / .answer, travel.N.title / .body, stay.N.name / .address / .notes (accommodations),
    people.N.name / .role (wedding party), registry.N.store, story.N.text (story paragraphs).
    A paragraph spanning several boxes is ONE layer. Prefer these fields over static text whenever the wording is clearly the couple's own details (a sample FAQ, travel note or itinerary) rather than design wording ("About the Wedding").
- role "static" = wording that stays the same on every customer's site ("Together with their families", "Wedding Invitation", "Save the date", "Reception to follow").
  If static text holds details a customer would need to change (parents' names, a dress code, an RSVP deadline), keep it static and say so in notes.
- role "ignore" = a box that isn't real text (a stray artefact).
- uppercase: true when set in all caps. letterSpacing in em. align: how the text is aligned in the design.
- font: which face the text is set in. "display" = the decorative/script/headline face (usually the names), "body" = the main text face, "accent" and "extra" = any other clearly different faces (e.g. a bold display serif for the date, a sans-serif for small details). Only use accent/extra when the design really has a 3rd/4th face.

Fonts: for each face you used (display, body, and accent/extra if needed) give your best Google Fonts family plus up to 3 "alternatives" — they are test-rendered against the real letters and the closest wins, so include genuinely different plausible faces. Families that best match what you see (e.g. Great Vibes, Pinyon Script, Parisienne, Allura, Cormorant Garamond, Playfair Display, EB Garamond, Montserrat, Lato). Include the weights used.

Palette (for the website around and below the design): bg = the design's main background tone, surface = a nearby tint for alternating bands, ink = main text colour, muted = secondary text, accent = buttons/links, onAccent = text on accent. Ink on bg and onAccent on accent need at least 4.5:1 contrast.

Photos (P-boxes, drawn in cyan): list the ones that are photographs of people or places that each customer will replace with their own. Frames, tape, stamps, flowers, stickers, illustrations and textures are NOT photos.

Bands (long designs only, B-boxes): say which part of the website each band is, using hero, hostIntro (story/about the couple), schedule (itinerary, the day's details), venue, gallery, accommodations, travelInformation, registry, faqs, rsvp.

Sections: the standard sections that follow the design on the website, in order, with headings in the design's voice. Wedding: story, keyPeople, schedule, venue, gallery, registry, faqs, rsvp, footer. Birthday: schedule, venue, gallery, faqs, rsvp, footer. Leave out anything the design itself already shows (a long design with its own FAQ band needs no faqs section). Always end with rsvp (the reply form), then footer (no heading). Alternate band bg/surface. divider: leaf for floral/botanical, dots for playful, line otherwise.

Notes: up to 6 short plain-English things staff should double-check (uncertain font matches, guesses). No notes about things you are sure of.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "AI import isn't set up yet (ANTHROPIC_API_KEY is missing)." });

  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data?.user) return res.status(401).json({ error: "Not signed in" });
  const { data: profile } = await supabaseAdmin.from("profiles").select("is_staff").eq("id", data.user.id).single();
  if (!profile?.is_staff) return res.status(403).json({ error: "Staff only" });

  const body = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body) as DesignInput;
  const out = await analyseDesign(body);
  if ("error" in out) return res.status(out.status).json({ error: out.error });
  return res.status(200).json(out);
}

export interface DesignInput {
  tiles?: unknown;
  boxes?: unknown;
  width?: number;
  height?: number;
  hint?: string;
  /** "svg": boxes were found from the file's structure and may include non-text. */
  mode?: "images" | "svg";
  pictures?: unknown;
  bands?: unknown;
}

/** The Claude call itself (separate from auth so it can be tested directly). */
export async function analyseDesign(body: DesignInput, model = MODEL): Promise<{ result: unknown; usage?: unknown } | { error: string; status: number }> {
  const tiles = Array.isArray(body.tiles) ? body.tiles.filter((t): t is string => typeof t === "string").slice(0, 8) : [];
  const boxes = Array.isArray(body.boxes) ? body.boxes.slice(0, 200) : [];
  if (!tiles.length || !boxes.length) return { error: "Nothing to analyse.", status: 400 };
  const content = [
    ...tiles.map((data) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })),
    {
      type: "text",
      text: [
        `The design is ${body.width}×${body.height}px${tiles.length > 1 ? `, shown top to bottom in ${tiles.length} overlapping slices` : ""}.`,
        body.mode === "svg"
          ? "These boxes were found from the design file's structure. Nearly all are text, but a few may be dots, lines or bits of illustration — leave those out of layers."
          : "",
        `Measured text boxes (x, y, w, h as fractions of the design; colour of the text):`,
        JSON.stringify(boxes),
        Array.isArray(body.pictures) && body.pictures.length
          ? `Pictures in the design (P-boxes; format jpeg usually means a photograph):\n${JSON.stringify(body.pictures.slice(0, 40))}`
          : "",
        Array.isArray(body.bands) && body.bands.length ? `Bands of this long design, top to bottom (y0–y1 as fractions):\n${JSON.stringify(body.bands.slice(0, 20))}` : "",
        body.hint ? `Note from staff: ${String(body.hint).slice(0, 300)}` : "",
        "Call build_template.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      // User-linked keys (sk-ant-usr…) must name the workspace on every request.
      ...(process.env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
      system: SYSTEM,
      tools: [TOOL],
      // Newer models don't accept a forced tool choice; the prompt asks for
      // the tool and a reply without it is treated as a failure below.
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content }],
    }),
  });
  const out = (await r.json().catch(() => null)) as {
    content?: { type: string; input?: unknown }[];
    error?: { message?: string };
    usage?: { input_tokens: number; output_tokens: number };
  } | null;
  if (!r.ok || !out) return { error: `The AI request failed: ${out?.error?.message ?? r.status}`, status: 502 };
  const result = out.content?.find((c) => c.type === "tool_use")?.input;
  if (!result) return { error: "The AI didn't return a template.", status: 502 };
  return { result, usage: out.usage };
}
