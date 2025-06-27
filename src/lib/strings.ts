export function searchOptimize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function removeNonAlphanumeric(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, "");
}

export function removeNonNumeric(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

export function removeNonAlpha(input: string): string {
  return input.replace(/[^a-zA-Z]/g, "");
}

export function capitalizeFirstLetters(input: string): string {
  return input
    .toLowerCase()
    .replace(
      /(\s|^|\-)[A-zÀ-ÖØ-öø-įĴ-őŔ-žǍ-ǰǴ-ǵǸ-țȞ-ȟȤ-ȳɃɆ-ɏḀ-ẞƀ-ƓƗ-ƚƝ-ơƤ-ƥƫ-ưƲ-ƶẠ-ỿ]/g,
      (char) => char.toUpperCase(),
    )
    .trim();
}
