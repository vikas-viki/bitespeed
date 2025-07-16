import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['src/prisma/**'],
  },
  ...tseslint.configs.recommended,
  {
    ...js.configs.recommended,
    rules: {
      'no-console': 'warn',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
];
