import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next dev가 저장소 루트에 AGENTS.md를 자동 생성하지 않도록 끈다.
  agentRules: false,
};

export default nextConfig;
