const express = require("express");
const session = require("express-session");
const socketio_session = require("express-socket.io-session");
const redis = require("redis");
const session_store = require("connect-redis");
const socketio = require("socket.io");
const {ExpressPeerServer} = require("peer");
const http = require("http");
const vhost = require("vhost");
const ejs = require("ejs");
const {v4: uuid} = require("uuid");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const Database = require("better-replit-db");
const f = require("./functions");

const app = express();
const server = http.Server(app);
const io = socketio(server);
const peerServer = ExpressPeerServer(server, {debug: true});
const db = new Database();
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
	},
	store: new redisStore({client: redis.createClient({host: process.env["redis_host"], port: process.env["redis_port"], password: process.env["redis_password"]})}),
});
const shared_session = socketio_session(session_instance, cookieParser(), {autoSave: true});

users = {};

app.engine("html", ejs.renderFile);
app.set("view engine", "html");
app.use(express.static("public"));
app.use('/peerjs', peerServer)
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session_instance);
io.use(shared_session);

server.listen(3000,  () => {
	console.log("server started");
});

app.get('/', function(req, res){
	res.render("index.html");
});

//Login
app.get('/login', function(req, res){
	let valid = f.checkSession(req.session);
	if (valid) res.redirect('/home');
	else res.render("login.html");
});

app.get('/login/google', function(req, res){
});

app.post('/login', async function(req, res){
	let status = await f.checkEmailLogin(req.body);
	if (status.error == false && status.code == 0){
		res.send({valid: true, userID: status.userID});
	} else if (status.error == true){
		if (status.code == 1) return res.send({valid: false, error: "Invalid Form Data"});
		else if (status.code == 2) return res.send({valid: false, error: "Username or Password missing"});
		else if (status.code == 100) return res.send({valid: false, error: "Incorrect Password"});
		else if (status.code == 101) return res.send({valid: false, error: "Email not Found"});
		else if (status.code == 202) return res.send({valid: false, error: "Account must be logged into via Google"});
		else if (status.code in [200, 201, 203]) return res.send({valid: false, error: "Server Error"});
	} else res.send({valid: false});
});

app.post('/login/google', function(req, res){
	let googleIdToken = req.body.credential;
	let credential = f.verifyGoogleToken(googleIdToken, process.env["google_client_id"]).catch(console.error);
	console.log(credential);
});

//---MEETS---//

app.get('/meet/join', function(req, res){
	if (req.query.id){
		let meetID = req.query.id;
		if (meets.hasOwnProperty(meetID)){
			let meet = meets[meetID];
			if (meet.password == false){
				res.render("meet.html");
			} else{
				if (req.query.password){
					if (req.query.password == meet.password){
						if (false){
						} else res.render("meet.html");
					} else res.render("join_meet.html", {});
				} else res.render("join_meet.html", {});
			}
		} else{
			res.render("join_meet.html", {});
		}
	} else res.render("join_meet.html", {});
});

app.get('/meet', function(req, res){
	/*
	if (req.session.meetID){
	}
	*/
	res.render("meet.html");
});

app.post('/meet/connect', function(req, res){
	//Meet Connection
	res.send({call: req.body});
});

//socket.io for meets
io.on("connection", function(socket){
});

app.get('/test', function(req, res){
	res.render("test.html", {googleClientId: process.env["google_client_id"]});
});