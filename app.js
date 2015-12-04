/**
 * Module dependencies.
 */
var express = require('express');
var cookieParser = require('cookie-parser');
var compress = require('compression');
var favicon = require('serve-favicon');
var session = require('express-session');
var bodyParser = require('body-parser');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var lusca = require('lusca');
var methodOverride = require('method-override');
var _ = require('lodash');
var MongoStore = require('connect-mongo')(session);
var flash = require('express-flash');
var path = require('path');
var mongoose = require('mongoose');
var passport = require('passport');
var expressValidator = require('express-validator');
var sass = require('node-sass-middleware');
var request = require('request');

var helpers = require('./helpers/helpers');
var constants = require('./helpers/constants');

/**
 * Controllers (route handlers).
 */
var homeController = require('./controllers/home');
var userController = require('./controllers/user');
var contactController = require('./controllers/contact');
var sessionController = require('./controllers/codeSession');

/**
 * API keys and Passport configuration.
 */
var secrets = require('./config/secrets');
var passportConf = require('./config/passport');

/**
 * Create Express server.
 */
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

/**
 * Connect to MongoDB.
 */
mongoose.connect(secrets.db);
mongoose.connection.on('error', function() {
  console.log('MongoDB Connection Error. Please make sure that MongoDB is running.');
  process.exit(1);
});

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(compress());
app.use(sass({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  debug: true,
  outputStyle: 'expanded'
}));
app.use(logger('dev'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(methodOverride());
app.use(cookieParser());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: secrets.sessionSecret,
  store: new MongoStore({ url: secrets.db, autoReconnect: true })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca({
  csrf: true,
  xframe: 'SAMEORIGIN',
  xssProtection: true
}));
app.use(function(req, res, next) {
  res.locals.user = req.user;
  next();
});
var oneDay = 86400000;
app.use(express.static(path.join(__dirname, 'public'), { maxAge: oneDay }));


/**
 * Primary app routes.
 */
app.get('/', homeController.getLandingPage)
app.get('/home', passportConf.isAuthenticated, homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.get('/account', passportConf.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConf.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConf.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConf.isAuthenticated, userController.postDeleteAccount);
app.get('/session/:shortCode', passportConf.isAuthenticated, sessionController.getSession);
app.post('/session/connect', passportConf.isAuthenticated, sessionController.postConnectToSession);
app.post('/session/start', passportConf.isAuthenticated, sessionController.postStartSession);
app.post('/session/forceLeave', passportConf.isAuthenticated, sessionController.postForceLeaveSession);
app.post('/session/end', passportConf.isAuthenticated, sessionController.postEndSession);
app.post('/session/leave', passportConf.isAuthenticated, sessionController.postLeaveSession);
app.post('/session/code/update', passportConf.isAuthenticated, sessionController.postUpdateSessionCode);
app.post('/session/language/update', passportConf.isAuthenticated, sessionController.postUpdateSessionLanguage);
app.post('/theme/chat', passportConf.isAuthenticated, userController.postChangeChatTheme);
app.post('/theme/editor', passportConf.isAuthenticated, userController.postChangeEditorTheme);
app.post('/filter/full', passportConf.isAuthenticated, userController.postChangeFilterFull);
app.post('/filter/time', passportConf.isAuthenticated, userController.postChangeFilterTime);

/**
 * Error Handler.
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
server.listen(app.get('port'), function() {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

/**
 * Initialize socket.io server
 */
io.on('connection', function(socket) {
  console.log('Socket connected');
  socket.on('send-chat-message', function(msg) {
    socket.broadcast.to(socket.shortCode).emit('update-chat', socket.name, socket.colors, msg);
  });
  socket.on('send-code-update', function(code) {
    socket.broadcast.to(socket.shortCode).emit('update-code', code);
  });
  socket.on('send-language-update', function(lang) {
    socket.broadcast.to(socket.shortCode).emit('update-language', lang);
  })
  socket.on('set-user', function(user_id, name, shortCode, sessionOwner) {
    socket.join(shortCode);
    var rooms = io.sockets.adapter.rooms;
    socket.user_id = user_id;
    socket.owner_id = sessionOwner;
    socket.name = name;
    socket.shortCode = shortCode;

    socket.colors = {
      'default': helpers.getUsernameColor(socket.name, constants.NAME_COLORS_DEFAULT),
      'terminal': helpers.getUsernameColor(socket.name, constants.NAME_COLORS_TERMINAL),
      'blue': helpers.getUsernameColor(socket.name, constants.NAME_COLORS_BLUE)
    }

    socket.emit('user-set', socket.name, socket.colors);
    socket.broadcast.to(socket.shortCode).emit('user-connected', socket.name, socket.colors); 
  });
  socket.on('disconnect', function() {
    if (socket.user_id == socket.owner_id) {
      socket.broadcast.to(socket.shortCode).emit('owner-disconnected');
    }
    socket.broadcast.to(socket.shortCode).emit('user-disconnected', socket.name, socket.colors);
    console.log('Socket disconnected');
  });
});

module.exports = app;
