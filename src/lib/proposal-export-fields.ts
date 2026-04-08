const STATE_CAPITALS: Record<string, string> = {
  AC: "Rio Branco",
  AL: "Maceio",
  AP: "Macapa",
  AM: "Manaus",
  BA: "Salvador",
  CE: "Fortaleza",
  DF: "Brasilia",
  ES: "Vitoria",
  GO: "Goiania",
  MA: "Sao Luis",
  MT: "Cuiaba",
  MS: "Campo Grande",
  MG: "Belo Horizonte",
  PA: "Belem",
  PB: "Joao Pessoa",
  PR: "Curitiba",
  PE: "Recife",
  PI: "Teresina",
  RJ: "Rio de Janeiro",
  RN: "Natal",
  RS: "Porto Alegre",
  RO: "Porto Velho",
  RR: "Boa Vista",
  SC: "Florianopolis",
  SP: "Sao Paulo",
  SE: "Aracaju",
  TO: "Palmas",
};

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function getCapitalInterior(city?: string | null, state?: string | null): string {
  const uf = String(state ?? "").trim().toUpperCase();
  if (!uf || !city) return "";
  const capital = STATE_CAPITALS[uf];
  if (!capital) return "";
  return normalizeText(city) === normalizeText(capital) ? "Capital" : "Interior";
}

export function getExportEspaco(screen: Record<string, any>): string {
  return (
    screen?.espaco ??
    screen?.venue_type_parent ??
    screen?.staging_tipo_venue ??
    screen?.category ??
    screen?.screen_type ??
    ""
  );
}
