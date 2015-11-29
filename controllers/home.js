var CodeSession = require('../models/CodeSession');

/**
 * GET /
 * Home page.
 */
exports.index = function(req, res) {
	if (req.user.role == 0) {
		var codeSession = CodeSession.findOne({ user_id: req.user._id }, function(err, codeSession) {
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
	} else {
		res.render('home/tutor_home', {
			title: 'Home'
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