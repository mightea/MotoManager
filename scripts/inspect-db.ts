import Database from 'better-sqlite3';

const db = new Database('db.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

try {
    const migrations = db.prepare("SELECT * FROM __drizzle_migrations").all();
    console.log('Migrations applied:', migrations);
} catch (e) {
    console.log('Error querying migrations:', e.message);
}
