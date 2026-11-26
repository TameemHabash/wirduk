/**
 * A name inside a translated sentence, drawn in its own style (redesign: a chapter name in
 * bold teal, no «»). Translate with `{ [param]: NAME_MARK }`, then split with `aroundName`.
 */
export const NAME_MARK = '⁣';

/** The sentence's text before and after the name. */
export function aroundName(sentence: string): [string, string] {
  const at = sentence.indexOf(NAME_MARK);
  if (at < 0) return [sentence, ''];
  return [sentence.slice(0, at), sentence.slice(at + NAME_MARK.length)];
}
