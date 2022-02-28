const { ADMIN_ROLE_ID, CURRENCY_NAME, CURRENCY_SYMBOL_EMOTE_ID } = require('../modules/config');
const { addDataToBiddersArray } = require('./_util');

module.exports = {
    data: {
        name: "allbalance",
        description: "Check every bidders balance",
        defaultPermission: false,
    },
    handler: async (interaction, db) => {
        const bidders = await db.all(`
            SELECT *
            FROM bidders
            WHERE balance > 0`,
        );

        if (!bidders.length) {
            await interaction.reply({ content: `No bidder has ${CURRENCY_NAME}!`, ephemeral: true });
            return;
        }

        const currencySymbolEmoji = await interaction.guild.emojis.fetch(CURRENCY_SYMBOL_EMOTE_ID);

        await addDataToBiddersArray(bidders, db, interaction.guild.members);
        const output = bidders.map(bidder => `**${bidder.bidder_name}** (${ bidder.members.join(', ') }): ${currencySymbolEmoji}${ bidder.balance }`);
        await interaction.reply({ content: output.join("\n") });
    },
    permissions: [
        {
            id: ADMIN_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}