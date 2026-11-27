/**
 * The reader's «المصدر» fold and its Dorar link. The fold's own row never counts; what it shows
 * inside counts like the rest of the page (owner, 2026-11-27).
 */
import { Linking } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { DHIKR } from '@/test-utils/fixtures/content';
import { counted, openReader, tapCounter } from '@/test-utils/reader';
import { tr, trPattern } from '@/test-utils/tr';

/** A tap on a part of the page that has its own gesture («المصدر», the Dorar link). */
const tapGesture = (testId: string) =>
  act(async () =>
    fireGestureHandler(getByGestureTestId(testId), [
      { state: State.BEGAN },
      { state: State.ACTIVE },
      { state: State.END },
    ]),
  );

/** The source line, shown once «المصدر» is open. */
const sourceLine = () => screen.queryByText(trPattern('reader.source'));

describe('Reader — «المصدر» folded', () => {
  it('a tap on «المصدر» opens it and does not count (owner, 2026-11-27)', async () => {
    await openReader(DHIKR.hundredTimes);
    expect(sourceLine()).toBeNull();
    await tapGesture('source-fold');
    expect(screen.getByLabelText(counted(0, 100))).toBeOnTheScreen();
    expect(sourceLine()).toBeOnTheScreen();
  });

  it('another tap closes it, and does not count either', async () => {
    await openReader(DHIKR.hundredTimes);
    await tapGesture('source-fold');
    await tapGesture('source-fold');
    expect(screen.getByLabelText(counted(0, 100))).toBeOnTheScreen();
    expect(sourceLine()).toBeNull();
  });

  it('counting goes on as before around it', async () => {
    await openReader(DHIKR.hundredTimes);
    await tapCounter();
    await tapGesture('source-fold');
    await tapCounter();
    expect(screen.getByLabelText(counted(2, 100))).toBeOnTheScreen();
  });
});

describe('Reader — "عرض في الدرر السنية"', () => {
  let openUrl: jest.SpyInstance;
  beforeEach(() => {
    openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });
  afterEach(() => openUrl.mockRestore());

  /** The reader at a dhikr with a Dorar source, «المصدر» open, and its link tapped. */
  async function tapDorarLink() {
    await openReader(DHIKR.hundredTimes);
    await tapGesture('source-fold'); // the link is inside «المصدر»
    await tapGesture('dorar-link');
  }

  it('the tap on the link counts, and opens nothing by itself', async () => {
    await tapDorarLink();
    expect(screen.getByLabelText(counted(1, 100))).toBeOnTheScreen();
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('counting goes on while its toast is shown', async () => {
    await tapDorarLink();
    await tapCounter();
    expect(screen.getByLabelText(counted(2, 100))).toBeOnTheScreen();
    expect(screen.getByText(tr('reader.dorarToast'))).toBeOnTheScreen();
  });

  it('the toast opens the Dorar page, and goes away', async () => {
    await tapDorarLink();
    await fireEvent.press(screen.getByText(tr('reader.dorarToast')));
    expect(openUrl).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/dorar\.net\//));
    expect(screen.queryByText(tr('reader.dorarToast'))).toBeNull();
  });
});
