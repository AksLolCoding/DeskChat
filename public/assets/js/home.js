$("#chats").append(site.loader.element("normal"));

$.post('/chats').then(data => {
	if (data.error){
		return;
	}
	data = Object.values(data);
	$("#chats").html(`<div id="buttons-wrapper">
		<a id="create-chat" class="link-important">+ Create Chat</a>
	</div>`);
	$("#create-chat").on("click", e => {
		site.ui.modal.display(`<h2 style="text-align: center;">Create Chat</h2>
  		<p>This feature is in development. Please check again later.</p>`);
	});
	if (data.length == 0){
		$("#chats").append(`<p>You have no chats right now! Try creating one.</p>`);
		return;
	}
	data.forEach(chat => {
		var users = Object.values(chat.users), latest = chat.latest;
		console.log(chat);
		$("#chats").append(`<div class="chat">
			<div class="left">
				<h3 class="chat-name">${chat.name}</h3>
				<i class="chat-latest">${latest.content}</i>
			</div>
			<div class="right">
				<p class="chat-users"></p>
			</div>
		</div>`);
		if (users.length == 1) $("p.chat-users").text(`${users[0].name}`);
		else if (users.length == 2) $("p.chat-users").text(`${users[0].name} and ${users[1].name}`);
		else $("p.chat-users").text(`${users[0].name}, ${users[1].name}, ${users.length - 2} more`);
	});
});