import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// Configuración plana (ESLint 9+). El proyecto usa TypeScript estricto en
// tsconfig.json; aquí solo se suman reglas que el compilador no puede detectar.
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src-tauri/target/**',
      '.tauri_data/**',
      'src-tauri/.tauri_data/**',
      'legacy_python/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
