import { describe, expect, it } from "vitest";
import { evaluateEvidence } from "@/src/domain/evidence";
describe("evidencia", () => { it("requiere dos dominios y una primaria", () => expect(evaluateEvidence([{ id: "1", domain: "a.gt", isPrimary: true }, { id: "2", domain: "b.gt", isPrimary: false }], 2).ready).toBe(true)); it("marca incompleto con una sola fuente", () => expect(evaluateEvidence([{ id: "1", domain: "a.gt", isPrimary: false }], 1).verdict).toBe("INCOMPLETE")); });
