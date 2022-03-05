const { TWITCH_BOT_USERNAME, TWITCH_BOT_PASSWORD, TWITCH_CHANNEL } = require('./config');

if (TWITCH_BOT_USERNAME) {
    const tmi = require('tmi.js');
    const client = new tmi.Client({
        identity: {
            username: TWITCH_BOT_USERNAME,
            password: TWITCH_BOT_PASSWORD
        },
        channels: [TWITCH_CHANNEL]
    });

    async function init() {
        await client.connect();
        return (msg) => client.say(TWITCH_CHANNEL, msg);
    }

    function disconnect() {
        return client.disconnect();
    }

    module.exports.init = init;
    module.exports.disconnect = disconnect;
} else {
    function noopPromise() {
        const noop = () => {};
        return Promise.resolve(noop);
    }

    module.exports.init = noopPromise;
    module.exports.disconnect = noopPromise;
}