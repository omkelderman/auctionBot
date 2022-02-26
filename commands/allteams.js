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
            await interaction.reply({ content: "No bidder exists!", ephemeral: true });
            return;
        }

        await addDataToBiddersArray(bidders, db, interaction.guild.members, true);

        const output = bidders.map(bidder => {
            const team = bidder.boughtGroups.length
                ? bidder.boughtGroups.map(g => `${g.groupName} (${g.playerNames.join(', ')})`).join(', ')
                : '-';
            return `${bidder.bidder_name} (${bidder.members.join(', ')}): ${team}`;
        });
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