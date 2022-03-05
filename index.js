require('./modules/config');
const database = require("./modules/database");
const bot = require("./modules/discord");
const sheets = require('./modules/sheets');
const twitch = require('./modules/twitch');

let discordClient;
let db;

async function main() {
    db = await database.connect();
    const sheetsApiClient = await sheets.auth();
    const twitchClient = await twitch.init();
    discordClient = await bot.run(db, sheetsApiClient, twitchClient);
}

main().catch(console.error);

process.on('SIGTERM', () => process.emit('requestShutdown'));
process.on('SIGINT', () => process.emit('requestShutdown'));
process.once('requestShutdown', async () => {
    process.on('requestShutdown', () => console.log(`process ${process.pid} already shutting down...`));
    console.log('shutting down...');
    if (discordClient) {
        discordClient.destroy();
    }
    if (db) {
        await db.close();
    }
    await twitch.disconnect();
    console.log('Shutdown complete');
});