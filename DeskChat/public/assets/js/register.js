//Init
$("body").append(`
<form action='/register' method="POST" id="registerform" accept-charset="UTF-8">
    <h3>Email:</h3><input type="email" name="email" required><br><br>
	<h3>Username:</h3><input type="text" name="username" required><br><br>
    <h3>Password:</h3><input type="password" name="password" required />
	<svg xmlns="http://www.w3.org/2000/svg" id="togglePassword" viewBox="0 0 16 16" symbol="eye">
  		<path/>
  		<path/>
		<path/>
	</svg><br><br><br>
	<div class="g-recaptcha"></div><br><br>
    <button type="submit">Register</button><br>
	<p>Already have an account? <a href='/login'>Login</a> to your account.</p>
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

grecaptcha.ready(function(){
	grecaptcha.render($(".g-recaptcha")[0], {
		sitekey: "6Lc9H50dAAAAAO9cUDL76JGTvUqpjcGhzLGiuL8y",
		theme: site.theme.load() == "light" ? "light" : "dark",
		size: "normal",
	});
});

$("#togglePassword").on("click", function(e){
	password = $("input[name=password]"), toggle = $("#togglePassword");
	password.attr("type", password.attr("type") == "password" ? "text": "password");
	toggle.attr("symbol", toggle.attr("symbol") == "eye" ? "eye-slash": "eye");
});

//Email Login
let $form = $("#registerform"), form = $form[0], $submit = $("button[type=submit]");
var codes = {
	0: "Successfully registered!",
	1: "Data corrupted.",
	2: "Field is missing.",
	3: "Email is invalid.",
	4: "ReCaptcha is invalid.",
	100: "Email is taken.",
	101: "Username is taken.",
	102: "Password is too weak.",
}

function verify(){
	var email = $("input[name=email]").val(), password = $("input[name=password]").val(), username = $("input[name=username]").val();
	if (email.replace(/\s/g, '') == "" || password.replace(/\s/g, '') == "" || username.replace(/\s/g, '') == "") return 2;
	if (!email.includes("@")) return 3;
	if (!/(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{6,})/.test(password)) return 102;
	return 0;
}

function callback(data){
	if (typeof data != "object") return;
	grecaptcha.reset();
	if (data.valid == true){
		var url = (new URLSearchParams(location.search)).get("url") ? decodeURIComponent((new URLSearchParams(location.search)).get("url")) : '/home';
		window.location.href = url;
	} else{
		var error_text = codes[data.code];
		$("#error-msg").text(error_text);
		$("#error-wrapper").show();
		$submit.removeClass("disabled");
		$submit.html("Register");
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
	FormData.send(form, '/register', {success: callback}, {withCredentials: true});
});

//Google Login
$google_btn = $("#google_login");

$google_btn.on("click", function(){
	window.location.href = "/login/google";
});

//Google