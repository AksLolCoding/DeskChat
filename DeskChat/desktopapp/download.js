const express = require("express");
const path = require("path");
const fs = require("fs");

function getFiles(dir, ogdir = ""){
	let files = [], size = 0;
	const filesindir = fs.readdirSync(dir);
	if (ogdir == "") ogdir = dir;

  	for (file of filesindir){
    	const absolute = path.join(dir, file);
    	if (fs.statSync(absolute).isDirectory()){
			let subdir = getFiles(absolute, dir);
        	files.push(...subdir.files);
			size += subdir.size;
    	} else{
        	files.push(absolute.substr(ogdir.length));
			size += fs.statSync(absolute).size;
    	}
  	}
	return {files, size};
};

var {files: appfiles, size: appsize} = getFiles(__dirname + '/files/');

module.exports = function(app) {
	app.get('/download', function(req, res){
		res.render("download/download.html");
	});

	app.use('/download/files', express.static('./desktopapp/files'));

	app.get('/download/data', function(req, res){
		res.send({
			version: "alpha-wip",
			files: appfiles,
			size: appsize,
			downloadlink: "https://deskchat.akslolcoding.repl.co/download/files/",
			appfolder: "C:\\Tools\\DeskChat\\",
		});
	});
	
	app.get('/download/installer.exe', function(req, res){
		res.sendFile('./installer.exe', {root: __dirname});
	});
}