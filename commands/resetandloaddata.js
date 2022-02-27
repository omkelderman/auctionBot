const { ADMIN_ROLE_ID, BID_GROUP_NAME, BID_GROUP_NAME_PLURAL, GOOGLE_SHEET_ID } = require('../modules/config');

function parseIntOrThrow(str, allowNull) {
    if (allowNull && str === '') return null;
    const i = parseInt(str);
    if (isNaN(i)) throw new Error(`'${str}' is not a number`);
    return i;
}

module.exports = {
    data: {
        name: "resetandloaddata",
        description: `Reset (!!!) and load all data from the google sheet (bidding ${BID_GROUP_NAME_PLURAL} and player ${BID_GROUP_NAME_PLURAL})`,
        defaultPermission: false,
    },
    handler: async (interaction, db, sheetsApiClient) => {
        await interaction.deferReply();

        const result = await sheetsApiClient.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'BotData!A2:J',
        });

        const playerGroupDataResultResult = await sheetsApiClient.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'BotData!K2:L',
        });

        const allPlayers = new Map();
        const captains = new Map();
        function addPlayer(map, p) {
            if (map.has(p.groupName)) {
                map.get(p.groupName).push(p);
            } else {
                map.set(p.groupName, [p]);
            }
        }
        var excludedGroups = new Set();
        for (const row of result.data.values) {
            const player = {
                id: parseIntOrThrow(row[1]),
                username: row[0].trim(),
                rank: parseIntOrThrow(row[2]),
                bws: parseIntOrThrow(row[4]),
                country: row[3].trim(),
                discord: row[5].trim(),
                groupName: row[6].trim(),
                badgeCount: parseIntOrThrow(row[7], true),
                qualifierRank: parseIntOrThrow(row[8], true),
                isCaptain: row[9] == '1'
            }

            if (player.isCaptain) {
                addPlayer(captains, player);
            } else {
                if (player.qualifierRank == null) {
                    // skip
                    excludedGroups.add(player.groupName);
                } else {
                    // take
                    addPlayer(allPlayers, player);
                }
            }
        }

        for (const excludedGroup of excludedGroups) {
            allPlayers.delete(excludedGroup);
        }

        console.log('player duos:', allPlayers.size);
        console.log('captain duos:', captains.size);

        const playerGroupDataPerGroupName = new Map(playerGroupDataResultResult.data.values.map(x => ({name: x[1].trim(), draftOrder: x[0]})).filter(x => allPlayers.has(x.name)).map((x, i) => [x.name, {index: i, draftOrder: x.draftOrder}]));

        const playerGroups = [];
        for (const [playerGroupName, players] of allPlayers) {
            const playerGroupData = playerGroupDataPerGroupName.get(playerGroupName);
            if (!playerGroupData) {
                await interaction.followUp(`ERROR: cannot find the qualifier seed value and draft order of '${playerGroupName}' on the sheet`);
                return;
            }

            playerGroups.push({ qualifierSeed: playerGroupData.index, draftOrder: playerGroupData.draftOrder, playerGroupName, players });
        }

        // reset data
        await db.run('DELETE FROM bids');
        await db.run('DELETE FROM bid_members');
        await db.run('DELETE FROM bidders');
        await db.run('DELETE FROM players');
        await db.run('DELETE FROM player_groups');

        // add captains
        const notFoundDiscordMembers = [];
        await interaction.guild.members.fetch();
        for (const [capGroupName, players] of captains) {
            // add captain group
            console.log(`Adding captain group ${capGroupName}`);
            const bidderInsertResult = await db.run('INSERT INTO bidders (bidder_name) VALUES (?)', capGroupName);

            for (const player of players) {
                const d = interaction.guild.members.cache.find(u => u.user.tag === player.discord);
                if (d) {
                    await db.run('INSERT INTO bid_members (discord_id, bidder_id) VALUES (?, ?)', d.id, bidderInsertResult.lastID);
                } else {
                    notFoundDiscordMembers.push({ username: player.username, discord: player.discord, capGroupName });
                }
            }
        }

        // add players
        for (const { qualifierSeed, draftOrder, playerGroupName, players } of playerGroups) {
            // add player group
            console.log(`Adding player group ${playerGroupName}`);
            const bidderInsertResult = await db.run('INSERT INTO player_groups (group_name, qualifier_seed, draft_order) VALUES (?, ?, ?)', playerGroupName, qualifierSeed, draftOrder);

            for (const player of players) {
                await db.run('INSERT INTO players (user_id, group_id, username, country, rank, bws, qualifier_seed, badge_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    player.id,
                    bidderInsertResult.lastID,
                    player.username,
                    player.country,
                    player.rank,
                    player.bws,
                    player.qualifierRank,
                    player.badgeCount);
            }
        }

        await interaction.followUp('All data is reset and new data from sheet is loaded!');
        if (notFoundDiscordMembers.length > 0) {
            await interaction.followUp('WARNING: the following captains could not be found on the server (either the name on the sheet is out of date or they left):\n' +
                notFoundDiscordMembers.map(x => `• **${x.discord}** (${BID_GROUP_NAME}: **${x.capGroupName}**, osu! username: **${x.username}**)`).join('\n'));
        }
    },
    permissions: [
        {
            id: ADMIN_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}