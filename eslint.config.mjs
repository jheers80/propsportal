import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "with-turbopack-app/.next/**",
    ],
    rules: {
      // Temporarily relax strict any checks to allow incremental typing
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow unescaped entities in some admin text fields for now
      'react/no-unescaped-entities': 'off',
      // Disallow default imports from the API helpers module to force named imports
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/apiPost',
              importNames: ['default'],
              message: 'Import named exports from "@/lib/apiPost" (e.g. { apiPost, apiGet }) instead of the default export.'
            }
          ]
        }
      ],
    },
  },
];

export default eslintConfig;
