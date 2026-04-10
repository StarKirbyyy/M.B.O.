import Week1Demo from "@/app/components/week1-demo";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50 to-white">
      <section className="mx-auto w-full max-w-5xl px-4 pt-10 md:px-8">
        <p className="inline-flex rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold tracking-wide text-sky-800">
          City Flaneur Agent · Week 3
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          城市深度游助手：最小可运行原型
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
          目标是先打通课程作业的核心链路：模糊需求输入、目标澄清、外部工具调用、初始计划生成与状态流转展示。
        </p>
      </section>

      <Week1Demo />
    </main>
  );
}
