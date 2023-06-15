var $wrapper = $("#logout-wrapper");
$wrapper.html(`<h2 >Clicking "Logout" below will log you out of DeskChat:</h2><br>
<form id="logout-form" action='/logout' method="POST">
<input type="checkbox" name="alldevices"><label for="alldevices">Logout on all devices</label><br><br>
<button type="submit">Logout</button><br>
<p class="text-light">If you have logged in using an external provider (Google), you must log out of that account too.</p>
</form>`);
var $form = $("#logout-form"), form = $form[0], $submit = $("button[type=submit]");

function callback(data){
	$submit.removeClass("disabled");
	$submit.html("Logout");
	if (data){
		var url = (new URLSearchParams(location.search)).get("url") ? decodeURIComponent((new URLSearchParams(location.search)).get("url")) : '/';
		window.location.href = url;
	}
}

$submit.on("click", function(e){
	e.preventDefault();
	$submit.addClass("disabled");
	$submit.html(site.loader.html("medium", "white"));
	FormData.send(form, '/logout', {success: callback}, {withCredentials: true});
});