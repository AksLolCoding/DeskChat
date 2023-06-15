const express = require("express");
const session = require("express-session");
const socketio_session = require("express-socket.io-session");
const redis = require("redis");
const session_store = require("connect-redis");
const socketio = require("socket.io");
const peer = require("peer");
const http = require("http");
const ejs = require("ejs");
const uuid = require("uuid");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const gzip = require("compression");
const f = require("./functions");

const app = express();
const server = http.Server(app);
const meetio = socketio(server, {
	path: '/socket.io/meet',
});
const meetpeer = peer.ExpressPeerServer(server, {
	path: '/peer/meet',
	port: 443,
});
const profile_upload = multer({
	storage: multer.memoryStorage(),
});
const redisStore = session_store(session);
const session_instance = session({
	secret: process.env["session_secret"],
	saveUninitialized: true,
	resave: false,
	unset: "destroy",
	cookie: {
		httpOnly: true,
		maxAge: 30 * 24 * 60 * 60 * 1000,
	},
	store: new redisStore({client: redis.createClient({host: process.env["redis_host"], port: process.env["redis_port"], password: process.env["redis_password"]})}),
});
const shared_session = socketio_session(session_instance, cookieParser(), {autoSave: true});

//Middleware
app.engine("html", ejs.renderFile);
app.set("view engine", "html");
app.use(express.static("public"));
app.use(meetpeer);
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(session_instance);
//app.use(gzip);
app.use(f.sessionData);
meetio.use(shared_session);
meetio.use(f.socketData);

//Quickchat
require('./quickchat')(app, server);

//Desktop App
require('./desktopapp/download')(app);

//Functions
String.prototype.replaceAll = (str, find, replace) => {return str.split(find).join(replace)};
global.btoa = (str) => Buffer.from(str).toString("base64");
global.atob = (str) => Buffer.from(str).toString("ascii");

//--SERVER--
server.listen(3000,  () => {
	console.log("[SERVER] Server started on port 3000.");
});

//--SITE & LANDING--/
app.get('/', function(req, res){
	res.render("landing/index.html");
});

app.get('/site/product', function(req, res){
	res.render("landing/product.html");
});

//== !!! IMPORTANT NOTE TO YOU !!! ==
//if ur reading this i have a website: deskchat.tk
//you can contact me at: contact@deskchat.tk

//--SESSIONS--//
app.head('/', function(req, res){
	res.send(["HEAD", "GET", "POST"]);
});

//Login
app.get('/login', function(req, res){
	if (req.session.loggedin) res.redirect('/home');
	else res.render("session/login.html");
});

app.get('/login2', function(req, res){
	if (req.session.loggedin) res.redirect('/home');
	else res.render("session/login.html");
});

app.get('/login/google', function(req, res){
	if (req.session.loggedin) res.redirect('/home');
	else res.redirect(process.env["gsi_url"]);
});

app.post('/login', async function(req, res){
	let status = await f.checkEmailLogin(req.body);
	if (status.error == false && status.code == 0){
		await f.setSession(req.session, status.userID, status.username);
		res.send({valid: true, userID: status.userID});
	}
	else if (status.error == true) res.send({valid: false, code: status.code});
	else res.send({valid: false, code: status.code});
});

app.post('/login/google', async function(req, res){
	let googleIdToken = req.body.credential;
	let credential = await f.verifyGoogleToken(googleIdToken, process.env["google_client_id"]).catch(console.error);
	console.log(credential);
});

//Register
app.get('/register', function(req, res){
	if (req.session.loggedin) res.redirect('/home');
	else res.render("session/register.html", {captcha_key: process.env["captcha_key"]});
});

app.post('/register', async function(req, res){
	let status = await f.registerEmail(req.body);
	if (status.error == false && status.code == 0){
		await f.setSession(req.session, status.userID, status.username);
		res.send({valid: true, userID: status.userID});
	}
	else if (status.error == true) res.send({valid: false, code: status.code});
	else res.send({valid: false, code: status.code});
});

//Logout
app.get('/logout', function(req, res){
	if (req.session.loggedin) res.render("session/logout.html");
	else res.redirect('/');
});

app.post('/logout', function(req, res){
	req.session.destroy();
	if (req.header("x-requested-with") == "XMLHttpRequest") res.send(true);
	else res.redirect('/');
});

//--CHATS--//
app.get('/home', function(req, res){
	if (req.session.loggedin) res.render("home.html");
	else res.redirect('/login?url=%2Fhome');
});

app.post('/chats', function(req, res){
	res.send({
		1: {
			name: "Sample Chat",
			id: 1,
			users: {
				1: {
					name: "user1",
					id: 1,
				}
			},
			new: 0,
			starred: 0,
			lastseen: Date.now() - 24*60*60*1000,
			latest: {
				type: "text",
				sender: "user1",
				content: "Hello!",
			},
		},
	});
});

//---MEETS---//
var meets = {7: {password: "123", id: 7}};

app.get('/meet/join', function(req, res){
	res.render("meet/join.html");
});

app.post('/meet/join', async function(req, res){
	var status = await f.meet.verifyJoin(req.body.id, req.body.password);
	res.send(status);
});

app.get('/meet', function(req, res){
	res.render("meet/meet.html");
});

app.post('/meet/host', function(req, res){
});

//Meet Socket
meetio.on("connection", function(socket){
	socket.auth = socket.handshake.auth;
	if (socket.auth.host){
		if (f.meet.verifyHost(socket.auth.id, socket.auth.host).error){
			if (f.meet.verifyJoin(socket.auth.id, "").error){
				socket.emit("disconnectReason", "not host");
				socket.disconnect();
				return;
			} else{
				socket.auth.host = null;
			}
		}
	} else{
		try{
			if (f.meet.verifyJoin(socket.auth.id, atob(socket.auth.password)).error){
				socket.emit("disconnectReason", "wrong join details");
				socket.disconnect();
				return;
			}
		} catch(e){
			socket.emit("disconnectReason", "invalid password");
			console.log(e);
			socket.disconnect();
			return;
		}
	}
	socket.join("room:" + socket.auth.id);
	socket.on("ready", function(peerid){
		socket.peerid = peerid;
		meetio.to("room:" + socket.auth.id).emit("peerid", peerid);
	});
	socket.on("disconnect", function(){
		meetio.to("room:" + socket.auth.id).emit("peer-leave", socket.peerid);
	});
});

//--TESTS--//
app.get('/test', function(req, res){
	res.render("testupload.html");
});

app.get('/tabs', function(req, res){
	res.render("testtabs.html")
});

app.get('/switch', function(req, res){
	res.render("switch.html");
});

//Images (Firebase Storage)
app.get('/cdn/*', async function(req, res){
	let path = req.params[0];
	path = f.st.r(path);
	try {await f.st.getDownloadURL(path);}
	catch(e) {return res.sendStatus(404);}
	f.st.getStream(path).pipe(res);
});

//--ERROR HANDLING--//
app.use(function(req, res, next){
	res.status(404).render("404page.html");
});
app.use(function(err, req, res, next){
	console.log(err);
});