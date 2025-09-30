import { Router } from "express";
import  AuthenticatorController from "../controller/authentication.js";
const router = Router();

router.post('/',AuthenticatorController.AuthenticateUser);

export default router;