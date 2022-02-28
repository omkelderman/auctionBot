const { BIDDER_ROLE_ID, BID_GROUP_NAME, CURRENCY_NAME } = require('../modules/config');

module.exports = {
    data: {
        name: "bid",
        description: `Bid on the currently auctioned ${BID_GROUP_NAME}!`,
        defaultPermission: false,
        options: [{
            name: "amount",
            type: "INTEGER",
            description: `Amount of ${CURRENCY_NAME} to bid`,
            required: true,
        }],
    },
    handler: async () => {
        // Logic is handled in newsale.js via an InteractionCollector
        // TODO find a way for bid not to do anything unless an auction is active
    },
    permissions: [
        {
            id: BIDDER_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}