var _ = require('lodash');
var async = require('async');
var CodeSession = require('../models/CodeSession');
var helpers = require('../helpers/helpers');
var constants = require('../helpers/constants');

/**
 * GET /session/:shortCode
 * Session page.
 */
exports.getSession = function(req, res) {
  CodeSession.findOne({ shortCode: req.params.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    if (codeSession) {
      if (codeSession.activeUsers.length >= 2 && helpers.getIdIndexInArray(req.user._id, codeSession.activeUsers) == -1) {
        req.flash('errors', {msg: 'This session is full!'});
        return res.redirect('/');
      }
      // student is beginning his own session
      if (req.user.id.toString() == codeSession.user.toString()) {
        return res.render('session/session', {
          title: 'Session',
          codeSession: codeSession,
          isStudent: true,
          languages: constants.LANGUAGES
        });
        // another student trying to access session shouldn't be allowed
      } else if (req.user.role == 0) {
        req.flash('errors', {msg: 'You must be a tutor to join this session!'});
        return res.redirect('/');
        // tutor trying to join session
      } else {
        CodeSession.findOne({ activeUsers: req.user.id }, function (err, activeSession) {
          if (err) return next(err);
          if (activeSession && codeSession.shortCode != activeSession.shortCode) {
            req.flash('errors', {msg: 'You must leave your active session before entering another one.'});
            return res.redirect('back');
          }

          if (!codeSession.active) {
            req.flash('errors', {msg: 'This student is not currently in a session.'});
            return res.redirect('/');
          }
          return res.render('session/session', {
            title: 'Session',
            codeSession: codeSession,
            isStudent: false,
            languages: constants.LANGUAGES
          });
        });
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

exports.postForceLeaveSession = function(req, res, next) {
  CodeSession.findOne({ shortCode: req.body.shortCode }, function(err, codeSession) {
    if (err) return;
    if (codeSession) {
      var idIndex = helpers.getIdIndexInArray(req.user.id, codeSession.activeUsers);
      if (idIndex != -1) {
        codeSession.activeUsers.splice(idIndex, 1);
      }
      // deactive session if no active users left, or if owner leaves sessions
      if (codeSession.user.toString() == req.user.id.toString() || codeSession.activeUsers.length == 0) {
        codeSession.active = false;
      }
      codeSession.save(function(err) {
        if (err) return;
        req.flash('errors', { msg: 'The owner has ended the session.' });
        return res.redirect('/');
      });
    } else {
      req.flash('errors', {msg: 'The owner has ended session.'});
      return res.redirect('/');
    }
  });
}

/**
 * POST /session/leave
 * Params: shortCode
 * Leaves current session
*/
exports.postLeaveSession = function(req, res, next) {
  CodeSession.findOne({ shortCode: req.body.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    if (codeSession) {
      if (req.user._id.toString() == codeSession.user.toString()) {
        req.flash('errors', {msg: 'Weird, you should be ending the session, not leaving it.'});
        return res.redirect('/');
      }
      var idIndex = helpers.getIdIndexInArray(req.user.id, codeSession.activeUsers);
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

/**
 * POST /session/connect:shortCode
 * Params: shortCode
 * Activates session and adds users to activeUsers once a socket.io connection is made
 * Double checks the conditions made before getSession
*/
exports.postConnectToSession = function(req, res, next) {
  CodeSession.findOne({ shortCode: req.body.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    if (codeSession) {
      var idIndex = helpers.getIdIndexInArray(req.user.id, codeSession.activeUsers);
      if (codeSession.activeUsers.length >= 2 && idIndex == -1) {
        req.flash('errors', {msg: 'This session is full!'});
        return res.redirect('/');
      }

      if (req.user.id.toString() == codeSession.user.toString()) {
        if (idIndex == -1){
          codeSession.activeUsers.push(req.user.id);
        }
        if (!codeSession.active) {
          codeSession.lastStartTime = new Date();
          codeSession.active = true;
        }

        codeSession.save(function(err) {
          if (err) return next(err);
          var response = {
            code: 200,
            msg: 'Connected.'
          }
          return response;
        })
      } else if (req.user.role == 0) {
        req.flash('errors', {msg: 'You must be a tutor to join this session!'});
        return res.redirect('/');
        // tutor trying to join session
      } else {
        CodeSession.findOne({ activeUsers: req.user.id }, function (err, activeSession) {
          if (err) return next(err);
          if (activeSession && codeSession.shortCode != activeSession.shortCode) {
            req.flash('errors', {msg: 'You must leave your active session before entering another one.'});
            return res.redirect('/');
          }

          if (!codeSession.active) {
            req.flash('errors', {msg: 'This student is not currently in a session.'});
            return res.redirect('/');
          }

          if (idIndex == -1){
            codeSession.activeUsers.push(req.user._id);
          }
          codeSession.save(function(err) {
            if (err) return next(err);
            var response = {
              code: 200,
              msg: 'Connected.'
            }
            return response;
          })
        });
      }
    } else {
      req.flash('errors', {msg: 'Unable to connect to session.'});
      return res.redirect('/');
    }
  });
}

/**
 * POST /session/code/update
 * Params: shortCode
 *         code
 * Updates session code
*/
exports.postUpdateSessionCode = function(req, res, next) {
  console.log('hit');
  if ((req.body.code != '' && !req.body.code) || !req.body.shortCode) {
    req.flash('errors', {msg: 'Bad parameters.'});
    return res.redirect('/');
  }

  CodeSession.findOne({ shortCode: req.body.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    if (codeSession) {
      var idIndex = helpers.getIdIndexInArray(req.user.id, codeSession.activeUsers);
      if (idIndex == -1) {
        req.flash('errors', {msg: 'You can\'t update a session you\'re not part of!'});
        return res.redirect('/');
      } else {
        codeSession.code = req.body.code;
        codeSession.save(function(err) {
          if (err) return next(err);
          var response = {
            code: 200,
            msg: 'Saved.'
          }
          return response;
        });
      }
    } else {
      req.flash('errors', {msg: 'Unable to connect to session.'});
      return res.redirect('/');
    }
  });
}
