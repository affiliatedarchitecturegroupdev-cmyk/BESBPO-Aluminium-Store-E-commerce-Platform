import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupportService } from '../support/support.service';

// What's real in this file: session/message persistence, the knowledge-category lookup
// structure, and the escalation-to-human handoff (creates a real SupportTicket linked to
// the chat transcript). What's NOT real yet — clearly marked, not silently stubbed:
// the actual LLM call and the vector-similarity knowledge retrieval. See
// docs/30-ai-support-agent.md and docs/22-service-providers.md (Claude API + pgvector).
const ESCALATION_TRIGGERS = ['speak to a person', 'human', 'agent', 'not helpful', 'refund', 'complaint'];

@Injectable()
export class AiAgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly support: SupportService,
  ) {}

  startSession(userId: string | null) {
    return this.prisma.chatSession.create({ data: { userId: userId ?? undefined } });
  }

  async handleUserMessage(sessionId: string, content: string) {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Chat session not found');

    await this.prisma.chatMessage.create({ data: { sessionId, role: 'USER', content } });

    if (this.shouldSuggestEscalation(content)) {
      const reply = "I'll connect you with a member of the team — one moment.";
      await this.prisma.chatMessage.create({ data: { sessionId, role: 'ASSISTANT', content: reply } });
      return { reply, suggestEscalation: true };
    }

    // TODO(phase-2): replace this with a real Claude API call, grounded by a pgvector
    // similarity search against KnowledgeBaseEntry (products, pricing, lead times, specs,
    // compliance) plus live reads from the catalog/configurator/orders modules for
    // account-specific questions ("where's my order"). Returning a structured placeholder
    // here rather than a fake "AI-sounding" response, per AGENTS.md's rule against
    // pretending a stub is done.
    const knowledgeHits = await this.searchKnowledgeBase(content);
    const reply = knowledgeHits.length
      ? `Here's what I found: ${knowledgeHits[0].title}. (Full generative response pending Phase 2 LLM wiring.)`
      : "I don't have a confident answer for that yet — would you like me to connect you with the team?";
    await this.prisma.chatMessage.create({ data: { sessionId, role: 'ASSISTANT', content: reply } });
    return { reply, suggestEscalation: knowledgeHits.length === 0, knowledgeHits };
  }

  async escalateToHuman(sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    });
    if (!session) throw new NotFoundException('Chat session not found');

    const subject = session.messages[0]?.content.slice(0, 80) ?? 'Chat escalation';
    const ticket = await this.support.createFromChatEscalation(userId, sessionId, subject);
    await this.prisma.chatSession.update({ where: { id: sessionId }, data: { status: 'ESCALATED' } });
    return ticket;
  }

  private shouldSuggestEscalation(content: string): boolean {
    const lower = content.toLowerCase();
    return ESCALATION_TRIGGERS.some((t) => lower.includes(t));
  }

  // Naive substring match for now — the real implementation is a pgvector cosine-similarity
  // search over embedded KnowledgeBaseEntry.content, per docs/30-ai-support-agent.md.
  private async searchKnowledgeBase(query: string) {
    return this.prisma.knowledgeBaseEntry.findMany({
      where: { content: { contains: query.split(' ')[0], mode: 'insensitive' } },
      take: 3,
    });
  }
}
