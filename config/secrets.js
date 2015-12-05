// secrets file for the project
// although if I was running this in production I would save all secrets
// to environment variables on my OS, for the purposes of testing the sending
// emails capability of the project on development, I have explicitly given the API tokens
// for my SendGrid account below
// 
// I trust testers of this application won't use these tokens for themselves.
module.exports = {

  db: process.env.MONGODB || process.env.MONGOLAB_URI || 'mongodb://localhost:27017/code-peer',

  sessionSecret: process.env.SESSION_SECRET || 'axolotl',

  sendgrid: {
    user: process.env.SENDGRID_USER || 'erictimmerman',
    password: process.env.SENDGRID_PASSWORD || 'xQTdtHs9zZACYeUYJFizGYZA9TzWmF'
  }

};
