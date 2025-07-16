import { configs as tsConfigs, config as tsConfig } from 'typescript-eslint';
import js from '@eslint/js';

export default tsConfig({
  extends: [
    js.configs.recommended,  
    tsConfigs.recommended   
  ],
  rules: {
    'no-console': 'warn',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    '@typescript-eslint/no-magic-numbers': ['error', { ignoreArrayIndexes: true }],
    '@typescript-eslint/no-explicit-any': 'warn'
  }
});
