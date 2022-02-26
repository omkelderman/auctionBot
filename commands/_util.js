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
            SELECT username, group_id
            FROM players
            WHERE group_id IN (${[...groupsPerGroupId.keys()].join(',')})
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

async function addPlayerDataToPlayerGroups(groups, db) {
    if(!groups.length) return;

    var groupById = new Map();
    for(const group of groups) {
        group.players = [];
        groupById.set(group.group_id, group);
    }

    const groupIdsInString = [...groupById.keys()].join(',');

    const allPlayers = await db.all(`
        SELECT *
        FROM players
        WHERE group_id in (${groupIdsInString})
    `);

    for(const player of allPlayers) {
        groupById.get(player.group_id).players.push(player);
    }
}

function contentsArrayToEmbedsArray(title, ...data) {
    const contentsArray = [];
    let lastContent = '';

    const MAX_EMBED_CONTENT_LENGTH = 4096;

    for (const content of data) {
        if (content.length > MAX_EMBED_CONTENT_LENGTH) {
            throw new Error('unable to build embeds: single piece of text exceeds discord length requirements');
        }

        if ((lastContent.length + 1 + content.length) > MAX_EMBED_CONTENT_LENGTH) {
            // adding new data would exceed length
            contentsArray.push(lastContent);
            lastContent = content;
        } else {
            lastContent = `${lastContent}\n${content}`;
        }
    }

    if (lastContent.length > 0) {
        contentsArray.push(lastContent);
    }

    if (contentsArray.length == 0) {
        return [];
    } else if (contentsArray.length == 1) {
        return [{ title, description: contentsArray[0] }]
    } else {
        return contentsArray.map((value, index, { length: totalLength }) => ({
            title: `${title} (${index + 1}/${totalLength})`,
            description: value
        }));
    }
}

async function replyWithEmbeds(interaction, ephemeral, ...embeds) {
    const MAX_EMBEDS_IN_MESSAGE = 10;

    let processed = 0;
    while (processed < embeds.length) {
        const chunk = embeds.slice(processed, processed + MAX_EMBEDS_IN_MESSAGE);
        processed += chunk.length;

        if (interaction.replied) {
            await interaction.followUp({
                embeds: chunk,
                ephemeral
            })
        } else {
            await interaction.reply({
                embeds: chunk,
                ephemeral
            })
        }
    }
}

module.exports.addDataToBiddersArray = addDataToBiddersArray;
module.exports.getSingleBidderWithData = getSingleBidderWithData;
module.exports.addPlayerDataToPlayerGroups = addPlayerDataToPlayerGroups;
module.exports.contentsArrayToEmbedsArray = contentsArrayToEmbedsArray;
module.exports.replyWithEmbeds = replyWithEmbeds;
