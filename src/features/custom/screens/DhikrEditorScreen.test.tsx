import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { mockCustomAudio, mockPermission, mockPicker } from '@/test-utils/mocks/audio';
import { openDialog, pressInDialog } from '@/test-utils/dialog';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { left, mockRouter, setRouteParams, tryToLeave } from '@/test-utils/mocks/router';
import { tr } from '@/test-utils/tr';

import { DhikrEditorScreen } from './DhikrEditorScreen';

async function withCategory(title = 'أدعيتي') {
  const repos = await createTestRepositories();
  const category = await repos.custom.createCategory(title);
  return { repos, category };
}

describe('Dhikr editor', () => {
  async function openNew() {
    const { repos, category } = await withCategory();
    setRouteParams({ id: String(category.id), dhikrId: 'new' });
    await renderWithApp(<DhikrEditorScreen />, repos);
    return { repos, category };
  }

  it('saves text with tashkeel, count, notes and goes back', async () => {
    const { repos, category } = await openNew();
    await fireEvent.changeText(screen.getByLabelText(tr('custom.dhikrText')), 'سُبْحَانَ اللَّهِ');
    await fireEvent.press(screen.getByLabelText(tr('custom.increaseCount')));
    await fireEvent.press(screen.getByLabelText(tr('custom.increaseCount')));
    await fireEvent.changeText(screen.getByLabelText(tr('custom.fadl')), 'فضل');
    await fireEvent.changeText(screen.getByLabelText(tr('custom.source')), 'مصدر');
    await fireEvent.press(screen.getByText(tr('custom.save')));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    const [saved] = await repos.custom.listAdhkar(category.id);
    expect(saved).toMatchObject({
      text: 'سُبْحَانَ اللَّهِ',
      count: 3,
      source: { fadl: 'فضل', source: 'مصدر', grading: null, dorarUrl: null },
    });
  });

  it('shows clear errors for empty text and a bad count', async () => {
    await openNew();
    await fireEvent.press(screen.getByText(tr('custom.save')));
    expect(await screen.findByText(tr('custom.errors.emptyText'))).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText(tr('custom.dhikrText')), 'نص');
    await fireEvent.changeText(screen.getByLabelText(tr('custom.count')), '0');
    await fireEvent.press(screen.getByText(tr('custom.save')));
    expect(await screen.findByText(tr('custom.errors.badCount'))).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('the count: + and −, or the number typed (owner, 2026-11-26)', async () => {
    const { repos, category } = await openNew();
    await fireEvent.changeText(screen.getByLabelText(tr('custom.dhikrText')), 'نص');
    await fireEvent.changeText(screen.getByLabelText(tr('custom.count')), '1000');
    await fireEvent.press(screen.getByLabelText(tr('custom.increaseCount')));
    expect(screen.getByLabelText(tr('custom.count')).props.value).toBe('1001');
    await fireEvent.press(screen.getByLabelText(tr('custom.decreaseCount')));
    await fireEvent.press(screen.getByLabelText(tr('custom.decreaseCount')));
    expect(screen.getByLabelText(tr('custom.count')).props.value).toBe('999');
    // Only digits are kept.
    await fireEvent.changeText(screen.getByLabelText(tr('custom.count')), '12x');
    expect(screen.getByLabelText(tr('custom.count')).props.value).toBe('12');
    await fireEvent.press(screen.getByText(tr('custom.save')));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect((await repos.custom.listAdhkar(category.id))[0]?.count).toBe(12);
  });

  it('refuses a count above 100000', async () => {
    await openNew();
    await fireEvent.changeText(screen.getByLabelText(tr('custom.dhikrText')), 'نص');
    await fireEvent.changeText(screen.getByLabelText(tr('custom.count')), '100001');
    await fireEvent.press(screen.getByText(tr('custom.save')));
    expect(await screen.findByText(tr('custom.errors.badCount'))).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  describe('«بلا حد» (owner, design ب, 2026-11-27)', () => {
    /** The choice «عدد محدد» / «بلا حد». */
    const kind = (key: 'custom.countFixed' | 'custom.countUnlimited') =>
      screen.getByLabelText(tr(key));

    it('a new dhikr starts with «عدد محدد» and its + and −', async () => {
      const { repos, category } = await withCategory();
      setRouteParams({ id: String(category.id), dhikrId: 'new' });
      await renderWithApp(<DhikrEditorScreen />, repos);
      expect(kind('custom.countFixed')).toBeSelected();
      expect(kind('custom.countUnlimited')).not.toBeSelected();
      expect(screen.getByLabelText(tr('custom.increaseCount'))).toBeOnTheScreen();
    });

    it('«بلا حد» hides + and −, and is saved', async () => {
      const { repos, category } = await withCategory();
      setRouteParams({ id: String(category.id), dhikrId: 'new' });
      await renderWithApp(<DhikrEditorScreen />, repos);
      await fireEvent.changeText(screen.getByLabelText(tr('custom.dhikrText')), 'نص');
      await fireEvent.press(kind('custom.countUnlimited'));
      expect(kind('custom.countUnlimited')).toBeSelected();
      expect(screen.queryByLabelText(tr('custom.increaseCount'))).toBeNull();
      expect(screen.queryByLabelText(tr('custom.count'))).toBeNull();
      await fireEvent.press(screen.getByText(tr('custom.save')));
      await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
      expect((await repos.custom.listAdhkar(category.id))[0]).toMatchObject({ unlimited: true });
    });

    it('an unlimited dhikr opens on «بلا حد»; «عدد محدد» brings its number back', async () => {
      const { repos, category } = await withCategory();
      const d = await repos.custom.createDhikr(category.id, {
        text: 'نص',
        count: 33,
        unlimited: true,
      });
      setRouteParams({ id: String(category.id), dhikrId: String(d.id) });
      await renderWithApp(<DhikrEditorScreen />, repos);
      expect(await screen.findByLabelText(tr('custom.countUnlimited'))).toBeSelected();
      await fireEvent.press(kind('custom.countFixed'));
      expect(screen.getByLabelText(tr('custom.count')).props.value).toBe('33');
      await fireEvent.press(screen.getByText(tr('custom.save')));
      await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
      expect(await repos.custom.getDhikr(d.id)).toMatchObject({ count: 33, unlimited: false });
    });

    it('a bad number left behind «بلا حد» does not stop the save (the old number is kept)', async () => {
      const { repos, category } = await withCategory();
      const d = await repos.custom.createDhikr(category.id, { text: 'نص', count: 7 });
      setRouteParams({ id: String(category.id), dhikrId: String(d.id) });
      await renderWithApp(<DhikrEditorScreen />, repos);
      await fireEvent.changeText(await screen.findByLabelText(tr('custom.count')), '');
      await fireEvent.press(kind('custom.countUnlimited'));
      await fireEvent.press(screen.getByText(tr('custom.save')));
      await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
      expect(await repos.custom.getDhikr(d.id)).toMatchObject({ count: 7, unlimited: true });
    });

    it('a change to «بلا حد» alone is a change: leaving asks first', async () => {
      const { repos, category } = await withCategory();
      const d = await repos.custom.createDhikr(category.id, { text: 'نص', count: 3 });
      setRouteParams({ id: String(category.id), dhikrId: String(d.id) });
      await renderWithApp(<DhikrEditorScreen />, repos);
      await fireEvent.press(await screen.findByLabelText(tr('custom.countUnlimited')));
      expect(await tryToLeave()).toBe(false);
      expect(openDialog().getByText(tr('custom.discardTitle'))).toBeOnTheScreen();
    });
  });

  it('hides the two audio buttons once there is audio; removing it brings them back', async () => {
    const { repos, category } = await withCategory();
    const d = await repos.custom.createDhikr(category.id, {
      text: 'نص',
      count: 1,
      audioFile: 'old.m4a',
    });
    setRouteParams({ id: String(category.id), dhikrId: String(d.id) });
    await renderWithApp(<DhikrEditorScreen />, repos);
    expect(await screen.findByLabelText(tr('custom.removeAudio'))).toBeOnTheScreen();
    expect(screen.queryByLabelText(tr('custom.record'))).toBeNull();
    expect(screen.queryByLabelText(tr('custom.pickFile'))).toBeNull();
    await fireEvent.press(screen.getByLabelText(tr('custom.removeAudio')));
    expect(screen.getByLabelText(tr('custom.record'))).toBeOnTheScreen();
    expect(screen.getByLabelText(tr('custom.pickFile'))).toBeOnTheScreen();
  });

  it('adds an audio file picked from the phone', async () => {
    mockPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///cache/dua.mp3', name: 'dua.mp3', size: 1000, mimeType: 'audio/mpeg' },
      ],
    });
    const { repos, category } = await openNew();
    await fireEvent.changeText(screen.getByLabelText(tr('custom.dhikrText')), 'نص');
    await fireEvent.press(screen.getByLabelText(tr('custom.pickFile')));
    expect(await screen.findByLabelText(tr('custom.removeAudio'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(tr('custom.save')));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect((await repos.custom.listAdhkar(category.id))[0]?.audioFile).toBe('stored-dua.mp3');
  });

  it('refuses a file that is not audio', async () => {
    mockPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///cache/x.pdf', name: 'x.pdf', size: 10, mimeType: 'application/pdf' },
      ],
    });
    await openNew();
    await fireEvent.press(screen.getByLabelText(tr('custom.pickFile')));
    expect(await screen.findByText(tr('custom.notAudio'))).toBeOnTheScreen();
    expect(mockCustomAudio.storeCustomAudio).not.toHaveBeenCalled();
  });

  it('explains when the microphone is not allowed', async () => {
    mockPermission.granted = false;
    await openNew();
    await fireEvent.press(screen.getByLabelText(tr('custom.record')));
    expect(await screen.findByText(tr('custom.micDenied'))).toBeOnTheScreen();
  });

  it('removing the audio deletes the old file on save', async () => {
    const { repos, category } = await withCategory();
    const d = await repos.custom.createDhikr(category.id, {
      text: 'نص',
      count: 1,
      audioFile: 'old.m4a',
    });
    setRouteParams({ id: String(category.id), dhikrId: String(d.id) });
    await renderWithApp(<DhikrEditorScreen />, repos);
    await fireEvent.press(await screen.findByLabelText(tr('custom.removeAudio')));
    await fireEvent.press(screen.getByText(tr('custom.save')));
    await waitFor(() => expect(mockCustomAudio.deleteCustomAudio).toHaveBeenCalledWith('old.m4a'));
    expect((await repos.custom.getDhikr(d.id))?.audioFile).toBeNull();
  });

  it('deletes a dhikr after confirming', async () => {
    const { repos, category } = await withCategory();
    const d = await repos.custom.createDhikr(category.id, { text: 'نص', count: 1 });
    setRouteParams({ id: String(category.id), dhikrId: String(d.id) });
    await renderWithApp(<DhikrEditorScreen />, repos);
    await fireEvent.press(await screen.findByText(tr('custom.deleteDhikr')));
    expect(openDialog().getByText(tr('custom.deleteDhikrConfirmTitle'))).toBeOnTheScreen();
    await pressInDialog(tr('custom.delete'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await repos.custom.getDhikr(d.id)).toBeNull();
  });
});

describe('Dhikr editor: leaving with changes', () => {
  async function openNewWithText() {
    const { repos, category } = await withCategory();
    setRouteParams({ id: String(category.id), dhikrId: 'new' });
    await renderWithApp(<DhikrEditorScreen />, repos);
    await fireEvent.changeText(screen.getByLabelText(tr('custom.dhikrText')), 'x');
    return { repos, category };
  }

  it('asks first («تجاهل التغييرات؟»)', async () => {
    await openNewWithText();
    expect(await tryToLeave()).toBe(false);
    expect(openDialog().getByText(tr('custom.discardTitle'))).toBeOnTheScreen();
  });

  it('«تجاهل» leaves and saves nothing', async () => {
    const { repos, category } = await openNewWithText();
    await tryToLeave();
    await pressInDialog(tr('custom.discard'));
    expect(left).toEqual([{ type: 'GO_BACK' }]);
    expect(await repos.custom.listAdhkar(category.id)).toEqual([]);
  });

  it('a file added on this screen is deleted when the user leaves without saving', async () => {
    mockPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/d.mp3', name: 'd.mp3', size: 1000, mimeType: 'audio/mpeg' }],
    });
    await openNewWithText();
    await fireEvent.press(screen.getByLabelText(tr('custom.pickFile')));
    await screen.findByLabelText(tr('custom.removeAudio'));
    await tryToLeave();
    await pressInDialog(tr('custom.discard'));
    expect(mockCustomAudio.deleteCustomAudio).toHaveBeenCalledWith('stored-d.mp3');
  });

  it('after a save, it leaves without asking', async () => {
    await openNewWithText();
    await fireEvent.press(screen.getByText(tr('custom.save')));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await tryToLeave()).toBe(true);
  });
});
