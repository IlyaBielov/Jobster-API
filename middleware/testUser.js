const { BadRequestError } = require('../errors');

// ставимо ПІСЛЯ auth (він кладе req.user.testUser) і лише на маршрути, що змінюють дані
const testUser = (req, res, next) => {
  if (req.user.testUser) {
    // 400, а не 401: на 401 фронт розлогінює (checkForUnauthorizedResponse); msg піде в toast
    throw new BadRequestError('Test User. Read Only!');
  }
  next(); // звичайний юзер — далі до контролера
};

module.exports = testUser;
