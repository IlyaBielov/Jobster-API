const express = require('express');
const router = express.Router(); // міні-app, змонтований в app.js на /api/v1/auth
const authenticateUser = require('../middleware/authentication'); // /auth публічний, тож захищаємо лише окремий маршрут

const { login, register, updateUser } = require('../controllers/auth');

router.post('/login', login);
router.post('/register', register);
router.patch('/updateUser', authenticateUser, updateUser); // PATCH — змінюємо наявний документ; handler-и йдуть зліва направо: токен → контролер

module.exports = router;
