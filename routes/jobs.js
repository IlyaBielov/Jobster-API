const express = require('express');
const router = express.Router();
const testUser = require('../middleware/testUser'); // auth уже стоїть в app.js на всьому /api/v1/jobs

const { getAllJobs, getJob, createJob, updateJob, deleteJob } = require('../controllers/jobs');

// GET — без testUser: демо-юзер може все дивитись, але нічого не змінювати
router.get('/', getAllJobs);
router.post('/', testUser, createJob);
router.get('/:id', getJob); // :id → req.params.id
router.delete('/:id', testUser, deleteJob);
router.patch('/:id', testUser, updateJob); // PATCH — часткове оновлення (лише передані поля)

module.exports = router;
