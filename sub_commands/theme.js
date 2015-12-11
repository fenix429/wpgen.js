
// Dependencies
var shell = require("shelljs");
var promptly = require("promptly");
var changeCase = require('change-case');
var glob = require("multi-glob").glob;
var nodegit = require("nodegit");
var Q = require("q");

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
	// Thngs to do
	var removedGitFiles = Q.defer(),
		editedThemeFiles = Q.defer();

	// Remove the Git specific file
	glob([ destination + '/**/.git', destination + '/**/.gitignore' ], function(err, files){
		shell.rm('-rf', files);
		removedGitFiles.resolve();
	});

	// Loop through the files replacing the Theme Name, Slug, Package Name, and Node Name
	glob([ destination + "/**/*.{php,less,css,json}" ], function(err, files){
		files.forEach(function(file, i){
			shell.sed( "-i", "@package HeadStart", "@package " + config.packageName, file );
			shell.sed( "-i", "/themes/HeadStart/", "/themes/" + config.packageName, file );
			shell.sed( "-i", "head_start", config.nodeName, file );
			shell.sed( "-i", "HeadStart", config.themeName, file );
			shell.sed( "-i", "_hs", config.themeSlug, file );

			if (i === files.length - 1) {
				editedThemeFiles.resolve();
			}
		});
	});

	Q.allSettled([removedGitFiles, editedThemeFiles]).then(function (result) {
		// Setup the language file
		shell.mv( destination + "/languages/_hs.pot", destination + "/languages/" + config.slug + ".pot");

		// Setup the project file
		shell.mv( destination + "/HeadStart.sublime-project", destination + "/" + config.packageName + ".sublime-project");

		shell.echo("Done... Running Theme Configuration...");

		configureTheme();
	});
};

var configureTheme = function () {

};

