import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { AppExceptionFilter } from './app-exception.filter';
import {
  VariantErrorCode,
  VariantValidationError,
} from '../analytics/domain/variant-errors';

interface CapturedResponse {
  statusCode?: number;
  body?: unknown;
}

/** An HTTP `ArgumentsHost` that records what the filter wrote. */
const httpHost = (captured: CapturedResponse): ArgumentsHost => {
  const response = {
    status(code: number) {
      captured.statusCode = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  };

  return {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
};

const graphqlHost = (): ArgumentsHost =>
  ({ getType: () => 'graphql' }) as unknown as ArgumentsHost;

describe('AppExceptionFilter', () => {
  let filter: AppExceptionFilter;
  let captured: CapturedResponse;

  beforeEach(() => {
    filter = new AppExceptionFilter();
    captured = {};
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  });

  describe('over HTTP', () => {
    it('answers a rejected input with 400 and the descriptor error code', () => {
      const rejection = new VariantValidationError(
        VariantErrorCode.UNKNOWN_QUERY_FIELD,
        'Unknown query field: ghost.',
      );

      filter.catch(rejection, httpHost(captured));

      expect(captured.statusCode).toBe(400);
      expect(captured.body).toEqual({
        statusCode: 400,
        code: 'unknown_query_field',
        message: 'Unknown query field: ghost.',
      });
    });

    it('answers a missing required field with its own code', () => {
      const rejection = new VariantValidationError(
        VariantErrorCode.MISSING_REQUIRED_FIELD,
        'A required field is missing: uri.',
      );

      filter.catch(rejection, httpHost(captured));

      expect(captured.body).toEqual({
        statusCode: 400,
        code: 'missing_required_field',
        message: 'A required field is missing: uri.',
      });
    });

    it('keeps the status and message of a framework HTTP exception', () => {
      filter.catch(new NotFoundException('No such route'), httpHost(captured));

      expect(captured.statusCode).toBe(404);
      expect(captured.body).toEqual({
        statusCode: 404,
        code: 'not_found',
        message: 'No such route',
      });
    });

    it('reports a DTO validation failure as a bad request, keeping its details', () => {
      const rejection = new BadRequestException({
        message: ['project_id must be an integer number'],
        statusCode: 400,
      });

      filter.catch(rejection, httpHost(captured));

      expect(captured.statusCode).toBe(400);
      expect(captured.body).toEqual({
        statusCode: 400,
        code: 'bad_request',
        message: 'project_id must be an integer number',
      });
    });

    it('answers an unexpected failure with 500 and no internal detail', () => {
      filter.catch(new Error('ClickHouse socket hang up at 10.0.0.4:9000'), httpHost(captured));

      expect(captured.statusCode).toBe(500);
      expect(captured.body).toEqual({
        statusCode: 500,
        code: 'internal_error',
        message: 'Internal server error',
      });
    });

    // The `rest` convention: "Downstream dependency unavailable or timed out -> 502/504.
    // Never surfaced as 500 — a 500 claims the fault is ours." The service answered 500
    // for an unreachable ClickHouse, which is a claim about whose fault it is, and it was
    // wrong. Observed live: the store was stopped and every request answered
    // `{"statusCode":500,"code":"internal_error"}`.
    it('answers 502 when the store could not be reached at all', () => {
      const refused = Object.assign(new Error('connect ECONNREFUSED 10.1.2.3:8123'), {
        code: 'ECONNREFUSED',
      });

      filter.catch(refused, httpHost(captured));

      expect(captured.statusCode).toBe(502);
      expect(captured.body).toEqual({
        statusCode: 502,
        code: 'bad_gateway',
        message: 'The analytics store is unavailable.',
      });
    });

    it('answers 504 when the store was reached but did not answer in time', () => {
      filter.catch(new Error('Timeout error.'), httpHost(captured));

      expect(captured.statusCode).toBe(504);
      expect(captured.body).toEqual({
        statusCode: 504,
        code: 'gateway_timeout',
        message: 'The analytics store did not respond in time.',
      });
    });

    it('keeps 500 when the store answered and the complaint is about our query', () => {
      // We reached it. "Unknown table expression identifier" is our fault, and the
      // convention's 500 row is the right one — this is the boundary the 502 must not cross.
      filter.catch(new Error("Unknown table expression identifier 'variant'"), httpHost(captured));

      expect(captured.statusCode).toBe(500);
      expect(captured.body).toEqual({
        statusCode: 500,
        code: 'internal_error',
        message: 'Internal server error',
      });
    });

    it('leaks no host or port when reporting an unreachable store', () => {
      const refused = Object.assign(new Error('connect ECONNREFUSED 10.1.2.3:8123'), {
        code: 'ECONNREFUSED',
      });

      filter.catch(refused, httpHost(captured));

      expect(JSON.stringify(captured.body)).not.toContain('10.1.2.3');
      expect(JSON.stringify(captured.body)).not.toContain('8123');
    });

    it('logs the unreachable store rather than swallowing it', () => {
      const refused = Object.assign(new Error('connect ECONNREFUSED 10.1.2.3:8123'), {
        code: 'ECONNREFUSED',
      });

      filter.catch(refused, httpHost(captured));

      expect(filter['logger'].error).toHaveBeenCalled();
    });

    it('logs the unexpected failure it hid from the client', () => {
      const failure = new Error('ClickHouse socket hang up');

      filter.catch(failure, httpHost(captured));

      expect(filter['logger'].error).toHaveBeenCalledWith(
        'Unhandled failure: ClickHouse socket hang up',
        failure.stack,
      );
    });
  });

  describe('over GraphQL', () => {
    it('rejects with the same code and message a REST client would see', () => {
      const rejection = new VariantValidationError(
        VariantErrorCode.UNKNOWN_QUERY_OPERATOR,
        'Unsupported operator: regex.',
      );

      const act = (): void => filter.catch(rejection, graphqlHost());

      expect(act).toThrow(GraphQLError);
      expect(act).toThrow('Unsupported operator: regex.');
    });

    it('carries the error code in the GraphQL extensions', () => {
      const rejection = new VariantValidationError(
        VariantErrorCode.QUERY_TOO_COMPLEX,
        'Query condition nests deeper than the permitted 10 levels.',
      );

      let thrown: unknown;
      try {
        filter.catch(rejection, graphqlHost());
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(GraphQLError);
      expect((thrown as GraphQLError).extensions).toEqual({ code: 'query_too_complex' });
    });

    it('hides an unexpected failure behind a generic GraphQL error', () => {
      const act = (): void => filter.catch(new Error('socket hang up'), graphqlHost());

      expect(act).toThrow('Internal server error');
      expect(act).not.toThrow('socket hang up');
    });
  });
});
