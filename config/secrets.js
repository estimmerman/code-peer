// model secrets file
// the MongoDB database name can be whatever you want, by default MongoDB uses 'test'
// session secret is arbitrary
// API tokens/passwords listed will NOT work, they are purely for example
module.exports = {

  db: process.env.MONGODB || process.env.MONGOLAB_URI || 'mongodb://localhost:27017/code-peer',

  sessionSecret: process.env.SESSION_SECRET || 'axolotl',

  sendgrid: {
    user: process.env.SENDGRID_USER || 'erictimmerman',
    password: process.env.SENDGRID_PASSWORD || 'xQTdtHs9zZACYeUYJFizGYZA9TzWmF'
  }

};
