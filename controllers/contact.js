/**
 * Main Contact controller
 * Allows user to send an email to CodePeer (me)
 */

var secrets = require('../config/secrets');
var nodemailer = require("nodemailer");
// mailer module
var transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: secrets.sendgrid.user,
    pass: secrets.sendgrid.password
  }
});

/**
 * GET /contact
 * Render contact form page
 */
exports.getContact = function(req, res) {
  res.render('contact/contact', {
    title: 'Contact'
  });
};

/**
 * POST /contact
 * Send a contact form via Nodemailer.
 */
exports.postContact = function(req, res) {
  // validates input
  req.assert('name', 'Name cannot be blank').notEmpty();
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('message', 'Message cannot be blank').notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/contact');
  }

  // email fields
  var from = req.body.name + ' < ' + req.body.email + '>';
  var body = req.body.message;
  // email is sent to me
  var to = 'erictimmerman@college.harvard.edu';
  var subject = 'Contact Form | CodePeer';

  var mailOptions = {
    to: to,
    from: from,
    subject: subject,
    text: body
  };

  // send email
  transporter.sendMail(mailOptions, function(err) {
    if (err) {
      req.flash('errors', { msg: err.message });
      return res.redirect('/contact');
    }
    // redirect to contact page with success message
    req.flash('success', { msg: 'Email has been sent successfully!' });
    res.redirect('/contact');
  });
};