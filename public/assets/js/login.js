//Init
$("body").append(`<div id="login_container">
    <div id="google_login">
		<img src="/assets/images/google.png">
		<span>Google</span>
	</div>
</div>`);

//Email Login
let $form = $("#loginform"), form = $form[0];

function callback(data){
	if (typeof data != "object") return;
	if (data.valid == true){
		console.log(data.userID);
		window.location.href = '/home';
	} else{
		console.log(data.error);
		return; //display_error(data.error)
	}
}

$form.on("submit", function(e){
	e.preventDefault();
	form.disabled = true;
	FormData.send(form, '/login', {success: callback}, {withCredentials: true});
});

//Google Login
$google_btn = $("#google_login");

$google_btn.on("click", function(){
	window.location.href = "https://accounts.google.com/gsi/select?client_id=396042887321-osv8rgbgfc1f2qofkr0aeq12lavlf68m&ux_mode=redirect&login_uri=https%3A%2F%2Fdeskchat.akslolcoding.repl.co%2Flogin%2Fgoogle&ui_mode=card&context=signin&g_csrf_token=deskchat"
});

//Google
//    https://accounts.google.com/gsi/select?client_id=396042887321-osv8rgbgfc1f2qofkr0aeq12lavlf68m&ux_mode=redirect&login_uri=https%3A%2F%2Fdeskchat.akslolcoding.repl.co%2Flogin%2Fgoogle&ui_mode=card&context=signin&g_csrf_token=deskchat