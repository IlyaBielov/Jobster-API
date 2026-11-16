// окремий одноразовий скрипт: `node populate.js` — заливає mock-data.json у БД, сервер для цього не потрібен
require('dotenv').config(); // свій процес — свій dotenv, app.js тут не запускається

const mockData = require('./mock-data.json'); // require парсить JSON сам; createdBy — _id демо-юзера
const Job = require('./models/Job'); // через модель, а не напряму в колекцію — пройдуть валідатори й default
const connectDB = require('./db/connect');

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    // без deleteMany: кожен запуск ДОДАЄ ще 75 вакансій — запускай один раз
    // масив → save() для кожного: впаде один — решта вже може бути в БД; createdAt з файлу timestamps не чіпає
    await Job.create(mockData);
    console.log('Success!!!');
    process.exit(0); // інакше відкрите з'єднання mongoose не дасть процесу завершитись
  } catch (error) {
    console.log(error);
    process.exit(1); // ненульовий код — сигнал, що скрипт впав
  }
};

start();
