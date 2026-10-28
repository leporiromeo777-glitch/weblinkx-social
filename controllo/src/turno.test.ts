import { describe, expect, it } from "vitest";
import { ORE } from "../../scripts/social/turno";
import { DALLE, momentoDiAvviare, oraInSvizzera } from "./turno";

describe("turno da Netlify", () => {
  it("parte dall'ora del video, come il workflow", () => {
    expect(DALLE).toBe(Math.min(...Object.values(ORE)));
  });

  it("dalle 12 svizzere a mezzanotte, con l'ora legale e senza", () => {
    // Inverno: UTC+1.
    expect(oraInSvizzera(new Date("2026-10-28T10:59:00Z"))).toBe(11);
    expect(momentoDiAvviare(new Date("2026-10-28T10:59:00Z"))).toBe(false);
    expect(momentoDiAvviare(new Date("2026-10-28T11:07:00Z"))).toBe(true);
    expect(momentoDiAvviare(new Date("2026-10-28T22:59:00Z"))).toBe(true);
    expect(momentoDiAvviare(new Date("2026-10-28T23:07:00Z"))).toBe(false);
    // Estate: UTC+2.
    expect(momentoDiAvviare(new Date("2027-06-01T09:59:00Z"))).toBe(false);
    expect(momentoDiAvviare(new Date("2027-06-01T10:07:00Z"))).toBe(true);
  });
});
