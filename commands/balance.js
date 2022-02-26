const { BIDDER_ROLE_ID } = require('../modules/config');
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

        await interaction.reply({ content: `**${bidder.bidder_name}** (${bidder.members.join(', ')}): $${bidder.balance}`, ephemeral: true });
    },
    permissions: [
        {
            id: BIDDER_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}