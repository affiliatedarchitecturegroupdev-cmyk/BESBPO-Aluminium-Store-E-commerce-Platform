import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

// Prisma's known request errors are database-level outcomes the client can act on — they are not
// bugs. Without this filter every unique-constraint violation (a duplicate SKU, a re-used email)
// surfaced as an opaque 500 "Internal server error", which tells the caller nothing and makes a
// routine validation failure look like a crash.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        // `target` is the list of columns in the violated unique index.
        const target = exception.meta?.target;
        const fields = Array.isArray(target) ? target.join(', ') : String(target ?? 'field');
        return response
          .status(HttpStatus.CONFLICT)
          .json({ statusCode: 409, error: 'Conflict', message: `Value already in use: ${fields}` });
      }
      case 'P2025':
        return response
          .status(HttpStatus.NOT_FOUND)
          .json({ statusCode: 404, error: 'Not Found', message: 'Record not found' });
      case 'P2003':
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Referenced record does not exist',
        });
      default:
        break;
    }

    // Anything else stays a 500, but is logged with the Prisma code and the query that failed so
    // it is diagnosable. The generic body is deliberate — Prisma messages can name columns and
    // table structure, which should not reach a browser.
    this.logger.error(
      `Unhandled Prisma error ${exception.code}: ${exception.message}`,
      exception.stack,
    );
    // A thrown HttpException already carries the right status; anything else is a genuine 500.
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    return response.status(status).json({ statusCode: status, message: 'Internal server error' });
  }
}