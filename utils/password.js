
const bcrypt = require("bcryptjs");

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

module.exports = {
  hashPassword,
  verifyPassword
};
