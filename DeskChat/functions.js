//Init
const {OAuth2Client} = require("google-auth-library");
const googleClient = new OAuth2Client(process.env["google_client_id"]);
const cryptojs = require("crypto-js");
const axios = require("axios");
const email_validator = require("email-validator");
const uuid = require("uuid").v4;

//Database/Storage (Firebase)
db = require("@firebase/database");
st = require("@firebase/storage");

const firebase = {
	init: require("@firebase/app").initializeApp,
	config: JSON.parse(process.env["firebase-config"]),
	db: db,
	st: st,
}
firebase.app = firebase.init(firebase.config);

db.r = function(path){
	if (typeof path == "string") path = db.ref(db.getDatabase(), path);
	return path;
}

db.write = async function(path, data){
	if (typeof path == "string") path = db.ref(db.getDatabase(), path);
	result = await db.set(path, data).catch(console.warn);
	return result;
}

db.read = async function(path){
	if (typeof path == "string") path = db.ref(db.getDatabase(), path);
	let result = await db.get(path).catch(console.warn);
	if (result.exists()) return result.val();
	else return false;
}

db.search = async function(path, prop, value){
	if (typeof path == "string") path = db.ref(db.getDatabase(), path);
	let result = await db.read(db.query(path, db.orderByChild(prop), db.equalTo(value)));
	return result;
}

st.r = function(path){
	if (typeof path == "string") path = st.ref(st.getStorage(), path);
	return path;
}

st.upload = async function(path, file, md = {}){
	if (typeof path == "string") path = st.ref(st.getStorage(), path);
	if (file instanceof Buffer) return st.uploadBytes(path, file, md);
	if (ArrayBuffer.isView(file)) return st.uploadBytes(path, file, md);
	if (typeof file == "string"){
		if (file.substr(0, 5) == "data:") return st.uploadString(path, file, "data_url");
		else return st.uploadString(path, file);
	}
	return file;
}

st.uploadResumable = async function(path, file){
	if (typeof path == "string") path = st.ref(st.getStorage(), path);
	return st.uploadBytesResumable(path, file);
}

//Start data
var user_count = 0;
var products = {
	deskchat: {
		name: "DeskChat",
		url: '/',
		creator: "AksLolCoding",
		creator_url: "https://akslolcoding.tk/",
	},
	quickchat: {
		name: "QuickChat",
		url: '/quickchat',
		creator: "AksLolCoding",
		creator_url: "https://akslolcoding.tk/",
	},
};

//Security
async function checkCaptcha(token){
	let resp = await axios({
		method: "POST",
		url: "https://www.google.com/recaptcha/api/siteverify",
		params: {response: token, secret: process.env['captcha_secret']},
	});
	return resp.data.success;
}

function sessionData(req, res, next){
	if (req.session){
		if (req.session.loggedin){
			res.locals.session = {
				loggedin: true,
				userID: req.session.userID,
				username: req.session.username,
			};
		} else {
			res.locals.session = {
				loggedin: false,
				userID: 0,
				username: "",
			};
		}
	} else{
		res.locals.session = {
			loggedin: false,
			userID: 0,
			username: "",
		};
	}
	res.locals.product = products["deskchat"];
	next();
}

function socketData(socket, next){
	socket.session = socket.handshake.session;
	if (socket.session){
		if (socket.session.loggedin){
		} else{
		}
	}
	next();
}

async function setSession(session, userid, username){
	const user = await db.read("users/" + userid);
	session.loggedin = true;
	session.userID = userid;
	session.username = username;
	return true;
}

async function checkEmailLogin(data){
	if (typeof data != "object") return {error: true, code: 1};
	if (!data.hasOwnProperty("email") || !data.hasOwnProperty("password")) return {error: true, code: 2};
	if (typeof data.email != "string") return {error: true, code: 1};
	if (!data.email.includes("@")) return {error: true, code: 3};

	data.email = data.email.replace(/\./g, ' ');
	let user = await db.read("logins/" + data.email);
	if (user != false){
		if (typeof user == "object"){
			if (user.hasOwnProperty("method")){
				if (user.method != "email"){
					return {error: true, code: 202, method: user.method};
				}
				if (user.hasOwnProperty("password")){
					let password = cryptojs.SHA256(data.password).toString();
					if (password == user.password){
						return {error: false, code: 0, userID: user.id, username: user.username};
					} else return {error: false, code: 100};
				} else return {error: true, code: 201};
			} else return {error: true, code: 203};
		} else return {error: true, code: 200};
	} return {error: true, code: 101};
}

async function registerEmail(data){
	if (typeof data != "object") return {error: true, code: 1};
	if (!data.hasOwnProperty("email") || !data.hasOwnProperty("password") || !data.hasOwnProperty("username")) return {error: true, code: 2};
	
	if (data.hasOwnProperty("g-recaptcha-response")){
		if (!(await checkCaptcha(data["g-recaptcha-response"]))) return {error: true, code: 4};
	} else return {error: true, code: 4};

	if (!email_validator.validate(data.email)) return {error: true, code: 3};
	if (!/(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{6,})/.test(data.password)) return {error: true, code: 102};

	data.email = data.email.replace(/\./g, ' ');
	console.log(await db.search("logins", "username", data.username));
	if ((await db.search("logins", "username", data.username)) == false){
		try{
			var userID = await createAccount(data);
			return {error: false, code: 0, userID: userID, username: data.username};
		} catch(e){return {error: true, code: 200};}
	} else return {error: true, code: 101};
}

async function createAccount(data){
	userID = await db.read('users/count') + 1;
	db.write('users/count', userID);
	db.write("logins/" + data.email, {
		email: data.email,
		username: data.username,
		password: cryptojs.SHA256(data.password).toString(),
		method: "email",
		id: userID,
	});
	db.write("users/" + userID, {
		info: {
			username: data.username,
			email: data.email,
			id: userID,
		},
	});
	return userID;
}

//Meets
var meet = {
	validRoomId: async function(id){
		var valid = await db.read('meets/' + id + '/info');
		if (valid) return true;
		else return false;
	},
	findRoomId: async function(){
		let id = 0, valid = true, count = 0;
		while (true){
			id = Math.floor(Math.random() * 900000) + 100000;
			valid = await meet.validRoomId(id);
			count += 1;
			if (count >= 100) return false;
			if (!valid) break;
		}
		return id;
	},
	create: async function(password){
		var host = uuid(), meetID = await meet.findRoomId();
		if (!id) return false;
		db.write("meets/" + meetID, {
			info: {
				id: meetID,
				users: 0,
				password: password == "" ? "" : cryptojs.SHA256(password).toString(),
				host: host,
			},
			users: {},
			messages: {},
		});
		return {
			meetID: meetID,
			host: host,
		};
	},
	host: async function(req, res){
		var data = req.body;
		if (!data.password) return {error: true, code: 1};
		if (!/^.{3,16}$/.test(password)) return {error: true, code: 101};
	},
	verifyJoin: async function(id, password){
		if (!id) return {error: true, code: 1};
		var meet = await db.read('meets/' + id + '/info');
		if (!meet) return {error: true, code: 101};
		if (meet.password == "") return {error: false, code: 0};
		if (!password) return {error: true, code: 2};
		if (cryptojs.SHA256(password).toString() != meet.password) return {error: true, code: 102};
		return {error: false, code: 0};
	},
	verifyHost: async function(id, host){
		if (!id) return {error: true, code: 1};
		if (!host) return {error: true, code: 2};
		var meet = await db.read('meets/' + id + '/info');
		if (!meet) return {error: true, code: 101};
		if (host != meet.host) return {error: true, code: 102};
		return {error: false, code: 0};
	},
};

//Chats
var chat = {
	create: async function(name, user){
		var chatID = await db.read("chats/count");
		db.write("chats/count", chatID + 1);
		db.write("chats/" + chatID, {
			info: {
				id: chatID,
				name: name,
			},
			users: {
				[user.id]: {
					id: user.id,
					username: user.username,
				}
			},
			messages: {},
		});
		db.write("users/" + userID + "/chats/" + chatID, {
			id: chatID,
			users: {
				id: user.id,
				username: user.username,
			},
		});
		return chatID;
	},
	new: async function(req, res){
	},
	get_chats: async function(user, last){
		let a = db.query(db.read("users/" + user.id + "/chats"));
	},
	next: async function(req, res){
	},
};

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
	return payload;
}

module.exports = {
	products: products,
	sessionData: sessionData,
	socketData: socketData,
	setSession: setSession,
	checkEmailLogin: checkEmailLogin,
	registerEmail: registerEmail,
	createAccount: createAccount,
	decodeBase64: decodeBase64,
	decodeJWT: decodeJWT,
	verifyGoogleToken: verifyGoogleToken,
	firebase: firebase,
	db: db,
	st: st,
	meet: meet,
	chat: chat,
}

/* THIS IS THE INFO FOR THE CODE
*/