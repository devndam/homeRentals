import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateBody } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';
import {
  RegisterDto, LoginDto, ForgotPasswordDto,
  ResetPasswordDto, RefreshTokenDto, ChangePasswordDto,
} from './auth.dto';

const router = Router();
const ctrl = new AuthController();

router.post('/register', validateBody(RegisterDto), asyncHandler(ctrl.register));
router.post('/login', validateBody(LoginDto), asyncHandler(ctrl.login));
router.post('/refresh', validateBody(RefreshTokenDto), asyncHandler(ctrl.refreshToken));
router.post('/forgot-password', validateBody(ForgotPasswordDto), asyncHandler(ctrl.forgotPassword));
router.post('/reset-password', validateBody(ResetPasswordDto), asyncHandler(ctrl.resetPassword));
router.post('/change-password', authenticate as any, validateBody(ChangePasswordDto), asyncHandler(ctrl.changePassword as any));
router.post('/logout', asyncHandler(ctrl.logout));
router.get('/me', authenticate as any, asyncHandler(ctrl.me as any));

export default router;
