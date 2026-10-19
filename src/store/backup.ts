import { SCHEMA_VERSION, TABLES, type RoutineDB, type TableName } from './db';

export interface ExportFile {
  schemaVersion: number;
  exportedAt: string;
  app: 'routine-hud';
  tables: Record<TableName, unknown[]>;
}

export async function exportAll(db: RoutineDB, exportedAt = new Date().toISOString()): Promise<ExportFile> {
  const tables = {} as Record<TableName, unknown[]>;
  await db.transaction('r', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) tables[t] = await db.table(t).toArray();
  });
  return { schemaVersion: SCHEMA_VERSION, exportedAt, app: 'routine-hud', tables };
}

/** Validate an export file. Returns an error message, or null when valid. */
export function validateExport(json: unknown): string | null {
  if (!json || typeof json !== 'object') return 'Not a JSON object.';
  const f = json as Partial<ExportFile>;
  if (typeof f.schemaVersion !== 'number') return 'Missing schemaVersion.';
  if (f.schemaVersion > SCHEMA_VERSION) return `File is from a newer version (schema ${f.schemaVersion}).`;
  if (f.schemaVersion < 1) return `Unsupported schema ${f.schemaVersion}.`;
  if (!f.tables || typeof f.tables !== 'object') return 'Missing tables.';
  for (const [name, rows] of Object.entries(f.tables)) {
    if (!(TABLES as readonly string[]).includes(name)) return `Unknown table "${name}".`;
    if (!Array.isArray(rows)) return `Table "${name}" is not a list.`;
  }
  return null;
}

/** Replace every table with the file's contents inside one transaction. */
export async function importAll(db: RoutineDB, json: unknown): Promise<void> {
  const err = validateExport(json);
  if (err) throw new Error(err);
  const f = json as ExportFile;
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = f.tables[t] ?? [];
      if (rows.length) await db.table(t).bulkAdd(rows);
    }
  });
}

export async function wipeAll(db: RoutineDB): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear();
  });
}
