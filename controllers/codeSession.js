var _ = require('lodash');
var async = require('async');
var CodeSession = require('../models/CodeSession');

/**
 * GET /session/:shortCode
 * Session page.
 */
exports.getSession = function(req, res) {
  if (req.user) return res.redirect('/');
  var codeSession = CodeSession.findOne({ shortCode: req.params.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    if (codeSession) {
      codeSession.active = true;
      codeSession.activeUsers += 1;
      codeSession.save(function(err) {
        if (err) return next(err);
        res.render('session', {
          title: 'Session',
          shortCode: req.params.shortCode,
          codeSession: codeSession
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
  CodeSession.findOne({ user_id: req.user._id }, function(err, codeSession) {
    if (err) return next(err);
    if (codeSession) {
      return res.redirect('/session/' + codeSession.shortCode);
    } else {
      var codeSession = new CodeSession({
        user_id: req.user._id,
        active: false,
        activeUsers: 0
      });

      codeSession.save(function(err) {
        if (err) return next(err);
        return res.redirect('/session/' + codeSession.shortCode);
      })
    }
  });
};