# Template Builder — Decision Log

Terse by design: one entry per decision a future engineer could otherwise
accidentally reverse. Newest at top. See the full architecture plan for
detailed reasoning if you need it.

## Self-serve event creation uses a new shared `rsvps` table, not per-event dynamic tables
- Decision: Self-serve-created events leave `events.table_name` null and
  store RSVPs in a new normalized `rsvps(event_id, name, email, message,
  created_at)` table instead. Legacy events (`francesjash_rsvps`,
  `tercel_rsvps`, any future staff-provisioned event) keep their existing
  per-event table untouched. `api/wedding-rsvp.ts` and `EventsSection`'s
  guest-list query both branch on whether `table_name` is set.
- Why: A browser can't run `CREATE TABLE`. Self-serve creation needs RSVP
  storage to exist the instant an event is created; the old
  one-table-per-event pattern only works when a human provisions it by
  hand. Confirmed with the user over the alternative (a database function
  doing dynamic DDL per event) — this keeps zero dynamic SQL and zero risk
  to existing data.

## Creating an event immediately seeds its `wedding_sites` draft
- Decision: `useCreateEvent` inserts the `events` row AND a `wedding_sites`
  row in the same flow, seeding `draft_content.hosts` /
  `.eventDate` / `.primaryLocation.name` straight from the quick-start
  form's answers (same `EventContent` shape the builder already uses).
- Why: Avoids asking for the same names/date/venue twice; the couple lands
  on the template gallery with real content already flowing through every
  template's preview instead of a blank draft.

## Template gallery cards show a live-styled mockup, not a photo or a broken-image fallback
- Decision: `TemplateMockupPreview` renders a small static DOM snippet
  using each template's real `resolveEventTheme()` colors/fonts (fake nav
  labels, host-name text, date line, RSVP pill) instead of
  `previewThumbnailUrl` (which pointed at images that don't exist yet).
- Why: No image/screenshot asset pipeline exists yet; a mockup built from
  the template's actual theme is honest about what it looks like, unlike
  a generic placeholder box. `previewThumbnailUrl` still exists on
  `TemplateDefinition` and can be preferred once real screenshots exist —
  zero data-model change needed then.

## Known future constraint: free vs. premium templates (not yet enforced)
- Decision: `TemplateDefinition.tier?: "free" | "premium"` exists and every
  template sets it explicitly (`editorial-formal` is `"free"`); the
  gallery shows a cosmetic "Premium" badge when set. Selecting a premium
  template is NOT currently blocked — there's no billing to check against.
- Why noted here anyway: product intent is a freemium template catalog.
  The declarative field exists now so premium templates can be added
  later without a registry/contract change; the actual gate (block
  selection/publish unless subscribed) is future work, enforced wherever
  `useEventSiteDraft`'s save/publish or the gallery's `chooseTemplate`
  runs, once a plan/billing concept exists.

## Known future constraint: one site build per account on the free tier (not yet built)
- Decision: Not implemented. No billing/subscription/plan concept exists
  anywhere in this codebase today, and none is being added preemptively.
- Why noted here anyway: the product intent is that unpaid accounts will
  eventually be limited to exactly one site build, with more requiring a
  subscription. The gate point is marked with a comment in
  `useEventSiteDraft.ts` right before a new `wedding_sites` row is
  created — that's where a "does this account already have a site, and
  are they unsubscribed?" check belongs once billing exists. Nothing about
  the current architecture (one `wedding_sites` row per `event`, accounts
  can link multiple events) blocks adding that check later; it's a small,
  additive gate, not a rearchitecture.

## Generalized from "wedding" to any event type (weddings, birthdays, etc.)
- Decision: Canonical content is `EventContent` with `hosts: Person[]` (a
  list, not a fixed couple pair). UI copy says "Event"/"Host(s)", matching
  the existing `events` table naming already used in the account portal.
  Public route is `/invite/:slug` (was `/w/:slug`); dev harness is
  `/internal/event-site-preview` (was `/internal/wedding-preview`).
- Why: RSVP Studio's real reference sites (tercelat41, francesjash) are
  birthdays, not weddings — locking the schema/copy/routes to "wedding"
  was too narrow for what the product actually needs to support.
- Note: the underlying Supabase table is still named `wedding_sites`
  (an internal identifier, never user-facing, already run against
  production with zero rows at stake) — a purely cosmetic rename to
  `event_sites` is an easy additive follow-up if wanted, not done here to
  avoid a second manual SQL step for no functional gain. Same reasoning
  for the `src/pages/wedding-sites/` folder name.

## Engine + live site live inside rsvp-studio's Vite SPA, not a separate app
- Decision: New routes and tables live in this repo; no per-event Next.js
  deployment.
- Why: `events`, `profiles`, and auth already live here — a second
  per-event deployment is exactly the one-off pattern this feature exists
  to replace.

## Template selection is its own page, not a dropdown inside the builder
- Decision: `/account/events/:eventId/site-builder` is a template gallery
  (cards, "Use this template"); the actual content/design editor lives one
  level deeper at `.../site-builder/edit`. A top-level "Website" item in
  the account sidebar links straight to the gallery.
- Why: A dropdown buried under Profile → My Events → Edit Website was the
  wrong information architecture for the primary action of the whole
  feature — picking a template needed to feel like the entry point, not a
  setting.

## Content and presentation are two separate jsonb payloads
- Decision: `wedding_sites.draft_content` / `draft_presentation`, mirrored
  by `published_content` / `published_presentation`.
- Why: Editing a venue address must never touch template config, and
  switching templates must never touch content.

## Presentation settings are stored per-template, keyed by template id
- Decision: `presentation.byTemplate[templateId]`, created lazily from the
  template's `defaultSettings`, never deleted when the host(s) switch away.
- Why: Switching templates must not lose the host(s)' prior template's
  settings — this is table stakes per the research (competitors market it
  as a headline feature).

## No validation library added (no zod)
- Decision: Hand-written `normalizeEventContent()` at the two real
  runtime boundaries (fixture load, Supabase row read); TS interfaces
  otherwise.
- Why: No schema library exists anywhere in this repo today; this is
  builder/host-authored content, not arbitrary third-party input.
  Revisit if a second real need (e.g. builder form validation) appears.

## ImageAsset stores master + normalized focal point, no baked-in aspect ratio
- Decision: `{ masterUrl, width, height, alt, focalPoint: {x, y} }`, no
  `crop` field in V1.
- Why: Different templates need different crop shapes from the same
  source image without re-upload; baking in a ratio would break template
  swaps the moment a second archetype needs a different hero shape.

## Gallery is an ordered list of items with per-item metadata, not a flat array
- Decision: `Gallery.items: GalleryItem[]` with an explicit `order` and an
  optional `layoutHint`.
- Why: Editorial/botanical archetypes need sequencing and per-image role;
  a flat unordered array can't recover that later without a breaking
  reshape (see the archetype-stress-test in the research doc).

## RSVP stays on the existing per-event dynamic-table pattern
- Decision: `api/wedding-rsvp.ts` is one generic function that resolves
  the event's actual RSVP table server-side from `slug`; no new
  normalized `rsvps` table.
- Why: Reuses the proven insert + double-email pattern from
  `tercelat41/app/api/rsvp/route.ts` without inventing a second RSVP
  engine, and keeps the existing account-dashboard `GuestTable` working
  unmodified (it already reads by `events.table_name`).

## Bug fix: template selection silently reverted on reload (stale closure)
- Bug: `TemplateGalleryPage.chooseTemplate` called `setPresentation(...)`
  then immediately `await save()`. `save` is a `useCallback` closing over
  `presentation` from the hook's current render — since `setPresentation`
  only *schedules* the update, `save()` ran with the pre-update
  `presentation` still in its closure, persisting the OLD
  `activeTemplateId` to `wedding_sites.draft_presentation`. The gallery
  UI showed the new template as "Selected," but reloading the editor (a
  fresh `useEventSiteDraft` instance re-reading from Supabase) rendered
  whatever was selected before — observed as clicking "Botanical" and
  landing on "Editorial Formal."
- Fix: `save()` (and by extension `publish()`) in `useEventSiteDraft.ts`
  now accepts an optional `{ content?, presentation? }` override;
  `chooseTemplate` computes the new `PresentationState` value explicitly
  and passes it directly to `save({ presentation: nextPresentation })`
  instead of relying on state-update timing.
- Why this matters generally: any caller that calls `setState` then
  immediately calls a memoized callback closing over that same state, in
  the same synchronous function, hits this. Worth checking for the same
  pattern before adding new "select X then immediately persist X" flows.

## Scrapbook template: art-directed collages, fixed tones, container queries
- Decision: `templates/scrapbook/` is a full-bleed, eight-band long-form
  page rebuilt from a Canva "Dark Red Beige Romantic Scrapbook" website
  export, with template-owned primitives (`Polaroid`, `StationeryCard`,
  `Envelope`, `Flower`, `CollageItem`) rather than generic shared
  components, and one injected stylesheet (`styles.ts`) instead of
  inline styles.
- Collages: each piece is a deterministic percentage position on a
  fixed-ratio canvas that un-stacks into a single column below an
  860px container width. Rotations are fixed constants, never
  randomised — random tilts would also change on every re-render, which
  is visibly unstable while editing.
- Tones are PINNED per band to the reference (red → beige → red → …)
  rather than computed by alternation. Content the reference has no
  band for rides inside an existing band (key people inside the story
  band) or is appended last (overflow photo board), so an optional
  section can never shift a named section onto the wrong background.
- Sizing uses CONTAINER query units (`cqw`) and `@container`
  breakpoints, not `vw`/media queries. The builder renders templates
  inside a scaled 1024px preview canvas (`builder/components/PreviewCanvas`),
  so viewport units would measure the browser window rather than the
  template's own width and the preview would not match the published
  page.
- Photos resolve through a named-slot resolver (`content.ts`'s
  `resolvePhotoSlots`) — sections ask for `slots.hero`, never
  `galleries[0].items[3]` — with leftovers flowing to an optional
  gallery board. Master images are untouched; cropping is CSS
  `object-fit` plus each asset's own `focalPoint`.
- The envelope is built in CSS, not extracted: both envelopes in the
  reference are partly occluded by cards and photos, so there is no
  clean cutout to lift.
- RSVP keeps the identical submission contract (POST /api/wedding-rsvp
  with slug/name/email/message); only its presentation changed — a
  burgundy RSVP card in the closing collage opens a stationery dialog,
  so the published page keeps the collage instead of parking a large
  web form in it.

## Bug fix: two flower assets were cropped mid-flower, envelope was CSS
- Bug: `flower-sprig-green.webp` (the yellow bloom cluster used in the
  final RSVP collage) and `flower-sprig-yellow.webp` (the dried cluster)
  were both crops taken this session that cut straight through real
  petals/leaves — visible as a hard rectangular edge slicing the
  flower. This was an asset problem, not a CSS one: no amount of parent
  `overflow` change fixes an image that is itself missing pixels.
- Fix: re-extracted both from the source render with generous margins.
  The yellow bloom overlaps BOTH the page's beige paper AND the
  envelope in the source, so a single-color key couldn't isolate it —
  fixed with a two-anchor (beige + envelope-tone) minimum-distance key.
  The dried cluster's stem is partly occluded by a photo and a card in
  the source; those corners are masked out by fixed region (their
  colours are too close to the flower's own warm-brown palette for a
  color key to separate) rather than reconstructed, since the source
  itself doesn't show more stem there (occluded, not cropped by us).
- The envelope (`components.tsx`'s `Envelope`) was a CSS approximation
  (flat colour flap, `clip-path` triangle, radial-gradient fringe for
  the lace). Replaced with `envelope.webp`, extracted from the source:
  the envelope's flat body colour sits almost exactly on the page's own
  beige (see the two sampled tones in git history), so — same lesson as
  the flowers — a color-distance key could not separate body from
  background at any threshold. Used a hand-traced polygon silhouette
  instead (extracts real pixels bounded by shape, not color), and since
  both source instances have their right flap slope occluded (a card in
  one, a flower stem in the other), mirrored the fully-visible left
  slope onto the right — valid because the flap is bilaterally
  symmetric by construction. Real paper texture, fold-line shading and
  the scalloped lace trim are preserved from the photograph; nothing is
  redrawn.
- Layering fix in the final RSVP collage: flowers were behind the
  stationery cards (`z` values didn't follow the reference's back-to-
  front order — envelope, photo, cards, THEN botanicals on top). Given
  explicit z values matching that order; no stacking-context bug found
  once positioned correctly (each CollageItem is a sibling in the same
  stacking context, so z-index compares directly between them
  regardless of `transform: rotate()` on a card/photo's own child).
- Positioning fix, same section: the real envelope asset is much taller
  relative to its width (229:345) than the old flatter CSS shape was,
  so at its original box size/position its flap ended up almost
  entirely behind the RSVP card and the photo. Narrowed its footprint
  to match its real proportions and raised it slightly so the flap
  clears both neighbours, the way it does in the reference — this is a
  position/size tune of the existing composition, not a redesign.

## Bug fix: `.sb-sec{overflow:hidden}` was clipping collage compositions
- Bug: every Scrapbook section had `overflow:hidden`, added for vague
  horizontal-scroll safety. It has no effect on normal-flow content, but
  any collage card, envelope or flower positioned via
  `.sb-collage__item{position:absolute}` that extended even slightly
  past its `.sb-collage`'s own `aspect-ratio` box got hard-clipped at
  the section boundary — the Date/Venue and RSVP collages' lower cards
  being sliced at the red/beige transition.
- Fix: removed `overflow` from `.sb-sec` entirely. Horizontal
  containment is handled once, at the page level (`.sb-root{overflow-
  x:hidden}`); sections themselves never clip. `.sb-pol__win` keeps its
  own `overflow:hidden` — that one is correct, since it's the actual
  photo aperture where `object-fit: cover` is supposed to crop.
- Verified with a temporary dev-only measurement pass (querying every
  `.sb-collage__item`'s `getBoundingClientRect()` against its collage's
  and section's bounds, gated behind `?qa=1` on the harness, removed
  after use — not shipped) at 1440/1024/768/390: zero unintended
  overflow. The only flagged case was the final collage's photo rising
  17px above its own collage box, which is the intentional layered
  overlap and stays inside the section's own padding.
- Why simply removing the clip wasn't enough on its own: sections have
  opaque backgrounds, so a card that genuinely overflowed its collage's
  height would just get painted over by the next section instead of
  clipped — same visual bug, different mechanism. The collages' actual
  spacing (tuned in the prior polish pass) already keeps every element
  inside its own section's bounds; removing the clip was what let that
  correct spacing actually render instead of being cut regardless.

## Templates can ship `demoContent`; the gallery renders the real thing
- Decision: `TemplateDefinition.demoContent?: EventContent`. The gallery
  card renders the template's ACTUAL component with that content,
  scaled and clipped, instead of a schematic mockup. Templates without
  demo content keep the mockup fallback.
- Why: a collage template previewed against an empty draft shows
  placeholders, not design — nobody can judge it. Demo content is never
  written to an event and never merged into client data.
- Gallery cards became `div role="button"` rather than `<button>`,
  since a real template render contains its own buttons and nesting
  interactive elements is invalid HTML.

## Scrapbook photos declare a placement preset, not ad-hoc geometry
- Decision: `POLAROID_PRESETS` (hero, venue, venueSmall, storyLeft,
  storyRight, travel, final, person) fixes each placement's aspect,
  rotation, tape and frame style; call sites pass `preset="storyLeft"`.
- Why: every photo had drifted to the same size/tilt/shadow, which read
  as one duplicated component rather than a handmade board. Presets are
  constants — never randomised, so nothing shifts between renders.

## Desktop-only collage filler is dropped when stacked
- Decision: `CollageItem` has `filler` (the envelope, the stamp). It's
  hidden below the 860px container breakpoint.
- Why: stacked, those purely-compositional pieces each occupied most of
  a phone screen while saying nothing. Photos, cards and small
  botanicals still stack; the composition is recomposed rather than
  shrunk.

## Builder previews get `editorPreview`; published pages never do
- Decision: `TemplateProps` gained an optional `editorPreview` flag,
  passed only by the builder shell (and the dev harness's "Editor mode"
  toggle). Templates use it to render editor-only affordances — "Add
  your story" hints, empty Polaroid frames — so a half-filled draft
  still shows the page's real structure.
- Why: hiding every empty section is right for a published site but
  wrong while editing. A new draft (two host names and a venue, nothing
  else) collapsed the Scrapbook template from nine bands to three,
  which read as "the template is broken" rather than "this content
  isn't written yet".
- Published pages don't pass the flag, so these affordances can never
  reach a real guest.

## Section tones self-repair when bands are hidden
- Decision: after filtering hidden bands, any band whose tone repeats
  its predecessor's is flipped.
- Why: tones are pinned to the reference, but hiding sections can put
  two beige bands side by side — a sparse published draft rendered the
  details collage and the RSVP collage as one continuous beige slab.
  With every band present the canonical order never repeats, so this is
  a no-op and the reference rhythm is preserved exactly.

## Dev fixtures: one complete, one deliberately sparse
- Decision: `isabella-and-mateo` (two hosts, story, date, venue, four
  schedule items, two stays, travel info, nine photos, four key people,
  two registry links, five FAQs) and `sparse-draft` (the barely-filled
  state right after event creation).
- Why: a collage-heavy template judged only against complete content
  hides exactly the failure mode that matters — the Scrapbook template
  looked finished while most of its sections were quietly collapsed.
  Check new templates against both, with the editor toggle on.

## Bug fix: "getting married in {venue}" used the wrong semantic field
- Bug: the hero's location clause and the registry line read
  `primaryLocation.name`, which is the VENUE name — so an event whose
  venue field held a person's name rendered "getting married … in
  Francis".
- Fix: `deriveLocality()` reads the town/city out of
  `primaryLocation.addressLine` ("482 Orchard Lane, Hudson Valley, NY"
  → "Hudson Valley") and returns null when the address has no
  structure to read. Callers drop the clause entirely rather than
  substituting the venue name.

## Design-import tool: OCR + inpaint, not SVG-text reverse-engineering or color-keying
- Decision: `scripts/design-import/` (standalone Python CLI, not part of
  the Vite app) automates what was previously hand-built for
  `templates/botanical/`: rasterize the source SVG → OCR text detection
  (docTR local default, Google Vision opt-in) → LaMa/IOPaint inpainting
  to remove detected text → human-reviewed region crops with feathered
  edges → `extraction-report.json` (recovered text + art region hints).
  It does NOT attempt to detect "this SVG path cluster used to be
  `<text>`" from outlined vector paths — research (5 agents, see the
  plan doc in this session's history) found no reliable general way to
  do that. It also does NOT auto-map recovered text onto `EventContent`
  fields or auto-segment art regions from scratch — those stay
  human-reviewed for now (AHA: revisit once we've run this against 2-3
  more real designs and see the actual patterns worth automating).
- Why: The hand-built approach's two real bugs (ghosted text-edge
  pixels, since anti-aliased glyph edges sit ON the color line between
  text and background color; and pale-pink flower petals getting
  destroyed by the same color-distance keying, since blush sits close to
  that same line) are structurally impossible for a geometry-based mask
  + inpaint approach — inpainting doesn't care about color similarity
  between text and art.
- Verification: re-ran against `fixtures/1.svg` (the exact design
  `templates/botanical/` was built from by hand). Confirmed: (1) full
  floral fidelity preserved, including the pale pink petals lost by
  hand; (2) all baked text cleanly removed (host names, "Wedding
  Invitation", the four order-of-events labels) with no ghosting; (3)
  one real remaining limitation — LaMa leaves a faint same-hue smudge
  filling large solid-color regions behind removed oversized display
  text (e.g. the "23" date numeral), a known LaMa limitation on flat
  fills, not a ghosting/color-keying bug; cosmetically trivial, deferred
  as a v2 item (SD inpainting escalation) rather than fixed now.
- Unexpected finding: the tool's output (`full-clean.webp`, a full
  opaque background with text removed) suggests a SIMPLER real template
  architecture than what was hand-built — a single background-image
  layer with real text overlaid directly, rather than the hand-built
  approach's separate arch-shaped CSS fill + floating transparent
  floral-crown asset composited on top. Worth using for the next
  template built from this tool's output.

## Cinematic archetype: built 1:1 from a real deployed site, not a flat design export
- Decision: `templates/cinematic/` is sourced directly from
  `~/angelica-birthday-website` ("gel-at-30"), a real Vite/React
  birthday-invite site, rather than a Canva/SVG export like every prior
  template. Its public assets (`background.png`, `party-hat.png`,
  `heart-sticker.png`) were already clean pre-separated cutouts — no
  color-keying or inpainting needed, unlike Scrapbook/Botanical.
- Structural difference from Scrapbook: no alternating fixed-tone bands.
  Every section is a translucent glass card (`backdrop-filter: blur`)
  floating over ONE fixed full-viewport background stack (static
  image + vignette + glow pulse + drifting blurred color blobs + a
  canvas particle system), so hiding a section never creates an
  adjacent-tone conflict to resolve.
- Staged reveal simplified from the reference's 5 separate timer-driven
  React states down to ONE `revealed` boolean, with per-element
  `transitionDelay` inline styles doing the staggering. Same visual
  effect, less state. Fully skipped under `prefers-reduced-motion`
  (both the intro overlay and the reveal itself render instantly).
- Mobile scroll-scrubbed video background, ported faithfully: the
  reference drives a muted looping floral video's `currentTime` from
  scroll position (`video.currentTime = scrollPercent * duration`) on
  mobile only, replacing the static desktop image — this is what makes
  the floral border feel alive while scrolling. Initially dropped during
  the first build pass (flagged by the user: "the flowers were supposed
  to move at scroll") and then added back as `useScrollScrubVideo.ts` +
  a container-query swap (`@container cn (max-width:640px)`) between
  `.cn-bg__image` and `.cn-bg__video` — a real viewport-size distinction
  (mobile vs. desktop), so a container query is correct here for the
  same reason it's used everywhere else in this template (the builder's
  scaled 1024px preview canvas must never trigger it). The reference's
  video was hosted on Readdy's CDN; downloaded and re-encoded locally to
  `public/event-templates/cinematic/scroll-bg.mp4` (2.1MB → 175KB,
  H.264 CRF 28, no audio) rather than linking the external URL, matching
  this project's standing rule of self-hosting Readdy-sourced assets.
- `playbackRate = 0` (not `pause()`) on the video, per the reference —
  required for iOS Safari to keep `currentTime` seekable without
  surfacing the native play-button overlay.
- Verification: `tsc --noEmit` and `npm run build` both clean. Visually
  verified via a real (non-virtual-time) headless Chrome screenshot at
  desktop width — confirmed the intro name-reveal, staggered content
  reveal, dual polaroid photos with hat/heart stickers, handwritten
  story/date/venue, glassmorphic RSVP card with signature block, and
  sage footer bar all render correctly. Also verified the mobile
  container-query swap actually renders the scroll-scrubbed video
  instead of the static image at a narrow container width.
## Gallery photo upload: real Supabase Storage, additive to URL paste
- Decision: added `event-site-images` as a new public Supabase Storage
  bucket (`supabase/event-site-images-storage.sql`, run AFTER
  `wedding-sites-schema.sql`), with `uploadEventImage()`
  (`content/uploadEventImage.ts`) and a reusable `ImageUploadField`
  component. `GalleryFields` now offers both: paste an already-hosted
  URL (unchanged) or upload a file directly, which lands in the same
  `masterUrl` field either way — resolves the "no file upload yet"
  V1 simplification called out in `GalleryFields`' original comment.
- Path convention: objects are stored at `<event_id>/<image_id>.<ext>`
  so storage RLS can authorize inserts purely from the path's first
  segment, without a second lookup table — same pattern as this
  project's other event-scoped access checks.
- Bucket is public (not signed URLs): published `/invite/:slug` pages
  are public, so gallery photos must be readable without auth. Only
  event owners/members can insert/delete, checked against
  `event_members`/`events.owner_id`.
- `eventId` is threaded from `BuilderShellPage` (which already has it
  from the route param) through `ContentEditor` down to `GalleryFields`
  as a plain prop — no new context needed for one consumer.
- Verification: `tsc --noEmit` and `npm run build` both clean. The SQL
  migration itself needs to be run in the Supabase dashboard before this
  ships (per the standing workflow — Francis pastes SQL before code
  push), not yet executed as of this change.

## Cinematic editor placeholders: Hero didn't wire editorPreview at all
- Bug: the first Cinematic build never passed `editorPreview` into
  `Hero.tsx` at all, and `DetailsSections.tsx` rendered an empty
  heading with nothing beneath it for a section with no content — so a
  fresh/sparse draft in the builder looked almost entirely blank (just
  a name and a divider), giving no sense of what the template can show.
  Caught by the user looking at a real "Testing" draft in the builder.
- Fix: `Hero` now takes `editorPreview` and shows a `PhotoSlot` (dashed
  empty frame) for each missing gallery photo, an `EditorHint` for a
  missing story/date/venue, and falls back to "Your Name" instead of an
  empty headline. `DetailsSections`' four sections each show an
  `EditorHint` describing what belongs there instead of a bare heading
  when empty. Same `EditorHint`/`*Slot` pattern as Scrapbook's
  `components.tsx` — reused the name, not reinvented.
- Verification: screenshotted the `sparse-draft` fixture with
  `editor=1` — hero now shows two photo slots + hat/heart stickers +
  three hint lines, and every section below (Schedule / Getting There &
  Staying / Registry / Questions) shows its own hint instead of
  standing empty.

## Cinematic background invisible in the real builder: position:fixed + transform:scale()
- Bug: the floral background border rendered correctly at the raw
  preview-harness URL but showed only its blank pink center — no
  flowers — inside the real signed-in builder. Root cause: `.cn-bg` used
  `position:fixed; inset:0`. `PreviewCanvas.tsx` renders every template
  inside a `transform: scale(...)` box, and a CSS transform makes that
  box the CONTAINING BLOCK for any `position:fixed` descendant (per
  spec) — so `inset:0` sized the background to the transformed box's
  full scrollable PAGE height (thousands of px), not one real viewport,
  blowing the image up so far that only its blank center was ever in
  frame.
- First fix attempted and REJECTED: `position:fixed` with explicit
  `width:100vw;height:100vh` instead of `inset:0`. This fixed the SIZE
  (vw/vh always resolve against the real viewport regardless of
  transformed ancestors), but not the POSITION — the fixed element's
  offset is still anchored to the transformed box's origin, which is
  the very top of the entire (very tall) page. That pinned the
  background to the top 100vh of the page and nothing else — scrolling
  to a section like "Schedule" showed a plain void, not floral
  background, exactly the follow-up bug the user caught next.
- Actual fix: `position:sticky` instead of `position:fixed`, with
  `margin-bottom:-100vh` so it doesn't push later content down:
  `.cn-bg{position:sticky;top:0;left:0;width:100%;height:100vh;margin-bottom:-100vh;...}`.
  Sticky positioning is NOT subject to the transform-creates-containing-block
  rule at all (that rule only applies to fixed/absolute) — a sticky
  element's positioning is relative to its nearest SCROLLING ancestor,
  which correctly resolves to the real document on the published page
  and to `PreviewCanvas`'s own `overflow-y:auto` pane in the builder.
  `.cn-bg` must stay the first child of `.cn-root` for the negative
  margin to correctly cancel its reserved flow space.
- Verification: a standalone HTML repro (a `transform:scale(0.8)` box
  taller than its scroll container, containing a sticky background sib
  ling + several content sections, scrolled partway down) confirmed the
  sticky background stays visible behind sections well past the first
  screen, unlike the fixed+vw/vh attempt — then reproduced correctly in
  the real template.
- Lesson for future templates: inside this project's builder, a
  full-viewport backdrop that must stay visible for the ENTIRE scroll
  (not just the first screen) needs `position:sticky` with the negative
  margin trick, not `position:fixed` in any form — `fixed` only works
  unmodified in a document that has no transformed ancestor, which the
  builder's `PreviewCanvas` guarantees is never true here.

- Gotcha for next time: `--virtual-time-budget` in headless Chrome does
  NOT reliably advance CSS `transition-delay`-based animations — an
  early screenshot attempt showed only the 0ms/300ms-delayed elements
  revealed and everything after appeared to be "missing," when in fact
  the DOM was complete and it was purely a virtual-clock artifact
  (`--dump-dom` confirmed all elements were present). Real wall-clock
  screenshots (a headless instance kept running, driven over the
  DevTools Protocol with an actual `setTimeout` wait before
  `Page.captureScreenshot`) are what actually verifies staged-reveal
  animations, not `--virtual-time-budget`.
