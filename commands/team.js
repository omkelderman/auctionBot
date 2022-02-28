const { BIDDER_ROLE_ID, CURRENCY_SYMBOL_EMOTE_ID } = require('../modules/config');
const { getSingleBidderWithData } = require('./_util');

module.exports = {
    data: {
        name: "team",
        description: "View your team",
        defaultPermission: false,
    },
    handler: async (interaction, db) => {
        const bidder = await getSingleBidderWithData(interaction.user.id, interaction, db, true);
        if(!bidder) {
            await interaction.reply({ content: 'You are not a bidder??? This should not happen, inform an admin please!', ephemeral: true });
            return;
        }

        const header = `**${bidder.bidder_name}** (${bidder.members.join(', ')})`;
        if(bidder.boughtGroups.length) {
            const currencySymbolEmoji = await interaction.guild.emojis.fetch(CURRENCY_SYMBOL_EMOTE_ID);
            const team = bidder.boughtGroups.map(g => `- **${g.groupName}** (${currencySymbolEmoji}${g.saleValue}): ${g.playerNames.join(', ')}`);
            await interaction.reply(`${header}:\n${team.join('\n')}`);
        } else {
            await interaction.reply(`${header}: -`);
        }
    }
    ,
    permissions: [
        {
            id: BIDDER_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}