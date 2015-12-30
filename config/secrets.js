// model secrets file
// the MongoDB database name can be whatever you want, by default MongoDB uses 'test'
// session secret is arbitrary
// API tokens/passwords listed will NOT work, they are purely for example
module.exports = {

  db: process.env.MONGODB || process.env.MONGOLAB_URI || 'mongodb://localhost:27017/code-peer',

  sessionSecret: process.env.SESSION_SECRET || 'test_session_secret',

  sendgrid: {
    user: process.env.SENDGRID_USER || 'test_user',
    password: process.env.SENDGRID_PASSWORD || 'test_password'
  }

};
