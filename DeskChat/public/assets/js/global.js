//Initialize JS (or whatever)
if (typeof window.site == "undefined") window.site = {start_time: Date.now()};

//Loader
site.loader = {
	html: (size = "", color = "") => {return `<div class="loader${({"":"","normal":"","small":"-small","medium":"-medium","large":"-large"})[size]}" style="${color ? "--accent-color: " + color : ""}"><span class="loader-inner"></span></div>`},
	element: (size = "", color = "") => {return $.parseHTML(site.loader.html(size, color))[0];},
};

//Theme
site.theme = {
	save: (val) => {if(!val) val = $("html").attr("theme"); localStorage.setItem("theme", val);},
	load: () => {return localStorage.getItem("theme");},
	toggle: () => {$("html").attr("theme", $("html").attr("theme") == "light" ? "dark" : "light");site.theme.save();},
	set: (theme) => {$("html").attr("theme", theme);site.theme.save();},
};
if (site.theme.load() == null) site.theme.save("dark");
site.theme.set(site.theme.load());

//UI
site.ui = {
	//Masks
	mask: {
		show: () => {
			$("body").append(`<div class="modal-mask"></div>`);
			setTimeout(() => {
				$(".modal-mask").css("opacity", "0.5");
			}, 20);
			return $(".modal-mask");
		},
		hide: () => {
			$(".modal-mask").css("opacity", "0");
			setTimeout(() => {
				$(".modal-mask")[0].remove();
			}, 500);
		},
	},
	//Modals
	modal: {
		queue: [],
		active: false,
		ready: Date.now(),
		display: (msg = "", close = true) => {
			if (site.ui.modal.active){
				site.ui.modal.queue.push({
					msg: msg,
					close: close,
				});
				return false;
			} else{
				return site.ui.modal.displayRaw(msg, close);
			}
		},
		displayRaw: (msg = "", close = true) => {
			var mask = site.ui.mask.show();
			$("body").append(`<div class="modal-wrapper"><div class="modal-frame"><div class="modal-content">${msg}</div></div></div>`);
			if (close){
				$(".modal-wrapper").on("click", site.ui.modal.close);
				$(".modal-wrapper .modal-frame").on("click", e => e.stopPropagation());
			}
			setTimeout(() => {
				$(".modal-wrapper").css("backdrop-filter", "blur(0.6px)");
				$(".modal-frame").css("transform", "scale(1)");
			}, 20);
			site.ui.modal.active = true;
			return $(".modal-frame");
		},
		close: () => {
			site.ui.mask.hide();
			$(".modal-wrapper").css("backdrop-filter", "");
			$(".modal-frame").css("transform", "");
			setTimeout(() => {
				site.ui.modal.remove();
				site.ui.modal.active = false;
				if (site.ui.modal.queue.length > 0){
					var opts = site.ui.modal.queue[0];
					site.ui.modal.queue.splice(0, 1);
					site.ui.modal.display(opts.msg, opts.close);
				} else {
				}
			}, 200);
		},
		remove: () => {
			$(".modal-wrapper").remove();
		},
	},
	//Flyouts
	flyout: {
		queue: [],
		height: 20,
		change: 0,
		count: 0,
		moveDown: (height) => {
			if (typeof height == "string") height = parseInt(height.split("px")[0]);
			site.ui.flyout.change = -(height + 10);
			site.ui.flyout.height -= height + 10;
			Object.values(site.ui.flyout.queue).forEach((f) => {
				var bottom = parseInt(f.style.bottom.split("px")[0]) + site.ui.flyout.change;
				f.style.bottom = bottom + "px";
			});
		},
		displayRaw: (msg, duration = 5, animate = 0.8, width = 250, height = 125) => {
			var flyout = $.parseHTML(`<div class="flyout-frame" style="width: ${width}px; height: ${height}px; right: -${width}px; bottom: ${site.ui.flyout.height}px;
"><div class="timer-bar-outer" style="--duration: ${duration}s; --animate: ${animate}s;"><div class="timer-bar-inner"></div></div><div class="flyout-content">${msg}</div></div>`)[0];
			flyout.animate = animate, flyout.duration = duration;
			var remove = new Function(`site.ui.flyout.remove(${flyout.id})`);
			$("body").append(flyout);
			site.ui.flyout.queue[site.ui.flyout.count] = flyout;
			site.ui.flyout.height += height + 10;
			site.ui.flyout.count += 1;
			$(flyout).animate({right: 10}, animate * 1000);
			setTimeout(remove, (duration + animate) * 1000);
			return flyout;
		},
		remove: (id) => {
			var flyout = id ? site.ui.flyout.queue[id] : $(".flyout-frame")[0];
			if (!flyout) return;
			$(flyout).find(".timer-bar-inner")[0].style.width = "0px";
			$(flyout).animate({right: '-' + flyout.style.width}, flyout.remove);
			setTimeout(new Function(`site.ui.flyout.moveDown("${flyout.style.height}")`), flyout.animate * 1000);
			setTimeout(new Function(`delete site.ui.flyout.queue[${id}];`), flyout.animate * 1000);
		},
	},
	notif: {
		askPermission: async (force = false) => {
			/*site.ui.modal.display(`<h3>Enable Notifications</h3>
			<p>Please enable notifications.</p>
			`, true);*/
			var status = await Notification.requestPermission();
			//site.ui.modal.remove();
			return status == "granted";
		},
		getPermission: async (force = false) => {
			var status = Notification.permission;
			if (status == "default") status = site.ui.notif.askPermission();
			return status;
		},
		displayRaw: (opts) => {
			return new Notification(opts.title, opts);
		},
		display: (opts) => {
			opts = $.extend({
				title: "Notification",
				body: "",
				icon: '/favicon.ico',
				badge: "",
				image: "",
				dir: "auto",
				data: null,
			}, opts);
			if (site.ui.notif.getPermission(false)){
				site.ui.notif.displayRaw(opts);
			} else{
				alert(opts.body);
			}
		},
	},
	init: () => {
	}
};

//Util
site.util = {
	init: () => {
	},
	sameDomain: (url) => {
		var pattern = new URLPattern(url, location.origin);
		return (pattern.hostname == location.hostname);
	},
	meetJoinLink: (id, password) => {
		return `https://deskchat.akslolcoding.repl.co/meet/join?id=${id}&password=${btoa(password)}`;
	},
};

//Init
site.ui.init();
site.util.init();