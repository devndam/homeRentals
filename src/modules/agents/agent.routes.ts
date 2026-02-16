import { Router } from 'express';
import { AgentController } from './agent.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { CreateAgentDto, UpdateAgentDto, AgentBookingsQueryDto, AgentPropertiesQueryDto } from './agent.dto';
import { UserRole } from '../../types';

const router = Router();
const ctrl = new AgentController();

router.use(authenticate as any);
router.use(authorize(UserRole.PROPERTY_OWNER) as any);

router.post('/', validateBody(CreateAgentDto), asyncHandler(ctrl.createAgent as any));
router.get('/', asyncHandler(ctrl.getMyAgents as any));
router.get('/:id', asyncHandler(ctrl.getAgentById as any));
router.get('/:id/properties', validateQuery(AgentPropertiesQueryDto), asyncHandler(ctrl.getAgentProperties as any));
router.get('/:id/bookings', validateQuery(AgentBookingsQueryDto), asyncHandler(ctrl.getAgentBookings as any));
router.patch('/:id', validateBody(UpdateAgentDto), asyncHandler(ctrl.updateAgent as any));
router.patch('/:id/toggle-active', asyncHandler(ctrl.toggleAgentActive as any));
router.delete('/:id', asyncHandler(ctrl.removeAgent as any));

export default router;
