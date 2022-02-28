const { ADMIN_ROLE_ID, CURRENCY_NAME } = require('../modules/config');
const { getSingleBidderWithData } = require('./_util');

module.exports = {
    data: {
        name: "setbalance",
        description: "Sets the balance for a single user",
        defaultPermission: false,
        options: [{
            name: "amount",
            type: "INTEGER",
            description: `The amount of ${CURRENCY_NAME} to set to`,
            required: true,
        }, {
            name: "user",
            type: "USER",
            description: "The user to set the balance for",
            required: true,
        }],
    },
    handler: async (interaction, db) => {
        const { member } = interaction.options.get("user");
        const bidder = await getSingleBidderWithData(member.id, interaction, db, false);
        if(!bidder) {
            await interaction.reply("Mentioned user is not a bidder!");
            return;
        }
        const amount = interaction.options.get("amount").value;

        await db.run(`
            UPDATE bidders
            SET balance = ?
            WHERE bidder_id = ?
        `, amount, bidder.bidder_id);

        await interaction.reply(`Set balance of ${bidder.bidder_name} (${bidder.members.join(', ')}) to ${ amount }`);
    },
    permissions: [
        {
            id: ADMIN_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}