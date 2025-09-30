import {Router} from 'express'
import authenticationRouter from './authenticationRoutes.js'

const router = Router();

router.use('/auth', authenticationRouter);

export default router;


