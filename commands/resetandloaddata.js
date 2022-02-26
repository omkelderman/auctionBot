const { ADMIN_ROLE_ID, BID_GROUP_NAME_PLURAL, GOOGLE_SHEET_ID } = require('../modules/config');

module.exports = {
    data: {
        name: "resetandloaddata",
        description: `Reset (!!!) and load all data from the google sheet (bidding ${BID_GROUP_NAME_PLURAL} and player ${BID_GROUP_NAME_PLURAL})`,
        defaultPermission: false,
    },
    handler: async (interaction, db, sheetsApiClient) => {
        await interaction.deferReply();

        // get some random bullshit from the sheet as a proof of concept that we can access it
        const result = await sheetsApiClient.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'parse!A2:I5',
        });

        await interaction.followUp('WIP, for now a test response, from sheet \'parse!A2:I5\'\n```' + JSON.stringify(result.data.values, null, 4) + '```');
    },
    permissions: [
        {
            id: ADMIN_ROLE_ID,
            type: "ROLE",
            permission: true,
        },
    ],
}