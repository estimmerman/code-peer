var mongoose = require('mongoose');

var codeSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: 'User' },
  active: { type: Boolean, default: false },
  shortCode: { type: String },
  activeUsers: { type: [mongoose.Schema.ObjectId], default: [] },
  lastStartTime: { type: Date, default: null },
  code: { type: String }
});

var shortCodeOptions = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
codeSessionSchema.pre('save', function(next) {
  var codeSession = this;
  if (codeSession.shortCode) return next();
  codeSession.shortCode = Array(8).join().split(',').map(function() { return shortCodeOptions.charAt(Math.floor(Math.random() * shortCodeOptions.length)); }).join('');
  next();
});

module.exports = mongoose.model('CodeSession', codeSessionSchema);