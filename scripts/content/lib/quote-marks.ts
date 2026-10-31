/**
 * The book wraps quoted words in double parentheses: ((سبحان الله)).
 * The owner asked to drop them (2026-10-22). Single parentheses stay: they
 * hold notes such as (ثلاث مرات).
 *
 * A pair is removed only when "((" and its matching "))" belong together
 * (the inner pair sits right inside the outer one). So
 * "(ينفث عن يساره (ثلاثاً))" keeps both pairs: the "))" there closes two
 * different notes. A "((" or "))" left without any pair (the PDF copy lost
 * its other half) is removed too.
 */
export function removeDoubleParens(text: string): string {
  const partner = new Map<number, number>();
  const stack: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') stack.push(i);
    else if (text[i] === ')') {
      const open = stack.pop();
      if (open !== undefined) {
        partner.set(open, i);
        partner.set(i, open);
      }
    }
  }

  const drop = new Set<number>();
  for (const [open, close] of partner) {
    if (text[open] !== '(' || text[open + 1] !== '(') continue;
    if (partner.get(open + 1) === close - 1)
      [open, open + 1, close - 1, close].forEach((i) => drop.add(i));
  }
  // Halves of a double pair that lost their partner.
  for (let i = 0; i + 1 < text.length; i++) {
    const two = text[i]! + text[i + 1]!;
    if ((two === '((' || two === '))') && !partner.has(i) && !partner.has(i + 1)) {
      drop.add(i);
      drop.add(i + 1);
    }
  }

  // Only where something was removed, two spaces that meet become one; the
  // book's own spacing elsewhere stays as it is.
  let out = '';
  let afterDrop = false;
  for (let i = 0; i < text.length; i++) {
    if (drop.has(i)) {
      afterDrop = true;
      continue;
    }
    const ch = text[i]!;
    if (afterDrop && ch === ' ' && out.endsWith(' ')) continue;
    out += ch;
    if (ch !== ' ') afterDrop = false;
  }
  return out.trim();
}
