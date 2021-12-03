//Initialize JS Foundations
var site = {start_time: new Date()};

//Loader
site.loader = $.parseHTML(`<div class="loader"><div class="loader-inner"></div></div>`);

//Theme Options
site.theme = {
toggle: () => {$("html").attr("theme", $("html").attr("theme") == "light" ? "dark" : "light");},
set: (theme) => {$("html").attr("theme", theme);},
}