import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
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
    },
  },
  {
    // Tests assert against untyped boundaries on purpose: an HTTP response body and a
    // GraphQL payload are `any`, and inspecting them is the whole point of an e2e. The
    // `any`-safety rules stay fully in force for `src/**` production code.
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // Passing a mock's method to `expect()` is how a call is asserted.
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);
