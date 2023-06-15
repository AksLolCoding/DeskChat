//Init
$("body").append(`
<form action='/login' method="POST" id="loginform" accept-charset="UTF-8">
    <h3>Email:</h3><input type="email" name="email" required><br><br>
    <h3>Password:</h3><input type="password" name="password" required />
	<svg xmlns="http://www.w3.org/2000/svg" id="togglePassword" viewBox="0 0 16 16">
  		<path/>
  		<path/>
		<path d="">
	</svg><br><br>
    <button type="submit">Login</button><br>
	<p>Don't have an account? <a href='/register'>Create</a> one today!</p>
</form><br>
<div id="error-wrapper" style="display: none;">
    <div id="error-msg" class="error-box"></div><br>
</div><br>
<div id="login_container">
    <div id="google_login">
		<img src="/cdn/icons/google.png">
		<span>Google</span>
	</div>
</div>`);


$("#togglePassword").on("click", function(e){
	password = $("input[type='password'], input[type='text']");
	password.attr("type", password.attr("type") == "password" ? "text": "password");
});

//Email Login
let $form = $("#loginform"), form = $form[0], $submit = $("button[type=submit]");
var codes = {
	0: "Successfully logged in!",
	1: "Server error. Please refresh.",
	2: "Email or password is empty.",
	3: "Email is invalid.",
	100: "Password is incorrect.",
	101: "Email is invalid.",
	201: "Server error. Please refresh.",
	202: "This email is registered using an external service.",
	203: "Server error. Please refresh.",
}

function verify(){
	var email = $("input[name=email]").val(), password = $("input[name=password]").val();
	if (email.replace(/\s/g, '') == "" || password.replace(/\s/g, '') == "") return 2;
	if (!email.includes("@")) return 3;
	if (!/(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{6,})/.test(password)) return 100;
	return 0;
}

function callback(data){
	if (typeof data != "object") return;
	if (data.valid == true){
		var url = (new URLSearchParams(location.search)).get("url") ? decodeURIComponent((new URLSearchParams(location.search)).get("url")) : '/home';
		window.location.href = url;
	} else{
		var error_text = codes[data.code];
		$("#error-msg").text(error_text);
		$("#error-wrapper").show();
		$submit.removeClass("disabled");
		$submit.html("Login");
	}
}

$submit.on("click", function(e){
	e.preventDefault();
	form.disabled = true;
	document.body.style.cursor = "";
	$submit.addClass("disabled");
	$submit.html(site.loader.html("medium", "white"));
	var code = verify();
	if (code != 0){
		callback({valid: false, code: code});
		return;
	}
	FormData.send(form, '/login', {success: callback}, {withCredentials: true});
});

//Google Login
$google_btn = $("#google_login");

$google_btn.on("click", function(){
	window.location.href = '/login/google';
});

//Google