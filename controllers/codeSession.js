var _ = require('lodash');
var async = require('async');
var CodeSession = require('../models/CodeSession');

var getIdIndexInArray = function(id, arr) {
  for (var i = 0; i < arr.length; i++) {
    if (id.toString() == arr[i].toString()) return i;
  }
  return -1;
}
/**
 * GET /session/:shortCode
 * Session page.
 */
exports.getSession = function(req, res) {
  CodeSession.findOne({ shortCode: req.params.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    if (codeSession) {
      if (codeSession.activeUsers.length >= 2 && getIdIndexInArray(req.user._id, codeSession.activeUsers) == -1) {
        req.flash('errors', {msg: 'This session is full!'});
        return res.redirect('/');
      }
      // student is beginning his own session
      if (req.user._id.toString() == codeSession.user.toString()) {
        // only update start time if not resuming session
        if (!codeSession.active){
          codeSession.lastStartTime = new Date();
        }
        codeSession.active = true;
        if (getIdIndexInArray(req.user._id, codeSession.activeUsers) == -1){
          codeSession.activeUsers.push(req.user._id);
        }
        codeSession.save(function(err) {
          if (err) return next(err);
          return res.render('session/session', {
            title: 'Session',
            codeSession: codeSession,
            isStudent: true
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
        if (getIdIndexInArray(req.user._id, codeSession.activeUsers) == -1){
          codeSession.activeUsers.push(req.user._id);
          codeSession.save(function(err) {
            if (err) return next(err);
            return res.render('session/session', {
              title: 'Session',
              codeSession: codeSession,
              isStudent: false
            });
          })
        } else {
          return res.render('session/session', {
            title: 'Session',
            codeSession: codeSession,
            isStudent: false
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
  CodeSession.findOne({ user: req.user._id }, function(err, codeSession) {
    if (err) return next(err);
    if (codeSession) {
      return res.redirect('/session/' + codeSession.shortCode);
    } else {
      var codeSession = new CodeSession({
        user: req.user._id,
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
      if (req.user._id.toString() != codeSession.user.toString()) {
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

/**
 * POST /session/leave
 * Params: shortCode
 * Ends current session
*/
exports.postLeaveSession = function(req, res, next) {
  CodeSession.findOne({ shortCode: req.body.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    if (codeSession) {
      if (req.user._id.toString() == codeSession.user.toString()) {
        req.flash('errors', {msg: 'Weird, you should be ending the session, not leaving it.'});
        return res.redirect('/');
      }
      var idIndex = getIdIndexInArray(req.user._id, codeSession.activeUsers);
      if (idIndex != -1){
        codeSession.activeUsers.splice(idIndex, 1);
      } else {
        req.flash('errors', {msg: 'You cannot leave a session you are not part of!'});
        return res.redirect('/');
      }
      codeSession.save(function(err) {
        if (err) return next(err);
        req.flash('success', { msg: 'Session left!' });
        return res.redirect('/');
      });
    } else {
      req.flash('errors', {msg: 'Could not find session to leave.'});
      return res.redirect('back');
    }
  });
}

