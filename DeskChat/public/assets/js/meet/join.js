$("#join-wrapper").html(`<h1>Join Meet</h1><br>
<form id="join-form">
	<div class="loader">
 		<div class="loader-inner"></div>
   	</div>
</form><br>
<div id="error-wrapper" style="display: none;">
    <div id="error-msg" class="error-box"></div>
</div>`);

var join = {
	id: new URLSearchParams(location.search).get("id"),
	password: atob(new URLSearchParams(location.search).get("password")),
	id_valid: false,
}, codes = {
	0: "Joining meet...",
	1: "Invalid Meet ID",
	2: "Incorrect Password",
	101: "Invalid Meet ID",
	102: "Incorrect Password",
	103: "Invalid Name",
};

async function check(id, password){
	return await $.ajax({
		type: "POST",
		url: '/meet/join',
		data: {
			id: id,
			password: password,
		},
		xhrFields: {withCredentials: true},
	});
}

function joinmeet(id, password, name){
	sessionStorage.setItem("meet-id", id);
	sessionStorage.setItem("meet-password", btoa(password));
	sessionStorage.setItem("meet-name", name);
	location.href = '/meet';
}

async function getId(){
	if (join.id){
		var status = await check(join.id, "");
		if (status.code == 0){
			setTimeout(getName, 0);
			return;
		} else if ([2, 202].includes(status.code)){
			join.id_valid = true;
			setTimeout(getPassword, 0);
			return;
		}
	}
	$("#join-form").html(`<input type="text" placeholder="Meet ID" onkeydown="javascript: return ['Backspace','Delete','ArrowLeft','ArrowRight', 'Enter'].includes(event.code) ? true : !isNaN(Number(event.key)) && event.code!=='Space'" id="input" style="text-align: center; width: calc(60% - 42px);"><br><br>
	<button type="submit" id="join">Join</button>`);
	$("#input").focus();
	$("#input").on("keypress", function(e){
		if (e.keyCode == 13){
			e.preventDefault();
			$("#join").click();
		}
	});
	$("#join").on("click", async function(e){
		e.preventDefault();
		$("#join-form")[0].disabled = true;
		document.body.style.cursor = "";
		$("#join").addClass("disabled");
		$("#join").html(site.loader.html("medium", "white"));
		join.id = $("#input").val();
		var status = await check(join.id, "");
		$("#join").removeClass("disabled");
		$("#join").html("Join");
		if (status.code == 0) getName();
		else if ([2, 202].includes(status.code)) getPassword();
		else{
			var error_text = codes[status.code];
			$("#error-msg").text(error_text);
			$("#error-wrapper").show();
		}
	});
}

async function getPassword(){
	if (join.id_valid && join.password){
		var status = await check(join.id, join.password);
		if (status.code == 0){
			setTimeout(getName, 0);
			return;
		}
	}
	$("#error-wrapper").hide();
	$("#join-form").html(`<input type="password" placeholder="Meet Password" id="input" style="text-align: center; width: calc(60% - 42px);"><br><br>
	<button type="submit" id="join">Join</button>`);
	$("#input").focus();
	$("#input").on("keypress", function(e){
		if (e.keyCode == 13){
			e.preventDefault();
			$("#join").click();
		}
	});
	$("#join").on("click", async function(e){
		e.preventDefault();
		$("#join-form")[0].disabled = true;
		document.body.style.cursor = "";
		$("#join").addClass("disabled");
		$("#join").html(site.loader.html("medium", "white"));
		join.password = $("#input").val();
		var status = await check(join.id, join.password);
		$("#join").removeClass("disabled");
		$("#join").html("Join");
		if (status.code == 0) getName();
		else{
			var error_text = codes[status.code];
			$("#error-msg").text(error_text);
			$("#error-wrapper").show();
		}
	});
}

function getName(){
	$("#error-wrapper").hide();
	$("#join-form").html(`<input type="text" placeholder="Your Name" id="input" style="text-align: center; width: calc(60% - 42px);"><br><br>
	<button type="submit" id="join">Join</button>`);
	$("#input").focus();
	$("#input").on("keypress", function(e){
		if (e.keyCode == 13){
			e.preventDefault();
			$("#join").click();
		}
	});
	$("#join").on("click", async function(e){
		e.preventDefault();
		join.name = $("#input").val(); //code 103
		if (!/^.{3,16}$/.test(join.name) && /^\s*$/.test(join.name)){
			var error_text = codes[103];
			$("#error-msg").text(error_text);
			$("#error-wrapper").show();
			return;
		}
		$("#join-form")[0].disabled = true;
		document.body.style.cursor = "";
		$("#join").addClass("disabled");
		$("#join").html(site.loader.html("medium", "white"));
		joinmeet(join.id, join.password, join.name);
	});
}

getId();