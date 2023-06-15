const socketio = require("socket.io");
const uuid = require("uuid");
const f = require("./functions");

//Functions
String.prototype.replaceAll = (str, find, replace) => {return str.split(find).join(replace)};
global.btoa = (str) => Buffer.from(str).toString("base64");
global.atob = (str) => Buffer.from(str).toString("ascii");

module.exports = function(app, server){
	//Socket.io
	const io = socketio(server, {
		path: '/socket.io/quickchat',
		pingTiemout: 30 * 1000, //30sec
		maxHttpBufferSize: 2e7, //20MB
	});

	//Init
	var names = {};
	function joinRoom(socket){
		if (!names[socket.room]) names[socket.room] = [];
		socket.join("uuid:" + socket.uuid);
		socket.join("room:" + socket.room);
		names[socket.room].push({
			name: socket.name,
			admin: socket.admin,
			uuid: socket.uuid,
		});
		io.to("uuid:" + socket.uuid).emit("uuid", socket.uuid);
		io.to("room:" + socket.room).emit("userjoin", socket.name, socket.admin, socket.uuid, names[socket.room]);
	}
	
	function leaveRoom(socket){
		var room = names[socket.room];
		for (var index = 0; index < room.length; index++){
				if (room[index].uuid == socket.uuid) break;
			}
			names[socket.room].splice(index, 1);
			io.to("room:" + socket.room).emit("userleave", socket.name, socket.admin, socket.uuid, names[socket.room]);
	}
	
	function mime(url){
		var types = ["image", "video", "audio"], type;
		for (var i = 0; i < types.length; i++){
			type = types[i];
			if (url.startsWith("data:" + type)) return type;
		}
		return "file";
	}

	//Server
	app.get('/quickchat', function(req, res){
		res.render("quickchat/quickchat.html", {product: f.products.quickchat});
	});
	app.get('/site/product/quickchat', function(req, res){
		res.render("landing/product-quickchat.html", {product: f.products.quickchat});
	});

	//Socket.io
	io.on("connection", function(socket){
		socket.name = socket.handshake.auth.name;
		socket.room = socket.handshake.auth.room.toLowerCase();
		socket.admin = socket.handshake.auth.admin == process.env["quickchat_admin_code"] ? 3 : socket.handshake.auth.mod == process.env["quickchat_mod_code"] ? 1 : 0;
		socket.uuid = uuid.v4();
		if (!socket.name || socket.name.replaceAll(socket.name, " ", "") == "" || typeof socket.name != "string" || !socket.room || socket.room.replaceAll(socket.name, " ", "") == "" || typeof socket.room != "string"){
			socket.disconnect();
			return;
		}
		joinRoom(socket);
		socket.on("send", function(msg, callback){
			if (!msg || msg.replaceAll(msg, " ", "") == "" || typeof msg != "string") return;
			io.to("room:" + socket.room).emit("msg", socket.name, socket.admin, socket.uuid, msg);
			callback(true);
		});
		socket.on("file", function(name, m, url, callback){
			if (!url || url.replaceAll(url, " ", "") == "" || typeof url != "string") return;
			var type = mime(m);
			if (!type){
				callback(false);
				return;
			}
			io.to("room:" + socket.room).emit(type, socket.name, socket.admin, socket.uuid, name, url);
			callback(true);
		});
		socket.on("reloadRoom", function(){
			if (socket.admin != 3) return;
			io.emit("reload");
		});
		socket.on("banUser", function(id, time){
			if (socket.admin == 0) return;
			if (socket.admin == 1 && time > 60 * 60 * 1000) return;
			io.to("uuid:" + id).emit("ban", Date.now() + time);
		});
		socket.on("send-notif", function(text){
		  	if (!text) return;
			if (socket.admin != 3) return;
			io.to("room:" + socket.room).emit("notif", text);
		});
		socket.on("disconnect", function(){
			leaveRoom(socket);
		});
	});
}