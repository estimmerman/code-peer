var mongoose = require('mongoose');

// mongoose schema for a CodeSession
// each User has only ONE CodeSession attributed to them
var codeSessionSchema = new mongoose.Schema({
  // the user_id associated with the session
  user: { type: mongoose.Schema.ObjectId, ref: 'User' },
  // if the session is active
  active: { type: Boolean, default: false },
  // the unique shortCode attributed to the session
  shortCode: { type: String },
  // active users in the session, array of user_ids
  activeUsers: { type: [mongoose.Schema.ObjectId], default: [] },
  // start time of the session
  lastStartTime: { type: Date, default: null },
  // the saved code for the session
  code: { type: String, default: 'Your code goes here!' },
  // the saved language for the session
  language: { type: String, default: 'text/x-csrc' },
});

// when creating a new CodeSession, I create a unique shortCode for it
// which you see when joining a session in the url
// it is an 8-character long random string made of the following characters
var shortCodeOptions = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
// on save, check if shortCode is already set, if not, set it
codeSessionSchema.pre('save', function(next) {
  var codeSession = this;
  if (codeSession.shortCode) return next();
  codeSession.shortCode = Array(8).join().split(',').map(function() { return shortCodeOptions.charAt(Math.floor(Math.random() * shortCodeOptions.length)); }).join('');
  next();
});

// set the schema as an export
module.exports = mongoose.model('CodeSession', codeSessionSchema);