const { ADMIN_ROLE_ID, CURRENCY_NAME } = require('../modules/config');

module.exports = {
    data: {
        name: "resetbalance",
        description: "Sets all bidders balance",
        defaultPermission: false,
        options: [{
            name: "amount",
            type: "INTEGER",
            description: `The amount of ${CURRENCY_NAME} to set to`,
            required: true,
        }],
    },
    handler: async (interaction, db) => {
        const amount = interaction.options.get("amount").value;
        await db.run(`
            UPDATE bidders
            SET balance = ?
        `, amount);

        await interaction.reply(`Set all bidders balance to ${ amount }`);
    },
    permissions: [
        {
            id: ADMIN_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}