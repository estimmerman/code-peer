/**
 * Main Home controller
 */

var CodeSession = require('../models/CodeSession');
var helpers = require('../helpers/helpers');
var constants = require('../helpers/constants');

/**
 * GET /home
 * Renders home page
 */
exports.index = function(req, res, next) {
	res.locals.path = req.path;

	CodeSession.findOne({ user: req.user._id }, function (err, codeSession) {
	    if (err) return next(err);

		// query filters for the sessions the user will see
		var queryFilters = {
			'showFull': false,
			'timeOrder': null
		};
		var userFilters = req.user.filterSettings;
		// if user wants to see full session
		queryFilters.showFull = userFilters.showFull;
		// set time filter
		if (userFilters.timeOrder == 'new') {
			queryFilters.timeOrder = 'desc';
		} else {
			queryFilters.timeOrder = 'asc';
		}

		// see if user already has an active session (that's not their own)
		CodeSession.findOne({ activeUsers: req.user.id })
		// .populate is the equivalent of a JOIN TABLE in SQL, joins these user fields into the session model returned
		.populate('user', 'firstName lastName school')
		.exec(function (err, currentSession){
			if (err) return next(err);
			// sees if there is an active session for the user, and adds it to an array
			// only if the active session is not their own
			var activeSession = [];
			if (currentSession && currentSession.user.id != req.user.id) {
				activeSession.push(currentSession);
				activeSession[0].minutesStartedAgo = helpers.getMinutesFromSessionStart(activeSession[0]);
			}

			// query for sessions given filters
			// session must be active
			// a session with 0 active users will never be active
			CodeSession.find({ active: true, 'settings.private': { $ne: true } })
			.populate('user', 'firstName lastName school')
			.sort({lastStartTime: queryFilters.timeOrder})
			.exec(function (err, codeSessions) {
				if (err) return next(err);

				if (!queryFilters.showFull) {
					 for (var i = 0; i < codeSessions.length; i++) {
					 	if (!codeSessions[i].settings.noLimitOnActiveUsers && codeSessions[i].activeUsers.length >= codeSessions[i].settings.maxActiveUsers) {
					 		codeSessions.splice(i, 1);
					 	}
					 }
				}

				// set the minutes since the session started for each
				// given the helper method from helpers.js
				codeSessions.forEach(function (session) {
					session.minutesStartedAgo = helpers.getMinutesFromSessionStart(session);
				});

				// filter out own session from main list so it only appears once
				if (codeSession) {
					for (var i = 0; i < codeSessions.length; i++) {
						if (codeSessions[i].id == codeSession.id) {
							codeSessions.splice(i, 1);
						}
						if (activeSession.length > 0 && codeSessions[i].id == activeSession[0].id) {
							codeSessions.splice(i, 1);
						}
					}
				}

				// render user home page with sessions
				if (codeSession) {
					res.render('home', {
						title: 'Home',
						codeSessions: codeSessions,
						ownSession: codeSession,
						activeSession: activeSession
					});
				} else {
					res.render('home', {
						title: 'Home',
						codeSessions: codeSessions,
						ownSession: null,
						activeSession: activeSession
					});
				}
			});
		});
	});
};

/**
 * GET /
 * Renders landing page
 */
exports.getLandingPage = function(req, res) {
	// if a user is logged in, redirect to the homepage
	if (req.user){
		return res.redirect('/home');
	} else {
		res.render('landing_page', {
			title: 'CodePeer'
		});
	}
}