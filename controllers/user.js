/**
 * Main User controller
 */

var _ = require('lodash');
var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var passport = require('passport');
var User = require('../models/User');
var secrets = require('../config/secrets');

/**
 * GET /login
 * Renders login page
 */
exports.getLogin = function(req, res) {
  if (req.user) return res.redirect('/');
  res.render('account/login', {
    title: 'Login'
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = function(req, res, next) {
  req.sanitize('email').trim();

  // validations of the email and password
  req.checkBody({
   'email': {
      notEmpty: true,
      isEmail: {
        errorMessage: 'Invalid email.'
      }
    },
    'password': {
      notEmpty: true,
      errorMessage: 'Invalid password.'
    }
  });

  var errors = req.validationErrors();

  // check if errors, and post these errors if they exist
  if (errors) {
    req.flash('errors', {msg: 'Invalid email or password.'});
    return res.redirect('/login');
  }

  // authenticate the user, initializing/serializing the user if authenticated
  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err);
    if (!user) {
      req.flash('errors', { msg: info.message });
      return res.redirect('/login');
    }
    // logs in the user using the passport middleware
    // redirects to homepage afterwards if successful
    req.logIn(user, function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Success! You are logged in.' });
      res.redirect(req.session.returnTo || '/');
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = function(req, res) {
  // ends the session, and redirects to login page
  req.logout();
  res.redirect('/login');
};

/**
 * GET /signup
 * Renders signup page
 */
exports.getSignup = function(req, res) {
  if (req.user) return res.redirect('/');
  res.render('account/signup', {
    title: 'Create Account'
  });
};

/**
 * POST /signup
 * Create a new User
 */
exports.postSignup = function(req, res, next) {
  // sanitize input for arbitrary spaces
  req.sanitize('firstName').trim()
  req.sanitize('lastName').trim()
  req.sanitize('school').trim()
  req.sanitize('email').trim()

  // validation of input
  req.assert('firstName', 'You must enter a first name.').notEmpty();
  req.assert('lastName', 'You must enter a last name.').notEmpty();
  req.assert('role', 'You must choose an account type.').notEmpty();
  req.assert('school', 'You must enter a school.').notEmpty();

  req.assert('email', 'Email is not valid.').isEmail();
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirmPassword', 'Passwords do not match.').equals(req.body.password);

  var errors = req.validationErrors();

  // post errors in input if they exist
  if (errors) {
    req.flash('errors', errors[0]);
    return res.redirect('/signup');
  }

  // new User with given input
  var user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    role: req.body.role,
    school: req.body.school,
    email: req.body.email.toLowerCase(),
    password: req.body.password
  });

  // sees if user exists by this email already
  User.findOne({ email: user.email }, function(err, existingUser) {
    // if user exists with this email, post error
    if (existingUser) {
      req.flash('errors', { msg: 'Account with that email address already exists.' });
      return res.redirect('/signup');
    }
    // else, save this new user, and redirect to homepage
    user.save(function(err) {
      if (err) return next(err);
      req.logIn(user, function(err) {
        if (err) return next(err);
        res.redirect('/');
      });
    });
  });
};

/**
 * GET /account
 * Renders profile page
 */
exports.getAccount = function(req, res) {
  res.render('account/profile', {
    title: 'Account Management'
  });
};

/**
 * POST /account/profile
 * Update profile information
 */
exports.postUpdateProfile = function(req, res, next) {
  // gets user
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    // make sure we can grab user
    if (!user){
      req.flash('errors', { msg: 'Cannot find your profile to update.' });
      return res.redirect('/account');
    }

    // update user information
    user.firstName = req.body.firstName || '';
    user.lastName = req.body.lastName || '';
    user.school = req.body.school || '';
    user.about = req.body.about || '';

    // saves user and redirects back to profile page
    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Profile information updated.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/password
 * Update current password
 */
exports.postUpdatePassword = function(req, res, next) {
  // validate input
  req.assert('newPassword', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirmPassword', 'Passwords do not match.').equals(req.body.newPassword);

  var errors = req.validationErrors();

  // posts errors in validation if they exist
  if (errors) {
    req.flash('errors', errors[0]);
    return res.redirect('/account');
  }

  // finds user to update password
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    // validate that the user is whom they say they are by comparing old passwords
    user.comparePassword(req.body.oldPassword, function(err, isMatch) {
      if (!isMatch) {
        req.flash('errors', { msg: 'Old password does not match your current password.' });
        return res.redirect('/account');
      }

      // update new password to the given one (which will be hashed on save in User.js)
      user.password = req.body.newPassword;

      // saves user and redirects to profile page
      user.save(function(err) {
        if (err) return next(err);
        req.flash('success', { msg: 'Password has been changed.' });
        res.redirect('/account');
      });
    });
  });
};

/**
 * POST /account/delete
 * Delete user account
 */
exports.postDeleteAccount = function(req, res, next) {
  // removes the user and logs out the session
  User.remove({ _id: req.user.id }, function(err) {
    if (err) return next(err);
    req.logout();
    req.flash('info', { msg: 'Your account has been deleted.' });
    res.redirect('/login');
  });
};

/**
 * GET /reset/:token
 * Renders reset password page
 */
exports.getReset = function(req, res) {
  // makes sure user is good
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  // gets user by the reset token, assuming it hasn't expired
  User.findOne({ resetPasswordToken: req.params.token })
    .where('resetPasswordExpires').gt(Date.now())
    .exec(function(err, user) {
      // if no user found by valid token, redirects to the forgot page
      if (!user) {
        req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
        return res.redirect('/forgot');
      }
      // renders reset page
      res.render('account/reset', {
        title: 'Password Reset'
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request
 */
exports.postReset = function(req, res, next) {
  // validates input
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirm', 'Passwords must match.').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  // async waterfall with callbacks, processes one after another async calls
  async.waterfall([
    function(done) {
      // finds user by the reset token if valid
      User.findOne({ resetPasswordToken: req.params.token })
        .where('resetPasswordExpires').gt(Date.now())
        .exec(function(err, user) {
          if (!user) {
            req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
            return res.redirect('back');
          }

          // updates password to the requested one
          user.password = req.body.password;
          // empties the reset tokens and fields after they're used
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;

          // saves user with new password
          user.save(function(err) {
            if (err) return next(err);
            // logs in the user after it successfully saves
            req.logIn(user, function(err) {
              done(err, user);
            });
          });
        });
    },
    // after password is reset, sends email to the user reminding them of the password
    // change for security purposes, so the user can verify it was them that did it
    function(user, done) {
      // uses SendGrid to send mail
      var transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: secrets.sendgrid.user,
          pass: secrets.sendgrid.password
        }
      });
      // attributes for the email
      var mailOptions = {
        to: user.email,
        from: 'CodePeer <erictimmerman@college.harvard.edu>',
        subject: 'Your CodePeer password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      // sends the email
      transporter.sendMail(mailOptions, function(err) {
        req.flash('success', { msg: 'Success! Your password has been changed.' });
        done(err);
      });
    }
  ], function(err) {
    // unless there's an error, redirects to homepage
    if (err) return next(err);
    res.redirect('/');
  });
};

/**
 * GET /forgot
 * Renders forgot password page
 */
exports.getForgot = function(req, res) {
  // checks authentication
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('account/forgot', {
    title: 'Forgot Password'
  });
};

/**
 * POST /forgot
 * Create a random token, then sends the user an email with a reset link
 */
exports.postForgot = function(req, res, next) {
  // validate email
  req.assert('email', 'Please enter a valid email address.').isEmail();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/forgot');
  }

  // another async waterfall, calls one after another
  async.waterfall([
    function(done) {
      // creates random token for resetting your password
      crypto.randomBytes(16, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      // gets user to reset password of
      User.findOne({ email: req.body.email.toLowerCase() }, function(err, user) {
        if (!user) {
          req.flash('errors', { msg: 'No account with that email address exists.' });
          return res.redirect('/forgot');
        }

        // sets reset token and expiration date
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        // saves user
        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      // sends email to user regarding the reset link
      var transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: secrets.sendgrid.user,
          pass: secrets.sendgrid.password
        }
      });
      // attributes for email
      // reset link just has the token at the end of the url
      var mailOptions = {
        to: user.email,
        from: 'CodePeer <erictimmerman@college.harvard.edu>',
        subject: 'Reset your password on CodePeer',
        text: 'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      // sends email
      transporter.sendMail(mailOptions, function(err) {
        req.flash('info', { msg: 'An e-mail has been sent to ' + user.email + ' with further instructions.' });
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    // redirects to the forgot page once done with confirmation message of email sent
    res.redirect('/forgot');
  });
};

/**
 * POST /theme/chat
 * Updates the chat theme for the user
 */
exports.postChangeChatTheme = function(req, res, next) {
  // gets user
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    // updates user's chat theme with the given theme
    user.chatTheme = req.body.theme;

    // saves user
    user.save(function(err) {
      if (err) return next(err);
      res.redirect('back');
    });
  });
}

/**
 * POST /theme/editor
 * Updates the editor them for the user
 */
exports.postChangeEditorTheme = function(req, res, next) {
  // gets user
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    // updates editor theme with the given theme
    user.editorTheme = req.body.theme;

    // saves user
    user.save(function(err) {
      if (err) return next(err);
      res.redirect('back');
    });
  });
}

/**
 * POST /filter/full
 * Toggles the filter for showing full sessions
 */
exports.postChangeFilterFull = function(req, res, next) {
  // gets user
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    // grabs the filter session object from the user
    var filters = user.filterSettings;
    // toggles true/false
    filters.showFull = !filters.showFull;
    // updates user's field
    user.filterSettings = filters;
    // have to mark the field as modified so that MongoDB knows to save it
    // since it's a custom object, so it doesn't naturally know if it's changed values
    user.markModified('filterSettings');
    // saves user
    user.save(function(err) {
      if (err) return next(err);
      res.redirect('back');
    });
  });
}

/**
 * POST /filter/time
 * Updates the filter for showing sessions newest to oldest or oldest to newest
 */
exports.postChangeFilterTime = function(req, res, next) {
  // get user
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    // get filters and updates the timeOrder field
    var filters = user.filterSettings;
    filters.timeOrder = req.body.time;
    user.filterSettings = filters;
    user.markModified('filterSettings');
    // saves user
    user.save(function(err) {
      if (err) return next(err);
      res.redirect('back');
    });
  });
}

