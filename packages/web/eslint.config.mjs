import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Design Ref: §9.3 Cross-Package Import Rules
// packages/web 은 @simple-note/renderer 에서 오직 domain/* 와 types/* 만 import.
// store/*, components/*, utils/*, App/platform 진입점은 Tauri/DOM 의존이므로 금지.
//
// NOTE: no-restricted-imports `patterns.group` 은 gitignore 스타일이라
// "@simple-note/renderer" 단독으로 쓰면 하위 경로까지 모두 매칭됨.
// exact 차단은 `paths` 옵션(name) 사용, 글롭 차단은 `patterns.group` 사용.

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@simple-note/renderer",
              message:
                "packages/web 은 renderer 의 App 진입점을 import 할 수 없다 — 허용 경로: @simple-note/renderer/{domain,types}/*",
            },
            {
              name: "@simple-note/renderer/platform",
              message:
                "packages/web 은 renderer/platform 을 import 할 수 없다 (Tauri invoke) — 허용 경로: @simple-note/renderer/{domain,types}/*",
            },
          ],
          patterns: [
            {
              group: ["@simple-note/renderer/store/*"],
              message:
                "packages/web 은 renderer/store 를 import 할 수 없다 (Tauri 환경 가정). web/ 자체 store 를 만들어라.",
            },
            {
              group: ["@simple-note/renderer/components/*"],
              message:
                "packages/web 은 renderer/components 를 import 할 수 없다 (DOM/Tauri 의존). 필요하면 web/components/ 에 포팅하라.",
            },
            {
              group: ["@simple-note/renderer/utils/*"],
              message:
                "packages/web 은 renderer/utils 를 import 할 수 없다 (환경 의존 가능). 순수 함수는 renderer/domain/ 으로 옮긴 뒤 사용하라.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
