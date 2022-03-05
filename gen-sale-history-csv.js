const { addDataToBiddersArray, addPlayerDataToPlayerGroups } = require("./commands/_util");
const { GUILD_ID, BID_GROUP_NAME } = require("./modules/config");
const database = require("./modules/database");
const discord = require("./modules/discord");

function escapeQuotes(str) {
    return str.replaceAll('"', '""');
}

async function main() {
    const client = await discord.connectSimple();
    const guild = await client.guilds.fetch(GUILD_ID);
    const db = await database.connect();
    const flatDbResult = await db.all(`
        SELECT
            b.bid_id,
            b.start_time,
            pg.group_id,
            pg.group_name,
            bb.bidder_id,
            bb.bidder_name,
            b.sale_value
        FROM bids b
        INNER JOIN player_groups pg ON pg.group_id = b.group_id
        LEFT OUTER JOIN bidders bb ON bb.bidder_id = b.final_bidder_id
        ORDER BY b.start_time
    `);

    const biddersArray = [];
    const biddersMap = new Map();
    const groupArray = [];
    const data = flatDbResult.map((x) => {
        let bidder;
        if (x.bidder_id) {
            bidder = biddersMap.get(x.bidder_id);
            if (bidder == null) {
                bidder = {
                    bidder_id: x.bidder_id,
                    bidder_name: x.bidder_name
                }
                biddersMap.set(x.bidder_id, bidder);
                biddersArray.push(bidder);
            }
        } else {
            bidder = null;
        }
        const group = {
            group_id: x.group_id,
            group_name: x.group_name
        };
        groupArray.push(group);
        return {
            bid_id: x.bid_id,
            start_time: x.start_time,
            sale_value: x.sale_value,
            group: group,
            bidder: bidder
        };
    });

    await addDataToBiddersArray(biddersArray, db, guild.members, false);
    await addPlayerDataToPlayerGroups(groupArray, db);


    await db.close();
    client.destroy();

    console.log(data);
    console.log(`"id","date time","${BID_GROUP_NAME}","players","sale value","captain","members"`);
    for(const bid of data) {
        const playersStr = bid.group.players.map(p => p.username).join(', ');
        const row = `${bid.bid_id},${bid.start_time},"${escapeQuotes(bid.group.group_name)}","${escapeQuotes(playersStr)}"`;
        if(bid.bidder) {
            const membersStr = bid.bidder.members.join(', ');
            console.log(`${row},${bid.sale_value},"${escapeQuotes(bid.bidder.bidder_name)}","${escapeQuotes(membersStr)}"`);
        } else {
            console.log(`${row},,`);
        }
    }
}


main().catch(console.error);