FormData.send = function(form, target = '/', options = {}, xhrfields = {}){
	if (form.enctype == "multipart/form-data"){
		this.send.multipart(form, target, options, xhrfields);
	} else if (form.enctype == "application/x-www-form-urlencoded"){
		this.send.application(form, target, options, xhrfields);
	}
}

FormData.send.multipart = function(form, target = '/', options = {}, xhrfields = {}){
	let formData = new FormData(form);
	let ajaxOptions = $.extend({
		type: "POST",
	}, options, {
		url: target,
		data: formData,
		cache: false,
		contentType: false,
		processData: false,
		xhrFields: xhrfields,
	});
	return $.ajax(ajaxOptions);
};

FormData.send.application = function(form, target = '/', options = {}, xhrfields = {}){
	let formData = $(form).serialize();
	let ajaxOptions = $.extend({
		type: "POST",
		cache: false,
	}, options, {
		url: target,
		data: formData,
		xhrFields: xhrfields,
	});
	return $.ajax(ajaxOptions);
}