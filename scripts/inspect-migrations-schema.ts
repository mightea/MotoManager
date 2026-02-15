import Database from 'better-sqlite3';

const db = new Database('db.sqlite');
const schema = db.prepare("PRAGMA table_info(__drizzle_migrations)").all();
console.log(schema);
