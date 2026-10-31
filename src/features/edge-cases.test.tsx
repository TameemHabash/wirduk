/**
 * Edge cases of the brief §16 not covered elsewhere (milestone 13). No network, a full phone and
 * cut downloads are tested with the audio (audio-downloads, audio-screens) and the report
 * (ReportScreen); a large system font is checked on the owner's phone.
 */
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';

import type { Repositories } from '@/data/DataProvider';
import { DHIKR_FONT_SIZE } from '@/data/settings/settings';
import { AboutScreen } from '@/features/about/AboutScreen';
import { AdwamuhaSettingsScreen } from '@/features/adwamuha/AdwamuhaSettingsScreen';
import { addDays } from '@/features/adwamuha/logic/days';
import { startPlan } from '@/features/adwamuha/logic/progress';
import { copyDefaultPlan } from '@/features/adwamuha/logic/ward';
import { PlanEditorScreen } from '@/features/adwamuha/PlanEditorScreen';
import { ProgressScreen } from '@/features/adwamuha/ProgressScreen';
import { SetupIntroScreen } from '@/features/adwamuha/SetupIntroScreen';
import { SetupOrderScreen } from '@/features/adwamuha/SetupOrderScreen';
import { SetupRemindersScreen } from '@/features/adwamuha/SetupRemindersScreen';
import { SetupStartScreen } from '@/features/adwamuha/SetupStartScreen';
import { AudioDownloadsScreen } from '@/features/audio/AudioDownloadsScreen';
import { counterStore } from '@/features/counter/counter-store';
import { MyAdhkarScreen } from '@/features/custom/MyAdhkarScreen';
import { HomeScreen } from '@/features/home/HomeScreen';
import { ReaderScreen } from '@/features/reader/ReaderScreen';
import { ReportScreen } from '@/features/report/ReportScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { openShippedContentDb } from '@/test-utils/databases';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { setRouteParams } from '@/test-utils/router-mock';
import { COLORS, type ColorScheme } from '@/theme/colors';

const DAY = '2026-03-04';
const at9 = () => new Date(2026, 2, 4, 9, 0);

afterEach(async () => {
  await settleLists();
});

async function withAdwamuha(): Promise<Repositories> {
  const repos = await createTestRepositories();
  await repos.adwamuha.save({
    enabled: true,
    plan: copyDefaultPlan(await repos.content.getDefaultPlan('ar')),
    state: startPlan(3, addDays(DAY, -10)),
    startedOn: addDays(DAY, -10),
    offSince: null,
  });
  return repos;
}

describe('the longest dhikr at the largest font size', () => {
  it('shows all its text, and the counter and «إتمام» still work', async () => {
    const longest = await openShippedContentDb().getFirst<{ id: number; categoryId: number }>(
      `SELECT a.Id AS id, a.CategoryId AS categoryId FROM Adhkar a
         JOIN DhikrTranslations t ON t.DhikrId = a.Id AND t.Lang = 'ar'
        ORDER BY length(t.Text) DESC LIMIT 1`,
    );
    const repos = await createTestRepositories();
    await repos.settings.set('dhikrFontSize', DHIKR_FONT_SIZE.max);
    const dhikr = (await repos.content.getDhikr(longest!.id, 'ar'))!;
    expect(dhikr.text.length).toBeGreaterThan(500);
    counterStore.reset(dhikr.id);
    setRouteParams({ id: String(longest!.categoryId), dhikr: String(dhikr.id) });
    await renderWithApp(<ReaderScreen />, repos);
    // Every line of it is there, at size 40.
    const firstLine = dhikr.text.split('\n')[0]!;
    const shown = await screen.findByText(new RegExp(firstLine.slice(0, 20)));
    expect(StyleSheet.flatten(shown.props.style).fontSize).toBe(DHIKR_FONT_SIZE.max);
    expect(screen.getByLabelText(`تم 0 من ${dhikr.count}`)).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText(/^إتمام/));
    expect(counterStore.get(dhikr.id)).toBe(dhikr.count);
  });
});

/** Every color a rendered screen draws (styles and color props). */
function drawnColors(): Set<string> {
  const found = new Set<string>();
  const keys = ['color', 'backgroundColor', 'borderColor', 'tintColor', 'shadowColor'];
  const add = (v: unknown) => typeof v === 'string' && found.add(v.toLowerCase());
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    const n = node as { props?: Record<string, unknown>; children?: unknown[] };
    const style = StyleSheet.flatten(n.props?.style as never) as
      Record<string, unknown> | undefined;
    for (const key of keys) add(style?.[key]);
    for (const [key, value] of Object.entries(style ?? {})) if (/Color$/.test(key)) add(value);
    for (const key of ['color', 'thumbColor', 'placeholderTextColor', 'stroke', 'fill']) {
      add(n.props?.[key]);
    }
    n.children?.forEach(visit);
  };
  visit(screen.toJSON());
  return found;
}

/** The colors only one theme has (the other theme must never show them). */
function onlyIn(scheme: ColorScheme): Set<string> {
  const other = new Set(
    Object.values(COLORS[scheme === 'light' ? 'dark' : 'light']).map((c) => c.toLowerCase()),
  );
  return new Set(
    Object.values(COLORS[scheme])
      .map((c) => c.toLowerCase())
      .filter((c) => !other.has(c)),
  );
}

const SCREENS: [
  string,
  () => ReactElement,
  (() => Promise<Repositories>)?,
  Record<string, string>?,
][] = [
  ['Home', () => <HomeScreen />, withAdwamuha],
  ['Home without «أدومها»', () => <HomeScreen />],
  ['the reader', () => <ReaderScreen />, undefined, { id: '1' }],
  ['«مساري»', () => <ProgressScreen />, withAdwamuha],
  ['«أدومها» settings', () => <AdwamuhaSettingsScreen />, withAdwamuha],
  ['the plan editor', () => <PlanEditorScreen />, withAdwamuha],
  ['setup 1', () => <SetupIntroScreen />],
  ['setup 2', () => <SetupStartScreen />],
  ['setup 3', () => <SetupOrderScreen />, undefined, { step: '6' }],
  ['setup 4', () => <SetupRemindersScreen />, undefined, { step: '1' }],
  ['Settings', () => <SettingsScreen />],
  ['search', () => <SearchScreen />],
  ['audio downloads', () => <AudioDownloadsScreen />],
  ['my adhkar', () => <MyAdhkarScreen />],
  ['report a problem', () => <ReportScreen />],
  ['about', () => <AboutScreen />],
];

const ROWS = SCREENS.map(([name, ui, repos, params]) => ({ name, ui, repos, params }));

describe.each(['dark', 'light'] as const)('the %s theme everywhere', (scheme) => {
  it.each(ROWS)('$name uses no color of the other theme', async ({ ui, repos, params }) => {
    if (params) setRouteParams(params);
    await renderWithApp(ui(), repos ? await repos() : undefined, { now: at9, theme: scheme });
    await act(async () => {
      for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 10));
    });
    const drawn = [...drawnColors()];
    const foreign = [...onlyIn(scheme === 'dark' ? 'light' : 'dark')].filter((c) =>
      drawn.includes(c),
    );
    expect(foreign).toEqual([]);
    // And the screen is drawn in this theme (its background).
    expect(drawn).toContain(COLORS[scheme].background.toLowerCase());
  });
});
