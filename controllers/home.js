var CodeSession = require('../models/CodeSession');

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
				if (session.lastStartTime) {
					var diff = Math.abs(new Date() - session.lastStartTime);
					var minutes = Math.floor((diff/1000)/60);
					session.minutesStartedAgo = minutes;
				} else {
					session.minutesStartedAgo = "an unknown number of";
				}
			});

			res.render('home/tutor_home', {
				title: 'Home',
				codeSessions: codeSessions
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