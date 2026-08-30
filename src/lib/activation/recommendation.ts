import { SOLUTIONS, type BusinessNeedCode, type BusinessTypeCode, type SolutionCode } from "./catalog.ts";

export type RecommendationInput = {
  industry: BusinessTypeCode;
  primaryNeed: BusinessNeedCode;
  selectedNeeds: BusinessNeedCode[];
};

export type Recommendation = {
  solutionCode: SolutionCode;
  reason: string;
  confidence: "HIGH" | "MEDIUM";
  rulesetVersion: number;
};

export function recommendSolution(input: RecommendationInput): Recommendation {
  const direct: Partial<Record<BusinessTypeCode, SolutionCode>> = {
    bodega: "pos",
    ferreteria: "pos",
    minimarket: "pos",
    panaderia: "pos",
    restaurante: "rest",
    gimnasio: "gym",
    veterinaria: "vet",
  };
  const directCode = direct[input.industry];
  if (directCode) {
    return {
      solutionCode: directCode,
      reason: directCode === "pos"
        ? "Tu negocio necesita vender, controlar caja y mantener productos e inventario conectados."
        : `${SOLUTIONS[directCode].name} corresponde a tu sector, pero todavía está en desarrollo.`,
      confidence: "HIGH",
      rulesetVersion: 1,
    };
  }

  const commercialNeeds: BusinessNeedCode[] = ["sales", "inventory", "cash", "purchases"];
  const posSignals = [input.primaryNeed, ...input.selectedNeeds].filter((need) => commercialNeeds.includes(need)).length;
  if (posSignals > 0) {
    return {
      solutionCode: "pos",
      reason: "Tus necesidades principales encajan con ventas, caja, compras o inventario.",
      confidence: posSignals >= 2 ? "HIGH" : "MEDIUM",
      rulesetVersion: 1,
    };
  }
  if (input.primaryNeed === "accounting") {
    return { solutionCode: "conta", reason: "Tu prioridad es la gestión contable, una solución que está en nuestro roadmap.", confidence: "HIGH", rulesetVersion: 1 };
  }
  return {
    solutionCode: "pos",
    reason: "PROCESA POS es la solución disponible más cercana; puedes explorarla o solicitar orientación antes de activarla.",
    confidence: "MEDIUM",
    rulesetVersion: 1,
  };
}
