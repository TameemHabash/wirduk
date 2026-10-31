import { parseCsv, readSheet, withRecordings } from './apply-audio-sheet';
import type { Overrides } from './lib/types';

const HEADER =
  'row,section,morning_id,evening_id,dhikr,count,current_file,current_recording_says,' +
  'current_file_link,new_file_path,new_recording_says,notes';

/** A sheet as Excel saves it: quotes only where needed, the owner's paths with quotes. */
const sheet = (...rows: string[]) => `\uFEFF${[HEADER, ...rows].join('\r\n')}\r\n`;
const exists = () => true;

describe("the owner's audio sheet", () => {
  it('reads Excel CSV: commas and line breaks inside quotes, doubled quotes', () => {
    expect(parseCsv('a,"b, c","d\r\ne","say ""hi"""\r\n1,,3,\r\n')).toEqual([
      ['a', 'b, c', 'd\r\ne', 'say "hi"'],
      ['1', '', '3', ''],
    ]);
  });

  it('names each file after its dhikr; one file used by two rows is copied once', () => {
    const recordings = readSheet(
      sheet(
        '1,morning + evening,1001,133001,"نص، طويل",1,75,1,,"""D:\\a\\2.m4a""",1,',
        '2,morning,1018,133018,نص,10,92,1,,D:\\a\\19.m4a,1,',
        '3,morning only,1019,,نص,100,93,1,,D:\\a\\19.m4a,1,',
        '4,evening only,,133004,نص,1,78,1,,,1,',
        '5,morning + evening,1017,133017,نص,100,91,1,,D:\\a\\18x5.m4a,5,',
      ),
      exists,
    );
    expect(recordings).toEqual([
      { rows: [1], source: 'D:\\a\\2.m4a', name: '1001.m4a', says: 1, ids: [1001, 133001] },
      {
        rows: [2, 3],
        source: 'D:\\a\\19.m4a',
        name: '1018.m4a',
        says: 1,
        ids: [1018, 133018, 1019],
      },
      { rows: [5], source: 'D:\\a\\18x5.m4a', name: '1017.m4a', says: 5, ids: [1017, 133017] },
    ]);
  });

  it('stops at a row with a problem, and says which row', () => {
    const one =
      (row: string, fileExists = exists) =>
      () =>
        readSheet(sheet(row), fileExists);
    expect(one('7,morning,1001,,نص,3,75,1,,D:\\a\\1.m4a,2,')).toThrow(/Row 7: .*2 times.*count 3/);
    expect(one('7,morning,1001,,نص,3,75,1,,D:\\a\\1.wav,1,')).toThrow(/Row 7: not an m4a/);
    expect(one('7,morning,1001,,نص,3,75,1,,D:\\a\\1.m4a,1,', () => false)).toThrow(
      /Row 7: the file is not there/,
    );
  });

  it('writes the dhikr → file map and the repeats, keeping the other repeats', () => {
    const overrides = {
      categorySplits: [],
      countFixes: [],
      textFixes: [],
      audioRepeats: { reason: 'r', files: { other: 2 } },
    } as Overrides;
    const result = withRecordings(
      overrides,
      [
        { rows: [5], source: 'x', name: '1017.m4a', says: 5, ids: [133017, 1017] },
        { rows: [1], source: 'y', name: '1001.m4a', says: 1, ids: [1001] },
      ],
      'docs/audio/sheet.csv',
    );
    expect(result.audioRepeats!.files).toEqual({ other: 2, '1017.m4a': 5 });
    expect(Object.entries(result.audioRecordings!.adhkar)).toEqual([
      ['1001', '1001.m4a'],
      ['1017', '1017.m4a'],
      ['133017', '1017.m4a'],
    ]);
    expect(result.audioRecordings!.sheet).toBe('docs/audio/sheet.csv');
  });
});
