const getUserByEmail = (email, database) => {
  return Object.keys(database).filter(k => database[k].email === email)[0];
};

module.exports = { getUserByEmail }