const sheets = require('@googleapis/sheets');
const { GOOGLE_APIS_CRED_JSON_FILE } = require('./config');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];


async function auth() {
    const auth = new sheets.auth.GoogleAuth({
        keyFilename: GOOGLE_APIS_CRED_JSON_FILE,
        scopes: SCOPES
    });

    const authClient = await auth.getClient();
    const client = sheets.sheets({
        version: 'v4',
        auth: authClient
    });

    return client;
}

module.exports = { auth };