const Discord = require("discord.js")
const { ADMIN_ROLE_ID, MIN_INCREMENT, INITIAL_TIMER, IDLE_TIMER, MAX_BID, BID_GROUP_NAME, BID_GROUP_NAME_PLURAL, GROUP_NAME_EMBED_COLOR, PLAYER_INFO_EMBED_COLOR } = require('../modules/config');
const { getSingleBidderWithData } = require('./_util');

async function checkBid(bidValue, bidInteraction, balance, saleValue) {
    if (bidValue > MAX_BID) {
        await bidInteraction.reply({
            content: `You're only allowed to bid up to a maximum of ${ MAX_BID } in an auction! Bid ${ MAX_BID } exactly in case you want to buy the ${BID_GROUP_NAME} instantly.`,
            ephemeral: true,
        });
        return false;
    }

    if (bidValue > balance) {
        await bidInteraction.reply({
            content: `You cannot bid more money than you currently possess! (${ balance })`,
            ephemeral: true,
        });
        return false;
    }

    if (bidValue < saleValue + MIN_INCREMENT) {
        await bidInteraction.reply({
            content: `You have to bid at least ${ saleValue + MIN_INCREMENT } or higher!`,
            ephemeral: true,
        });
        return false;
    }

    if (bidValue % MIN_INCREMENT !== 0) {
        await bidInteraction.reply({
            content: `The bid was not an increment of ${ MIN_INCREMENT }!`,
            ephemeral: true,
        });
        return false;
    }

    return true;
}

// TODO revamp this whole thing
function initCollector(interaction, db, group) {
    let saleValue = MIN_INCREMENT;
    let lastBidder = null;

    const collector = new Discord.InteractionCollector(interaction.client, {
        channel: interaction.channel,
        time: INITIAL_TIMER,
    });

    collector.on("collect", async bidInteraction => {
        if (!bidInteraction.isCommand()) return;
        if (bidInteraction.commandName.toLowerCase() !== "bid") return;

        const bidder = await getSingleBidderWithData(bidInteraction.user.id, bidInteraction, db);
        if(!bidder) {
            await interaction.reply({ content: 'You are not a bidder??? This should not happen, inform an admin please!', ephemeral: true });
            return;
        }

        const bidValue = bidInteraction.options.get("amount").value;
        if (!await checkBid(bidValue, bidInteraction, bidder.balance, saleValue)) return;

        saleValue = bidValue;
        lastBidder = bidder;
        const bidderStr = `${bidder.bidder_name} (${bidder.members.join(', ')})`;
        await bidInteraction.reply(`${bidderStr} bids ${bidValue}.`);

        if (bidValue === MAX_BID) collector.stop();
        collector.resetTimer({ time: IDLE_TIMER });
    });

    collector.on("end", async () => {
        if (lastBidder == null) {
            await interaction.followUp(`No one has bid on the ${BID_GROUP_NAME}.`);
            await db.run(`
                UPDATE bids
                SET ongoing = FALSE
                WHERE ongoing = TRUE;
            `)
        } else {
            await interaction.followUp(`${group.group_name} (${group.players.map(x => x.username).join(', ')}) has been sold to ${lastBidder.bidder_name} (${lastBidder.members.join(', ')}) for ${ saleValue }`);
            await db.run(`
                UPDATE bids
                SET sale_value      = ?,
                    final_bidder_id = ?,
                    ongoing         = FALSE
                WHERE ongoing = TRUE;
            `, saleValue, lastBidder.bidder_id);
            await db.run(`
                UPDATE bidders
                SET balance = balance - ?
                WHERE bidder_id = ?;
            `, saleValue, lastBidder.bidder_id);
        }
    });
}

function generateGroupCardMessage(group) {
    let msg = {
        content: "Bidding has started! Use `/bid <amount>` to start placing a bid.",
        embeds: [
            {
                color: GROUP_NAME_EMBED_COLOR,
                title: group.group_name
            }
        ]
    };

    for(const player of group.players) {
        const imageUrl = `https://a.ppy.sh/${player.user_id}?.png`;
        const flagUrl = `https://osu.ppy.sh/images/flags/${player.country}.png`;
        const profileUrl = `https://osu.ppy.sh/users/${player.user_id}`;

        const playerEmbed = {
            color: PLAYER_INFO_EMBED_COLOR,
            fields: [
                {
                    name: "Qual. Seed",
                    value: `#${player.qualifier_seed}`,
                    inline: true
                },
                {
                    name: "Rank",
                    value: `#${player.rank}`,
                    inline: true
                },
                {
                    name: "BWS",
                    value: `#${player.bws}`, // TODO ask dio how to round this, if any, original had Math.ceil
                    inline: true
                }
            ],
            author: {
                name: player.username,
                url: profileUrl,
                icon_url: imageUrl,
            },
            footer: {
                text: "Rank is from end of signups",
            },
        }

        if(player.badges && player.badge_ranks) {
            const badgeRanks = player.badge_ranks.split(",");
            const badges = player.badges.split("\n").map((e, i) => [e.trim(), badgeRanks[i].trim()]);
            if(badges.length) {
                playerEmbed.fields.push({
                    name: `Badges (${ badges.length })`,
                    value: badges.filter(([_, rank]) => rank)
                    .map(([name, rank]) => `(#${ rank }) ${ name }`)
                    .join('\n')
                });
            }
        }

        msg.embeds.push(playerEmbed);
    }

    return msg;
}

module.exports = {
    data: {
        name: "newsale",
        description: "Create a new sale",
        defaultPermission: false,
    },
    handler: async (interaction, db) => {
        const ongoing = await db.get(`
            SELECT *
            FROM bids
            WHERE ongoing = TRUE
        `);

        if (ongoing) {
            await interaction.reply("There is already a sale ongoing!")
            return;
        }

        const randomAvailableGroup = await db.get(`
            SELECT *
            FROM player_groups
            WHERE group_id NOT IN (SELECT group_id FROM bids)
            ORDER BY RANDOM()
            LIMIT 1;
        `);

        if (!randomAvailableGroup) {
            await interaction.reply(`No more ${BID_GROUP_NAME_PLURAL} to auction!`);
            return;
        }

        randomAvailableGroup.players = await db.all(`
            SELECT *
            FROM players
            WHERE GROUP_ID = ?
        `, randomAvailableGroup.group_id);

        // create bid
        await db.run(`
            INSERT INTO bids (group_id, sale_value, ongoing, start_time)
            VALUES (?, 0, TRUE, datetime('now'))
        `, randomAvailableGroup.group_id);

        await interaction.reply(generateGroupCardMessage(randomAvailableGroup))

        initCollector(interaction, db, randomAvailableGroup);
    },
    permissions: [
        {
            id: ADMIN_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}