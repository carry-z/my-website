"use client";
import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';

// 定义通用的动画变体
// 1. 修改后的 fadeInUp 定义
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } 
  }
};

// 2. 顺便把 staggerContainer 也改一下，确保万无一失
const staggerContainer: Variants = {
  visible: {
    transition: {
      staggerChildren: 0.1 
    }
  }
};


export default function PersonalWebsiteHomepage() {
  const photos = [
    { url: "/images/photography/DSC08477.jpg", title: "城市夜色", description: "在光影和秩序之间，捕捉城市最安静的一面。" },
    { url: "/images/photography/P1179397.jpg", title: "路途切片", description: "把经过的风景留下，也把当时的心绪保存下来。" },
    { url: "/images/photography/P1179425.jpg", title: "日常取景", description: "从看似普通的瞬间里，找到值得停留的构图。" },
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
            <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight md:text-6xl">
              <span className="block whitespace-nowrap">以探针触及光电前沿，</span>
              <span className="block whitespace-nowrap">用镜头记录共和国故事。</span>
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
            <div className="aspect-[4/5] overflow-hidden rounded-[3rem] shadow-2xl shadow-neutral-500/10 bg-white p-4 md:aspect-[3/4]">
              <div className="relative h-full w-full rounded-[2rem] overflow-hidden">
                <Image
                  src="/images/gr.png"
                  alt="Hero photograph"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-[center_20%] transition-transform duration-700 group-hover:scale-105"
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

        <section id="photography" className="bg-neutral-50">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="mx-auto max-w-7xl px-6 py-28 md:px-10"
          >
            <motion.div variants={fadeInUp} className="mb-16 max-w-3xl">
              <p className="text-sm uppercase tracking-[0.25em] font-medium text-neutral-500">Photography</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">摄影作品</h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-600">
                这些照片来自我日常的观察与记录。它们不只是画面，也是一段时间里我看待世界的方式。
              </p>
            </motion.div>
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {photos.map((photo) => (
                <motion.figure
                  key={photo.url}
                  variants={fadeInUp}
                  className="group overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-lg shadow-neutral-900/5"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={photo.url}
                      alt={photo.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <figcaption className="space-y-3 px-6 py-6">
                    <h3 className="text-xl font-semibold tracking-tight text-neutral-900">{photo.title}</h3>
                    <p className="text-sm leading-relaxed text-neutral-600">{photo.description}</p>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </motion.div>
        </section>
        
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
