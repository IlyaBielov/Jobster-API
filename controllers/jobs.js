const mongoose = require('mongoose'); // для mongoose.Types.ObjectId в aggregate
const moment = require('moment'); // { year: 2026, month: 11 } → 'Nov 2026' для осі графіка
const Job = require('../models/Job');
const { StatusCodes } = require('http-status-codes');
const { BadRequestError, NotFoundError } = require('../errors');

// CRUD для jobs: кожен запит фільтрує по createdBy — юзер бачить лише свої job
const getAllJobs = async (req, res, next) => {
  // фронт шле /jobs?status=all&jobType=all&sort=latest&page=1[&search=...]
  const { search, status, jobType, sort } = req.query; // рядки (масив, якщо параметр повторено); undefined, якщо нема

  // умови фільтра збираємо в об'єкт; createdBy — завжди, щоб не бачити чужі job
  const queryObject = {
    createdBy: req.user.userId,
  };

  // поле додаємо лише коли є що шукати — інакше фільтр не обмежує вибірку
  if (search) {
    // екрануємо спецсимволи regex: 'c++' шукається буквально, а '(' не дає 500 від MongoDB
    // String(): ?search=a&search=b Express віддає масивом — без цього .replace впаде з 500
    const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& — сам знайдений символ
    queryObject.position = { $regex: escapedSearch, $options: 'i' }; // підрядок будь-де в position; 'i' — без регістру
  }

  // 'all' — дефолт у фільтрах фронту, означає «не фільтрувати»; такого значення в enum нема
  if (status && status !== 'all') {
    queryObject.status = status; // точний збіг, не regex — значення з випадаючого списку
  }
  if (jobType && jobType !== 'all') {
    queryObject.jobType = jobType;
  }

  // без await: find() повертає Query, до якого ще можна дочепити sort/skip/limit
  let result = Job.find(queryObject);

  // .sort() дописує умову в Query і повертає його ж; присвоєння в result — стиль курсу (тому let)
  if (sort === 'latest') {
    result = result.sort('-createdAt'); // '-' — за спаданням: нові зверху
  }
  if (sort === 'oldest') {
    result = result.sort('createdAt');
  }
  if (sort === 'a-z') {
    // _id — другий ключ: при однакових position порядок стабільний, і сторінки не перетинаються
    result = result.sort('position _id'); // рядки — за алфавітом (з урахуванням регістру)
  }
  if (sort === 'z-a') {
    result = result.sort('-position -_id');
  }

  // query-параметри — рядки: Number('2') → 2; NaN/0 → || дає дефолт
  // Math.max: page=-1 дав би від'ємний skip, і MongoDB кинула б помилку (500)
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.max(Number(req.query.limit) || 10, 1);
  const skip = (page - 1) * limit; // page 1 → 0, page 2 → 10: скільки документів пропустити

  result = result.skip(skip).limit(limit); // MongoDB віддає лише одну сторінку, не всю колекцію

  const jobs = await result; // await запускає запит у БД

  // окремий запит: скільки ВСЬОГО під ці фільтри — jobs.length тут максимум limit
  const totalJobs = await Job.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalJobs / limit); // 76 / 10 → 8 сторінок; 0 job → 0

  // саме ці ключі читає фронт (allJobsSlice: payload.totalJobs, payload.numOfPages)
  res.status(StatusCodes.OK).json({ jobs, totalJobs, numOfPages });
}

const getJob = async (req, res, next) => {
  const { user: { userId }, params: { id: jobId } } = req; // userId — з токена (auth), jobId — з URL /jobs/:id

  const job = await Job.findOne({ _id: jobId, createdBy: userId }); // обидві умови: чужу job не віддаємо
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`); // 404 і для неіснуючої, і для чужої — не підказуємо, що вона є
  }

  res.status(StatusCodes.OK).json({ job });
}

const createJob = async (req, res, next) => {
  req.body.createdBy = req.user.userId // власника беремо з токена, а не з тіла запиту
  const job = await Job.create(req.body) // валідація схеми; невідомі поля strict-режим відкине
  res.status(StatusCodes.CREATED).json({ job }) // { job } — та сама форма, що в getJob/updateJob
}

const updateJob = async (req, res, next) => {
  const {
    body: { company, position },
    user: { userId },
    params: { id: jobId },
  } = req;

  // undefined (поле не передали) — ок для PATCH; лише явний '' вважаємо помилкою
  if (company === '' || position === '') { // 400 з людським текстом ще до запиту в БД
    throw new BadRequestError('Company or Position fields cannot be empty');
  }

  const job = await Job.findOneAndUpdate(
    { _id: jobId, createdBy: userId }, // оновлюємо лише свою job
    req.body, // Mongoose загортає в $set — змінюються лише передані поля (PATCH)
    { returnDocument: 'after', runValidators: true } // Mongoose 9: замість { new: true }; валідатори схеми й тут
  );
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`);
  }

  res.status(StatusCodes.OK).json({ job });
}

const deleteJob = async (req, res, next) => {
  const { user: { userId }, params: { id: jobId } } = req;

  const job = await Job.findOneAndDelete({ _id: jobId, createdBy: userId }); // findOneAndRemove прибрали в Mongoose 8+
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`);
  }

  res.status(StatusCodes.OK).send(); // тіло не потрібне — достатньо статусу
}

// дані для сторінки Stats: картки за статусом + графік за місяцями
const showStats = async (req, res) => {
  // aggregation pipeline: документи проходять етапи по черзі, рахує сама MongoDB
  let stats = await Job.aggregate([
    // aggregate НЕ кастить типи за схемою (на відміну від find) — тому ObjectId явно; з new, бо Mongoose 6+
    { $match: { createdBy: new mongoose.Types.ObjectId(req.user.userId) } },
    // один вихідний документ на кожен status; $sum: 1 — +1 за кожну job у групі
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  // [{ _id: 'pending', count: 32 }, ...] → { pending: 32, ... } — фронт читає stats.pending
  stats = stats.reduce((acc, curr) => {
    const { _id: title, count } = curr; // перейменовуємо _id → title для читабельності
    acc[title] = count;
    return acc; // reduce передає acc у наступну ітерацію — без return буде undefined
  }, {}); // {} — стартове значення acc

  // статус без жодної job $group не поверне взагалі — тому дефолт 0 для кожного
  const defaultStats = {
    pending: stats.pending || 0,
    interview: stats.interview || 0,
    declined: stats.declined || 0,
  };

  let monthlyApplications = await Job.aggregate([
    { $match: { createdBy: new mongoose.Types.ObjectId(req.user.userId) } },
    // ключ групи — об'єкт: лише місяць злив би Nov 2025 і Nov 2026 в одну групу
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, // $month: 1–12; дати в UTC
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }, // від найновіших — щоб $limit узяв останні
    { $limit: 6 }, // 6 останніх місяців, у яких були job (порожні місяці $group не створює)
  ]);
  // [{ _id: { year, month }, count }] → [{ date: 'Nov 2026', count }] — графік бере поля date і count
  monthlyApplications = monthlyApplications.map((item) => {
    const { _id: { year, month }, count } = item; // вкладена деструктуризація з _id
    const date = moment() // стартуємо від «зараз» — день і час не важливі, format бере лише місяць і рік
      .month(month - 1) // у moment місяці 0–11, а $month з MongoDB дає 1–12
      .year(year)
      .format('MMM Y'); // 'MMM' — коротка назва місяця, 'Y' — рік
    return { date, count };
  });

  res.status(StatusCodes.OK).json({ defaultStats, monthlyApplications });
}

module.exports = {
  getAllJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  showStats,
}
