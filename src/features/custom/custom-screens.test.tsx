import { StyleSheet } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AdhkarScreen } from '@/features/adhkar/AdhkarScreen';
import { CategoryEditorScreen } from '@/features/custom/CategoryEditorScreen';
import { DhikrEditorScreen } from '@/features/custom/DhikrEditorScreen';
import { MyAdhkarScreen } from '@/features/custom/MyAdhkarScreen';
import { ReaderScreen } from '@/features/reader/ReaderScreen';
import { mockCustomAudio, mockPermission, mockPicker } from '@/test-utils/audio-mock';
import { dialogButtons, openDialog, pressInDialog } from '@/test-utils/dialog';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter, setRouteParams } from '@/test-utils/router-mock';

async function withCategory(title = 'أدعيتي') {
  const repos = await createTestRepositories();
  const category = await repos.custom.createCategory(title);
  return { repos, category };
}

describe('The adhkar tab — أذكاري section', () => {
  it('invites the user to add their own adhkar when there are none', async () => {
    await renderWithApp(<AdhkarScreen />);
    expect(await screen.findByText('أضف أذكارك الخاصة')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'إضافة باب' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/custom/new');
  });

  it('lists own categories first, opens them, and links to manage', async () => {
    const { repos, category } = await withCategory();
    await repos.custom.createDhikr(category.id, { text: 'سبحان الله', count: 33 });
    await renderWithApp(<AdhkarScreen />, repos);
    await fireEvent.press(await screen.findByLabelText('أدعيتي، ذكر واحد'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/category/[id]',
      params: { id: String(category.id) },
    });
    await fireEvent.press(screen.getByText('إدارة'));
    expect(mockRouter.push).toHaveBeenCalledWith('/custom');
  });

  it('lets an own category be a favorite', async () => {
    const { repos, category } = await withCategory();
    await renderWithApp(<AdhkarScreen />, repos);
    await fireEvent.press(await screen.findByLabelText('إضافة «أدعيتي» إلى المفضلة'));
    expect(await screen.findByLabelText('إزالة «أدعيتي» من المفضلة')).toBeOnTheScreen();
    expect(await repos.favorites.list()).toEqual([category.id]);
    await settleLists();
  });
});

describe('New category', () => {
  it('creates a category and opens its editor', async () => {
    const { repos } = await renderWithApp(<CategoryEditorScreen />);
    await fireEvent.changeText(screen.getByLabelText('اسم الباب'), 'أذكار العمل');
    await fireEvent.press(screen.getByText('إنشاء'));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/custom/[id]',
        params: { id: '-1' },
      }),
    );
    expect((await repos.custom.listCategories()).map((c) => c.title)).toEqual(['أذكار العمل']);
  });

  it('asks for a name', async () => {
    await renderWithApp(<CategoryEditorScreen />);
    await fireEvent.press(screen.getByText('إنشاء'));
    expect(await screen.findByText('اكتب اسم الباب.')).toBeOnTheScreen();
  });
});

describe('Edit category', () => {
  it('lists the adhkar and opens the dhikr editor', async () => {
    const { repos, category } = await withCategory();
    const d = await repos.custom.createDhikr(category.id, { text: 'الحمد لله', count: 33 });
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<CategoryEditorScreen />, repos);
    expect(await screen.findByText('الحمد لله')).toBeOnTheScreen();
    expect(screen.getByText('× 33')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('الحمد لله'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/custom/[id]/dhikr/[dhikrId]',
      params: { id: String(category.id), dhikrId: String(d.id) },
    });
    await fireEvent.press(screen.getByText('إضافة ذكر'));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/custom/[id]/dhikr/[dhikrId]',
      params: { id: String(category.id), dhikrId: 'new' },
    });
  });

  it('renames the category', async () => {
    const { repos, category } = await withCategory('قديم');
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<CategoryEditorScreen />, repos);
    await fireEvent.changeText(await screen.findByDisplayValue('قديم'), 'جديد');
    await fireEvent.press(screen.getByText('حفظ'));
    await waitFor(async () =>
      expect((await repos.custom.getCategory(category.id))?.title).toBe('جديد'),
    );
  });

  it('deletes the category with its audio and its favorite, after confirming', async () => {
    const { repos, category } = await withCategory();
    await repos.custom.createDhikr(category.id, { text: 'نص', count: 1, audioFile: 'a.m4a' });
    await repos.favorites.add(category.id);
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<CategoryEditorScreen />, repos);
    await fireEvent.press(await screen.findByText('حذف الباب'));
    // The name with no «», in its own color (owner, 2026-11-26); the red button on top.
    expect(openDialog().getByText(/^حذف أدعيتي؟$/)).toBeOnTheScreen();
    expect(openDialog().queryByText(/«/)).toBeNull();
    const name = openDialog().getByText('أدعيتي');
    expect(StyleSheet.flatten(name.props.style).color).not.toBe(
      StyleSheet.flatten(openDialog().getByText(/^حذف أدعيتي؟$/).props.style).color,
    );
    expect(dialogButtons()).toEqual(['حذف', 'إلغاء']);
    await pressInDialog('حذف');
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith('/adhkar'));
    expect(await repos.custom.listCategories()).toEqual([]);
    expect(await repos.favorites.list()).toEqual([]);
    expect(mockCustomAudio.deleteCustomAudio).toHaveBeenCalledWith('a.m4a');
  });

  it('cancelling the delete keeps the category', async () => {
    const { repos, category } = await withCategory();
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<CategoryEditorScreen />, repos);
    await fireEvent.press(await screen.findByText('حذف الباب'));
    await pressInDialog('إلغاء');
    expect(screen.queryByTestId('dialog')).toBeNull();
    expect(await repos.custom.listCategories()).toHaveLength(1);
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });
});

describe('Dhikr editor', () => {
  async function openNew() {
    const { repos, category } = await withCategory();
    setRouteParams({ id: String(category.id), dhikrId: 'new' });
    await renderWithApp(<DhikrEditorScreen />, repos);
    return { repos, category };
  }

  it('saves text with tashkeel, count, notes and goes back', async () => {
    const { repos, category } = await openNew();
    await fireEvent.changeText(screen.getByLabelText('نص الذكر'), 'سُبْحَانَ اللَّهِ');
    await fireEvent.press(screen.getByLabelText('زيادة العدد'));
    await fireEvent.press(screen.getByLabelText('زيادة العدد'));
    await fireEvent.changeText(screen.getByLabelText('الفضل (اختياري)'), 'فضل');
    await fireEvent.changeText(screen.getByLabelText('المصدر (اختياري)'), 'مصدر');
    await fireEvent.press(screen.getByText('حفظ'));
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
    await fireEvent.press(screen.getByText('حفظ'));
    expect(await screen.findByText('اكتب نص الذكر.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('نص الذكر'), 'نص');
    await fireEvent.changeText(screen.getByLabelText('عدد المرات'), '0');
    await fireEvent.press(screen.getByText('حفظ'));
    expect(await screen.findByText('عدد المرات رقم صحيح من 1 إلى 100000.')).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('the count: + and −, or the number typed (owner, 2026-11-26)', async () => {
    const { repos, category } = await openNew();
    await fireEvent.changeText(screen.getByLabelText('نص الذكر'), 'نص');
    await fireEvent.changeText(screen.getByLabelText('عدد المرات'), '1000');
    await fireEvent.press(screen.getByLabelText('زيادة العدد'));
    expect(screen.getByLabelText('عدد المرات').props.value).toBe('1001');
    await fireEvent.press(screen.getByLabelText('إنقاص العدد'));
    await fireEvent.press(screen.getByLabelText('إنقاص العدد'));
    expect(screen.getByLabelText('عدد المرات').props.value).toBe('999');
    // Only digits are kept.
    await fireEvent.changeText(screen.getByLabelText('عدد المرات'), '12x');
    expect(screen.getByLabelText('عدد المرات').props.value).toBe('12');
    await fireEvent.press(screen.getByText('حفظ'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect((await repos.custom.listAdhkar(category.id))[0]?.count).toBe(12);
  });

  it('refuses a count above 100000', async () => {
    await openNew();
    await fireEvent.changeText(screen.getByLabelText('نص الذكر'), 'نص');
    await fireEvent.changeText(screen.getByLabelText('عدد المرات'), '100001');
    await fireEvent.press(screen.getByText('حفظ'));
    expect(await screen.findByText('عدد المرات رقم صحيح من 1 إلى 100000.')).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
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
    expect(await screen.findByLabelText('حذف الصوت')).toBeOnTheScreen();
    expect(screen.queryByLabelText('تسجيل بصوتي')).toBeNull();
    expect(screen.queryByLabelText('اختيار ملف صوتي')).toBeNull();
    await fireEvent.press(screen.getByLabelText('حذف الصوت'));
    expect(screen.getByLabelText('تسجيل بصوتي')).toBeOnTheScreen();
    expect(screen.getByLabelText('اختيار ملف صوتي')).toBeOnTheScreen();
  });

  it('adds an audio file picked from the phone', async () => {
    mockPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///cache/dua.mp3', name: 'dua.mp3', size: 1000, mimeType: 'audio/mpeg' },
      ],
    });
    const { repos, category } = await openNew();
    await fireEvent.changeText(screen.getByLabelText('نص الذكر'), 'نص');
    await fireEvent.press(screen.getByLabelText('اختيار ملف صوتي'));
    expect(await screen.findByLabelText('حذف الصوت')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('حفظ'));
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
    await fireEvent.press(screen.getByLabelText('اختيار ملف صوتي'));
    expect(await screen.findByText('هذا الملف ليس ملفًا صوتيًا.')).toBeOnTheScreen();
    expect(mockCustomAudio.storeCustomAudio).not.toHaveBeenCalled();
  });

  it('explains when the microphone is not allowed', async () => {
    mockPermission.granted = false;
    await openNew();
    await fireEvent.press(screen.getByLabelText('تسجيل بصوتي'));
    expect(
      await screen.findByText('لم يُسمح باستخدام الميكروفون. يمكنك السماح به من إعدادات الهاتف.'),
    ).toBeOnTheScreen();
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
    await fireEvent.press(await screen.findByLabelText('حذف الصوت'));
    await fireEvent.press(screen.getByText('حفظ'));
    await waitFor(() => expect(mockCustomAudio.deleteCustomAudio).toHaveBeenCalledWith('old.m4a'));
    expect((await repos.custom.getDhikr(d.id))?.audioFile).toBeNull();
  });

  it('deletes a dhikr after confirming', async () => {
    const { repos, category } = await withCategory();
    const d = await repos.custom.createDhikr(category.id, { text: 'نص', count: 1 });
    setRouteParams({ id: String(category.id), dhikrId: String(d.id) });
    await renderWithApp(<DhikrEditorScreen />, repos);
    await fireEvent.press(await screen.findByText('حذف الذكر'));
    expect(openDialog().getByText('حذف هذا الذكر؟')).toBeOnTheScreen();
    await pressInDialog('حذف');
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await repos.custom.getDhikr(d.id)).toBeNull();
  });
});

describe('Reading own adhkar', () => {
  it('counts an own dhikr like any other, shows the "أذكاري" label and an edit button', async () => {
    const { repos, category } = await withCategory();
    await repos.custom.createDhikr(category.id, { text: 'أستغفر الله', count: 3 });
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<ReaderScreen />, repos);
    const counter = await screen.findByLabelText('تم 0 من 3');
    await fireEvent(counter, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(screen.getByLabelText('تم 1 من 3')).toBeOnTheScreen();
    expect(screen.getByText('أذكاري')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('تعديل الباب'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/custom/[id]',
      params: { id: String(category.id) },
    });
  });

  it('offers to add a dhikr to an empty own category', async () => {
    const { repos, category } = await withCategory();
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<ReaderScreen />, repos);
    expect(await screen.findByText('لا أذكار في هذا الباب بعد.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('إضافة ذكر'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/custom/[id]/dhikr/[dhikrId]',
      params: { id: String(category.id), dhikrId: 'new' },
    });
  });

  it('finds own adhkar in search, first and labelled', async () => {
    const { repos, category } = await withCategory();
    await repos.custom.createDhikr(category.id, { text: 'رَضِيتُ بِاللَّهِ رَبًّا', count: 1 });
    await renderWithApp(<AdhkarScreen />, repos);
    await fireEvent.changeText(
      screen.getByPlaceholderText('ابحث بكلمة من الذكر أو اسم الباب'),
      'رضيت بالله',
    );
    expect((await screen.findAllByText(/^أذكاري · أدعيتي · الذكر 1$/)).length).toBe(1);
  });
});

describe('My adhkar screen', () => {
  it('lists own categories and opens their editor', async () => {
    const { repos, category } = await withCategory();
    await renderWithApp(<MyAdhkarScreen />, repos);
    await fireEvent.press(await screen.findByLabelText('أدعيتي، لا أذكار'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/custom/[id]',
      params: { id: String(category.id) },
    });
    await fireEvent.press(screen.getByText('إضافة باب'));
    expect(mockRouter.push).toHaveBeenCalledWith('/custom/new');
  });
});
