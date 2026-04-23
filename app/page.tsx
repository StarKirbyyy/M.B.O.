import CityAgentConsole from "@/app/components/city-agent-console";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50 to-white">
      <section className="mx-auto w-full max-w-5xl px-4 pt-10 md:px-8">
        <p className="inline-flex rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold tracking-wide text-sky-800">
          City Flaneur Agent · Runtime
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          城市深度游助手：Agent Runtime 控制台
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
          基于统一 run / event 协议展示目标澄清、工具调用、动态规划、自我修正和评测预埋结果。
        </p>
      </section>

      <CityAgentConsole />
    </main>
  );
}
