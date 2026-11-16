const User = require('../models/User')
const { StatusCodes } = require('http-status-codes');
const { BadRequestError, UnauthenticatedError } = require('../errors'); // барел errors/index.js — усі класи з одного місця


const register = async (req, res, next) => {
  const user = await User.create({ ...req.body }); // валідація схеми + pre('save') хешує пароль

  const token = user.createJWT() // логіка токена живе в моделі — контролер тонкий
  // 201; token усередині user — фронт кладе весь user у localStorage, а axios бере user.token
  res.status(StatusCodes.CREATED).json({
    user: {
      email: user.email,
      lastName: user.lastName,
      location: user.location,
      name: user.name,
      token,
    },
  });
}

const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) { // 400 — клієнт не надіслав потрібні поля
      throw new BadRequestError('Please enter a valid email or password');
  }

  const user = await User.findOne({ email }); // пароль у findOne не передаємо — у БД лише хеш

  if (!user) { // те саме повідомлення, що й для пароля — не підказуємо, які email існують
      throw new UnauthenticatedError('Invalid credentials');
  }

  const isPasswordValid = await user.comparePassword(password); // bcrypt хешує введене і порівнює з хешем
  if (!isPasswordValid) {
    throw new UnauthenticatedError('Invalid credentials');
  }

  const token = user.createJWT() // новий токен при кожному логіні — exp знову JWT_LIFETIME
  // та сама форма, що й у register; пароль (навіть хеш) у відповідь не йде
  res.status(StatusCodes.OK).json({
    user: {
      email: user.email,
      lastName: user.lastName,
      location: user.location,
      name: user.name,
      token,
    },
  });
}


module.exports = {
  register,
  login
}
