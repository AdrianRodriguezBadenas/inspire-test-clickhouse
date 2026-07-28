import { graphqlConfig } from './graphql.config';

describe('graphqlConfig', () => {
  it('exposes introspection while developing', () => {
    const config = graphqlConfig({ NODE_ENV: 'development' });

    expect(config.introspection).toBe(true);
  });

  it('exposes introspection while testing', () => {
    const config = graphqlConfig({ NODE_ENV: 'test' });

    expect(config.introspection).toBe(false);
  });

  it('hides introspection in production', () => {
    const config = graphqlConfig({ NODE_ENV: 'production' });

    expect(config.introspection).toBe(false);
  });

  it('hides introspection when the environment says nothing', () => {
    const config = graphqlConfig({});

    expect(config.introspection).toBe(false);
  });

  it.each([['development'], ['test'], ['staging'], ['production']])(
    'never puts a stacktrace in an error response, not even in %s',
    (nodeEnv) => {
      const config = graphqlConfig({ NODE_ENV: nodeEnv });

      expect(config.includeStacktraceInErrorResponses).toBe(false);
    },
  );

  it('never puts a stacktrace in an error response when the environment says nothing', () => {
    const config = graphqlConfig({});

    expect(config.includeStacktraceInErrorResponses).toBe(false);
  });

  it('never serves the playground', () => {
    const config = graphqlConfig({ NODE_ENV: 'development' });

    expect(config.playground).toBe(false);
  });

  it('serves the schema at /graphql', () => {
    const config = graphqlConfig({});

    expect(config.path).toBe('/graphql');
  });

  it('builds the schema from the code-first types', () => {
    const config = graphqlConfig({});

    expect(config.autoSchemaFile).toBe(true);
    expect(config.sortSchema).toBe(true);
  });
});
