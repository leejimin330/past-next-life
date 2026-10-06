import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 시나리오 라이브러리는 런타임에 fs로 읽으므로 배포 번들에 명시적으로 포함한다.
  outputFileTracingIncludes: {
    "/api/scenario/*": ["./data/scenario-lib/**/*.json"],
  },
};

export default nextConfig;
