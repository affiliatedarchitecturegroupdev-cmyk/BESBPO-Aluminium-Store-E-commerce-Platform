import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import { PROVINCES } from './provinces';

// The Province enum exists in three places that have already drifted once: prisma/schema.prisma
// (the source of truth Prisma validates against), this PROVINCES list (what DTOs accept), and the
// migration SQL (what actually reaches the database). The Phase 1 migration was created with only
// seven values while the schema and this list both declared nine, so `prisma migrate deploy` on a
// clean database produced a seven-value enum and seeding any Free State delivery zone failed with
// "invalid input value for enum Province: FREE_STATE". These tests exist so that drift fails here
// rather than on a deploy.

const backendRoot = join(__dirname, '..', '..');
const schema = readFileSync(join(backendRoot, 'prisma', 'schema.prisma'), 'utf8');

function schemaProvinces(): string[] {
  const match = schema.match(/enum\s+Province\s*\{([^}]*)\}/);
  if (!match) throw new Error('Province enum not found in prisma/schema.prisma');
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'));
}

function migrationSql(): string {
  const dir = join(backendRoot, 'prisma', 'migrations');
  return readdirSync(dir)
    .filter((entry) => !entry.endsWith('.toml'))
    .map((entry) => readFileSync(join(dir, entry, 'migration.sql'), 'utf8'))
    .join('\n');
}

describe('PROVINCES', () => {
  it('matches the Prisma schema enum exactly', () => {
    expect([...PROVINCES].sort()).toEqual(schemaProvinces().sort());
  });

  it('contains all nine South African provinces', () => {
    expect(PROVINCES).toHaveLength(9);
    expect(PROVINCES).toContain('FREE_STATE');
    expect(PROVINCES).toContain('NORTHERN_CAPE');
  });

  it('has no duplicate entries', () => {
    expect(new Set(PROVINCES).size).toBe(PROVINCES.length);
  });

  it('only exposes SCREAMING_SNAKE_CASE values, matching the enum convention', () => {
    for (const province of PROVINCES) {
      expect(province).toMatch(/^[A-Z]+(_[A-Z]+)*$/);
    }
  });

  it('every province reaches the database through the committed migrations', () => {
    // The regression this guards: a province present in schema.prisma and PROVINCES but absent
    // from the migration history. `migrate deploy` never diffs the schema, so nothing else catches
    // it — the enum created by the migrations is what the deployed database actually gets.
    const sql = migrationSql();
    const missing = PROVINCES.filter((province) => !sql.includes(`'${province}'`));
    expect(missing).toEqual([]);
  });
});