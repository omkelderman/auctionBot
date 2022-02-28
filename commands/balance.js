const { BIDDER_ROLE_ID, CURRENCY_SYMBOL_EMOTE_ID } = require('../modules/config');
const { getSingleBidderWithData } = require('./_util');

module.exports = {
    data: {
        name: "balance",
        description: "Check your current balance",
        defaultPermission: false,
    },
    handler: async (interaction, db) => {
        const bidder = await getSingleBidderWithData(interaction.user.id, interaction, db, false);
        if(!bidder) {
            await interaction.reply({ content: 'You are not a bidder??? This should not happen, inform an admin please!', ephemeral: true });
            return;
        }

        const currencySymbolEmoji = await interaction.guild.emojis.fetch(CURRENCY_SYMBOL_EMOTE_ID);
        await interaction.reply({ content: `**${bidder.bidder_name}** (${bidder.members.join(', ')}): ${currencySymbolEmoji}${bidder.balance}`, ephemeral: true });
    },
    permissions: [
        {
            id: BIDDER_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}