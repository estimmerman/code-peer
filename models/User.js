// for encrytion/decryption
var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');
var mongoose = require('mongoose');

// User model schema
var userSchema = new mongoose.Schema({
  // personal profile information
  firstName: { type: String, require: true },
  lastName: { type: String, require: true },
  about: String,

  // 0 --> student (default)
  // 1 --> tutor
  role: { type: Number, require: true, default: 0 },
  school: { type: String, require: true },

  // user settings - themes and filters
  chatTheme: { type: String, require: true, default: 'default' },
  editorTheme: { type: String, require: true, default: 'default' },
  // filters only used for tutors when choosing how to view the list of sessions
  filterSettings: { type: Object, default: {'showFull' : false, 'timeOrder' : 'new'} },

  // login information
  email: { type: String, require: true, unique: true, lowercase: true },
  password: { type: String, require: true},

  // fields for resetting your password
  tokens: Array,
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

/**
 * Password hash middleware
 * Prior to saving a User model, checks if the password has been modified
 * If it has, hashes the new password and saves this instead
 */
userSchema.pre('save', function(next) {
  var user = this;
  if (!user.isModified('password')) return next();
  // password has been modified, hash this and save it
  bcrypt.genSalt(10, function(err, salt) {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

/**
 * Helper method for validating user's password during login
 * Returns true if passwords match
 */
userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

// returns as an exports the mongoose schema for the User
module.exports = mongoose.model('User', userSchema);