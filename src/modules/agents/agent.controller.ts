import { Response } from 'express';
import { AgentService } from './agent.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const agentService = new AgentService();

export class AgentController {
  async createAgent(req: AuthenticatedRequest, res: Response) {
    const agent = await agentService.createAgent(req.user.sub, req.body);
    return sendCreated(res, agent, 'Agent created');
  }

  async getMyAgents(req: AuthenticatedRequest, res: Response) {
    const result = await agentService.getMyAgents(req.user.sub, req.query as any);
    return sendPaginated(res, result);
  }

  async getAgentById(req: AuthenticatedRequest, res: Response) {
    const agent = await agentService.getAgentById(req.params.id, req.user.sub);
    return sendSuccess(res, agent);
  }

  async removeAgent(req: AuthenticatedRequest, res: Response) {
    await agentService.removeAgent(req.params.id, req.user.sub);
    return sendSuccess(res, null, 'Agent deactivated');
  }

  async toggleAgentActive(req: AuthenticatedRequest, res: Response) {
    const agent = await agentService.toggleAgentActive(req.params.id, req.user.sub);
    return sendSuccess(res, agent, `Agent ${agent.isActive ? 'activated' : 'deactivated'}`);
  }
}
