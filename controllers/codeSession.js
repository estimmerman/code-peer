/**
 * Main CodeSession controller
 */

var _ = require('lodash');
var async = require('async');
var CodeSession = require('../models/CodeSession');
var helpers = require('../helpers/helpers');
var constants = require('../helpers/constants');

/**
 * GET /session/:shortCode
 * Renders session page
 */
exports.getSession = function(req, res) {
  // gets session from the shortCode parameter in the url
  CodeSession.findOne({ shortCode: req.params.shortCode })
  .populate('activeUsers', 'firstName lastName school')
  .exec(function(err, codeSession) {
    if (err) return next(err);
    // makes sure session exists
    if (codeSession) {
      // since I'm populating an object, for the getIdIndexInArray, I need to map just the user ids to an array
      var activeUsersIds = [];
      codeSession.activeUsers.forEach(function(user) {
        activeUsersIds.push(user.id);
      });
      
      // users helper method getIdIndexInArray from helpers.js to see if user.id is in the activeUsers of the session
      var userInActiveUsers = helpers.getIdIndexInArray(req.user._id, activeUsersIds) != -1;

      // if a max users limit exists and
      // if activeUsers for session is more than the specified amount, and the user trying to access it isn't one of them, session is full
      if (!codeSession.settings.noLimitOnActiveUsers && codeSession.activeUsers.length >= codeSession.settings.maxActiveUsers && !userInActiveUsers) {
        req.flash('errors', {msg: 'This session is full!'});
        return res.redirect('/');
      }

      // if user isn't in activeUsers (which is true when they are initially joining a session, since they are added to activeUsers only upon socket.io connection)
      // then add them, to populate the active users list correctly in the session
      if (!userInActiveUsers) {
        codeSession.activeUsers.push(
          {
            _id: req.user.id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            school: req.user.school
          }
        );
      }

      // user is beginning his own session, so always allow them to
      if (req.user.id.toString() == codeSession.user.toString()) {
        // render session page with locals
        return res.render('session/session', {
          title: 'Session',
          codeSession: codeSession,
          isOwner: true,
          languages: constants.LANGUAGES
        });
      // another student trying to access session shouldn't be allowed
      } else {
        // checks to see if user is already part of another session
        CodeSession.findOne({ activeUsers: req.user.id }, function (err, activeSession) {
          if (err) return next(err);
          // if user is in another session, don't allow them to join a second one
          if (activeSession && codeSession.shortCode != activeSession.shortCode) {
            if (activeSession.user.toString() == req.user.id.toString()) {
              req.flash('errors', {msg: 'You must end your session before entering another one.'});
              return res.redirect('/');
            } else {
              req.flash('errors', {msg: 'You must leave your active session before entering another one.'});
              return res.redirect('/');
            }
          }

          // if the session isn't active, user can't join it
          if (!codeSession.active) {
            req.flash('errors', {msg: 'This user is not currently in a session.'});
            return res.redirect('/');
          }

          // conditions passed, render session page with locals
          return res.render('session/session', {
            title: 'Session',
            codeSession: codeSession,
            isOwner: false,
            languages: constants.LANGUAGES
          });
        });
      }
    // session doesn't exist, redirect with error
    } else {
      req.flash('errors', {msg: 'Could not find session.'});
      return res.redirect('/');
    }
  });
};

/**
 * POST /session/start
 * Create a session if one doesn't exist
 * Always called when a student is beginning a session
 * Only creates a new session associated with their account if it doesn't exist
 */
exports.postStartSession = function(req, res, next) {
  var isResume = req.body.isResume || false;
  // see if user already has an active session (that's not their own)
  CodeSession.findOne({ activeUsers: req.user.id })
  .exec(function (err, currentSession){
    if (err) return next(err);

    // don't let them start a session if they're in another one (that isn't their own)
    if (currentSession && currentSession.user.toString() != req.user._id.toString()) {
      req.flash('errors', {msg: 'You must leave your active session before starting your own.'});
      return res.redirect('/');
    }

    // sees if user has a session already created
    CodeSession.findOne({ user: req.user._id }, function(err, codeSession) {
      if (err) return next(err);

      var maxActiveUsers = null;
      var noLimitOnActiveUsers = null;
      var private = null;

      if (!isResume) {
        // if a user is starting a session again, they provide new settings, update them below
        maxActiveUsers = req.body.maxActiveUsers || constants.CODESESSION_DEFAULTS.maxActiveUsers;
        noLimitOnActiveUsers = req.body.noLimitOnActiveUsers ? true : constants.CODESESSION_DEFAULTS.noLimitOnActiveUsers;
        private = req.body.isPrivate ? true : constants.CODESESSION_DEFAULTS.isPrivate;
      }

      // user has a session associated with account already, so redirect there
      if (codeSession) {
        if (isResume) {
          return res.redirect('/session/' + codeSession.shortCode);
        } else {
          var settings = codeSession.settings;
          settings.noLimitOnActiveUsers = noLimitOnActiveUsers;
          // only update max active users if there is a limit
          if (!noLimitOnActiveUsers) {
            settings.maxActiveUsers = Math.round(maxActiveUsers);
          }
          settings.private = private;
          // generates a new private key for the session if it is private
          if (private) {
            // generate private key
          }
          codeSession.settings = settings;
          codeSession.markModified('settings');

          // save session and redirect to the new session page
          codeSession.save(function(err) {
            if (err) return next(err);
            return res.redirect('/session/' + codeSession.shortCode);
          })
        }
      // no session exists, so create one and redirect to it
      } else {
        if (isResume) {
          req.flash('errors', {msg: 'You cannot resume a session that has never been created in the first place.'});
          return res.redirect('/');
        }

        // new CodeSession model
        var codeSession = new CodeSession({
          user: req.user._id,
          active: false,
          activeUsers: [],
          settings: {
            maxActiveUsers: maxActiveUsers,
            noLimitOnActiveUsers: noLimitOnActiveUsers,
            private: private
          }
        });

        // save session and redirect to the new session page
        codeSession.save(function(err) {
          if (err) return next(err);
          return res.redirect('/session/' + codeSession.shortCode);
        })
      }
    });
  });
};

/**
 * POST /session/end
 * Params: shortCode
 * Ends current session, called by student (owner of session)
*/
exports.postEndSession = function(req, res, next) {
  // gets session by shortcode
  CodeSession.findOne({ shortCode: req.body.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    // validates that session exists
    if (codeSession) {
      // only the owner of the session can end it
      if (req.user._id.toString() != codeSession.user.toString()) {
        req.flash('errors', {msg: 'You do not have the authority to end this session!'});
        return res.redirect('/');
      }
      // deactive session, clear all active users
      codeSession.active = false;
      codeSession.activeUsers = [];
      // save session and redirect to homepage
      codeSession.save(function(err) {
        if (err) return next(err);
        req.flash('success', { msg: 'Session ended!' });
        return res.redirect('/');
      });
    // can't end session that doesn't exist
    } else {
      req.flash('errors', {msg: 'Could not find session to end.'});
      return res.redirect('back');
    }
  });
}

/**
 * POST /session/forceLeave
 * Params: shortCode
 * Forces a user out of a session when the owner ends the session
 * Does not need to alter the CodeSession model since that is handled when the owner ends the session
*/
exports.postForceLeaveSession = function(req, res, next) {
  if (!req.body.reason || req.body.reason == 'default') {
      req.flash('errors', { msg: 'The owner has ended the session.' });
      return res.redirect('/');
  } else {
      // if user is being kicked, remove them from activeUsers first
      CodeSession.findOne({ shortCode: req.body.shortCode }, function(err, codeSession) {
        if (err) {
          return res.redirect('back');
        }
        // validates existence of session
        if (codeSession) {
          // remove user from active users
          var idIndex = helpers.getIdIndexInArray(req.user.id, codeSession.activeUsers);
          if (idIndex != -1){
            codeSession.activeUsers.splice(idIndex, 1);
          }
          codeSession.save(function(err) {
            if (err) {
              return res.redirect('back');
            }
            req.flash('errors', { msg: 'You have been kicked from the session.' });
            return res.redirect('/');
          });
        }
      });
  }
}

/**
 * POST /session/leave
 * Params: shortCode
 * Leaves current session, called by a user
*/
exports.postLeaveSession = function(req, res, next) {
  // gets session by shortcode
  CodeSession.findOne({ shortCode: req.body.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    // validates existence of session
    if (codeSession) {
      // don't allow the owner to leave the session, they must end it
      // the owner should never be calling this anyways, so this is an edge case
      if (req.user._id.toString() == codeSession.user.toString()) {
        req.flash('errors', {msg: 'Weird, you should be ending the session, not leaving it.'});
        return res.redirect('/');
      }
      // remove user from active users
      var idIndex = helpers.getIdIndexInArray(req.user.id, codeSession.activeUsers);
      if (idIndex != -1){
        codeSession.activeUsers.splice(idIndex, 1);
      // user isn't in active users, so they aren't even part of the session they are trying to leave
      } else {
        req.flash('errors', {msg: 'You cannot leave a session you are not part of!'});
        return res.redirect('/');
      }
      // save session and redirect to homepage
      codeSession.save(function(err) {
        if (err) return next(err);
        req.flash('success', { msg: 'Session left!' });
        return res.redirect('/');
      });
    // can't leave session that doesn't exist
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
  // gets session by shortcode
  CodeSession.findOne({ shortCode: req.body.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    // validates existenc of session
    if (codeSession) {
      var idIndex = helpers.getIdIndexInArray(req.user.id, codeSession.activeUsers);

      // if a max users limit exists and
      // if activeUsers for session is more than the specified amount, and the user trying to access it isn't one of them, session is full
      if (!codeSession.settings.noLimitOnActiveUsers && codeSession.activeUsers.length >= codeSession.settings.maxActiveUsers && idIndex == -1) {
        req.flash('errors', {msg: 'This session is full!'});
        return res.redirect('/');
      }

      // owner is connecting to their own session
      if (req.user.id.toString() == codeSession.user.toString()) {
        // add owner to active users if they're not in it
        if (idIndex == -1){
          codeSession.activeUsers.push(req.user.id);
        }
        // if session isn't active, activate it and set new start time
        if (!codeSession.active) {
          codeSession.lastStartTime = new Date();
          codeSession.active = true;
        }

        // save session and return a json response
        // this json response is sent rather than a redirect (like in other posts) since this is called
        // via an ajax POST after already in the session page
        codeSession.save(function(err) {
          var response = {};
            if (err) {
              response = {
                code: 500,
                msg: 'Issue connecting to session.'
              }
            } else {
              response = {
                code: 200,
                msg: 'Connected.'
              }
            }
            // return json response
            return res.send(response);
        })
      } else {
        // see if user is is another session
        CodeSession.findOne({ activeUsers: req.user.id }, function (err, activeSession) {
          if (err) return next(err);
          // if user is in another session, don't let them connect to this one
          if (activeSession && codeSession.shortCode != activeSession.shortCode) {
            if (activeSession.user.toString() == req.user.id.toString()) {
              req.flash('errors', {msg: 'You must end your session before entering another one.'});
              return res.redirect('/');
            } else {
              req.flash('errors', {msg: 'You must leave your active session before entering another one.'});
              return res.redirect('/');
            }
          }

          // user can only connect to an active session
          if (!codeSession.active) {
            req.flash('errors', {msg: 'This student is not currently in a session.'});
            return res.redirect('/');
          }

          // add user to active users if not part of them
          if (idIndex == -1){
            codeSession.activeUsers.push(req.user._id);
          }
          // save session and return json response
          codeSession.save(function(err) {
            var response = {};
            if (err) {
              response = {
                code: 500,
                msg: 'Issue connecting to session.'
              }
            } else {
              response = {
                code: 200,
                msg: 'Connected.'
              }
            }
            return res.send(response);
          })
        });
      }
    // can't connect to session that doesn't exist
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
  // validate parameters
  // allow empty code parameter (''), so must have check for this specifically
  // since it will be recognized loosely as null
  if ((req.body.code != '' && !req.body.code) || !req.body.shortCode) {
    req.flash('errors', {msg: 'Bad parameters.'});
    return res.redirect('/');
  }

  // get session by shortcode
  CodeSession.findOne({ shortCode: req.body.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    // validate existence of session
    if (codeSession) {
      var idIndex = helpers.getIdIndexInArray(req.user.id, codeSession.activeUsers);
      // can only update session the user is part of
      if (idIndex == -1) {
        req.flash('errors', {msg: 'You can\'t update a session you\'re not part of!'});
        return res.redirect('/');
      // user is part of session, so update the model's code field
      } else {
        codeSession.code = req.body.code;
        // save session and respond with json response
        codeSession.save(function(err) {
          var response = {};
          if (err) {
            response = {
              code: 500,
              msg: 'Issue saving code.'
            }
          } else {
            response = {
              code: 200,
              msg: 'Code saved.'
            }
          }
          return res.send(response);
        });
      }
    // session doesn't exist, can't update it
    } else {
      req.flash('errors', {msg: 'Unable to connect to session.'});
      return res.redirect('/');
    }
  });
}

/**
 * POST /session/language/update
 * Params: shortCode
 *         language
 * Updates session language
*/
exports.postUpdateSessionLanguage = function(req, res, next) {
  // validate parameters
  if (!req.body.language || !req.body.shortCode) {
    req.flash('errors', {msg: 'Bad parameters.'});
    return res.redirect('/');
  }

  // get session by shortcode
  CodeSession.findOne({ shortCode: req.body.shortCode }, function(err, codeSession) {
    if (err) return next(err);
    // validate existence of session
    if (codeSession) {
      var idIndex = helpers.getIdIndexInArray(req.user.id, codeSession.activeUsers);
      // can't update session user isn't part of
      if (idIndex == -1) {
        req.flash('errors', {msg: 'You can\'t update a session you\'re not part of!'});
        return res.redirect('/');
      } else {
        // update session coding language and save it, returning json response
        codeSession.language = req.body.language;
        codeSession.save(function(err) {
          var response = {};
            if (err) {
              response = {
                code: 500,
                msg: 'Issue saving language change.'
              }
            } else {
              response = {
                code: 200,
                msg: 'Language updated.'
              }
            }
            return res.send(response);
        });
      }
    // can't update non-existent session
    } else {
      req.flash('errors', {msg: 'Unable to connect to session.'});
      return res.redirect('/');
    }
  });
}



