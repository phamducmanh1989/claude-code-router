import { FastifyRequest, FastifyReply } from "fastify";
import { CopilotProvider } from "../providers/copilot";

export const copilotAuth = async (req: FastifyRequest, reply: FastifyReply) => {
  // Check if this is a request that should use Copilot authentication
  const body = req.body as any;
  
  // If the model specifies github-copilot provider, inject auth headers
  if (body?.model && typeof body.model === 'string' && body.model.includes('github-copilot')) {
    const authHeaders = await CopilotProvider.getAuthHeaders();
    
    if (!authHeaders) {
      reply.status(401).send({
        error: "GitHub Copilot authentication required. Please run 'ccr auth login' and select GitHub Copilot."
      });
      return;
    }
    
    // Inject authentication headers into the request
    // This will be used by the provider when making API calls
    (req as any).copilotAuth = authHeaders;
  }
};
