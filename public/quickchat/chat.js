import {linkifyHtml} from './linkify.min.js'
import {LZString} from './lz-string.min.js'
var ban = localStorage.getItem("ban");
if (ban && JSON.parse(ban) > Date.now()){
	ban = JSON.parse(ban);
	$("#wrapper").html(`<p>You are banned until ${(new Date(ban).toLocaleString())}.</p>`);
	throw new Error("You are banned.");
}

function ongo(){
	if (joined) return;
	name = $("#name").val(), room = $("#room").val(), admin = localStorage.getItem("admin_code"), mod = localStorage.getItem("mod_code");
	if (!name || name.replaceAll(" ", "") == "" || typeof name != "string") {
		alert("Invalid Name");
		return;
	}
	if (!room || room.replaceAll(" ", "") == "" || typeof room != "string") {
		room = "default";
	}
	window.socket = new io({
		auth: {
			name: name,
			room: room,
			admin: admin,
			mod: mod,
		},
		path: '/socket.io/quickchat',
	});
	joined = true;
	data = {
		room: room,
		name: name,
		messages: [],
	};
	$("#wrapper").addClass("joined");
	$("#wrapper").html(`<div id="header">
 		<p id="room"><b>Room:</b> ${room}</p>
   		<p id="connected">Connecting...</p>
	 	<div id="users">
 			<b>Users:</b>
   		</div>
   	</div><br>
 	<div id="messages"></div>
  	<div id="actions">
 		<textarea id="msg"></textarea>
  		<button id="send">Send</button>
  		<input id="file" type="file">
   		<button id="file-btn" onclick="$('#file').click()">Upload File</button>
	 	<button id="export">Export Chat</button>
  		<text id="sending"></text>
  		<div id="emojis"></div>
   	</div>`);
	emojis.forEach(emoji => {
		$("#emojis").append(`<img src='/quickchat/emojis/${emoji}.svg' data-emoji="${emoji}" class="emoji-btn">`);
	});
	socket.on("connect", onconnect);
	socket.on("disconnect", ondisconnect);
	socket.on("msg", onmsg);
	socket.on("userjoin", onjoin);
	socket.on("userleave", onleave);
	socket.on("uuid", onuuid);
	socket.on("reload", onreload);
	socket.on("ban", onban);
	socket.on("image", onimage);
	socket.on("video", onvideo);
	socket.on("audio", onaudio);
	socket.on("file", onfile);
	socket.on("notif", onnotif);
	$("#send").on("click", onsend);
	$(".emoji-btn").on("click", onemoji);
	$("#file").on("change", onsendfile);
	$("#export").on("click", onexport);
	$("#msg").on("keypress", function(e) {
		if (e.keyCode == 13 && !e.shiftKey) {
			onsend();
			e.preventDefault();
		}
	});
	if (admin){
		$("#actions").append(`
  		<button id="reload">Reload Room</button><br>
		<input type="text" placeholder="Notification Text" id="notif-text" style="width: 40%">
  		<button id="notif-send">Send Notification</button>
		`);
		$("#reload").on("click", onreloadRoom);
		$("#notif-send").on("click", onsendNotif);
	}
}

async function onimport(){
	var chat = $("#import")[0].files;
	if (chat.length == 0) {
		alert("No File Selected");
		$("#import").val("");
		return;
	} else chat = chat[0];
	if (!chat.type.startsWith("text/") && !chat.type == "") {
		alert("Invalid Chat File");
		$("#import").val("");
		return;
	}
	try {
		chat = await chat.text();
		chat = JSON.parse(chat);
	} catch (e) {
		alert("Invalid Chat File");
		$("#import").val("");
		return;
	}
	if (!chat.time || !chat.room || !chat.name || !chat.messages || !chat.messages instanceof Array) {
		alert("Invalid Chat File");
		$("#import").val("");
		return;
	}
	$("#wrapper").addClass("joined");
	$("#wrapper").html(`<div id="header">
 		<h3>Viewing Chat Replay from ${(new Date(chat.time)).toLocaleString()}</h3>
	 	<div id="users" style="display: none;">
 			<b>Users:</b>
   		</div>
   	</div><br>
	<div id="messages"></div>`);
	chat.messages.forEach(item => {
		data = { messages: [] };
		if (item.type == "msg") onmsg(item.name, item.a, item.uuid, item.msg);
		else if (item.type == "join") onjoin(item.name, item.a, item.uuid, []);
		else if (item.type == "leave") onleave(item.name, item.a, item.uuid, []);
		else if (item.type == "audio") onaudio(item.name, item.a, item.uuid, item.filename, item.audio);
		else if (item.type == "video") onvideo(item.name, item.a, item.uuid, item.filename, item.video);
		else if (item.type == "image") onimage(item.name, item.a, item.uuid, item.filename, item.image);
		else if (item.type == "file") onfile(item.name, item.a, item.uuid, item.filename, item.url);
	});
}

function downloadText(mime = "plain", filename, text){
	var base64 = `data:text/${mime};charset=utf-8,${encodeURIComponent(text)}`, node = $.parseHTML(`<a href="${base64}" download="${filename}"></a>`)[0];
	$("body").append(node);
	node.click();
	node.remove();
}

function onexport(){
	data.time = Date.now();
	var json = JSON.stringify(data), date = new Date(), time = `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}_${(date.getHours() - 1) % 12 + 1}-${date.getMinutes()}-${date.getHours() > 12 ? "PM" : "AM"}`;
	downloadText("json", `quickchat-${time}.chat`, json);
}

function setUsers(){
	$("#users").html(`<b>Users:</b>`);
	for (var i = 0; i < users.length; i++){
		var user = users[i], u = $($.parseHTML(`<div class="user"><p style="${user.uuid == myuuid ? "color: var(--accent-color)" : user.admin == 3 ? "color: red" : user.admin == 1 ? "color: green" : ""}">${user.name} </p></div>`));
		if (admin && !user.admin) u.append(`<button class="ban" onclick="onbanUser('${user.uuid}');">Ban</button><input id="ban-${user.uuid}" type="number" placeholder="Ban Time (Mins)">`);
		$("#users").append(u);
	}
}

function onconnect(){
	$("#connected").text("Connected");
	$("#connected").css("color", "limegreen");
}

function ondisconnect(){
	$("#connected").text("Disconnected. Attepting to reconnect...");
	$("#connected").css("color", "red");
	$("#ping").text("Ping: Not connected");
	$("#ping").css("color", "black");
}

function onreload(){
	if (admin) return;
	location.reload();
}

function onbanUser(uuid){
	if (!admin) return;
	console.log("ban");
	var bantime = $("#ban-" + uuid).val();
	if (bantime) bantime = parseInt(bantime) * 60 * 1000;
	else bantime = 10 * 60 * 1000;
	socket.emit("banUser", uuid, bantime);
}
window.onbanUser = onbanUser;

function onban(t){
	localStorage.setItem("ban", JSON.stringify(t));
	socket.disconnect();
	socket = void 0;
	location.reload();
}

function onreloadRoom(){
	if (!admin) return;
	socket.emit("reloadRoom");
}

function toBase64(file, callback){
	var reader = new FileReader();
	reader.onload = function(){
		callback(file, reader.result);
	}
	reader.readAsDataURL(file);
}

function onsend(){
	var msg = $("#msg").val();
	if (!msg || msg.replaceAll(" ", "").replaceAll("\n", "") == "" || typeof msg != "string") return;
	msg = LZString.compress(msg);
	$("#msg").val("");
	s(1);
	socket.emit("send", msg, function() {
		s(-1);
	});
}

function onmsg(name, a, uuid, msg){
	var scrollDown = document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight - window.scrollY <= 5;
	var omsg = msg; msg = LZString.decompress(msg);
	$("#messages").append(`<div class="message">
		<b></b><text></text><p></p>
 	</div><br>`);
	var nameb = $(".message b"), msgp = $(".message p"), timet = $(".message text");
	nameb = nameb[nameb.length - 1], msgp = msgp[msgp.length - 1], timet = timet[timet.length - 1];
	$(nameb).text(name); $(msgp).text(msg); $(timet).text(" on " + (new Date()).toLocaleString());
	if (a == 3) nameb.style.color = "red";
	else if (a == 1) nameb.style.color = "green";
	if (uuid == myuuid) nameb.style.color = "var(--accent-color)";
	render(msgp);
	data.messages.push({
		type: "msg",
		name: name,
		a: a,
		uuid: uuid,
		msg: omsg,
	});
	if (scrollDown) window.scroll({
		top: window.scrollY + $("#header")[0].getBoundingClientRect().bottom + $(".message").slice(-1)[0].getBoundingClientRect().top,
		behaviour: "instant",
	});
}

function render(msgp){
	msgp.innerHTML = linkifyHtml(msgp.innerHTML, {
		defaultProtocol: "https",
		ignoreTags: ["script", "style"],
		nl2br: true,
		target: "_blank",
		truncate: 64,
	});
	emojis.forEach(emoji => {
		msgp.innerHTML = msgp.innerHTML.replaceAll(":" + emoji + ":", `<img class="emoji" src='/quickchat/emojis/${emoji}.svg'>`);
	});
	msgp.innerHTML.replace(/(https?:\/\/[^\s]+)/g, function(url) {
		return `<a href="${url}">${url}</a>`;
	});
}

function onemoji(e){
	var emoji = e.target.dataset.emoji;
	var newmsg = $("#msg").val() + ":" + emoji + ":";
	$("#msg").val(newmsg);
	$("#msg").focus();
}

function onsendfile(){
	var image = $("#file")[0].files;
	if (image.length == 0) return;
	else image = image[0];
	$("#file").val("");
	s(1);
	toBase64(image, function(file, url){
		var mime = url.split(";")[0];
		if (url.length > 2e7){
			s(-1);
			alert("Could not send file: File too large");
			return;
		}
		url = LZString.compress(url);
		socket.emit("file", file.name, mime, url, function(){
			s(-1);
		});
	});
}

function onimage(name, a, uuid, filename, image){
	var scrollDown = document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight - window.scrollY <= 5;
	var oimage = image; image = LZString.decompress(image);
	$("#messages").append(`<div class="message">
		<b></b><text></text><br>
  		<img title="Click to open in new tab">
 	</div><br>`);
	var nameb = $(".message b"), timet = $(".message text"), imgi = $(".message img");
	nameb = nameb[nameb.length - 1], timet = timet[timet.length - 1], imgi = imgi[imgi.length - 1];
	$(nameb).text(name); $(timet).text(" on " + (new Date()).toLocaleString()); $(imgi).attr("src", image);
	if (a == 3) nameb.style.color = "red";
	else if (a == 1) nameb.style.color = "green";
	if (uuid == myuuid) nameb.style.color = "var(--accent-color)";
	data.messages.push({
		type: "image",
		name: name,
		a: a,
		filename: filename,
		image: oimage,
	});
	if (scrollDown) window.scroll({
		top: window.scrollY + $("#header")[0].getBoundingClientRect().bottom + $(".message").slice(-1)[0].getBoundingClientRect().top,
		behaviour: "instant",
	});
}

function onvideo(name, a, uuid, filename, video) {
	var scrollDown = document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight - window.scrollY <= 5;
	var ovideo = video; video = LZString.decompress(video);
	$("#messages").append(`<div class="message">
		<b></b><text></text><br>
  		<video controls>
 	</div><br>`);
	var nameb = $(".message b"), timet = $(".message text"), vidv = $(".message video");
	nameb = nameb[nameb.length - 1], timet = timet[timet.length - 1], vidv = vidv[vidv.length - 1];
	$(nameb).text(name); $(timet).text(" on " + (new Date()).toLocaleString()); $(vidv).attr("src", video);
	//$(vidv).on("canplaythrough", e => e.target.play());
	if (a == 3) nameb.style.color = "red";
	else if (a == 1) nameb.style.color = "green";
	if (uuid == myuuid) nameb.style.color = "var(--accent-color)";
	data.messages.push({
		type: "video",
		name: name,
		a: a,
		uuid: uuid,
		filename: filename,
		video: ovideo,
	});
	if (scrollDown) window.scroll({
		top: window.scrollY + $("#header")[0].getBoundingClientRect().bottom + $(".message").slice(-1)[0].getBoundingClientRect().top,
		behaviour: "instant",
	});
}

function onaudio(name, a, uuid, filename, audio) {
	var scrollDown = document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight - window.scrollY <= 5;
	var oaudio = audio; audio = LZString.decompress(audio);
	$("#messages").append(`<div class="message">
		<b></b><text></text><br>
  		<audio controls>
 	</div><br>`);
	var nameb = $(".message b"), timet = $(".message text"), auda = $(".message audio");
	nameb = nameb[nameb.length - 1], timet = timet[timet.length - 1], auda = auda[auda.length - 1];
	$(nameb).text(name); $(timet).text(" on " + (new Date()).toLocaleString()); $(auda).attr("src", audio);
	//$(auda).on("canplaythrough", e => e.target.play());
	if (a == 3) nameb.style.color = "red";
	else if (a == 1) nameb.style.color = "green";
	if (uuid == myuuid) nameb.style.color = "var(--accent-color)";
	data.messages.push({
		type: "audio",
		name: name,
		a: a,
		uuid: uuid,
		filename: filename,
		audio: oaudio,
	});
	if (scrollDown) window.scroll({
		top: window.scrollY + $("#header")[0].getBoundingClientRect().bottom + $(".message").slice(-1)[0].getBoundingClientRect().top,
		behaviour: "instant",
	});
}

function onfile(name, a, uuid, filename, url){
	var scrollDown = document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight - window.scrollY <= 5;
	var ourl = url; url = LZString.decompress(url);
	$("#messages").append(`<div class="message">
		<b></b><text></text><br>
  		<a></a>
 	</div><br>`);
	var nameb = $(".message b"), timet = $(".message text"), fila = $(".message a");
	nameb = nameb[nameb.length - 1], timet = timet[timet.length - 1], fila = fila[fila.length - 1];
	$(nameb).text(name); $(timet).text(" on " + (new Date()).toLocaleString()); $(fila).attr("download", filename); $(fila).attr("href", url); $(fila).text(`${filename} (Click to Download)`);
	if (a == 3) nameb.style.color = "red";
	else if (a == 1) nameb.style.color = "green";
	if (uuid == myuuid) nameb.style.color = "var(--accent-color)";
	data.messages.push({
		type: "file",
		name: name,
		a: a,
		uuid: uuid,
		filename: filename,
		url: ourl,
	});
	if (scrollDown) window.scroll({
		top: window.scrollY + $("#header")[0].getBoundingClientRect().bottom + $(".message").slice(-1)[0].getBoundingClientRect().top,
		behaviour: "instant",
	});
}

function onuuid(uuid){
	myuuid = uuid;
}

function onjoin(name, a, uuid, names){
	var scrollDown = document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight - window.scrollY <= 5;
	$("#messages").append(`<div class="message">
		<i><i ${uuid == myuuid ? 'style="color: var(--accent-color)"' : a ? 'style="color: red"' : ""}>${name}</i> joined at ${(new Date()).toLocaleString()}</i>
 	</div><br>`);
	users = names;
	setUsers(names);
	data.messages.push({
		type: "join",
		name: name,
		a: a,
		uuid: uuid,
	});
	if (scrollDown) window.scroll({
		top: window.scrollY + $("#header")[0].getBoundingClientRect().bottom + $(".message").slice(-1)[0].getBoundingClientRect().top,
		behaviour: "instant",
	});
}

function onleave(name, a, uuid, names){
	var scrollDown = document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight - window.scrollY <= 5;
	$("#messages").append(`<div class="message">
		<i><i ${uuid == myuuid ? 'style="color: var(--accent-color)"' : a ? 'style="color: red"' : ""}>${name}</i> left at ${(new Date()).toLocaleString()}</i>
 	</div><br>`);
	users = names;
	setUsers();
	data.messages.push({
		type: "leave",
		name: name,
		a: a,
		uuid: uuid,
	});
	if (scrollDown) window.scroll({
		top: window.scrollY + $("#header")[0].getBoundingClientRect().bottom + $(".message").slice(-1)[0].getBoundingClientRect().top,
		behaviour: "instant",
	});
}

function onsendNotif(){
	if (!admin) return;
	let text = $("#notif-text").val();
	if (!text) return;
	$("#notif-text").val("");
	socket.emit("send-notif", text);
}

function onnotif(text){
	if (admin) return;
	site.ui.notif.display({title: "New Message", body: text});
}

function s(sent){
	sending += sent;
	if (sending == 0) $("#sending").text("");
	else if (sending == 1) $("#sending").text(`Sending 1 message...`);
	else $("#sending").text(`Sending ${sending} messages...`);
}

var joined = false, name, room, admin, mod, myuuid = "", users = [], data = {}, emojis = ["smiley", "laugh", "love", "average", "surprised", "halo", "cry", "sleep", "party", "cool", "angry", "rich", "hot", "cold", "poo"], sending = 0;
$("#join").on("click", ongo);
$("#import").on("change", onimport);