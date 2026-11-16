const express = require('express');
const router = express.Router(); // міні-app, змонтований в app.js на /api/v1/auth
const authenticateUser = require('../middleware/authentication'); // /auth публічний, тож захищаємо лише окремий маршрут

const testUser = require('../middleware/testUser');

const rateLimiter = require('express-rate-limit');
// суворий ліміт лише на вхід/реєстрацію — проти перебору паролів і масової реєстрації
const apiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 хвилин; лічильник окремий від глобального в app.js
  max: 10, // 11-й запит з IP → 429, до контролера не доходить
  message: {
    msg: 'Too many requests from this IP, please try again after 15 minutes', // { msg } — фронт покаже в toast
  },
});

const { login, register, updateUser } = require('../controllers/auth');

router.post('/login', apiLimiter, login);
router.post('/register', apiLimiter, register);
// handler-и зліва направо: токен (кладе req.user) → заборона для демо → контролер
router.patch('/updateUser', authenticateUser, testUser, updateUser); // PATCH — змінюємо наявний документ

module.exports = router;
