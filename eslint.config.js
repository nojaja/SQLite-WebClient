const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const vueParser = require('vue-eslint-parser');
const vuePlugin = require('eslint-plugin-vue');
const sonarjsPlugin = require('eslint-plugin-sonarjs');
const jsdocPlugin = require('eslint-plugin-jsdoc');

const commonRules = {
  'sonarjs/cognitive-complexity': ['error', 10],
  'jsdoc/require-jsdoc': ['error', {
    require: {
      FunctionDeclaration: true,
      MethodDefinition: true,
      ClassDeclaration: true,
      ArrowFunctionExpression: true,
      FunctionExpression: true,
    },
  }],
  'jsdoc/require-param': 'warn',
  'jsdoc/require-returns': 'warn',
};

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'docs/typedoc-md/**',
      'jest.unit.config.js',
      'jest.coverage.config.js',
      'jest.e2e.config.js',
      'eslint.config.js',
      'typedoc.js',
      '.dependency-cruiser.js',
      'webpack.config.js',
      'playwright.config.ts',
      'tests/**',
    ],
  },
  // TypeScript ソースファイル
  {
    files: ['src/js/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      sonarjs: sonarjsPlugin,
      jsdoc: jsdocPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn'],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-unused-vars': 'off',
      ...commonRules,
    },
  },
  // Vue SFC ファイル
  {
    files: ['src/js/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      vue: vuePlugin,
      '@typescript-eslint': tsPlugin,
      sonarjs: sonarjsPlugin,
      jsdoc: jsdocPlugin,
    },
    rules: {
      'vue/multi-word-component-names': 'warn',
      'sonarjs/cognitive-complexity': ['error', 10],
    },
  },
];
