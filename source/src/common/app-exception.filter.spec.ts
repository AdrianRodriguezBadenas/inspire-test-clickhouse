import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { Response } from 'express';
import { QueryValidationError } from '../analytics/domain/variant-query';
import { AppExceptionFilter } from './app-exception.filter';

/** An ArgumentsHost reporting the given context type, carrying a mock response. */
const hostFor = (
  type: 'http' | 'graphql',
  response: MockProxy<Response>,
): ArgumentsHost => {
  const host = mock<ArgumentsHost>();
  host.getType.mockReturnValue(type);
  host.switchToHttp.mockReturnValue({
    getResponse: () => response,
    getRequest: () => ({}),
    getNext: () => undefined,
  } as never);
  return host;
};

describe('AppExceptionFilter', () => {
  let filter: AppExceptionFilter;
  let response: MockProxy<Response>;

  beforeEach(() => {
    filter = new AppExceptionFilter();
    response = mock<Response>();
    response.status.mockReturnValue(response);
  });

  it('shapes an HttpException with its own status and body', () => {
    // GIVEN
    const exception = new BadRequestException({
      code: 'missing_required_field',
      message: 'A required field is missing: project_id.',
      fields: ['project_id'],
    });

    // WHEN
    filter.catch(exception, hostFor('http', response));

    // THEN
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      code: 'missing_required_field',
      message: 'A required field is missing: project_id.',
      fields: ['project_id'],
    });
  });

  it('maps a query-validation failure to 400 with its domain code', () => {
    // GIVEN
    const exception = new QueryValidationError(
      'query_too_complex',
      'Query condition tree is nested too deeply.',
    );

    // WHEN
    filter.catch(exception, hostFor('http', response));

    // THEN
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      code: 'query_too_complex',
      message: 'Query condition tree is nested too deeply.',
    });
  });

  it('hides an unexpected failure behind a generic 500', () => {
    // GIVEN
    const exception = new Error('Connection to clickhouse:9000 refused');

    // WHEN
    filter.catch(exception, hostFor('http', response));

    // THEN
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      code: 'internal_error',
      message: 'An unexpected error occurred.',
    });
  });

  // Writing to the Express response on a GraphQL request would corrupt the
  // GraphQL envelope; graphql.config.ts shapes that route's errors instead.
  it('re-throws on a GraphQL request without touching the response', () => {
    // GIVEN
    const exception = new QueryValidationError(
      'unknown_query_field',
      'Unknown query field: bogus.',
    );

    // WHEN
    const act = () => filter.catch(exception, hostFor('graphql', response));

    // THEN
    expect(act).toThrow(exception);

    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });
});
