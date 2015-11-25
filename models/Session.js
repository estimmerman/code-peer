var mongoose = require('mongoose');

var sessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.ObjectId },
  active: { type: Boolean },
  shortCode: { type: String },
  activeUsers: { type: Number }
});

var shortCodeOptions = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
sessionSchema.pre('save', function(next) {
  var session = this;
  if (session.shortCode) return next();
  session.shortCode = Array(8).join().split(',').map(function() { return shortCodeOptions.charAt(Math.floor(Math.random() * shortCodeOptions.length)); }).join('');
  next();
});

module.exports = mongoose.model('Session', sessionSchema);