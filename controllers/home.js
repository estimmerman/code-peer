var CodeSession = require('../models/CodeSession');
var helpers = require('../helpers/helpers');

/**
 * GET /
 * Home page.
 */
exports.index = function(req, res) {
	res.locals.path = req.path;
	// student accessing home portal
	if (req.user.role == 0) {
		CodeSession.findOne({ user: req.user._id }, function(err, codeSession) {
		    if (err) return next(err);
		    if (codeSession) {
		    	res.render('home/student_home', {
				    title: 'Home',
				    activeSession: codeSession.active
				});
		    } else {
		    	res.render('home/student_home', {
				    title: 'Home',
				    activeSession: false
				});
		    }
		});
	// tutor accessing home portal
	} else {
		CodeSession.find({ activeUsers: req.user.id })
		.populate('user', 'firstName lastName school')
		.exec(function (err, ownSession){
			if (err) return next(err);
			var activeSession = [];
			if (ownSession.length > 0) {
				activeSession.push(ownSession[0]);
				activeSession[0].minutesStartedAgo = helpers.getMinutesFromSessionStart(activeSession[0]);
			}

			var queryFilters = {
				'activeUsers': 'this.activeUsers',
				'timeOrder': null
			};
			var userFilters = req.user.filterSettings;
			if (!userFilters.showFull) {
				queryFilters.activeUsers = 'this.activeUsers.length < 2';
			}
			if (userFilters.timeOrder == 'new') {
				queryFilters.timeOrder = 'desc';
			} else {
				queryFilters.timeOrder = 'asc';
			}
			CodeSession.find({ active: true, $where: queryFilters.activeUsers })
			.populate('user', 'firstName lastName school')
			.sort({lastStartTime: queryFilters.timeOrder})
			.exec(function (err, codeSessions) {
				if (err) return next(err);

				codeSessions.forEach(function (session) {
					session.minutesStartedAgo = helpers.getMinutesFromSessionStart(session);
				});

				// filter out from main list
				if (activeSession.length > 0) {
					for(var i = 0; i < codeSessions.length; i++) {
						if (codeSessions[i].id == activeSession[0].id) {
							codeSessions.splice(i, 1);
						}
					}
				}

				res.render('home/tutor_home', {
					title: 'Home',
					codeSessions: codeSessions,
					activeSession: activeSession
				});
			});
		});
	}
};

exports.getLandingPage = function(req, res) {
	if (req.user){
		return res.redirect('/home');
	} else {
		res.render('landing_page', {
			title: 'CodePeer'
		});
	}
}