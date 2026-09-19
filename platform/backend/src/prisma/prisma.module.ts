import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CounterService } from './counter.service';

// Marked @Global so every feature module can inject PrismaService without re-providing
// it (the scaffold injected it in ~40 services but never provided it anywhere, which
// crashes the app at bootstrap with "Nest can't resolve dependencies of X").
@Global()
@Module({
  providers: [PrismaService, CounterService],
  exports: [PrismaService, CounterService],
})
export class PrismaModule {}