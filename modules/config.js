require("dotenv").config();

function parseIntOrThrow(str) {
    const i = parseInt(str);
    if(isNaN(i)) throw new Error(`'${str}' is not a number`);
    return i;
}

const COLOR_HEX_REGEX = /^[A-Fa-f0-9]{6}$/;
function parseColor(str) {
    const match = COLOR_HEX_REGEX.exec(str);
    if(!match) throw new Error(`'${str}' is not a valid color (only accepts 6 character hex string)`);
    return parseInt(match[0], 16);
}

console.log('loading config...');

module.exports = {
    TOKEN: process.env.TOKEN,
    GUILD_ID: process.env.GUILD_ID,
    ADMIN_ROLE_ID: process.env.ADMIN_ROLE_ID,
    BIDDER_ROLE_ID: process.env.BIDDER_ROLE_ID,
    INITIAL_TIMER: parseIntOrThrow(process.env.INITIAL_TIMER),
    IDLE_TIMER: parseIntOrThrow(process.env.IDLE_TIMER),
    MAX_BID: parseIntOrThrow(process.env.MAX_BID),
    START_VALUE: parseIntOrThrow(process.env.START_VALUE),
    MIN_INCREMENT: parseIntOrThrow(process.env.MIN_INCREMENT),
    MAX_GROUP_COUNT_IN_TEAM: parseIntOrThrow(process.env.MAX_GROUP_COUNT_IN_TEAM),
    BID_GROUP_NAME: process.env.BID_GROUP_NAME,
    BID_GROUP_NAME_PLURAL: process.env.BID_GROUP_NAME_PLURAL,
    GROUP_NAME_EMBED_COLOR: parseColor(process.env.GROUP_NAME_EMBED_COLOR),
    PLAYER_INFO_EMBED_COLOR: parseColor(process.env.PLAYER_INFO_EMBED_COLOR),
    GOOGLE_APIS_CRED_JSON_FILE: process.env.GOOGLE_APIS_CRED_JSON_FILE,
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
    CURRENCY_SYMBOL_EMOTE_ID: process.env.CURRENCY_SYMBOL_EMOTE_ID,
    CURRENCY_NAME: process.env.CURRENCY_NAME,
    TWITCH_BOT_USERNAME: process.env.TWITCH_BOT_USERNAME,
    TWITCH_BOT_PASSWORD: process.env.TWITCH_BOT_PASSWORD,
    TWITCH_CHANNEL: process.env.TWITCH_CHANNEL
}