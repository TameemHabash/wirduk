import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { APP_CONFIG } from '@/config/app-config';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { mockPicker } from '@/test-utils/mocks/audio';
import { renderWithApp } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/mocks/router';

import { freeStorageBytes } from '@/features/report/services/free-space';
import { formatBytes, formatScreen } from '@/features/report/services/report';
import { DETAIL_KEYS } from '@/features/report/logic/report-protocol';
import { ReportScreen } from './ReportScreen';
import { shrinkImage } from '@/features/report/services/shrink-image';
import { tr } from '@/test-utils/tr';

const ENDPOINT = 'https://relay.test';
const TEXT = 'العداد لا يتحرك بعد الضغط';
const SEND = tr('report.send');

type Sent = { description: string; details: Record<string, string>; images: unknown[] };

let fetchMock: jest.Mock;
const originalFetch = global.fetch;

function answer(status: number, body: object) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

const sent = (): Sent => JSON.parse(String(fetchMock.mock.calls[0][1].body)) as Sent;

beforeEach(() => {
  jest.replaceProperty(APP_CONFIG.report, 'endpoint', ENDPOINT);
  fetchMock = jest.fn();
  global.fetch = fetchMock;
  answer(201, { ok: true });
});

afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = originalFetch;
});

async function openWith(text?: string) {
  await renderWithApp(<ReportScreen />);
  if (text !== undefined) {
    await fireEvent.changeText(await screen.findByLabelText(tr('report.description')), text);
  }
}

describe('Report details — formats', () => {
  it('writes sizes in GB, or MB below 1 GB', () => {
    expect(formatBytes(12.34 * 1024 ** 3)).toBe('12.3 GB');
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB');
    expect(formatBytes(850 * 1024 ** 2)).toBe('850 MB');
  });

  it('writes the screen in pixels and in layout units', () => {
    expect(formatScreen(384, 854.4, 2.8125)).toBe('1080×2403 px (384×854 dp)');
  });
});

describe('Report an issue — Settings', () => {
  it('has the row only once the relay exists, and it opens the report screen', async () => {
    await renderWithApp(<SettingsScreen />);
    await fireEvent.press(await screen.findByText(tr('report.title')));
    expect(mockRouter.push).toHaveBeenCalledWith('/report');
  });

  it('has no row without a relay', async () => {
    jest.replaceProperty(APP_CONFIG.report, 'endpoint', null);
    await renderWithApp(<SettingsScreen />);
    await screen.findByText(tr('settings.privacy'));
    expect(screen.queryByText(tr('report.title'))).toBeNull();
  });
});

describe('Report an issue — screen', () => {
  it('sends nothing until the description is long enough', async () => {
    await openWith('قصير');
    expect(screen.getByText('اكتب 10 أحرف على الأقل')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: SEND })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: SEND }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the details before sending, sends the report, thanks the user and goes back', async () => {
    await openWith(`  ${TEXT}  `);
    expect(screen.getByText(tr('report.detail.contentVersion'))).toBeOnTheScreen();
    expect(screen.getByText(String(APP_CONFIG.content.version))).toBeOnTheScreen();
    expect(screen.getByText(tr('report.detail.dhikrFontSize'))).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: SEND }));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/report`);
    expect(sent()).toMatchObject({
      description: TEXT,
      details: { contentVersion: String(APP_CONFIG.content.version), dhikrFontSize: '24' },
      images: [],
    });
    expect(await screen.findByText(tr('report.sent'))).toBeOnTheScreen();
  });

  it('shows and sends the screen size, the phone text size and the free storage', async () => {
    await openWith(TEXT);
    expect(screen.getByText(tr('report.detail.screen'))).toBeOnTheScreen();
    expect(screen.getByText(tr('report.detail.fontScale'))).toBeOnTheScreen();
    expect(screen.getByText(tr('report.detail.freeStorage'))).toBeOnTheScreen();
    expect(screen.getByText('12.3 GB')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: SEND }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const { details } = sent();
    expect(details.freeStorage).toBe('12.3 GB');
    expect(details.fontScale).toMatch(/^\d+%$/);
    expect(details.screen).toMatch(/^\d+×\d+ px \(\d+×\d+ dp\)$/);
    // In the same order as on the screen and in the issue (empty ones are left out).
    const keys = Object.keys(details);
    expect(keys).toEqual(DETAIL_KEYS.filter((k) => keys.includes(k)));
  });

  it('leaves out the free storage when the phone does not say', async () => {
    jest.mocked(freeStorageBytes).mockReturnValueOnce(null);
    await openWith(TEXT);
    expect(screen.queryByText(tr('report.detail.freeStorage'))).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: SEND }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sent().details).not.toHaveProperty('freeStorage');
  });

  it('can leave the details out', async () => {
    await openWith(TEXT);
    await fireEvent(screen.getByLabelText(tr('report.includeDetails')), 'valueChange', false);
    await fireEvent.press(screen.getByRole('button', { name: SEND }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sent().details).toEqual({});
  });

  it('adds screenshots (made small first), removes one, and sends the rest', async () => {
    mockPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.png' }, { uri: 'file:///b.png' }],
    });
    await openWith(TEXT);
    await fireEvent.press(screen.getByRole('button', { name: tr('report.addScreenshots') }));
    expect(await screen.findByLabelText('صورة 2')).toBeOnTheScreen();
    expect(shrinkImage).toHaveBeenCalledWith('file:///a.png');

    await fireEvent.press(screen.getByLabelText('حذف الصورة 1'));
    expect(screen.queryByLabelText('صورة 2')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: SEND }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sent().images).toEqual([{ type: 'image/jpeg', data: '/9j/AAAA' }]);
  });

  it('keeps at most 4 screenshots and says so', async () => {
    mockPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [1, 2, 3, 4, 5].map((n) => ({ uri: `file:///${n}.png` })),
    });
    await openWith(TEXT);
    await fireEvent.press(screen.getByRole('button', { name: tr('report.addScreenshots') }));
    expect(await screen.findByLabelText('صورة 4')).toBeOnTheScreen();
    expect(screen.queryByLabelText('صورة 5')).toBeNull();
    expect(screen.getByText('يمكن إرفاق 4 صور فقط، فأُضيفت الأولى منها.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: tr('report.addScreenshots') })).toBeDisabled();
  });

  it('says when a picture cannot be used', async () => {
    mockPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///huge.png' }],
    });
    jest.mocked(shrinkImage).mockResolvedValueOnce(null);
    await openWith(TEXT);
    await fireEvent.press(screen.getByRole('button', { name: tr('report.addScreenshots') }));
    expect(await screen.findByText(tr('report.imageError'))).toBeOnTheScreen();
    expect(screen.queryByLabelText('صورة 1')).toBeNull();
  });

  it.each([
    ['offline', tr('report.errors.offline')],
    ['rate-limited', tr('report.errors.rate-limited')],
    ['failed', tr('report.errors.failed')],
  ])('explains a failure (%s) and stays on the screen', async (kind, message) => {
    if (kind === 'offline') fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    else if (kind === 'rate-limited') answer(429, { ok: false, error: 'rate-limited' });
    else answer(500, {}); // no known error: "failed"
    await openWith(TEXT);
    await fireEvent.press(screen.getByRole('button', { name: SEND }));
    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
    // The text is kept, so the user can try again.
    expect(screen.getByRole('button', { name: SEND })).toBeEnabled();
  });
});
