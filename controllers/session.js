var _ = require('lodash');
var async = require('async');
var Session = require('../models/Session');

/**
 * GET /session/:shortCode
 * Session page.
 */
exports.getSession = function(req, res) {
  if (req.user) return res.redirect('/');
  var session = Session.findOne({ shortCode: req.params.shortCode }, function(err, session) {
    if (err) return next(err);
    if (session) {
      session.active = true;
      session.activeUsers += 1;
      session.save(function(err) {
        if (err) return next(err);
        res.render('session', {
          title: 'Session',
          shortCode: req.params.shortCode,
          session: session
        });
      })
    } else {
      return res.redirect('/');
    }
  });
  
};

/**
 * POST /session
 * Create a session if one doesn't exist
 */
exports.postStartSession = function(req, res, next) {
  Session.findOne({ user_id: req.user._id }, function(err, session) {
    if (err) return next(err);
    if (session) {
      return res.redirect('/session/' + session.shortCode);
    } else {
      var session = new Session({
        user_id: req.user._id,
        active: false,
        activeUsers: 0
      });

      session.save(function(err) {
        if (err) return next(err);
        return res.redirect('/session/' + session.shortCode);
      })
    }
  });
};