import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { DHIKR_FONT_SIZE } from '@/data/settings/settings';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/router-mock';

import { SettingsScreen } from './SettingsScreen';

describe('SettingsScreen', () => {
  it('has the reading switches, all on by default, and saves them', async () => {
    const { repos } = await renderWithApp(<SettingsScreen />);
    const next = await screen.findByLabelText('اهتزاز عند الانتقال إلى الذكر التالي');
    const awake = screen.getByLabelText('إبقاء الشاشة مضاءة أثناء قراءة الأذكار');
    const restore = screen.getByLabelText('المتابعة من حيث توقفت');
    expect([next, awake, restore].map((s) => s.props.value)).toEqual([true, true, true]);
    await repos.session.save({ categoryId: 1, dhikrId: 1017, counts: {} });
    await fireEvent(next, 'valueChange', false);
    await fireEvent(awake, 'valueChange', false);
    await fireEvent(restore, 'valueChange', false);
    await waitFor(async () =>
      expect(await repos.settings.getAll()).toMatchObject({
        nextDhikrVibration: false,
        keepScreenOn: false,
        restoreSession: false,
      }),
    );
    // Turned off: a state saved earlier is forgotten.
    expect(await repos.session.load()).toBeNull();
  });

  it('changes the text size and saves it', async () => {
    const { repos } = await renderWithApp(<SettingsScreen />);
    expect(await screen.findByText('24')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('تكبير الخط'));
    expect(screen.getByText('26')).toBeOnTheScreen();
    await waitFor(async () => expect((await repos.settings.getAll()).dhikrFontSize).toBe(26));
  });

  it('cannot go above the largest size', async () => {
    const repos = await createTestRepositories();
    await repos.settings.set('dhikrFontSize', DHIKR_FONT_SIZE.max);
    await renderWithApp(<SettingsScreen />, repos);
    const bigger = await screen.findByLabelText('تكبير الخط');
    expect(bigger).toBeDisabled();
    expect(screen.getByLabelText('تصغير الخط')).toBeEnabled();
  });

  it('shows a live preview with real dhikr text', async () => {
    await renderWithApp(<SettingsScreen />);
    // سبحان الله وبحمده, in the size preview and once per font in the picker.
    expect(await screen.findAllByText(/سُبْحَانَ/)).toHaveLength(5);
  });

  it('picks a dhikr font (Amiri Quran by default) and saves it', async () => {
    const { repos } = await renderWithApp(<SettingsScreen />);
    expect(await screen.findByRole('radio', { name: 'أميري قرآن' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'شهرزاد' }));
    expect(screen.getByRole('radio', { name: 'شهرزاد' })).toBeSelected();
    await waitFor(async () =>
      expect((await repos.settings.getAll()).dhikrFont).toBe('scheherazade'),
    );
  });

  it('turns haptics off and saves it', async () => {
    const { repos } = await renderWithApp(<SettingsScreen />);
    const toggle = await screen.findByLabelText('الاهتزاز الخفيف عند كل عدّة');
    await fireEvent(toggle, 'valueChange', false);
    await waitFor(async () => expect((await repos.settings.getAll()).hapticsEnabled).toBe(false));
  });

  it('turns the long vibration off (on by default) and saves it', async () => {
    const { repos } = await renderWithApp(<SettingsScreen />);
    const toggle = await screen.findByLabelText('اهتزاز طويل عند إتمام الباب');
    expect(toggle.props.value).toBe(true);
    await fireEvent(toggle, 'valueChange', false);
    await waitFor(async () =>
      expect((await repos.settings.getAll()).completionVibration).toBe(false),
    );
  });

  it('turns the tick sound on (off by default) and saves it', async () => {
    const { repos } = await renderWithApp(<SettingsScreen />);
    const toggle = await screen.findByLabelText('صوت خفيف عند كل عدّة');
    expect(toggle.props.value).toBe(false);
    await fireEvent(toggle, 'valueChange', true);
    await waitFor(async () => expect((await repos.settings.getAll()).tickSound).toBe(true));
  });

  it('opens About', async () => {
    await renderWithApp(<SettingsScreen />);
    await fireEvent.press(await screen.findByText('عن التطبيق'));
    expect(mockRouter.push).toHaveBeenCalledWith('/about');
  });
});
