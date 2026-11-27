import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useRepositories } from '@/data/DataProvider';
import type { AdwamuhaMessage, AdwamuhaMoment, AdwamuhaText } from '@/data/models';
import {
  type MessageContent,
  messagePool,
  nextPick,
  textFor,
} from '@/features/adwamuha/logic/messages';
import { useAsync } from '@/hooks/useAsync';

interface Library {
  texts: AdwamuhaText[];
  library: AdwamuhaMessage[];
  /** Both were read (a pool without the library would be short). */
  read: boolean;
}

const NOT_READ: Library = { texts: [], library: [], read: false };

/**
 * The owner's messages and tips and the approved library (content database), read once per
 * language, and the choice of a message for an occasion (no repeats: owner, 2026-11-21).
 */
export function useMessageLibrary() {
  const { adwamuha: repo, content } = useRepositories();
  const { i18n } = useTranslation();
  const { texts, library, read } = useAsync(
    () =>
      Promise.all([
        content.listAdwamuhaTexts(i18n.language).catch(() => []),
        content.listAdwamuhaMessages(i18n.language).catch(() => []),
      ]).then(([ownTexts, messages]): Library => ({
        texts: ownTexts,
        library: messages,
        read: true,
      })),
    [content, i18n.language],
    NOT_READ,
  );

  const chooseMessage = useCallback(
    async (moment: AdwamuhaMoment, occasion: string): Promise<MessageContent | null> => {
      if (!read) return null;
      const pool = messagePool(moment, texts, library);
      const picks = await repo.listPicks(moment);
      const earlier = picks.find((p) => p.occasion === occasion);
      if (earlier) {
        const same = pool.find((m) => m.key === earlier.messageId);
        if (same) return same.content;
        // Its message left the content: the occasion gets a new one.
        await repo.removePick(moment, occasion);
      }
      const next = nextPick(
        pool,
        picks.filter((p) => p.occasion !== occasion),
        Math.random,
      );
      if (!next) return null;
      const saved = await repo.addPick(moment, {
        occasion,
        messageId: next.message.key,
        round: next.round,
      });
      return (pool.find((m) => m.key === saved) ?? next.message).content;
    },
    [library, read, repo, texts],
  );

  const textForState = useCallback(
    (moment: AdwamuhaText['moment'], state: string) => textFor(texts, moment, state),
    [texts],
  );

  return { texts, library, textsRead: read, chooseMessage, textFor: textForState };
}
