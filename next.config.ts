import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell next/jest to transform these ESM-only packages during tests.
  // They are msw v2 dependencies that ship as ES modules and cannot be
  // required directly by Jest's CommonJS runtime without transformation.
  // This list has no effect on the production bundle because these packages
  // are only imported by test files (jest.setup.ts, __tests__/mocks/).
  transpilePackages: [
    "msw",
    "@mswjs/interceptors",
    "rettime",
    "headers-polyfill",
    "@open-draft/deferred-promise",
    "until-async",
    "outvariant",
    "strict-event-emitter",
    "is-node-process",
    "nanoid",
  ],
};

export default nextConfig;
