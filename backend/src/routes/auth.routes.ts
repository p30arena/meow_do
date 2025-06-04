import express, { Router } from 'express';
import { register, login, updateTimezone } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router: Router = express.Router(); // Auth routes

router.post('/register', register);
router.post('/login', login);

router.put('/me/timezone', protect, updateTimezone);

export default router;
