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

// req.user — від auth middleware, req.body — форма Profile
const updateUser = async (req, res) => {
  const { email, name, lastName, location } = req.body;
  if (!email || !name || !lastName || !location) { // форма Profile завжди шле всі 4 поля
    throw new BadRequestError('Please provide all values');
  }

  // userId з токена, а не з body — чужий профіль не оновиш
  const user = await User.findOne({ _id: req.user.userId });

  // поки лише в пам'яті; Mongoose позначає ці поля як modified, у БД вони підуть на save()
  user.email = email;
  user.name = name;
  user.lastName = lastName;
  user.location = location;

  // save(), а не findOneAndUpdate — щоб пройшли валідатори схеми й pre('save')
  await user.save();

  const token = user.createJWT(); // name у payload міг змінитись — видаємо свіжий токен
  // та сама форма, що й у login — фронт просто замінює user у localStorage
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
  login,
  updateUser,
}
