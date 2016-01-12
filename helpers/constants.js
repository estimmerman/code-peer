// file containing large constant variables/arrays
module.exports = Object.freeze({
	// colors for the various chat themes
	// colors based off colors that show well (not too hard to see) given the theme
    NAME_COLORS_DEFAULT : ['blue', 'green', 'red', 'darkviolet', 'cornflowerblue', 'crimson', 'seagreen', 'orangered'],
    NAME_COLORS_TERMINAL : ['aquamarine', 'khaki', 'palegreen', 'yellow', 'seagreen', 'darkorange', 'darkturquoise'],
    NAME_COLORS_BLUE : ['darkcyan', 'darkmagenta', 'royalblue', 'mediumvioletred', 'orchid'],
    // json object of the coding language options for the editor, and the
    // corresponding 'mode' that must be given to the editor to set the appropriate language
    LANGUAGES : {
    	'ASP.NET' : 'application/x-aspx',
    	'C' : 'text/x-csrc',
    	'C++' : 'text/x-c++src',
    	'C#' : 'text/x-csharp',
		'Clojure' : 'text/x-clojure',
		'COBOL' : 'text/x-cobol',
		'CoffeeScript' : 'text/x-coffeescript',
		'CSS' : 'text/css',
		'Django' : 'text/x-django',
		'EJS' : 'application/x-ejs',
		'Fortran' : 'text/x-Fortran',
		'Go' : 'text/x-go', 
		'Handlebars' : 'text/x-handlebars-template',
		'Haskell' : 'text/x-haskell',
		'HTML' : 'text/html',
		'Jade' : 'text/x-jade',
		'Java' : 'text/x-java',
		'Javascript' : 'text/javascript',
		'Markdown' : 'text/x-markdown',
		'MYSQL' : 'text/x-mysql',
		'Objective-C' : 'text/x-objectivec',
		'Pascal' : 'text/x-pascal',
		'Perl' : 'text/x-perl',
		'PHP' : 'text/x-php',
		'Python' : 'text/x-python',
		'R' : 'text/x-rsrc',
		'Ruby' : 'text/x-ruby',
		'Sass' : 'text/x-sass',
		'SCSS' : 'text/x-scss',
		'SQL' : 'text/x-sql',
		'Swift' : 'text/x-swift',
		'XML' : 'application/xml'
	},
	CODESESSION_DEFAULTS : {
		active: false,
		activeUsers: [],
		maxActiveUsers: 2,
		noLimitOnActiveUsers: false,
		isPrivate: false
	}
});