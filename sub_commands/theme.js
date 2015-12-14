
// Dependencies
var Promise = require("bluebird");
var glob = require("glob");
var shell = require("shelljs");
var promptly = require("promptly");
var changeCase = require('change-case');
var nodegit = require("nodegit");


// Script Vars
var config = {};
var destination = '';

module.exports = function(themeName, themeSlug) {
	config.themeName = themeName;
	config.themeSlug = themeSlug;
	config.packageName = changeCase.pascalCase(themeName);
	config.nodeName = changeCase.snakeCase(themeName);
	destination = ( shell.env['WPGEN_DEST_BASE'] || process.cwd() ) + '/' + config.packageName;

	// Exit if path exists
	if ( shell.test('-d', destination) ) { 
		shell.echo("A folder at that location already exists.  Exiting...");
		shell.exit(1);
	}

	// Double Check the Theme Directory
	shell.echo("The following driectory will be created: %s", config.packageName);

	promptly.confirm("Continue? y/n: ", function (err, weKeepGoing) {
		if ( weKeepGoing ){
			fetchThemeTemplate();
		} else {
			shell.echo("Exiting...")
		}
	});
};

var fetchThemeTemplate = function() {
	// Grab a fresh copy of the the starter files
	nodegit.Clone.clone("https://github.com/fenix429/HeadStart", destination, null)
		.then( setupThemeTemplate )
		.catch(function(err) {
			console.log(err);
		});
};

var setupThemeTemplate = function(repository) {
	// Remove Git specific files
	var removeGitFiles = new Promise( function(resolve, reject){
		glob(destination + '/**/.{git,gitignore}', function(err, files){
			shell.rm('-rf', files);
			var err = shell.error();

			if( err ) {
				reject( err );
			} else {
				resolve( true );
			}
		});
	});

	// Loop through the files replacing the Theme Name, Slug, Package Name, and Node Name
	var editThemeFiles = new Promise( function(resolve, reject){
		glob(destination + "/**/*.{php,less,css,json}", function(err, files){
			var err = null;

			files.forEach(function(file, i){
				shell.sed( "-i", "@package HeadStart", "@package " + config.packageName, file );
				err = shell.error() || err;
				
				shell.sed( "-i", "/themes/HeadStart/", "/themes/" + config.packageName, file );
				err = shell.error() || err;
				
				shell.sed( "-i", "head_start", config.nodeName, file );
				err = shell.error() || err;
				
				shell.sed( "-i", "HeadStart", config.themeName, file );
				err = shell.error() || err;

				shell.sed( "-i", "_hs", config.themeSlug, file );
				err = shell.error() || err;
			});

			if( err ) {
				reject( err );
			} else {
				resolve( true );
			}
		});
	});
	
	// Setup the language file
	shell.mv( destination + "/languages/_hs.pot", destination + "/languages/" + config.slug + ".pot");

	// Setup the project file
	shell.mv( destination + "/HeadStart.sublime-project", destination + "/" + config.packageName + ".sublime-project");

	Promise.all([removeGitFiles, editThemeFiles]).then(function(){
		shell.echo("All done.  Moving on...");

		configureTheme();
	});
};

var configureTheme = function () {

};

