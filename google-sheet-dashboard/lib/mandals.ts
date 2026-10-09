// Spellings of the same mandal that differ between (or within) sheet tabs,
// keyed and valued in the normalised form `mandalKey` produces.
const MANDAL_ALIASES: Record<string, string> = {
  hayathnagar: "hayatnagar",
  quthbullapur: "qutbullapur",
  khairtabad: "khairatabad",
  trimulgherry: "tirumalagiri",
};

// Identifies a mandal regardless of case, spacing, punctuation or known
// spelling variants.
export function mandalKey(name: string) {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return MANDAL_ALIASES[key] ?? key;
}
