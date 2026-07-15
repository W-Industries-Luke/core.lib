// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default tseslint.config(
  {
    // Build output, published artifacts and the vendored Storybook bundle are
    // not sources — linting them is noise, and `storybook-static` is minified.
    ignores: ['dist/**', 'out-tsc/**', 'storybook-static/**', 'projects/ui/documentation.json'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'ui', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'ui', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // `.storybook/preview-head.html` is a raw <head> fragment, not an Angular
    // template. Parsing it as one is meaningless, so keep the template rules
    // pointed at real component templates only.
    ignores: ['**/.storybook/**'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
);
