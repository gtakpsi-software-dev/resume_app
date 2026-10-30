// Export all Mongoose models
const User = require('./User');
const Resume = require('./Resume');
const Company = require('./Company');
const Keyword = require('./Keyword');
const Experience = require('./Experience');
const Alumni = require('./Alumni');

module.exports = {
  User,
  Resume,
  Company,
  Keyword,
  Experience,
  Alumni
};
