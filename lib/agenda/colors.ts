export const AGENDA_COLORS = [
  { value: "#9A5B67", name: "Rosé · original", soft: "#EAD7D5" },
  { value: "#2563A6", name: "Azul", soft: "#E8F0FA" },
  { value: "#28745C", name: "Verde", soft: "#E7F3ED" },
  { value: "#7651A8", name: "Violeta", soft: "#F0EAF8" },
  { value: "#A65332", name: "Terracota", soft: "#FAEDE5" },
  { value: "#475569", name: "Grafite", soft: "#EDF0F5" },
] as const;

export function agendaColor(value?: string | null) {
  return AGENDA_COLORS.find((color) => color.value === value) ?? AGENDA_COLORS[0];
}
