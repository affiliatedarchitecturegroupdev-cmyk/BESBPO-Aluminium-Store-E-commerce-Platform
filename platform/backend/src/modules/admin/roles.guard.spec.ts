import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';

// The regression these tests lock down: RolesGuard used `reflector.get` (handler metadata only)
// with `if (!roles) return true`. AdminController declares @Roles('ADMIN') at the *class* level,
// so handler metadata was undefined for every admin route, the guard returned true, and the whole
// admin surface was open to any signed-in user. `getAllAndOverride` with handler + class fixes it.

function contextFor(user: unknown): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows the request when no roles are declared', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextFor({ role: 'RETAIL' }))).toBe(true);
  });

  it('allows the request when the declared role list is empty', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([]) } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextFor({ role: 'RETAIL' }))).toBe(true);
  });

  it('allows a user whose role is in the declared list', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextFor({ role: 'ADMIN' }))).toBe(true);
  });

  it('rejects a signed-in user whose role is not allowed', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(contextFor({ role: 'TRADE' }))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects an unauthenticated request on a protected route', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(contextFor(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a user object with no role field', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(contextFor({ id: 'u1' }))).toThrow(
      ForbiddenException,
    );
  });

  it('reads metadata from both the handler and the class', () => {
    // If this ever reverts to handler-only metadata, class-level @Roles(...) silently stops
    // applying and the admin surface reopens.
    const getAllAndOverride = jest.fn().mockReturnValue(['ADMIN']);
    const reflector = { getAllAndOverride } as unknown as Reflector;
    new RolesGuard(reflector).canActivate(contextFor({ role: 'ADMIN' }));
    const [key, targets] = getAllAndOverride.mock.calls[0];
    expect(key).toBe('roles');
    expect(targets).toHaveLength(2);
  });

  it('denies by throwing rather than returning false', () => {
    // Returning false lets Nest emit a generic 403 with no message; throwing produces an
    // actionable body. Locking the throw in so a refactor does not silently change the response.
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    let thrown: unknown;
    try {
      new RolesGuard(reflector).canActivate(contextFor({ role: 'RETAIL' }));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ForbiddenException);
    expect((thrown as ForbiddenException).message).toBe('Insufficient role for this resource');
  });
});