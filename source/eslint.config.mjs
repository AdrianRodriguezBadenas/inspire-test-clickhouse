import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import jest from 'eslint-plugin-jest';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { readdirSync, existsSync } from 'node:fs';

// `eslint-plugin-import-x`, not `eslint-plugin-import`: the latter declares peer support
// only through eslint 9 and this project is on 10, so installing it would have needed
// --legacy-peer-deps — silencing a real incompatibility to satisfy a rule about not
// silencing things. import-x is the maintained fork, same rules under the `import-x/`
// prefix. The nestjs profile is updated to name it.

// The layers, innermost first. A layer may import anything to its right (inward) and
// nothing to its left (outward) — that single ordering generates every zone below, so the
// boundary is stated once instead of once per pair.
const LAYERS = ['controllers', 'application', 'infrastructure', 'domain'];

const WHY = {
  'domain<-application':
    'domain/ is pure types and rules — it may not import the application layer. Invert the dependency: pass what it needs in.',
  'domain<-infrastructure':
    'domain/ may not import infrastructure. Persistence is an outward detail; the domain defines the shape, infrastructure maps to it.',
  'domain<-controllers': 'domain/ may not import controllers. Nothing inward depends on a transport.',
  'infrastructure<-application':
    'infrastructure/ may not import the application layer — a repository does not call a service.',
  'infrastructure<-controllers': 'infrastructure/ may not import controllers.',
  'application<-controllers':
    'application/ may not import controllers — a service that knows its transport cannot be reused by another.',
  'controllers<-infrastructure':
    'controllers/ may not reach infrastructure directly — go through the application layer, which is where the business logic lives.',
};

const MODULES = readdirSync('./src', { withFileTypes: true })
  .filter((d) => d.isDirectory() && LAYERS.some((l) => existsSync(`./src/${d.name}/${l}`)))
  .map((d) => d.name);

const LAYER_ZONES = MODULES.flatMap((m) =>
  Object.entries(WHY).flatMap(([pair, message]) => {
    const [target, from] = pair.split('<-');
    return existsSync(`./src/${m}/${target}`) && existsSync(`./src/${m}/${from}`)
      ? [{ target: `./src/${m}/${target}`, from: `./src/${m}/${from}`, message }]
      : [];
  }),
);

if (LAYER_ZONES.length === 0) {
  // A boundary rule with no zones is a rule that passes on everything. If the layout ever
  // stops matching LAYERS, fail loudly here rather than lint clean and prove nothing.
  throw new Error(
    'eslint.config.mjs: no layer zones derived from ./src — the layering rule would enforce nothing. Check LAYERS against the directory names.',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local rule: a test must not import a NUMERIC constant from the code it tests.
//
// This is the mechanical half of CLAUDE.md's second non-negotiable — "never build the
// expected value from the code under test". A threshold imported into a test makes the
// test move with the code: change `MAX_CONDITION_DEPTH` from 10 to 11 and
// `nested(MAX_CONDITION_DEPTH + 1)` follows it, the interpolated message follows it, and
// the suite stays green while the limit a caller can observe has changed. Measured: that
// exact mutation survived nine tests.
//
// The mutation drill catches this, but only after the fact and only if someone runs it —
// and it cannot tell a weak test from a *shortcut fix* to a weak test. Lint catches it at
// the moment of writing, which is the only time it is cheap.
//
// Scoped to NUMBERS on purpose, decided by the type checker rather than by naming:
//   - A number is a threshold, a size, a cap. Its value is behaviour a caller observes, so
//     a test must state it as a literal.
//   - A string / object / array constant is usually a registry or a schema — the field list
//     a DDL is generated from, a table name. Deriving from those is the point; hard-coding
//     forty field names would duplicate the source of truth and rot.
//
// Escape hatch: an ordinary eslint-disable, which this config already requires to carry a
// written reason and which the escape-hatch ratchet counts.
// ─────────────────────────────────────────────────────────────────────────────
const noNumericConstantFromUnitUnderTest = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow importing a numeric constant into a test file' },
    schema: [],
    messages: {
      imported:
        "Do not import the numeric constant '{{name}}' into a test — the test would move with the code when its value changes. State the number as a literal in the test instead (see CLAUDE.md, rule 2).",
    },
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    if (!services?.program) return {};
    const checker = services.program.getTypeChecker();

    const isNumeric = (node) => {
      try {
        const tsNode = services.esTreeNodeToTSNodeMap.get(node);
        if (!tsNode) return false;
        const type = checker.getTypeAtLocation(tsNode);
        // NumberLike covers `number`, numeric literal types and numeric enums. A union is
        // numeric only if every member is — `number | undefined` still reads as a threshold.
        const parts = type.isUnion() ? type.types : [type];
        return parts.every((t) => (t.flags & 296) !== 0); // Number | NumberLiteral | Enum
      } catch {
        return false;
      }
    };

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== 'string' || !node.source.value.startsWith('.')) return;
        for (const spec of node.specifiers) {
          if (spec.type !== 'ImportSpecifier') continue;
          if (node.importKind === 'type' || spec.importKind === 'type') continue;
          if (!isNumeric(spec.local)) continue;
          context.report({ node: spec, messageId: 'imported', data: { name: spec.local.name } });
        }
      },
    };
  },
};

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  comments.recommended,
  {
    rules: {
      // NOT in the plugin's `recommended` set — that enables five rules and none of them
      // is this one, so relying on the preset would have left the profile's promise
      // unenforced. A suppression must name its rule and say why...
      '@eslint-community/eslint-comments/require-description': [
        'error',
        { ignore: [] },
      ],
      // ...and a suppression that no longer suppresses anything is a fossil, not history.
      '@eslint-community/eslint-comments/no-unused-disable': 'error',
    },
  },
  {
    plugins: { 'import-x': importX },
    // Without a TypeScript resolver, import-x cannot resolve a single relative `.ts`
    // import — measured: 77 of them — and both rules below skip what they cannot resolve.
    // They then pass on everything, for ever, while appearing to be enforced. Found by
    // deliberately violating the boundary and watching nothing happen; `no-unresolved`
    // turned on temporarily is what named the cause.
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: './tsconfig.json' })],
    },
    rules: {
      // A cycle is the failure mode that makes a layer boundary meaningless: two modules
      // that import each other are one module with extra steps.
      'import-x/no-cycle': ['error', { maxDepth: Infinity }],

      // The four-layer boundary from the profile's `## Layering`, as a build error rather
      // than a review comment. Direction: controllers → application → infrastructure,
      // and `domain/` imports nothing from the layers above it.
      //
      // Targets are globbed per module (`src/*/domain`, not `src/analytics/domain`) so a
      // second module inherits the boundary instead of quietly escaping it.
      // The four-layer boundary from the profile's `## Layering`, as a build error rather
      // than a review comment. Allowed direction: controllers -> application ->
      // infrastructure -> domain; `domain/` imports nothing from the layers above it.
      //
      // Zones are DERIVED from the modules on disk, not written per module and not
      // globbed. Measured: `target: './src/*/domain'` matches nothing in import-x 4.17 —
      // the rule stays silent and the boundary is decoration. Hard-coding
      // `./src/analytics/...` works but lets the second module escape the boundary the
      // day it is added, unnoticed, which is the same failure one level along. Reading
      // the directory means a new module inherits the rule by existing.
      'import-x/no-restricted-paths': ['error', { zones: LAYER_ZONES }],
    },
  },
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
    plugins: {
      jest,
      local: { rules: { 'no-numeric-constant-from-unit-under-test': noNumericConstantFromUnitUnderTest } },
    },
    rules: {
      // See the rule's own comment above: this is the lint half of CLAUDE.md rule 2.
      'local/no-numeric-constant-from-unit-under-test': 'error',

      // The characteristic failure of a generated test: it runs the new code and asserts
      // nothing, so it passes CI while proving nothing. This is the mechanical half of
      // what the mutation drill checks by hand — a test that claims an acceptance
      // criterion with `@covers` and asserts nothing would otherwise satisfy
      // criteria-have-tests.sh while pinning no behaviour at all.
      'jest/expect-expect': 'error',

      // A skipped or focused test is a silent hole: the first stops running, the second
      // stops everything else from running. Both pass.
      'jest/no-disabled-tests': 'error',
      'jest/no-focused-tests': 'error',

      // An assertion inside an `if` may simply not execute, which is a green test that
      // asserted nothing on the path that mattered.
      'jest/no-conditional-expect': 'error',

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
