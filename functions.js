const {OAuth2Client} = require("google-auth-library");
const Database = require("better-replit-db");

const googleClient = new OAuth2Client(process.env["google_client_id"]);
const db = new Database();
db.set("logins", {"a@b": {method: "email", password: "123", id: 754}});

var user_count = 0;

//User security
class User{
	constructor(){
	}
}

function checkSession(req){
}
async function checkEmailLogin(data){
	if (typeof data != "object") return {error: true, code: 1};
	if (!data.hasOwnProperty("email") || !data.hasOwnProperty("password")) return {error: true, code: 2};

	let logins = await db.get("logins");
	if (logins.hasOwnProperty(data.email)){
		let user = logins[data.email];
		if (typeof user == "object"){
			if (user.hasOwnProperty("method")){
				if (user.method != "email"){
					return {error: true, code: 202, method: user.method};
				}
				if (user.hasOwnProperty("password")){
					if (user.password == data.password){
						return {error: false, code: 0, userID: user.id};
					} else return {error: false, code: 100};
				} else return {error: true, code: 201};
			} else return {error: true, code: 203};
		} else return {error: true, code: 200};
	}
	return {error: true, code: 101};
}

//Data functions
function decodeBase64(base64){
	base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
	let decoded = Buffer.from(base64, "base64").toString("ascii");
	return decoded;
}

function decodeJWT(jwt){
	let split = jwt.split('.');
	let decoded = {};
	decoded.header = JSON.parse(decodeBase64(split[0]));
	decoded.payload = JSON.parse(decodeBase64(split[1]));
	return decoded;
}

//Google
async function verifyGoogleToken(token, googleClientID){
	const googleTicket = await googleClient.verifyIdToken({
		idToken: token,
		audience: googleClientID + ".apps.googleusercontent.com",
	});
	const payload = googleTicket.getPayload();
	console.log(payload);
}

module.exports = {
	checkSession: checkSession,
	checkEmailLogin: checkEmailLogin,
	decodeBase64: decodeBase64,
	decodeJWT: decodeJWT,
	verifyGoogleToken: verifyGoogleToken,
}

/* THIS IS THE INFO FOR THE CODE
*/