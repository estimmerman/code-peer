/**
 * GET /
 * Home page.
 */
exports.index = function(req, res) {
	if (req.user.role == 0) {
		res.render('student_home', {
		    title: 'Home'
		});
	} else {
		res.render('tutor_home', {
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