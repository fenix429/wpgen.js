#! /usr/bin/env node

var program = require("commander");

program.version('1.0.0');

program
	.command('theme')
	.description('Creates a new wordpress theme based on the HeadStart Template Theme.')
	.option('-n, --name [name]', 'specify the theme name', 'HeadStart')
	.option('-s, --slug [slug]', 'specify the theme slug', '_hs')
	.action(function(cmd){
		return require("./sub_commands/theme")(cmd.name, cmd.slug);
	});

program.parse(process.argv);