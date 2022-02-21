const { ADMIN_ROLE_ID } = require('../modules/config');
const { addDataToBiddersArray } = require('./_util');

module.exports = {
    data: {
        name: "allteams",
        description: "Check every bidders team",
        defaultPermission: false,
    },
    handler: async (interaction, db) => {
        const bidders = await db.all(`
            SELECT *
            FROM bidders`,
        );

        if (!bidders.length) {
            interaction.reply({ content: "No bidder exists!", ephemeral: true });
            return;
        }

        await addDataToBiddersArray(bidders, db, interaction.guild.members, true);

        const output = bidders.map(bidder => {
            if(!bidder.boughtGroups.length) {
                return '-';
            }
            const team = bidder.boughtGroups.map(g => `${g.groupName} (${g.playerNames.join(', ')})`).join(', ');
            return `${bidder.bidder_name} (${bidder.members.join(', ')}): ${team}`;
        });
        interaction.reply({ content: output.join("\n") });
    },
    permissions: [
        {
            id: ADMIN_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}