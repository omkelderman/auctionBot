const { ADMIN_ROLE_ID, BID_GROUP_NAME_PLURAL } = require('../modules/config');
const { addDataToBiddersArray, addPlayerDataToPlayerGroups, contentsArrayToEmbedsArray, replyWithEmbeds } = require('./_util');

module.exports = {
    data: {
        name: "alldata",
        description: `list all imported data (bidding ${BID_GROUP_NAME_PLURAL} and player ${BID_GROUP_NAME_PLURAL})`,
        defaultPermission: false,
    },
    handler: async (interaction, db) => {
        const bidders = await db.all('SELECT * FROM bidders');
        await addDataToBiddersArray(bidders, db, interaction.guild.members);
        const biddersData = bidders.map(bidder => `• **${bidder.bidder_name}** ($${bidder.balance}): ${bidder.members.join(', ')}`);

        const playerGroups = await db.all('SELECT * FROM player_groups');
        await addPlayerDataToPlayerGroups(playerGroups, db);
        const playerGroupsData = playerGroups.map(group => `**${group.group_name}**\n${group.players.map(player => `• ${player.username} (${player.country}) | Qual. Seed #${player.qualifier_seed} | BWS#${player.bws} | #${player.rank}`).join('\n')}`);

        const biddersEmbeds = contentsArrayToEmbedsArray('Bidding Groups', ...biddersData);
        const playerGroupsEmbeds = contentsArrayToEmbedsArray('Player Groups', ...playerGroupsData);
        await replyWithEmbeds(interaction, true, ...biddersEmbeds, ...playerGroupsEmbeds);
    },
    permissions: [
        {
            id: ADMIN_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}