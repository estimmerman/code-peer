var _ = require('lodash');
var async = require('async');
var CodeSession = require('../models/CodeSession');

var idInArray = function(id, arr) {
  for (var i = 0; i < arr.length; i++) {
    if (id.toString() == arr[i].toString()) return true;
  }
  return false;
}
/**
 * GET /session/:shortCode
 * Session page.
 */
exports.getSession = function(req, res) {
  var codeSession = CodeSession.findOne({ shortCode: req.params.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    if (codeSession) {
      if (codeSession.activeUsers.length >= 2) {
        req.flash('errors', {msg: 'This session is full!'});
        return res.redirect('/');
      }
      // student is beginning his own session
      if (req.user._id.toString() == codeSession.user_id.toString()) {
        codeSession.active = true;
        if (!idInArray(req.user._id, codeSession.activeUsers)){
          codeSession.activeUsers.push(req.user._id);
        }
        codeSession.save(function(err) {
          if (err) return next(err);
          return res.render('session/session', {
            title: 'Session',
            codeSession: codeSession
          });
        })
        // another student trying to access session shouldn't be allowed
      } else if (req.user.role == 0) {
        req.flash('errors', {msg: 'You must be a tutor to join this session!'});
        return res.redirect('/');
        // tutor trying to join session
      } else {
        if (!codeSession.active) {
          req.flash('errors', {msg: 'This student is not currently in a session.'});
          return res.redirect('/');
        }
        if (!idInArray(req.user._id, codeSession.activeUsers)){
          codeSession.activeUsers.push(req.user._id);
          codeSession.save(function(err) {
            if (err) return next(err);
            return res.render('session/session', {
              title: 'Session',
              codeSession: codeSession
            });
          })
        } else {
          return res.render('session/session', {
            title: 'Session',
            codeSession: codeSession
          });
        }
      }
    } else {
      req.flash('errors', {msg: 'Could not find session.'});
      return res.redirect('/');
    }
  });
};

/**
 * POST /session/start
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
        activeUsers: []
      });

      codeSession.save(function(err) {
        if (err) return next(err);
        return res.redirect('/session/' + codeSession.shortCode);
      })
    }
  });
};

/**
 * POST /session/end
 * Params: shortCode
 * Ends current session
*/
exports.postEndSession = function(req, res, next) {
  CodeSession.findOne({ shortCode: req.body.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    if (codeSession) {
      if (req.user._id.toString() != codeSession.user_id.toString()) {
        req.flash('errors', {msg: 'You do not have the authority to end this session!'});
        return res.redirect('/');
      }
      codeSession.active = false;
      codeSession.activeUsers = [];
      codeSession.save(function(err) {
        if (err) return next(err);
        req.flash('success', { msg: 'Session ended!' });
        return res.redirect('/');
      });
    } else {
      req.flash('errors', {msg: 'Could not find session to end.'});
      return res.redirect('back');
    }
  });
}