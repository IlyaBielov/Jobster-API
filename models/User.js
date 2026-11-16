const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'], // [значення, повідомлення помилки]
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [50, 'Name cannot be more than 50 characters'],
  },
  email: {
    type: String,
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please provide a valid email', // 2-й елемент масиву — текст ValidationError замість "Path `email` is invalid"
    ],
    required: [true, 'Please provide an email'],
    unique: true, // не валідатор, а унікальний індекс у MongoDB
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  // реєстрація питає лише name/email/password — default, щоб профіль одразу мав значення
  lastName: {
    type: String,
    trim: true, // '  Bielov ' → 'Bielov' перед валідацією й збереженням
    maxlength: [20, 'Last name cannot be more than 20 characters'], // свій текст замість 'Path `lastName` ...'
    default: 'lastName',
  },
  location: {
    type: String,
    trim: true,
    maxlength: 20,
    default: 'my city', // default пишеться при create(); старі юзери без поля отримають його лише при читанні
  },
})

// Mongoose 9: async-хук без next; function, а не =>, щоб this був документом
UserSchema.pre('save', async function() {
  const salt = await bcrypt.genSalt(10); // 10 раундів — баланс швидкості й стійкості до перебору
  this.password = await bcrypt.hash(this.password, salt); // у БД тільки хеш, не сам пароль
})

// instance-метод: кожен документ user уміє видати собі токен; function — заради this
UserSchema.methods.createJWT = function() {
  return jwt.sign(
    { userId: this._id, name: this.name }, // payload лише підписаний, не зашифрований — без секретів
    process.env.JWT_SECRET, // хто знає секрет — може підробити токен, тому довгий і в .env
    { expiresIn: process.env.JWT_LIFETIME } // напр. '30d' → поле exp у токені
  );
}

// кандидат хешується з тією ж сіллю (вона всередині хешу) і порівнюється — розшифрувати хеш не можна
UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
}

// JSDoc-тип для WebStorm: явні поля, щоб IDE знала user.name / user._id після create()
/** @typedef {{ name: string, email: string, password: string, lastName: string, location: string }} UserFields */
/** @typedef {{ createJWT: () => string, comparePassword: (password: string) => Promise<boolean> }} UserMethods */
/** @type {mongoose.Model<UserFields, {}, UserMethods>} */ // 3-й generic — методи з UserSchema.methods
module.exports = mongoose.model('User', UserSchema)
