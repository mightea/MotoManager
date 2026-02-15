import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Determine database path
const dbPath = process.env.DB_FILE_NAME?.replace(/^file:/, "") || "db.sqlite";
const db = new Database(dbPath);

console.log('Fixing migration history...');

// Read journal using fs to avoid Import Attributes syntax issues
const journalPath = path.resolve(process.cwd(), 'app/db/migrations/meta/_journal.json');
const journalContent = fs.readFileSync(journalPath, 'utf-8');
const journal = JSON.parse(journalContent);

const stmt = db.prepare('INSERT INTO __drizzle_migrations (id, hash, created_at) VALUES (?, ?, ?)');

const run = db.transaction(() => {
    for (const entry of journal.entries) {
        // Check if migration already exists (by id)
        // Note: Drizzle's id strategy might differ, but let's try assuming 1-based index from journal idx
        const id = entry.idx + 1;
        const existing = db.prepare('SELECT id FROM __drizzle_migrations WHERE id = ?').get(id);

        if (!existing) {
            console.log(`Inserting migration record for ${entry.tag} (id: ${id})`);
            // We use a dummy hash. If db:migrate fails later, we know why.
            stmt.run(id, 'fixed_by_script', entry.when);
        } else {
            console.log(`Migration record for ${entry.tag} already exists (id: ${id}).`);
        }
    }
});

run();
console.log('Done.');
