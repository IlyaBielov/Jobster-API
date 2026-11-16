const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  company: {
    type: String,
    required: [true, 'Please provide company name'],
    maxlength: [50, 'Company name cannot be more than 50 characters'], // перевіряє Mongoose до запису в БД
  },
  position: {
    type: String,
    required: [true, 'Please provide position'],
    maxlength: [100, 'Position cannot be more than 100 characters'],
  },
  status: {
    type: String,
    required: [true, 'Please provide status'],
    enum: { // об'єктна форма — щоб задати свій текст; {VALUE} Mongoose підставить сам
      values: ['interview', 'declined', 'pending'],
      message: '{VALUE} is not a valid status (interview, declined, pending)',
    }, // інше значення — ValidationError
    default: 'pending', // при create без status
  },
  createdBy: {
    type: mongoose.Types.ObjectId, // зберігаємо лише id власника, не копію юзера
    ref: 'User', // назва моделі — дає змогу populate('createdBy')
    required: [true, 'Please provide user'],
  },
  jobType: {
    type: String,
    enum: { // ті самі значення, що в jobTypeOptions на фронті (client/src/features/job/jobSlice.js)
      values: ['full-time', 'part-time', 'remote', 'internship'],
      message: '{VALUE} is not a valid job type (full-time, part-time, remote, internship)',
    },
    default: 'full-time', // фронт завжди шле jobType — default лише для запитів з Postman/Swagger
  },
  jobLocation: {
    type: String,
    default: 'my city', // форма Add Job підставляє сюди location з профілю юзера
    required: true, // з default спрацює лише на явний '' або null
  },
}, { timestamps: true }); // createdAt / updatedAt Mongoose ставить сам

// JSDoc-тип для WebStorm: без нього IDE плутає Job.create(...) з чужим типом і свариться на аргументи
/** @typedef {{ company: string, position: string, status: 'interview' | 'declined' | 'pending', createdBy: mongoose.Types.ObjectId, jobType: 'full-time' | 'part-time' | 'remote' | 'internship', jobLocation: string }} JobFields */
/** @type {mongoose.Model<JobFields>} */ // методів у схемі немає — достатньо 1-го generic
module.exports = mongoose.model('Job', JobSchema);
