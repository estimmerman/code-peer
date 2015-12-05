/**
 * Passport file for user authentication
 */
var _ = require('lodash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var secrets = require('./secrets');
var User = require('../models/User');

// serializes the user object for session management
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// deserializes user upon session end
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

/**
 * Sign in using email and password
 * This is a simple authentication strategy for logging in users via the passport module
 */
passport.use(new LocalStrategy({ usernameField: 'email' }, function(email, password, done) {
  email = email.toLowerCase();
  // finds user and compares passwords before authentication
  User.findOne({ email: email }, function(err, user) {
    if (!user) return done(null, false, { message: 'Email ' + email + ' not found'});
    user.comparePassword(password, function(err, isMatch) {
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Invalid email or password.' });
      }
    });
  });
}));

/**
 * Middleware for checking authentication of users
 */
exports.isAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
};