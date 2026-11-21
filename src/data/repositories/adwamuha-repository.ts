/**
 * Adwamuha's data in user.db (migration 4): the user's own plan and where
 * they are, the day records, pauses, history and shown messages. All local.
 */
import type { DayKey } from '@/features/adwamuha/logic/days';
import type { MessagePick } from '@/features/adwamuha/logic/messages';
import type { Session } from '@/features/adwamuha/logic/sessions';
import { parsePlanState, parseUserPlan } from '@/features/adwamuha/logic/stored';
import type { Pause, PlanState, UserPlan, WardRecord } from '@/features/adwamuha/logic/types';

import type { SqlDatabase } from '../db/sql';
import { parseCounts } from '../session';

import type { Clock } from './user-repositories';

const systemClock: Clock = () => Date.now();

/** Everything about the plan, once the feature was turned on. */
export interface AdwamuhaStored {
  enabled: boolean;
  plan: UserPlan;
  state: PlanState;
  /** The day this run of the plan started. */
  startedOn: DayKey;
  /** While off: the day it was turned off. */
  offSince: DayKey | null;
}

export interface StoredPause extends Pause {
  id: number;
}

export interface AdwamuhaEvent {
  id: number;
  at: number;
  day: DayKey;
  kind: string;
  step: number | null;
  data: unknown;
}

export class AdwamuhaRepository {
  private readonly db: SqlDatabase;
  private readonly now: Clock;

  constructor(db: SqlDatabase, now: Clock = systemClock) {
    this.db = db;
    this.now = now;
  }

  /** The plan and state, or null (never turned on, or the stored data is damaged). */
  async load(): Promise<AdwamuhaStored | null> {
    const row = await this.db.getFirst<{
      enabled: number;
      planJson: string;
      stateJson: string;
      startedOn: string;
      offSince: string | null;
    }>(
      `SELECT Enabled AS enabled, PlanJson AS planJson, StateJson AS stateJson,
              StartedOn AS startedOn, OffSince AS offSince
         FROM AdwamuhaState WHERE Id = 1`,
    );
    if (!row) return null;
    const plan = parseUserPlan(row.planJson);
    const state = plan ? parsePlanState(row.stateJson, plan) : null;
    if (!plan || !state) return null;
    return {
      enabled: row.enabled === 1,
      plan,
      state,
      startedOn: row.startedOn,
      offSince: row.offSince,
    };
  }

  async save(data: AdwamuhaStored): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO AdwamuhaState
         (Id, Enabled, PlanJson, StateJson, StartedOn, OffSince, UpdatedAt)
       VALUES (1, ?, ?, ?, ?, ?, ?)`,
      [
        data.enabled ? 1 : 0,
        JSON.stringify(data.plan),
        JSON.stringify(data.state),
        data.startedOn,
        data.offSince,
        this.now(),
      ],
    );
  }

  async listRecords(): Promise<WardRecord[]> {
    const rows = await this.db.getAll<Omit<WardRecord, 'late'> & { late: number }>(
      `SELECT Date AS date, Session AS session, CompletedAt AS completedAt, Late AS late,
              Source AS source, Step AS step
         FROM WardRecords ORDER BY Date, Session`,
    );
    return rows.map((r) => ({ ...r, late: r.late === 1 }));
  }

  /** Saves a day's ward. The first record of a date and session stays: returns false if one exists. */
  async addRecord(record: WardRecord): Promise<boolean> {
    const result = await this.db.run(
      `INSERT OR IGNORE INTO WardRecords (Date, Session, CompletedAt, Late, Source, Step)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        record.date,
        record.session,
        record.completedAt,
        record.late ? 1 : 0,
        record.source,
        record.step,
      ],
    );
    return result.changes > 0;
  }

  /** Undoes «قرأتُها من حفظي» (only a manual record can be removed). */
  async removeManualRecord(date: DayKey, session: Session): Promise<boolean> {
    const result = await this.db.run(
      "DELETE FROM WardRecords WHERE Date = ? AND Session = ? AND Source = 'manual'",
      [date, session],
    );
    return result.changes > 0;
  }

  async listPauses(): Promise<StoredPause[]> {
    return this.db.getAll<StoredPause>(
      `SELECT Id AS id, FromDate AS "from", ToDate AS "to", Kind AS kind
         FROM AdwamuhaPauses ORDER BY FromDate`,
    );
  }

  async addPause(pause: Pause): Promise<number> {
    const result = await this.db.run(
      'INSERT INTO AdwamuhaPauses (FromDate, ToDate, Kind) VALUES (?, ?, ?)',
      [pause.from, pause.to, pause.kind],
    );
    return result.lastInsertRowId;
  }

  /** Changes a pause (e.g. a break ended early), or removes it when `pause` is null. */
  async updatePause(id: number, pause: Pause | null): Promise<void> {
    if (pause === null) {
      await this.db.run('DELETE FROM AdwamuhaPauses WHERE Id = ?', [id]);
      return;
    }
    await this.db.run('UPDATE AdwamuhaPauses SET FromDate = ?, ToDate = ?, Kind = ? WHERE Id = ?', [
      pause.from,
      pause.to,
      pause.kind,
      id,
    ]);
  }

  async logEvent(day: DayKey, kind: string, step: number | null, data?: unknown): Promise<void> {
    await this.db.run(
      'INSERT INTO AdwamuhaEvents (At, Day, Kind, Step, Json) VALUES (?, ?, ?, ?, ?)',
      [this.now(), day, kind, step, data === undefined ? null : JSON.stringify(data)],
    );
  }

  async listEvents(): Promise<AdwamuhaEvent[]> {
    const rows = await this.db.getAll<Omit<AdwamuhaEvent, 'data'> & { json: string | null }>(
      'SELECT Id AS id, At AS at, Day AS day, Kind AS kind, Step AS step, Json AS json FROM AdwamuhaEvents ORDER BY Id',
    );
    return rows.map(({ json, ...e }) => ({ ...e, data: json === null ? null : JSON.parse(json) }));
  }

  /**
   * The ward of `date` read in parts (owner, 2026-11-14): its counts by dhikr id.
   * Empty when none was kept, it was another day's, or it is damaged.
   */
  async loadWardProgress(session: Session, date: DayKey): Promise<Record<string, number>> {
    const row = await this.db.getFirst<{ date: string; json: string }>(
      'SELECT Date AS date, Json AS json FROM WardProgress WHERE Session = ?',
      [session],
    );
    if (!row || row.date !== date) return {};
    try {
      return parseCounts(JSON.parse(row.json)) ?? {};
    } catch {
      return {};
    }
  }

  /** Keeps the counts of the ward of `date` (replaces an earlier day's). */
  async saveWardProgress(
    session: Session,
    date: DayKey,
    counts: Readonly<Record<string, number>>,
  ): Promise<void> {
    await this.db.run(
      'INSERT OR REPLACE INTO WardProgress (Session, Date, Json, SavedAt) VALUES (?, ?, ?, ?)',
      [session, date, JSON.stringify(counts), this.now()],
    );
  }

  /** The ward was finished: nothing more to keep. */
  async clearWardProgress(session: Session): Promise<void> {
    await this.db.run('DELETE FROM WardProgress WHERE Session = ?', [session]);
  }

  /** Every message already shown. */
  async listShown(): Promise<string[]> {
    const rows = await this.db.getAll<{ key: string }>('SELECT Key AS key FROM AdwamuhaShown');
    return rows.map((r) => r.key);
  }

  async wasShown(key: string): Promise<boolean> {
    return (
      (await this.db.getFirst('SELECT 1 AS one FROM AdwamuhaShown WHERE Key = ?', [key])) !== null
    );
  }

  /** Marks a message as shown. Returns false if it already was. */
  async markShown(key: string): Promise<boolean> {
    const result = await this.db.run(
      'INSERT OR IGNORE INTO AdwamuhaShown (Key, At) VALUES (?, ?)',
      [key, this.now()],
    );
    return result.changes > 0;
  }

  /** The messages a moment's occasions got, the latest first. */
  async listPicks(moment: string): Promise<MessagePick[]> {
    return this.db.getAll<MessagePick>(
      `SELECT Occasion AS occasion, MessageId AS messageId, Round AS round
         FROM AdwamuhaMessagePicks WHERE Moment = ? ORDER BY PickedAt DESC, rowid DESC`,
      [moment],
    );
  }

  /**
   * Saves the message an occasion got. The first one stays (two screens choosing at once
   * agree): returns the message id saved for the occasion.
   */
  async addPick(moment: string, pick: MessagePick): Promise<string> {
    await this.db.run(
      `INSERT OR IGNORE INTO AdwamuhaMessagePicks (Moment, Occasion, MessageId, Round, PickedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [moment, pick.occasion, pick.messageId, pick.round, this.now()],
    );
    const row = await this.db.getFirst<{ messageId: string }>(
      'SELECT MessageId AS messageId FROM AdwamuhaMessagePicks WHERE Moment = ? AND Occasion = ?',
      [moment, pick.occasion],
    );
    return row?.messageId ?? pick.messageId;
  }

  /** Forgets an occasion's message (it is no longer in the content). */
  async removePick(moment: string, occasion: string): Promise<void> {
    await this.db.run('DELETE FROM AdwamuhaMessagePicks WHERE Moment = ? AND Occasion = ?', [
      moment,
      occasion,
    ]);
  }
}
