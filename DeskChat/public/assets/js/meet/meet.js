//==INITIALIZATION==
var meet = {
	id: sessionStorage.getItem("meet-id"),
	password: sessionStorage.getItem("meet-password"),
	name: sessionStorage.getItem("meet-name"),
	host: sessionStorage.getItem("meet-host"),
};

if (!meet.id || (!meet.host && !meet.password)){
	if (!meet.id) location.href = `/meet/join`;
	else location.href = `/meet/join?id=${meet.id}`;
}

var auth; history.replaceState(null, null, '/meet');
if (meet.host){
	auth = {
		meetID: meet.id,
		host: meet.host,
		name: meet.name,
	};
} else {
	auth = {
		meetID: meet.id,
		password: meet.password,
		name: meet.name,
	};
}

const socket = io({
	auth: auth,
	path: '/socket.io/meet',
});

socket.on("disconnectReason", function(reason){
	console.log(reason);
});

const peer = new Peer(undefined, {
	path: '/peer/meet',
	host: '/',
	port: 443,
});

//==LOADING==
load = {
	init_bar: $(".init-bar-inner")[0],
	meet_loading: $("#meet_loading"),
	loadv: 0,
	max: 10,
	fade: () => {
		try{
			load.init_bar.style.width = "100%";
			load.loadv = load.max;
			$(".init-bar-outer").css("position", "absolute");
			$(".init-bar-outer").css("opacity", "0");
			$("#meet_loading").css("opacity", "0");
			$("#meet-wrapper-inner").css("opacity", "1");
			setTimeout(() => {
				$(".init-bar-outer")[0].remove();
				$("#meet_loading").remove();
			}, 1000);
			delete load;
		} catch(e){}
	},
	progress: (v = 1) => {
		load.loadv += v;
		load.init_bar.style.width = String(load.loadv / load.max * 100) + "%";
		if (load.loadv >= load.max) load.fade();
	},
};
meet.wrapper = $("#meet_wrapper");
meet.wrapper.append(`<div id="meet_loading" style="opacity: 1;">
	<div>
		<div class="loader"><span class="loader-inner"></span></div><br><br>
		<a id="loading_text">Initializing...</a>
 	</div>
</div>`);
load.loading_text = $("#loading_text");
load.progress(1);

//Socket.io & Peer Connections
load.loading_text.text("Fetching video...");

socket.on.connect = () => {
	socket.off("connect");
	load.progress(2);
	socket.emit("ready", peer.id);
	socket.on("peerid", socket.on.peerid);
	socket.on("peer-leave", socket.on.peer_leave);
}

socket.on.peerid = (peerid) => {
	if (peerid == peer.id) return;
	const call = peer.call(peerid, userStream);
	handleCall(call);
};

socket.on.peer_leave = (peerid) => {
	$("#video_" + peerid).remove();
};

peer.on.open = (peerID) => {
	meet.wrapper.append(`<div id="meet-wrapper-inner" style="opacity: 0;">
 		<div id="meet-header">
  		</div>
 		<div id="meet-main">
   		</div>
	 	<div id="meet-footer">
   			<button id="toggle-audio">Mute Audio</button>
   			<button id="toggle-video">Hide Video</button>	
   			<button id="screenshare-start">Start Screenshare</button>
	  <button id="screenshare-stop">Stop Screenshare</button>
  		</div>
		<div id="meet-sidebar">
  		</div>
 	</div>`);
	load.progress(2);
	peer.off("open");
	if (socket.connected) socket.on.connect();
	else socket.on("connect", socket.on.connect);
	peer.on("call", peer.on.call);
	$("#screenshare-start").on("click", controls.startScreenShare);
	$("#screenshare-stop").on("click", controls.stopScreenShare);
	$("#toggle-audio").on("click", controls.toggleAudio);
	$("#toggle-video").on("click", controls.toggleVideo);
}

peer.on.call = (call) => {
	call.answer(userStream);
	handleCall(call);
};

peer.on("open", peer.on.open);

//User Controls
var controls = {
	startScreenShare: async () => {
		var stream = await getScreen(), conns = getConns();
		conns.forEach(conn => {
			var sender = conn.peerConnection.getSenders().filter(s => s.track.kind == "video")[0];
			sender.replaceTrack(stream.getVideoTracks()[0]);
		});
		stream.getTracks()[0].onended = function(){
			$("#screenshare-stop").click();
		};
	},
	stopScreenShare: async () => {
		stopScreen();
		var stream = await getVideo(), conns = getConns();
		conns.forEach(conn => {
			var sender = conn.peerConnection.getSenders().filter(s => s.track.kind == "video")[0];
			sender.replaceTrack(stream.getVideoTracks()[0]);
		});
	},
	toggleAudio: () => {
		var track = userStream.getAudioTracks()[0], btn = $("#toggle-audio");
		if (track.enabled){
			track.enabled = false;
			btn.text("Unmute Audio");
			btn.css("background-color", "red");
		} else{
			track.enabled = true;
			btn.text("Mute Audio");
			btn.css("background-color", "var(--accent-color)");
		}
	},
	toggleVideo: () => {
		var track = userStream.getVideoTracks()[0], btn = $("#toggle-video");
		if (track.enabled){
			track.enabled = false;
			btn.text("Show Video");
			btn.css("background-color", "red");
		} else{
			track.enabled = true;
			btn.text("Hide Video");
			btn.css("background-color", "var(--accent-color)");
		}
	},
};

//Functions
function handleCall(call){
	var velem = $(`<video class="userVideo" id="video_${call.peer}">`), aelem = $(`<audio class="userAudio" id="audio_${call.peer}">`);
	$("#meet-main").append(velem);
	$("#meet-main").append(aelem);
	call.on("stream", function(stream){
		console.log(stream);
		updateStream(aelem, stream);
		updateStream(velem, stream);
	});
	call.on("close", function(){
		aelem.remove();
		velem.remove();
	});
}

function updateStream(element, stream){
	if (!element[0]) return;
	element[0].srcObject = stream;
	element.on("loadedmetadata", function(){
		element[0].play();
	});
}

function getConns(){
	var conns = [];
	Object.values(peer.connections).forEach(p => {
		p.forEach(conn => {
			conns.push(conn);
		});
	});
	return conns;
}

//User Media
var userStream, userScreen;
async function getVideo(){
	if (!userStream) userStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
	return userStream;
}

async function getScreen(){
	if (!userScreen) userScreen = await navigator.mediaDevices.getDisplayMedia({audio: false, video: true});
	return userScreen;
}

function stopScreen(){
	if (!userScreen) return;
	userScreen.getTracks().forEach(track => track.stop());
	userScreen = false;
}

getVideo().then(stream => {
	load.loading_text.text("Connecting...");
	load.progress(2);
});

load.progress(3);