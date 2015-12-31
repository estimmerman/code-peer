/**
 * Main Home controller
 */

var CodeSession = require('../models/CodeSession');
var helpers = require('../helpers/helpers');

/**
 * GET /home
 * Renders home page
 */
exports.index = function(req, res) {
	res.locals.path = req.path;

	CodeSession.findOne({ user: req.user._id }, function (err, codeSession) {
	    if (err) return next(err);

		// query filters for the sessions the tutor will see
		var queryFilters = {
			'activeUsers': 'this.activeUsers',
			'timeOrder': null
		};
		var userFilters = req.user.filterSettings;
		// if settings are set not to see full sessions, only
		// show those with less than 2 active users (2 is the max per session - one student and tutor)
		if (!userFilters.showFull) {
			queryFilters.activeUsers = 'this.activeUsers.length < 2';
		}
		// set time filter
		if (userFilters.timeOrder == 'new') {
			queryFilters.timeOrder = 'desc';
		} else {
			queryFilters.timeOrder = 'asc';
		}
		// query for sessions given filters
		// session must be active
		// a session with 0 active users will never be active
		CodeSession.find({ active: true, $where: queryFilters.activeUsers })
		.populate('user', 'firstName lastName school')
		.sort({lastStartTime: queryFilters.timeOrder})
		.exec(function (err, codeSessions) {
			if (err) return next(err);

			// set the minutes since the session started for each
			// given the helper method from helpers.js
			codeSessions.forEach(function (session) {
				session.minutesStartedAgo = helpers.getMinutesFromSessionStart(session);
			});

			// filter out active session from main list so it only appears once
			if (codeSession) {
				for (var i = 0; i < codeSessions.length; i++) {
					if (codeSessions[i].id == codeSession.id) {
						codeSessions.splice(i, 1);
					}
				}
			}

			// render user home page with sessions
			if (codeSession) {
				res.render('home', {
					title: 'Home',
					codeSessions: codeSessions,
					activeSession: codeSession.active
				});
			} else {
				res.render('home', {
					title: 'Home',
					codeSessions: codeSessions,
					activeSession: false
				});
			}
		});
	});








	// student accessing home portal
	// if (req.user.role == 0) {
	// 	// gets the session associated with the user
	// 	CodeSession.findOne({ user: req.user._id }, function (err, codeSession) {
	// 	    if (err) return next(err);
	// 	    // if the session exists and is active, the home page
	// 	    // will tell the user to 'Resume Session'
	// 	    if (codeSession) {
	// 	    	res.render('home/student_home', {
	// 			    title: 'Home',
	// 			    activeSession: codeSession.active
	// 			});
	// 		// else the homepage will say 'Begin Session'
	// 	    } else {
	// 	    	res.render('home/student_home', {
	// 			    title: 'Home',
	// 			    activeSession: false
	// 			});
	// 	    }
	// 	});
	// // tutor accessing home portal
	// } else {
	// 	// see if tutor already has an active session
	// 	CodeSession.findOne({ activeUsers: req.user.id })
	// 	// .populate is the equivalent of a JOIN TABLE in SQL, joins these user fields into the session model returned
	// 	.populate('user', 'firstName lastName school')
	// 	.exec(function (err, ownSession){
	// 		if (err) return next(err);
	// 		// sees if there is an active session for the tutor, and adds it to an array
	// 		var activeSession = [];
	// 		if (ownSession) {
	// 			activeSession.push(ownSession);
	// 			activeSession[0].minutesStartedAgo = helpers.getMinutesFromSessionStart(activeSession[0]);
	// 		}

	// 		// query filters for the sessions the tutor will see
	// 		var queryFilters = {
	// 			'activeUsers': 'this.activeUsers',
	// 			'timeOrder': null
	// 		};
	// 		var userFilters = req.user.filterSettings;
	// 		// if settings are set not to see full sessions, only
	// 		// show those with less than 2 active users (2 is the max per session - one student and tutor)
	// 		if (!userFilters.showFull) {
	// 			queryFilters.activeUsers = 'this.activeUsers.length < 2';
	// 		}
	// 		// set time filter
	// 		if (userFilters.timeOrder == 'new') {
	// 			queryFilters.timeOrder = 'desc';
	// 		} else {
	// 			queryFilters.timeOrder = 'asc';
	// 		}
	// 		// query for sessions given filters
	// 		// session must be active
	// 		// a session with 0 active users will never be active
	// 		CodeSession.find({ active: true, $where: queryFilters.activeUsers })
	// 		.populate('user', 'firstName lastName school')
	// 		.sort({lastStartTime: queryFilters.timeOrder})
	// 		.exec(function (err, codeSessions) {
	// 			if (err) return next(err);

	// 			// set the minutes since the session started for each
	// 			// given the helper method from helpers.js
	// 			codeSessions.forEach(function (session) {
	// 				session.minutesStartedAgo = helpers.getMinutesFromSessionStart(session);
	// 			});

	// 			// filter out active session from main list so it only appears once
	// 			if (activeSession.length > 0) {
	// 				for(var i = 0; i < codeSessions.length; i++) {
	// 					if (codeSessions[i].id == activeSession[0].id) {
	// 						codeSessions.splice(i, 1);
	// 					}
	// 				}
	// 			}

	// 			// render tutor home page with sessions
	// 			res.render('home/tutor_home', {
	// 				title: 'Home',
	// 				codeSessions: codeSessions,
	// 				activeSession: activeSession
	// 			});
	// 		});
	// 	});
	// }
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