
// Dependencies
var _ = require("lodash");
var sync = require("synchronize");
//var Promise = require("bluebird");
var glob = require("glob");
var shell = require("shelljs");
var promptly = require("promptly");
var changeCase = require("change-case");
var nodegit = require("nodegit");

// Script Vars
var settings = {};
var destination = "";

// Defualts for Theme Configuration
var config = {
	"footerWidgets": false,
	"withSidebar":   false,
	"footerNav":     false,
	"settings":      false,
	"withComments":  false
}

// Flag Patterns for Theme Configuration
var regexs = {
	hasDefaultValue: {
		"withSidebar": /\<!-- WPGEN:CONFIG WIDGETIZED_SIDEBAR:BEGIN -->([\s\S]*?)\<!-- WPGEN:CONFIG WIDGETIZED_SIDEBAR:ELSE -->([\s\S]*?)\<!-- WPGEN:CONFIG WIDGETIZED_SIDEBAR:END -->/im,
	},
	switches: {
		"footerWidgets": [
			/\<!-- WPGEN:CONFIG WIDGETIZED_FOOTER:BEGIN -->([\s\S]*?)\<!-- WPGEN:CONFIG WIDGETIZED_FOOTER:END -->/im,
			/\/\* WPGEN:CONFIG WIDGETIZED_FOOTER:BEGIN \*\/([\s\S]*?)\/\* WPGEN:CONFIG WIDGETIZED_FOOTER:END \*\//im
		],
		"withSidebar": [
			/\<!-- WPGEN:CONFIG WIDGETIZED_SIDEBAR:BEGIN -->([\s\S]*?)\<!-- WPGEN:CONFIG WIDGETIZED_SIDEBAR:END -->/im,
			/\/\* WPGEN:CONFIG WIDGETIZED_SIDEBAR:BEGIN \*\/([\s\S]*?)\/\* WPGEN:CONFIG WIDGETIZED_SIDEBAR:END \*\//im
		],
		"footerNav": [
			/\<!-- WPGEN:CONFIG FOOTER_NAVIGATION:BEGIN -->([\s\S]*?)\<!-- WPGEN:CONFIG FOOTER_NAVIGATION:END -->/im,
			/\/\* WPGEN:CONFIG FOOTER_NAVIGATION:BEGIN \*\/([\s\S]*?)\/\* WPGEN:CONFIG FOOTER_NAVIGATION:END \*\//im
		],
		"settings": [
			/\<!-- WPGEN:CONFIG THEME_SETTINGS:BEGIN -->([\s\S]*?)\<!-- WPGEN:CONFIG THEME_SETTINGS:END -->/im,
			/\/\* WPGEN:CONFIG THEME_SETTINGS:BEGIN \*\/([\s\S]*?)\/\* WPGEN:CONFIG THEME_SETTINGS:END \*\//im
		],
		"withComments": [
			/\<!-- WPGEN:CONFIG INCLUDE_COMMENTS:BEGIN -->([\s\S]*?)\<!-- WPGEN:CONFIG INCLUDE_COMMENTS:END -->/im
		],
	}
}

module.exports = function(themeName, themeSlug) {
	settings.themeName = themeName;
	settings.themeSlug = themeSlug;
	settings.packageName = changeCase.pascalCase(themeName);
	settings.nodeName = changeCase.snakeCase(themeName);
	destination = ( shell.env["WPGEN_DEST_BASE"] || process.cwd() ) + "/" + settings.packageName;

	// Exit if path exists
	if ( shell.test("-d", destination) ) { 
		shell.echo("A folder at that location already exists.  Exiting...");
		shell.exit(1);
	}

	// Double Check the Theme Directory
	shell.echo("The following driectory will be created: %s", settings.packageName);

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

var replaceInFile = function ( pattern, replacement, file ) {
	var content = shell.cat( file );

	while ( match = pattern.exec( content ) ) {
		
		content
			.replace( pattern, replacement )
			.to( file );
		
		content = shell.cat( file );
	}
}

var setupThemeTemplate = function ( repository ) {
	var files = [];

	// Remove Git specific files
	files = glob.sync( destination + "/**/.{git,gitignore}" );

	shell.rm( "-rf", files );

	// Loop through the files replacing the Theme Name, Slug, Package Name, and Node Name
	
	files = glob.sync( destination + "/**/*.{php,less,css,json}" )

	files.forEach(function ( file ) {
		replaceInFile( /@package HeadStart/gi, "@package " + settings.packageName, file );
		replaceInFile( /\/themes\/HeadStart\//gi, "/themes/" + settings.packageName, file );
		replaceInFile( /head_start/gi, settings.nodeName, file );
		replaceInFile( /HeadStart/gi, settings.themeName, file );
		replaceInFile( /\_hs/gi, settings.themeSlug, file );
	});
	
	// Setup the language file
	shell.mv( destination + "/languages/_hs.pot", destination + "/languages/" + settings.slug + ".pot");

	// Setup the project file
	shell.mv( destination + "/HeadStart.sublime-project", destination + "/" + settings.packageName + ".sublime-project");

	shell.echo("Setup all done.  Running theme configuration...");

	askForConfig();
};

var askForConfig = function () {
	sync.fiber(function(){
		config.footerWidgets = sync.await( promptly.confirm("Setup a widget area in the Footer? y/n: ", sync.defer() ) );
		config.withSidebar   = sync.await( promptly.confirm("Setup a Sidebar? y/n: ", sync.defer() ) );
		config.footerNav     = sync.await( promptly.confirm("Add a Menu Location to the Footer? y/n: ", sync.defer() ) );
		config.settings      = sync.await( promptly.confirm("Add a Theme Settings page? (Requires ACF Pro) y/n: ", sync.defer() ) );
		config.withComments  = sync.await( promptly.confirm("Setup the Comments area? y/n: ", sync.defer() ) );
	
		shell.echo("Selected Theme Configuration:");
		shell.echo("Footer Widget Area: %s", config.footerWidgets);
		shell.echo("Sidebar: %s", config.withSidebar);
		shell.echo("Footer Menu Location: %s", config.footerNav);
		shell.echo("Theme Settings page: %s", config.settings);
		shell.echo("Comments Area: %s", config.withComments);

		promptly.confirm("Accept Theme Configuation? (This cannot be undone!) y/n: ", function (err, weKeepGoing) {
			if ( err ) throw err;

			if ( weKeepGoing ) {
				configureTheme();
			} else {
				askForConfig();
			}

		});
	});
};

var processOptionalFlags = function( file ) {
	_.forIn(regexs.hasDefaultValue, function (pattern, flag) {
		var content = shell.cat( file );

		while ( match = pattern.exec( content ) ) {
			var optionalTag = match[1].trim(), defaultTag = match[2].trim();

			if ( config[flag] ) {
				content
					.replace( pattern, optionalTag )
					.to( file );
			} else {
				content
					.replace( pattern, defaultTag )
					.to( file );
			}

			content = shell.cat( file );
		}
	});
};

var processSwitchFlags = function( file ) {
	_.forIn(regexs.switches, function ( patterns, flag ) {
		if ( ! Array.isArray( patterns ) ) {
			patterns = [ patterns ]
		}

		patterns.forEach(function ( pattern ) {
			var content = shell.cat( file );

			while ( match = pattern.exec( content ) ) {
				if ( config[flag] ) {
					content
						.replace( pattern, match[1].trim() )
						.to( file );
				} else {
					content
						.replace( pattern, "" )
						.to( file );
				}

				content = shell.cat( file );
			}
		});
	});
};

var configureTheme = function () {

	glob( destination + "/**/*.php", function ( err, files ) {
		if (err) throw err;

		files.forEach(function ( file ) {
			processOptionalFlags( file );
			processSwitchFlags( file );
		});
	});

	finalizeSetup();
};

var finalizeSetup = function () {
	shell.cd( destination );

	shell.echo( 'Theme configured, running \'npm install\'. This may take a minute...' );

	shell.exec( 'npm install', function ( code, output ) {
		shell.echo( 'npm install done with status: %s', code );

		shell.exec( 'gulp less' );
	});
};

