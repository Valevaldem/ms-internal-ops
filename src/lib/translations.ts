export const translateStage = (stage: string): string => {
  const mapping: Record<string, string> = {
    "Post-Sale Follow-Up Pending (5 days)": "Seguimiento Post-Venta (5 días)",
    "Post-Sale Follow-Up Pending (1 month)": "Seguimiento Post-Venta (1 mes)",
    "Cycle Closed": "Ciclo Cerrado"
  };
  return mapping[stage] || stage;
};

export const translatePieceType = (pieceType: string): string => {
  const mapping: Record<string, string> = {
    "Ring": "Anillo",
    "Chain": "Cadena",
    "Earrings": "Aretes",
    "Bracelet": "Pulsera",
    "Other": "Otro"
  };
  return mapping[pieceType] || pieceType;
};
