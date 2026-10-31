/**
 * Cuts the interface texts of the owner's Adwamuha design
 * (`docs/adwamuha/flow-design.html`) into the app's strings
 * (`src/i18n/locales/ar/common.json`), so no Arabic is typed by hand. Each
 * text is found by the HTML around it; the keys it owns (the groups below and
 * `adwamuha.weekdays`) must not be edited by hand.
 *
 *   node scripts/adwamuha/design-strings.ts          write them
 *   node scripts/adwamuha/design-strings.ts --check  fail if common.json differs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { DESIGN_FILE, EDITS_FILE } from './owner-texts.ts';

export const STRINGS_FILE = join('src', 'i18n', 'locales', 'ar', 'common.json');

type Strings = Record<string, Record<string, unknown>>;

function cut(design: string, re: RegExp, what: string): string[] {
  const m = re.exec(design);
  if (!m) throw new Error(`Not found in the owner's design: ${what}`);
  return m.slice(1).map((s) => s.trim());
}

const all = (design: string, re: RegExp) => [...design.matchAll(re)].map((m) => m[1]!.trim());

/** Key suffixes by the day's number in the app (0 = Sunday, as `Date.getDay()`). */
const DAY_KEYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * The design's short day names (the week grid, the week start preview), Sunday first as
 * `adwamuha.weekdays` (the design lists them Saturday first).
 */
export function weekdayNames(design: string): string[] {
  const [list] = cut(design, /const WD=\[([^\]]+)\]/, 'short day names');
  const names = list!.split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
  if (names.length !== 7) throw new Error('The design should have 7 short day names');
  return [...names.slice(1), names[0]!];
}

/**
 * The setup screens (design screens 1–3). `intent`: the owner's «النية لكل يوم»,
 * kept in the 4-of-7 line (owner, 2026-10-29; docs/adwamuha/owner-edits.json).
 */
export function setupStrings(design: string, intent: string): Record<string, string> {
  const [title] = cut(design, /<h2 class="ob-title">([^<]+)<\/h2>/, 'ob-title');
  const points = [
    ...design.matchAll(
      /<div class="feat"><span class="n">[^<]+<\/span><div>([^<]+)<small>([^<]+)<\/small><\/div><\/div>/g,
    ),
  ].map((m) => [m[1]!.trim(), m[2]!.trim()]);
  if (points.length !== 3) throw new Error('The design should have 3 points on screen 1');
  const [enable] = cut(
    design,
    /<button class="btn" onclick="go\('ob2'\)">([^<]+)<\/button>/,
    'enable',
  );
  const [startTitle] = cut(
    design,
    /go\('ob1'\)">\$\{I\.back\}<\/button><h1>([^<]+)<\/h1>/,
    'ob2 title',
  );
  const [remindersTitle] = cut(
    design,
    /go\('ob2'\)">\$\{I\.back\}<\/button><h1>([^<]+)<\/h1>/,
    'ob3 title',
  );
  const intros = all(design, /<p class="ob-sub">([^<]+)<\/p>/g);
  if (intros.length !== 2) throw new Error('The design should have 2 setup intros');
  const choice = (mode: string) =>
    cut(
      design,
      new RegExp(
        `set\\(\\{startMode:'${mode}'\\}\\)">\\s*<b>([^<]+)<span class="radio"></span></b>\\s*<span>([^<]+)</span>`,
      ),
      `${mode} choice`,
    );
  const [fromFirst, fromFirstNote] = choice('first');
  const [fromSome, fromSomeNote] = choice('custom');
  const [stepNote] = cut(design, /<p class="warn">([^<]+)<\/p>/, 'warn');
  const [next] = cut(design, /<button class="btn" onclick="go\('ob3'\)">([^<]+)<\/button>/, 'next');
  const [daily] = cut(
    design,
    /<div class="t"><b>[^<]+<\/b><span>([^<]+)<\/span><\/div>\s*<button class="time">/,
    'daily reminder',
  );
  const [remindersHint] = cut(design, /<p class="hint">([^<]+)<\/p>/, 'reminder hint');
  const [go] = cut(design, /homeState:'first'\}\);go\('homeOn'\)">([^<]+)<\/button>/, 'go');

  const [point1, point2, point3] = points as [[string, string], [string, string], [string, string]];
  return {
    title: title!,
    point1: point1[0],
    point1Note: point1[1],
    point2: point2[0],
    point2Note: point2[1],
    point3: point3[0],
    point3Note: `${intent}، ${point3[1]}`,
    enable: enable!,
    startTitle: startTitle!,
    startIntro: intros[0]!,
    fromFirst: fromFirst!,
    fromFirstNote: fromFirstNote!,
    fromSome: fromSome!,
    fromSomeNote: fromSomeNote!,
    stepNote: stepNote!,
    next: next!,
    remindersTitle: remindersTitle!,
    remindersIntro: intros[1]!,
    daily: daily!,
    remindersHint: remindersHint!,
    go: go!,
  };
}

/** Home with «أدومها» on (design screen 4): the ward statuses and the quiet full-adhkar cards. */
export function homeStrings(design: string): Record<string, string> {
  const status = (key: string, kind: string, icon: string) =>
    cut(design, new RegExp(`${key}:\\['${kind}',${icon},'([^']+)'\\]`), `status ${key}`)[0]!;
  const [fullAdhkar] = cut(design, /<div class="sec-head"><h3>([^<]+)<\/h3><\/div>/, 'full adhkar');
  // «أتممتَ المسار · وضع المحافظة»: the second part, for the step chip after the last step.
  const [finished] = cut(design, /done:\{step:24,stage:'([^']+)'/, 'finished stage line');
  const maintenance = finished!.split(' · ')[1];
  if (!maintenance) throw new Error(`The design's finished line changed shape: ${finished}`);
  return {
    done: status('done', 'done', 'I\\.check'),
    late: status('late', 'late', 'I\\.clock'),
    now: status('now', 'now', "''"),
    notYet: status('wait', 'wait', "''"),
    missed: status('missed', 'wait', "''"),
    fullAdhkar: fullAdhkar!,
    maintenance,
  };
}

/** «مساري» (design screen 6): the ring, the week, recording outside the app, the special states. */
export function masariStrings(design: string): Record<string, string> {
  const at = (re: RegExp, what: string) => cut(design, re, what);
  const [stepsOf] = at(
    /<div class="n">\$\{S\.step\}<\/div><div class="of">([^<]+)<\/div>`\}/,
    'ring: of N steps',
  );
  const [allDone] = at(/<\/svg><\/div><div class="of">([^<]+)<\/div>/, 'ring: all done');
  const [finishedStage, finishedLeft] = at(
    /done:\{step:24,stage:'([^']+)',left:'([^']+)'/,
    'finished lines',
  );
  const [breakLeft] = at(/brk:\{step:\d+,stage:'[^']+',left:'([^']+)'/, 'break line');
  const [weekTitle] = at(/<h3 class="wk-title">([^<]+)<\/h3>/, 'week title');
  const [today] = at(/\$\{c\.today\?'([^']+)':c\.name\}/, 'today');
  const [morningRow] = at(
    /<span class="lbl">([^<]+)<\/span>\$\{cells\.map\([^\n]*?S\.am\[/,
    'morning row',
  );
  const [eveningRow] = at(
    /<span class="lbl">([^<]+)<\/span>\$\{cells\.map\([^\n]*?S\.pm\[/,
    'evening row',
  );
  const [firstWeekGoal] = at(/isFirst\?`<div class="goal"><h4>([^<]+)<\/h4><\/div>`/, 'first week');
  const [goalTitle, goalMoveOn] = at(/<h4>\$\{isDone\?'([^']+)':'([^']+)'\}<\/h4>/, 'goal titles');
  const [goalMet, ofFour] = at(/n>=4\?'([^']+)':n\+'([^']+)'/, 'goal bar');
  const legend = (dot: string, icon: string) =>
    at(new RegExp(`<span class="dot ${dot}">${icon}</span>([^<]+)</span>`), `legend ${dot}`)[0]!;
  const [bannerTitle, bannerText] = at(
    /<div class="banner"><b>([^<]+)<\/b>([^<]+)<\/div>/,
    'banner',
  );
  const breakUntil = bannerTitle!.split(' ').slice(0, 2).join(' ');
  const [breakEnded, endBreak] = at(
    /MDkey=null;render\(\);say\('([^']+)'\)">([^<]+)<\/button>/,
    'end the break',
  );
  const [readOutside, readOutsideNote] = at(
    /<span class="ri">\$\{I\.check\}<\/span><span><b>([^<]+)<\/b><small>([^<]+)<\/small>/,
    'read outside the app',
  );
  const [pickTitle, pickText] = at(
    /openSheet\(`<h2>([^<]+)<\/h2><p>([^<]+)<\/p>\s*\$\{rows/,
    'sheet',
  );
  const [todayWord] = at(/rows\.push\(\['am',6,'[^']+','([^']+)'/, 'today');
  const [yesterdayWord] = at(/rows\.push\(\['am',5,'[^']+','([^']+)'/, 'yesterday');
  const [nothingLeft] = at(
    /:`<p style="text-align:center;margin:8px 0 16px">([^<]+)<\/p>`\}/,
    'none',
  );
  const [onlyTwoDays] = at(/<p class="fine">([^<]+)<\/p>/, 'today and yesterday only');
  const [olderDay] = at(/<button class="dot miss" onclick="say\('([^']+)'\)"><\/button>/, 'older');
  const [yTitle, yText, yConfirm] = at(
    /<h2>([^<]+)<\/h2><p>([^<]+)<\/p>\s*<button class="btn" onclick="confirmYest\('\$\{ses\}'\)">([^<]+)<\/button>/,
    'record yesterday',
  );
  const [lifeChange] = at(
    /:`<button class="link" onclick="openLife\(\)">([^<]+)<\/button>`\}/,
    'life',
  );
  const [turnOff] = at(
    /isDone\?`<button class="link" onclick="say\('[^']+'\)">([^<]+)<\/button>`/,
    'off',
  );

  // ${ses} → {{ward}}; «يوم الثلاثاء» → «يوم {{day}}»; numbers → {{count}} / {{total}}.
  const ward = (s: string) => s.replace(/\$\{ses\}/g, '{{ward}}');
  const dayInText = ward(yText!).replace(/(يوم) \S+ (من)/, '$1 {{day}} $2');
  if (!dayInText.includes('{{day}}'))
    throw new Error(`The design's yesterday text changed: ${yText}`);
  return {
    stepsOf: stepsOf!.replace(/\d+/, '{{total}}'),
    allDone: allDone!.replace(/[٠-٩]+/g, '{{total}}'),
    finishedStage: finishedStage!,
    finishedLeft: finishedLeft!,
    breakLeft: breakLeft!,
    weekTitle: weekTitle!,
    today: today!,
    morningRow: morningRow!,
    eveningRow: eveningRow!,
    firstWeekGoal: firstWeekGoal!,
    goalTitle: goalTitle!,
    goalMoveOn: goalMoveOn!,
    goalMet: goalMet!,
    goalCount: `{{count}} ${ofFour}`,
    legendDone: legend('done', '\\$\\{I\\.check\\}'),
    legendLate: legend('late', '\\$\\{I\\.clock\\}'),
    legendMissed: legend('miss', ''),
    legendYesterday: legend('miss tap', ''),
    breakUntil: `${breakUntil} {{date}}`,
    breakText: bannerText!,
    endBreak: endBreak!,
    breakEnded: breakEnded!,
    readOutside: readOutside!,
    readOutsideNote: readOutsideNote!,
    pickTitle: pickTitle!,
    pickText: pickText!,
    todayWord: todayWord!,
    yesterdayWord: yesterdayWord!,
    nothingLeft: nothingLeft!,
    onlyTwoDays: onlyTwoDays!,
    olderDay: olderDay!,
    yesterdayTitle: ward(yTitle!),
    yesterdayText: dayInText,
    yesterdayConfirm: yConfirm!,
    lifeChange: lifeChange!,
    turnOff: turnOff!,
  };
}

/**
 * The «أدومها» settings screen (design screen 7). Its backup paragraph is not taken: Claude's
 * own text is used instead (owner, 2026-10-29).
 */
export function settingsStrings(design: string): Record<string, string> {
  const at = (re: RegExp, what: string) => cut(design, re, what);
  const [enabled, enabledNote, offNote] = at(
    /\$\{row\('([^']+)','([^']+)',`<button class="sw on" onclick="say\('([^']+)'\)"><\/button>`\)\}/,
    'on/off row',
  );
  const headings = all(design, /<h4 class="sh">([^<]+)<\/h4>/g);
  if (headings.length !== 6) throw new Error('The design should have 6 settings headings');
  // «بداية الأسبوع» (design, 2026-10-30): four choices, numbered with Saturday = 0 there.
  const [choices] = at(
    /\$\{\[((?:\[\d,'[^']+'\],?)+)\]\.map\(\(\[v,n\]\)=>`<button role="radio"/,
    'week start choices',
  );
  const weekStart: Record<string, string> = {};
  for (const m of choices!.matchAll(/\[(\d),'([^']+)'\]/g)) {
    weekStart[`weekStart${DAY_KEYS[(Number(m[1]) + 6) % 7]!}`] = m[2]!;
  }
  if (Object.keys(weekStart).length !== 4) throw new Error('The design should have 4 week starts');
  const [weekStartHint] = at(/<p class="whint">([^<]+)<\/p>/, 'week start hint');
  const [planOrder, recommended, planOrderNote] = at(
    /set\(\{order:'adw'\}\)">\s*<b>([^<]+)<span class="tag">([^<]+)<\/span><span class="radio"><\/span><\/b>\s*<span>([^<]+)<\/span>/,
    'plan order',
  );
  const [categoryOrder, categoryOrderNote] = at(
    /set\(\{order:'cat'\}\)"[^>]*>\s*<b>([^<]+)<span class="radio"><\/span><\/b>\s*<span>([^<]+)<\/span>/,
    'category order',
  );
  const [nudge, backToPlan] = at(
    /<div class="nudge">\$\{I\.bulb\}<div>([^<]+)<button class="link"[^>]*>([^<]+)<\/button>/,
    'nudge',
  );
  const [previewTitle] = at(/<div class="order-prev"><small>([^<]+)<\/small>/, 'preview');
  const times = [
    ...design.matchAll(
      /\$\{row\('([^']+)','([^']+)',`<button class="time">[^<]+<\/button><span class="muted">/g,
    ),
  ];
  const plan = [
    ...design.matchAll(/\$\{row\('([^']+)','([^']+)',`<span class="muted">\$\{I\.chev\}<\/span>`/g),
  ];
  if (times.length !== 2 || plan.length !== 2) throw new Error('The design changed its rows');
  const [openBackup] = at(
    /<button class="btn ghost" style="margin-top:12px;height:48px" onclick="say\('[^']+'\)">([^<]+)<\/button>/,
    'backup button',
  );
  const [orderTitle, remindersTitle, timesTitle, weekStartTitle, planTitle, backupTitle] =
    headings as [string, string, string, string, string, string];
  return {
    enabled: enabled!,
    enabledNote: enabledNote!,
    offNote: offNote!,
    orderTitle,
    planOrder: planOrder!,
    recommended: recommended!,
    planOrderNote: planOrderNote!,
    categoryOrder: categoryOrder!,
    categoryOrderNote: categoryOrderNote!,
    nudge: nudge!,
    backToPlan: backToPlan!,
    previewTitle: previewTitle!,
    remindersTitle,
    timesTitle,
    morningTimes: times[0]![1]!.trim(),
    morningTimesNote: times[0]![2]!.trim(),
    eveningTimes: times[1]![1]!.trim(),
    eveningTimesNote: times[1]![2]!.trim(),
    weekStartTitle,
    ...weekStart,
    weekStartHint: weekStartHint!,
    planTitle,
    editPlanNote: plan[0]![2]!.trim(),
    lifeChangeNote: plan[1]![2]!.trim(),
    backupTitle,
    openBackup: openBackup!,
  };
}

/** The owner's later words for the design's strings (docs/adwamuha/owner-edits.json). */
export interface DesignEdits {
  /** «النية لكل يوم», kept at the start of the 4-of-7 line (owner, 2026-10-29). */
  intent: string;
  /** Corrections (owner, 2026-10-30): in `group.key`, `from` (once in the design's text) becomes `to`. */
  fixes: { key: string; from: string; to: string }[];
}

export function designEdits(editsJson: string): DesignEdits {
  const edits = JSON.parse(editsJson) as {
    setupIntent: { text: string };
    designFixes?: { fixes: DesignEdits['fixes'] };
  };
  return { intent: edits.setupIntent.text, fixes: edits.designFixes?.fixes ?? [] };
}

/** Every string this script owns: `adwamuha.<group>.<key>`. */
export function designStrings(
  design: string,
  edits: DesignEdits,
): Record<string, Record<string, string>> {
  const groups: Record<string, Record<string, string>> = {
    setup: setupStrings(design, edits.intent),
    home: homeStrings(design),
    masari: masariStrings(design),
    settingsScreen: settingsStrings(design),
  };
  for (const { key, from, to } of edits.fixes) {
    const [group, name] = key.split('.') as [string, string];
    const value = groups[group]?.[name];
    if (value === undefined || value.split(from).length !== 2) {
      throw new Error(`The owner's fix for ${key} no longer matches the design: ask the owner`);
    }
    groups[group]![name] = value.replace(from, to);
  }
  return groups;
}

/** common.json with the design's strings put in (each group replaced whole). */
export function applyDesignStrings(strings: Strings, design: string, edits: DesignEdits): Strings {
  const adwamuha: Record<string, unknown> = { ...strings.adwamuha };
  for (const [group, values] of Object.entries(designStrings(design, edits))) {
    adwamuha[group] = values;
  }
  adwamuha.weekdays = weekdayNames(design);
  return { ...strings, adwamuha };
}

if (process.argv[1]?.endsWith('design-strings.ts')) {
  const root = join(dirname(process.argv[1]), '..', '..');
  const read = (file: string) => readFileSync(join(root, file), 'utf8');
  const current = JSON.parse(read(STRINGS_FILE)) as Strings;
  const next = applyDesignStrings(current, read(DESIGN_FILE), designEdits(read(EDITS_FILE)));
  if (process.argv.includes('--check')) {
    if (JSON.stringify(next) !== JSON.stringify(current)) {
      console.error(
        `${STRINGS_FILE} differs from the design: run scripts/adwamuha/design-strings.ts`,
      );
      process.exit(1);
    }
  } else {
    writeFileSync(join(root, STRINGS_FILE), `${JSON.stringify(next, null, 2)}\n`);
    console.log(`Wrote the design's strings into ${STRINGS_FILE} (run prettier on it)`);
  }
}
