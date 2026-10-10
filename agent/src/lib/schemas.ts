import { z } from "zod";

// Every agent's output is one of these schemas (BUILD_PLAN §12).

export const PlannerOut = z.object({
  keywords: z.array(z.string().min(3)).min(1).max(3).describe('Google Maps searches with the area baked in, e.g. "salon in Vanasthalipuram Hyderabad"'),
  area: z.string().describe("neighbourhood or locality to search"),
  city: z.string().describe("city"),
  why: z.string().describe("one line: why these searches fit the service; say plainly if the clients are not places or the fit is weak"),
  clients_are_places: z.boolean().describe("false if the clients are not physical businesses on Google Maps (e.g. startups, students)"),
  service_fit: z.enum(["good", "weak"]).describe("weak if the service makes little sense for these clients"),
  concrete_offers: z.array(z.string()).max(3).describe("if the service is vague, 2-3 concrete offers it could mean; else empty"),
});
export type PlannerOut = z.infer<typeof PlannerOut>;
