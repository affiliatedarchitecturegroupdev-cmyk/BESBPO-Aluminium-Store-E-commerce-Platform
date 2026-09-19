import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaExceptionFilter } from './prisma-exception.filter';

// These tests cover the mapping from Prisma's database-level errors to HTTP statuses. Before the
// filter existed, a duplicate SKU surfaced as an opaque 500; the caller could not tell a routine
// validation failure from a crash.

function buildHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function prismaError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('boom', {
    code,
    clientVersion: '5.22.0',
    meta,
  });
}

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    // The default branch logs; keep the test output clean without hiding the assertion.
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  });

  it('maps a unique-constraint violation (P2002) to 409 Conflict', () => {
    const { host, status, json } = buildHost();
    filter.catch(prismaError('P2002', { target: ['sku'] }), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json.mock.calls[0][0].message).toContain('sku');
  });

  it('names every offending field when the unique index spans more than one column', () => {
    const { host, json } = buildHost();
    filter.catch(prismaError('P2002', { target: ['slug', 'version'] }), host);
    expect(json.mock.calls[0][0].message).toContain('slug, version');
  });

  it('still produces a 409 when P2002 carries no target metadata', () => {
    const { host, status, json } = buildHost();
    filter.catch(prismaError('P2002'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json.mock.calls[0][0].statusCode).toBe(409);
  });

  it('maps a missing record (P2025) to 404 Not Found', () => {
    const { host, status } = buildHost();
    filter.catch(prismaError('P2025'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('maps a broken foreign key (P2003) to 400 Bad Request', () => {
    const { host, status } = buildHost();
    filter.catch(prismaError('P2003'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('leaves an unrecognised Prisma code as a 500', () => {
    const { host, status, json } = buildHost();
    filter.catch(prismaError('P1001'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json.mock.calls[0][0].message).toBe('Internal server error');
  });

  it('does not leak Prisma internals to the client on an unmapped error', () => {
    const { host, json } = buildHost();
    filter.catch(prismaError('P2034'), host);
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('boom');
  });
});