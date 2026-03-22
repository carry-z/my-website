"use client";
import { motion } from 'framer-motion';

// 定义通用的动画变体
// 1. 修改后的 fadeInUp 定义
const fadeInUp: any = { // 这里加个 : any，告诉 TypeScript “别管这个数组的死活”
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } 
  }
};

// 2. 顺便把 staggerContainer 也改一下，确保万无一失
const staggerContainer: any = {
  visible: {
    transition: {
      staggerChildren: 0.1 
    }
  }
};


export default function PersonalWebsiteHomepage() {
  const articles = [
    { title: "导电聚合物研究笔记", date: "2026.03", summary: "记录关于材料、实验与科研表达的一些思考。" },
    { title: "写在校园光影之间", date: "2026.02", summary: "用文字保存日常，用镜头记录校园与生活。" },
    { title: "关于表达与创作", date: "2026.01", summary: "在研究之外，也持续摄影与内容创作。" },
  ];

  const photos = [
    { url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80", title: "校园光影", description: "记录清晨、黄昏与日常之间流动的光。" },
    { url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1600&q=80", title: "山水之间", description: "将自然、路径与远方收进同一张画面。" },
    { url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80", title: "安静时刻", description: "在风景里寻找情绪，也在情绪里构图。" },
  ];

  return (
    // 优化：添加 smooth scrolling 支持
    <div className="min-h-screen bg-neutral-50 text-neutral-900 scroll-smooth">
      <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <a href="#home" className="text-xl font-bold tracking-tight hover:opacity-70 transition-opacity">
            Carry
          </a>
          <nav className="hidden gap-9 text-sm font-medium md:flex text-neutral-700">
            {['关于我', '文章', '摄影', '联系方式'].map((item, index) => (
              <a key={index} href={`#${['about', 'writing', 'photography', 'contact'][index]}`} className="relative group py-1">
                {item}
                {/* 优化：添加优雅的 hover 下划线动画 */}
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-900 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left"></span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="home">
        {/* Hero Section: 优化布局与文案呼应 */}
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-2 md:py-32 md:px-10 items-center"
        >
          <motion.div variants={fadeInUp} className="flex flex-col justify-center">
            <p className="mb-5 text-xs uppercase tracking-[0.3em] font-semibold text-neutral-500">
              Personal Website
            </p>
            <h1 className="max-w-xl text-5xl font-extrabold leading-[1.15] tracking-tight md:text-7xl">
              以探针触及光电前沿，
              <br />
              用镜头记录共和国故事。
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-neutral-600">
              你好，我是 Carry。这里是我的个人网站，用来展示我的研究兴趣、文字记录、摄影作品，以及与世界建立联系的方式。
            </p>
            <div className="mt-12 flex flex-wrap gap-5">
              <a href="#writing" className="group rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-neutral-800 hover:shadow-lg hover:shadow-neutral-900/10">
                查看文章 <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a href="#about" className="rounded-full border border-neutral-200 px-8 py-3.5 text-sm font-semibold transition hover:bg-neutral-100 hover:border-neutral-300">
                了解我
              </a>
            </div>
          </motion.div>

          {/* 优化：增加科研视觉元素 - 探针与微观结构 */}
          <motion.div variants={fadeInUp} className="relative group">
            <div className="aspect-[1/1] overflow-hidden rounded-[3rem] shadow-2xl shadow-neutral-500/10 bg-white p-4">
              <div className="relative h-full w-full rounded-[2rem] overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1581091870617-1f6a0a030f2f?auto=format&fit=crop&w=1200&q=80" // 替换为类似实验室、纳米结构的图片
                  alt="STM Probe" 
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* 叠加层：用于模拟光电材料的能级感 */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 mix-blend-multiply"></div>
              </div>
            </div>
            
            <div className="absolute -bottom-10 -left-10 rounded-[2rem] border border-neutral-100 bg-white/95 p-6 shadow-xl backdrop-blur-sm transition-transform group-hover:-translate-y-2">
              <p className="text-xs uppercase tracking-widest text-neutral-400">Research Focus</p>
              <p className="mt-2.5 text-base font-semibold text-neutral-900">
                Conducive Polymers & Photovoltaics
              </p>
            </div>
          </motion.div>
        </motion.section>

        {/* About Section: 增加视差滚动感 (可选，这里用 Framer Motion 模拟) */}
        <section id="about" className="bg-white border-y border-neutral-100">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            className="mx-auto max-w-7xl px-6 py-28 md:px-10"
          >
            <motion.div variants={fadeInUp} className="mb-16 max-w-3xl text-center mx-auto">
              <p className="text-sm uppercase tracking-[0.25em] font-medium text-neutral-500">About Me</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">科研与表达的交汇点</h2>
            </motion.div>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { title: '身份', content: '材料科学、科研表达与个人创作的学习者。' },
                { title: '兴趣', content: '研究、写作、摄影、设计。在实验之外，用文字和影像保存真实的感受。' },
                { title: '方向', content: '构建一个将科研的理性、表达的温度与审美的秩序融合的长期作品集。' },
              ].map((item, index) => (
                <motion.div key={index} variants={fadeInUp} className="rounded-3xl border border-neutral-100 bg-neutral-50 p-8 shadow-inner transition-colors hover:border-neutral-200">
                  <div className="h-12 w-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white mb-6 text-xl font-bold">
                    0{index + 1}
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-5 text-base leading-relaxed text-neutral-600">{item.content}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Writing & Photography sections would follow the same animation patterns */}
        
        {/* Contact Section: 增加卡片浮动感 */}
        <section id="contact" className="mx-auto max-w-7xl px-6 py-24 md:px-10">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeInUp}
            className="rounded-[3rem] bg-neutral-950 px-10 py-16 text-white md:px-20 md:py-24"
          >
            {/* ... section content remains similar but with updated padding/radius ... */}
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-neutral-100 bg-white px-6 py-10 text-center text-sm text-neutral-500">
        © 2026 Carry. Built with passion for research, writing, and photography.
      </footer>
    </div>
  );
}