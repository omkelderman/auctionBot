const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function initPlayersTable(db) {
    await db.run(`
        CREATE TABLE IF NOT EXISTS players
        (
            user_id         INTEGER PRIMARY KEY,
            group_id        INTEGER,
            username        TEXT,
            country         TEXT,
            rank            INTEGER,
            badges          TEXT,
            badge_ranks     TEXT,
            bws             NUMERIC,
            tier            INTEGER,
            flag            TEXT,
            url             TEXT,
            image           TEXT,
            qualifier_seed  INTEGER
        ) WITHOUT ROWID
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS player_groups
        (
            group_id    INTEGER PRIMARY KEY,
            group_name  TEXT
        )
    `);
}

async function initBiddersTable(db) {
    await db.run(`
        CREATE TABLE IF NOT EXISTS bidders
        (
            bidder_id    INTEGER PRIMARY KEY,
            bidder_name  TEXT,
            balance      INTEGER DEFAULT 0
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS bid_members
        (
            discord_id  TEXT PRIMARY KEY,
            bidder_id   INTEGER
        ) WITHOUT ROWID
    `);
}

async function initBidsTable(db) {
    await db.run(`
        CREATE TABLE IF NOT EXISTS bids
        (
            bid_id           INTEGER PRIMARY KEY,
            group_id         INTEGER,
            final_bidder_id  INTEGER,
            sale_value       INTEGER DEFAULT 0,
            start_time       TEXT,
            ongoing          BOOLEAN
        )
    `);

    await db.run(`DELETE
            FROM bids
            WHERE ongoing = TRUE`);
}

async function init(db) {
    await initPlayersTable(db);
    await initBiddersTable(db);
    await initBidsTable(db);
}

async function connect() {
    let db = await open({ filename: "./database.db", driver: sqlite3.Database });
    console.log("Connected to database");
    await init(db);
    return db;
}

module.exports = { connect };