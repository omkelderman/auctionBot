async function addDataToBiddersArray(bidders, db, disordGuildMembers, includeBoughtGroups) {
    if (!bidders.length) return;

    var bidderById = new Map();
    for (const bidder of bidders) {
        bidder.members = [];
        if (includeBoughtGroups) bidder.boughtGroups = [];
        bidderById.set(bidder.bidder_id, bidder);
    }

    const bidderIdsInString = [...bidderById.keys()].join(',');

    const bidMembers = await db.all(`
        SELECT *
        FROM bid_members
        WHERE bidder_id IN (${bidderIdsInString})
    `);

    await disordGuildMembers.fetch();
    for (const bidMember of bidMembers) {
        const member = disordGuildMembers.cache.get(bidMember.discord_id);
        const bidder = bidderById.get(bidMember.bidder_id);
        if (member) {
            bidder.members.push(member.displayName);
        } else {
            bidder.members.push(bidMember.discord_id);
        }
    }

    if(!includeBoughtGroups) return;

    const allGroupNames = await db.all(`
        SELECT g.group_id,
                g.group_name,
                b.final_bidder_id as bidder_id,
                b.sale_value
        FROM bids b,
                player_groups g
        WHERE b.group_id = g.group_id
            AND b.final_bidder_id IN (${bidderIdsInString})
    `);

    const groupsPerGroupId = new Map();
    for (const x of allGroupNames) {
        const bidder = bidderById.get(x.bidder_id);
        const g = { groupId: x.group_id, groupName: x.group_name, saleValue: x.sale_value, playerNames: [] };
        bidder.boughtGroups.push(g);
        groupsPerGroupId.set(g.groupId, g);
    }

    if (groupsPerGroupId.size) {
        const allPlayers = await db.all(`
            SELECT p.username,
                g.group_id
            FROM players p,
                player_groups g
            WHERE p.group_id = g.group_id
                AND g.group_id IN (${[...groupsPerGroupId.keys()].join(',')})
        `);

        for (const player of allPlayers) {
            const g = groupsPerGroupId.get(player.group_id);
            g.playerNames.push(player.username);
        }
    }
}

async function getSingleBidderWithData(discordMemberId, interaction, db, includeBoughtGroups) {
    const bidder = await db.get(`
        SELECT b.*
        FROM bidders b,
            bid_members bm
        WHERE bm.bidder_id = b.bidder_id
        AND bm.discord_id = ?
    `, discordMemberId);

    if (!bidder) return undefined;

    await addDataToBiddersArray([bidder], db, interaction.guild.members, includeBoughtGroups);
    return bidder;
}

module.exports.addDataToBiddersArray = addDataToBiddersArray;
module.exports.getSingleBidderWithData = getSingleBidderWithData;