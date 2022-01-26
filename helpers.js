const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const getUserByEmail = (email, database) => {
  return Object.keys(database).filter(k => database[k].email === email)[0];
};

const generateRandomString = () => crypto.randomBytes(3).toString('hex');

const emailLookup = (email, obj) => {
  return Object.keys(obj).some(k => obj[k].email === email);
};

const passwordCompare = (email, password, database) => {
  const user = getUserByEmail(email, database);
  return bcrypt.compareSync(password, database[user].hashedPassword);
};

const urlsForUser = (id, database) => {
  const ret = {};
  Object.keys(database)
    .filter(key => database[key].userID === id)
    .forEach(key => ret[key] = database[key].longURL);
  return ret;
};

module.exports = { getUserByEmail , generateRandomString, emailLookup, passwordCompare, urlsForUser}