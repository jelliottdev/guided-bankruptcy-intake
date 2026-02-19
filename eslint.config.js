import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'build/**',
      'assets/**',
      'material-ui/**',
      '**/assets/*.js',
      '**/assets/*.css',
      'node_modules/**',
      '*.config.js',
      '*.config.ts',
      '*.timestamp-*.mjs',
      'vite.config.ts.timestamp-*.mjs',
      'reference_repos/**',
      'scripts/**',
      'docs/**',
      'backend/**',
      '**/venv/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true, allowExportNames: ['useIntake'] }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  }
);
