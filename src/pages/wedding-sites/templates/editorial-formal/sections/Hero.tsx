import { useLayoutEffect, useRef, useState } from "react";
import type { EventContent } from "../../../content/types";
import { usePrefersReducedMotion } from "../../../engine/motion";
import type { EventTheme } from "../../../engine/theme";
import type { EditorialFormalSettings } from "../index";

interface HeroProps {
  content: EventContent;
  theme: EventTheme;
  heroTreatment: EditorialFormalSettings["heroTreatment"];
  heroImageUrl?: string;
}

function formatEventDate(iso: string): { day: string; month: string; weekday: string } | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString(undefined, { month: "long" }),
    weekday: date.toLocaleDateString(undefined, { weekday: "long" }),
  };
}

/**
 * Adapted from tercelat41's single-page hero: the FLIP-animated intro
 * group (eyebrow + centered numeral) is preserved as-is, generalized to
 * the event's day-of-month regardless of event type. `heroTreatment`
 * chooses between that flashier centered treatment and a calmer
 * left-aligned eyebrow for hosts who want less motion up top.
 */
export default function Hero({ content, theme, heroTreatment, heroImageUrl }: HeroProps) {
  const [settled, setSettled] = useState(false);
  const introGroupRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const formattedDate = formatEventDate(content.eventDate);
  const hostNames = content.hosts.map((host) => host.name).filter(Boolean).join(" & ");
  const hasLocation = Boolean(content.primaryLocation.name || content.primaryLocation.addressLine);
  const monogramLetter = content.hosts.find((h) => h.name)?.name.trim().charAt(0).toUpperCase();

  useLayoutEffect(() => {
    if (prefersReducedMotion) {
      setSettled(true);
      return;
    }
    const el = introGroupRef.current;
    if (!el || heroTreatment !== "centered-numeral") {
      setSettled(true);
      return;
    }
    const rect = el.getBoundingClientRect();
    const elCenterX = rect.left + rect.width / 2;
    const elCenterY = rect.top + rect.height / 2;
    const dx = window.innerWidth / 2 - elCenterX;
    const dy = window.innerHeight / 2 - elCenterY;

    el.style.transition = "none";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;

    const settleTimer = setTimeout(() => {
      el.style.transition = "transform 1.1s cubic-bezier(.22,1,.36,1)";
      el.style.transform = "translate(0px, 0px) scale(1)";
      setSettled(true);
    }, 1000);

    return () => clearTimeout(settleTimer);
  }, [heroTreatment, prefersReducedMotion]);

  return (
    <section
      style={{
        width: "100%",
        minHeight: heroImageUrl || formattedDate ? "80vh" : undefined,
        position: "relative",
        background: `radial-gradient(120% 100% at 50% 0%, ${theme.ink}08, ${theme.background} 60%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: heroImageUrl || formattedDate ? "72px 24px 48px" : "120px 24px 96px",
        textAlign: heroTreatment === "centered-numeral" ? "center" : "left",
      }}
    >
      <style>{`
        @keyframes wedding-fade-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wedding-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wedding-numeral-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
      `}</style>

      {monogramLetter ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontFamily: theme.displayFont,
            fontWeight: 700,
            fontSize: "min(70vh, 60vw)",
            lineHeight: 1,
            color: theme.ink,
            opacity: 0.035,
            userSelect: "none",
            zIndex: 0,
          }}
        >
          {monogramLetter}
        </span>
      ) : null}

      <div style={{ width: "min(680px, 92vw)", position: "relative", zIndex: 1 }}>
        <div
          ref={introGroupRef}
          style={{
            position: "relative",
            zIndex: 2,
            animation: prefersReducedMotion ? undefined : "wedding-fade-in 0.5s ease both",
            willChange: "transform",
          }}
        >
          <p
            style={{
              fontFamily: theme.bodyFont,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              fontSize: "clamp(12px, 3vw, 15px)",
              fontWeight: 700,
              color: theme.muted,
              margin: 0,
            }}
          >
            You&apos;re Invited
          </p>

          {heroTreatment === "centered-numeral" && formattedDate ? (
            <div
              style={{
                width: "min(60vw, 300px)",
                margin: "16px auto 0",
                position: "relative",
                animation: prefersReducedMotion ? undefined : "wedding-numeral-breathe 5s ease-in-out infinite",
              }}
            >
              <p
                style={{
                  fontFamily: theme.displayFont,
                  fontWeight: 700,
                  fontSize: "clamp(4rem, 22vw, 8rem)",
                  lineHeight: 1,
                  color: theme.ink,
                  margin: 0,
                }}
              >
                {formattedDate.day}
              </p>
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontSize: "clamp(13px, 2.5vw, 15px)",
                  color: theme.muted,
                  marginTop: 4,
                }}
              >
                {formattedDate.month} &middot; {formattedDate.weekday}
              </p>
            </div>
          ) : null}
        </div>

        <div
          style={{
            opacity: settled ? 1 : 0,
            transform: settled ? "translateY(0)" : "translateY(18px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          {heroImageUrl ? (
            <div
              style={{
                marginTop: 32,
                borderRadius: 24,
                overflow: "hidden",
                aspectRatio: "16 / 9",
                animation: prefersReducedMotion ? undefined : "wedding-fade-up 0.7s ease 0.25s both",
              }}
            >
              <img
                src={heroImageUrl}
                alt={hostNames}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          ) : null}

          <h1
            style={{
              fontFamily: theme.displayFont,
              fontWeight: 700,
              color: theme.ink,
              fontSize: "clamp(1.8rem, 6vw, 3rem)",
              lineHeight: 1.15,
              marginTop: 40,
              animation: prefersReducedMotion ? undefined : "wedding-fade-up 0.7s ease 0.35s both",
            }}
          >
            {hostNames}
          </h1>

          {heroTreatment !== "centered-numeral" && formattedDate ? (
            <p
              style={{
                fontFamily: theme.bodyFont,
                fontSize: 18,
                color: theme.muted,
                marginTop: 12,
              }}
            >
              {formattedDate.weekday}, {formattedDate.month} {formattedDate.day}
            </p>
          ) : null}

          {hasLocation ? (
            <p
              style={{
                fontFamily: theme.bodyFont,
                fontSize: 18,
                lineHeight: 1.6,
                color: theme.ink,
                marginTop: 24,
              }}
            >
              {content.primaryLocation.name}
              {content.primaryLocation.name && content.primaryLocation.addressLine ? <br /> : null}
              {content.primaryLocation.addressLine}
            </p>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: heroTreatment === "centered-numeral" ? "center" : "flex-start",
              gap: 10,
              margin: "32px 0 0",
            }}
          >
            <span style={{ width: 32, height: 1, background: theme.muted, opacity: 0.5 }} />
            <span style={{ width: 5, height: 5, borderRadius: "50%", border: `1px solid ${theme.muted}`, opacity: 0.8 }} />
            <span style={{ width: 32, height: 1, background: theme.muted, opacity: 0.5 }} />
          </div>
        </div>
      </div>
    </section>
  );
}
