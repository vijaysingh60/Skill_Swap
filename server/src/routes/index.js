import { Router } from 'express';
import { requireAdmin, requireAuth, requireVerifiedInstructor } from '../middleware/auth.js';
import * as auth from '../controllers/auth.controller.js';
import * as users from '../controllers/users.controller.js';
import * as requests from '../controllers/requests.controller.js';
import * as instructor from '../controllers/instructor.controller.js';
import * as admin from '../controllers/admin.controller.js';
import * as sessions from '../controllers/sessions.controller.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/me', requireAuth, auth.me);

router.put('/users/me', requireAuth, users.updateMe);
router.put('/users/me/mode', requireAuth, instructor.setMode);
router.get('/users', requireAuth, users.listStudents);
router.get('/users/recommended', requireAuth, users.recommended);
router.get('/users/:id', requireAuth, users.getStudent);

router.post('/requests', requireAuth, requests.createRequest);
router.get('/requests', requireAuth, requests.listRequests);
router.patch('/requests/:id', requireAuth, requests.respondToRequest);

router.post('/instructor/apply', requireAuth, instructor.apply);

router.get('/admin/instructors', requireAuth, requireAdmin, admin.listApplications);
router.patch('/admin/instructors/:id', requireAuth, requireAdmin, admin.decide);

router.get('/sessions', requireAuth, sessions.listSessions);
router.post('/sessions', requireAuth, requireVerifiedInstructor, sessions.createSession);
router.get('/sessions/:id', requireAuth, sessions.getSession);
router.post('/sessions/:id/join', requireAuth, sessions.joinSession);
router.delete('/sessions/:id/join', requireAuth, sessions.leaveSession);
router.post('/sessions/:id/cancel', requireAuth, sessions.cancelSession);
router.get('/sessions/:id/room', requireAuth, sessions.getRoom);

export default router;
