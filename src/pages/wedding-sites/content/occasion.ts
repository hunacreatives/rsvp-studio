import type { EventContent } from "./types";

/**
 * Wording that depends on the kind of celebration, so a birthday site never says
 * "We're finally getting married". Content saved before `occasion` existed gets
 * neutral wording rather than a guess.
 */
export function occasionWords(content: Pick<EventContent, "occasion">) {
  switch (content.occasion) {
    case "wedding":
      return { invitation: "Wedding Invitation", about: "About the Wedding", tagline: "We’re finally getting married" };
    case "birthday":
      return { invitation: "Birthday Invitation", about: "About the Party", tagline: "Come celebrate with us" };
    case "anniversary":
      return { invitation: "Anniversary Invitation", about: "About the Celebration", tagline: "Come celebrate with us" };
    default:
      return { invitation: "You’re Invited", about: "About the Celebration", tagline: "Come celebrate with us" };
  }
}
