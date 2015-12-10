
var shell = require("shelljs")
var promptly = require("promptly");
var changeCase = require('change-case');

module.exports = function(themeName, themeSlug) {
	var packageName = changeCase.pascalCase(themeName);
	var nodeName = changeCase.snakeCase(themeName);
	var dest = ( shell.env['WPGEN_DEST_BASE'] || process.cwd() ) + '/' + packageName;

	if ( shell.test('-d', dest) ) { 
		shell.echo("A folder at that location already exists.  Exiting...");
		shell.exit(1);
	}

	shell.echo("The following driectory will be created: %s", packageName);

	promptly.confirm("Continue? y/n: ", function (err, weKeepGoing) {
		if ( weKeepGoing )
			fetchThemeTemplate( themeName, themeSlug, packageName, nodeName, dest );
	});
};

var fetchThemeTemplate = function(themeName, themeSlug, packageName, nodeName, dest){
	console.log("fetchThemeTemplate() called...");
};