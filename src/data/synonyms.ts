import synonyms from "$data/lab.synonyms.json";

/**
 *
 * @param term Local lab term to be checked and normalized
 * @returns
 */
export default function (term: string) {
  if (!term) return null;

  // remove extra spaces, and convert to lower case
  const lower = term.toString().replace(/\s+/g, " ").toLowerCase();

  const result = synonyms.find((s) => s.includes(term));
  if (result) {
    return result[0];
  } else {
    const result = synonyms.find((s) => {
      const match = s.find((t) => lower.includes(t.toLowerCase()));
      if (match) {
        return s[0];
      }
    });
    if (result) {
      return result[0];
    }
    return null;
  }
}
