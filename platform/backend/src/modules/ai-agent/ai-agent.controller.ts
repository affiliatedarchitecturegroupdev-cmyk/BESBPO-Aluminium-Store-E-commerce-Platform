import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AiAgentService } from './ai-agent.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Context-aware support agent — architecture-level scaffold. See docs/30-ai-support-agent.md
// for the honest scope note: this wires the conversation/escalation flow for real, but the
// actual LLM call and knowledge-base retrieval are marked TODO(phase-2), not faked.
@Controller('ai-agent')
export class AiAgentController {
  constructor(private readonly service: AiAgentService) {}

  // Sessions work for both logged-in buyers and anonymous visitors — JwtAuthGuard is
  // deliberately not applied here.
  @Post('sessions')
  startSession(@Req() req: Request & { user?: { id: string } }) {
    return this.service.startSession(req.user?.id ?? null);
  }

  @Post('sessions/:id/messages')
  sendMessage(@Param('id') sessionId: string, @Body() dto: SendMessageDto) {
    return this.service.handleUserMessage(sessionId, dto.content);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:id/escalate')
  escalate(@Req() req: Request & { user: { id: string } }, @Param('id') sessionId: string) {
    return this.service.escalateToHuman(sessionId, req.user.id);
  }
}
