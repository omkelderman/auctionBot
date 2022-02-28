const Discord = require("discord.js")
const { ADMIN_ROLE_ID, MIN_INCREMENT, INITIAL_TIMER, IDLE_TIMER, MAX_BID, START_VALUE, BID_GROUP_NAME, BID_GROUP_NAME_PLURAL, GROUP_NAME_EMBED_COLOR, PLAYER_INFO_EMBED_COLOR, MAX_GROUP_COUNT_IN_TEAM, CURRENCY_NAME, CURRENCY_SYMBOL_EMOTE_ID } = require('../modules/config');
const { getSingleBidderWithData, addPlayerDataToPlayerGroups } = require('./_util');

async function checkBid(bidValue, bidInteraction, balance, saleValue, currencySymbolEmoji) {
    if (bidValue > MAX_BID) {
        await bidInteraction.reply({
            content: `You're only allowed to bid up to a maximum of ${MAX_BID} in an auction! Bid ${MAX_BID} exactly in case you want to buy the ${BID_GROUP_NAME} instantly.`,
            ephemeral: true,
        });
        return false;
    }

    if (bidValue > balance) {
        await bidInteraction.reply({
            content: `You cannot bid more ${CURRENCY_NAME} than you currently possess! (${balance})`,
            ephemeral: true,
        });
        return false;
    }

    if (bidValue < saleValue + MIN_INCREMENT) {
        await bidInteraction.reply({
            content: `You have to bid at least ${currencySymbolEmoji}${saleValue + MIN_INCREMENT} or higher!`,
            ephemeral: true,
        });
        return false;
    }

    if (bidValue % MIN_INCREMENT !== 0) {
        await bidInteraction.reply({
            content: `The bid was not an increment of ${MIN_INCREMENT}!`,
            ephemeral: true,
        });
        return false;
    }

    return true;
}

function initCollector(interaction, db, group, currencySymbolEmoji) {
    let saleValue = START_VALUE;
    let lastBidder = null;

    const collector = new Discord.InteractionCollector(interaction.client, {
        channel: interaction.channel,
        time: INITIAL_TIMER,
    });

    collector.on("collect", async bidInteraction => {
        if (!bidInteraction.isCommand()) return;
        if (bidInteraction.commandName.toLowerCase() !== "bid") return;

        const bidder = await getSingleBidderWithData(bidInteraction.user.id, bidInteraction, db);
        if (!bidder) {
            await bidInteraction.reply({ content: 'You are not a bidder??? This should not happen, inform an admin please!', ephemeral: true });
            return;
        }

        const { currentGroupCountInTeam } = await db.get('SELECT COUNT(*) AS currentGroupCountInTeam FROM bids WHERE final_bidder_id = ?', bidder.bidder_id);
        if (currentGroupCountInTeam >= MAX_GROUP_COUNT_IN_TEAM) {
            bidInteraction.reply({ content: `You have reached the maximum of ${MAX_GROUP_COUNT_IN_TEAM} ${BID_GROUP_NAME_PLURAL} already!`, ephemeral: true });
            return;
        }

        const bidValue = bidInteraction.options.get("amount").value;
        if (!await checkBid(bidValue, bidInteraction, bidder.balance, saleValue, currencySymbolEmoji)) return;

        saleValue = bidValue;
        lastBidder = bidder;
        const bidderStr = `${bidder.bidder_name} (${bidder.members.join(', ')})`;
        await bidInteraction.reply(`${bidderStr} bids ${currencySymbolEmoji}${bidValue} ${CURRENCY_NAME}`);

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
            await interaction.followUp(`**${group.group_name}** (${group.players.map(x => x.username).join(', ')}) has been sold to **${lastBidder.bidder_name}** (${lastBidder.members.join(', ')}) for ${currencySymbolEmoji}${saleValue} ${CURRENCY_NAME}`);
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
                title: group.group_name,
                fields: [
                    {
                        name: "Qual. Seed",
                        value: `#${group.qualifier_seed}`,
                        inline: true
                    }
                ]
            }
        ]
    };

    for (const player of group.players) {
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
                    value: `#${player.bws}`,
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

        if (player.badge_count) {
            playerEmbed.fields.push({
                name: `Badges`,
                value: player.badge_count.toString(),
                inline: true
            });
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
            ORDER BY draft_order
            LIMIT 1;
        `);

        if (!randomAvailableGroup) {
            await interaction.reply(`No more ${BID_GROUP_NAME_PLURAL} to auction!`);
            return;
        }

        await addPlayerDataToPlayerGroups([randomAvailableGroup], db);

        // create bid
        await db.run(`
            INSERT INTO bids (group_id, sale_value, ongoing, start_time)
            VALUES (?, 0, TRUE, datetime('now'))
        `, randomAvailableGroup.group_id);

        await interaction.reply(generateGroupCardMessage(randomAvailableGroup));

        const currencySymbolEmoji = await interaction.guild.emojis.fetch(CURRENCY_SYMBOL_EMOTE_ID);
        initCollector(interaction, db, randomAvailableGroup, currencySymbolEmoji);
    },
    permissions: [
        {
            id: ADMIN_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}