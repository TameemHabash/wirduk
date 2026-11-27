import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { Repositories } from '@/data/DataProvider';
import type { AdwamuhaMoment } from '@/data/models/index';
import { type MessageContent, messagePool, textFor } from '@/features/adwamuha/logic/messages';

/** A piece of text that is on screen when this message is shown. */
export async function momentSnippets(repos: Repositories, moment: AdwamuhaMoment) {
  const texts = await repos.content.listAdwamuhaTexts('ar');
  const library = await repos.content.listAdwamuhaMessages('ar');
  return messagePool(moment, texts, library).map(({ content: c }) =>
    c.kind === 'owner' ? c.text : c.message.texts[0]!,
  );
}

/** The text on screen for a message: the owner's words, or the start of a verse / hadith. */
export function snippetOf(content: MessageContent): string {
  return content.kind === 'owner' ? content.text : content.message.texts[0]!;
}

/** A tip ('stage:N', 'maintenance') or the welcome ('first:evening'), from the content database. */
export async function stateText(
  repos: Repositories,
  moment: 'tip' | 'welcome',
  state: string,
): Promise<string> {
  const text = textFor(await repos.content.listAdwamuhaTexts('ar'), moment, state);
  if (text === null) throw new Error(`No ${moment} for ${state}`);
  return text;
}

/**
 * Waits until one message of `moment` is on screen: the owner's own or one from
 * the approved library. Returns its key (`PoolMessage.key`).
 */
export async function expectMomentMessage(
  repos: Repositories,
  moment: AdwamuhaMoment,
): Promise<string> {
  const texts = await repos.content.listAdwamuhaTexts('ar');
  const library = await repos.content.listAdwamuhaMessages('ar');
  const pool = messagePool(moment, texts, library);
  let key = '';
  await waitFor(() => {
    const shown = pool.find(
      (m) => screen.queryAllByText(snippetOf(m.content), { exact: false }).length > 0,
    );
    expect(shown).toBeDefined();
    key = shown!.key;
  });
  return key;
}

/** Presses «حسنًا» on the messages due (they come first) until `text` shows in their place. */
export async function afterMessages(text: string) {
  await waitFor(
    async () => {
      const ok = screen.queryByText('حسنًا');
      if (ok) await fireEvent.press(ok);
      expect(screen.getByText(text)).toBeOnTheScreen();
    },
    { timeout: 3000 },
  );
}
