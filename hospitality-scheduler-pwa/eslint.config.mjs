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
      "**/debug/**",
      "**/test-notification/**",
      "src/app/debug/**",
      "src/app/test-notification/**",
      "src/components/debug/**",
      "**/FirebaseTestComponent.tsx"
    ]
  }
];

export default eslintConfig;
