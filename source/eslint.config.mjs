import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Decorator metadata makes these unavoidable at the Nest boundary.
      '@typescript-eslint/no-extraneous-class': 'off',

      // Interpolating a number is safe and readable. The rule's real value — catching
      // `${object}` → "[object Object]" and `${maybeNull}` — is untouched.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],

      // An escape hatch must expire and must say why: `@ts-expect-error` fails once the
      // underlying error is fixed, `@ts-ignore` never does. Both are counted by
      // .escape-hatches.json, whose ceiling for each is 0 today.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true },
      ],

      'max-depth': ['error', 4],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Field-declaration files: wide, not complex. `create-variant.dto.ts` is one class
    // with 288 field decorators; `variant-graphql.types.ts` four classes with 300 — the
    // variant entity's shape restated per transport. `max-lines` exists to catch a
    // module doing too much; these do one thing with many fields, so the rule measures
    // the wrong property here. Every other rule stays in force.
    files: ['**/dto/**/*.ts', '**/*graphql.types.ts'],
    rules: { 'max-lines': 'off' },
  },
  {
    // Test-file relaxations are enumerated per rule with a written reason — never a
    // blanket disable of the correctness rules. Two distinct kinds, per the nestjs
    // profile: untyped boundaries (debt — shrinks as the boundary gets modelled) and
    // negative-path construction (structural — the test cannot exist otherwise).
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    rules: {
      // Untyped boundaries: an HTTP response body and a GraphQL payload are `any`, and
      // inspecting them is the whole point of an e2e. Fully in force for `src/**`.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      // Passing a mock's method to `expect()` is how a call is asserted.
      '@typescript-eslint/unbound-method': 'off',

      // `() => expect(...)` as an arrow body is the assertion idiom; the rule reads its
      // void return as confusing. Measured: 19 hits, every one this pattern, none a
      // defect.
      '@typescript-eslint/no-confusing-void-expression': 'off',

      // `describe` and `it` callbacks are functions to the linter, so a per-function
      // line cap written for production code fires on any suite with several tests.
      // Measured: 17 hits, every one a describe block. Splitting suites to satisfy it
      // would make the tests worse.
      'max-lines-per-function': 'off',
      'max-lines': 'off',

      // Building an invalid value to feed a validator is the only way a negative-path
      // test can exist — `delete body.collection` on a required field, a deliberately
      // wrong type. Structural, not debt.
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
    },
  },
);
