const express = require('express');
const router = express.Router(); // міні-app, змонтований в app.js на /api/v1/auth
const authenticateUser = require('../middleware/authentication'); // /auth публічний, тож захищаємо лише окремий маршрут

const testUser = require('../middleware/testUser');

const { login, register, updateUser } = require('../controllers/auth');

router.post('/login', login);
router.post('/register', register);
// handler-и зліва направо: токен (кладе req.user) → заборона для демо → контролер
router.patch('/updateUser', authenticateUser, testUser, updateUser); // PATCH — змінюємо наявний документ

module.exports = router;
