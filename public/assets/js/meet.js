//==INITIALIZATION==
const socket = io();

const peer = new Peer(undefined, {
	path: '/peerjs',
	host: '/',
	port: 443,
});

//==LOADING==
load = {};
load.init_bar = $(".init-bar-inner")[0]; //Inner bar
load.meet_loading = $("#meet_loading");
load.meet_wrapper = $("#meet_wrapper");
load.loadv = 0; //loading progress
load.progress = (v=1) => {load.loadv += v; load.init_bar.style.width = String(load.loadv*5) + "%"};
load.progress(1);
load.meet_wrapper.append(`<div id="meet_loading">
	<div class="loader"><div class="loader-inner"></div></div><br><br>
	<a>Initializing...</a>
</div>`);
load.meet_loading.display_text = $("#meet_loading > a");
load.progress(1);

load.fadeInitBar = () => {
	try{
		load.init_bar.style.width = "100%";
		load.loadv = 20;
		setTimeout(() => {$(".init-bar-outer")[0].style.opacity = "0";}, 1000)
		setTimeout(() => {$(".init-bar-outer")[0].remove();}, 2000);
		delete load; load.asd.asd = 1;
		return true;
	} catch(e){
		return e;
	}
}

//Socket.io, AJAX, & Peer Connections
load.meet_loading.display_text.text("Connecting...");

socket.on.connect = () => {
	//Load data
	load.progress(1);
	$.ajax({
		url: '/meet/connect',
		method: "POST",
		data: {id: socket.id},
		success: function(data){
			if (data.call.id == socket.id){
				load.progress(1);
			} else{
				console.warn("Error Transporting Data: message corrupted");
			}
		},
		error: console.warn,
	});
}

peer.on.open = (peerID) => {
	load.progress(1);
}

socket.on("connect", socket.on.connect);
peer.on("open", peer.on.open);

//User Media
navigator.mediaDevices.getUserMedia({
	audio: true,
	video: true,
}).then((userStream) => {
	window.userStream = userStream;
	peer.on("call", function(call){
	});
	window.rec = new MediaRecorder(new MediaStream(userStream));
	window.c = [];
	window.v = $("video")[0];
	rec.start(1);
	//setTimeout(()=>{userStream.getTracks().forEach(t=>t.stop());}, 2000);
	setTimeout(()=>{rec.stop(); v.src = window.URL.createObjectURL(new Blob(c, {}));}, 5000);
	rec.ondataavailable = (e)=>{window.c.push(e.data)};
	console.log("got media");
});