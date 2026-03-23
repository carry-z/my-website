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

function PlatformIcon({ platform }: { platform: string }) {
  const commonProps = {
    className: "h-5 w-5",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  switch (platform) {
    case "xiaohongshu":
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="14" rx="4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 9.5H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 13H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M13.5 10L17 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17 10L13.5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "douyin":
      return (
        <svg {...commonProps}>
          <path d="M14 4v9.2a3.8 3.8 0 1 1-2.8-3.66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 6.2c.8 1.9 2.3 3.3 4.2 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "weibo":
      return (
        <svg {...commonProps}>
          <path d="M9.1 17.5c-2.6 0-4.7-1.5-4.7-3.5 0-2.2 2.5-4.1 5.6-4.1 2.7 0 4.3 1.2 4.3 2.9 0 2.6-2.5 4.7-5.2 4.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M15.5 8.2c1.6.2 3 1.5 3.2 3.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M14.8 5.4c2.6.3 4.7 2.4 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="9.4" cy="13.7" r="0.9" fill="currentColor" />
        </svg>
      );
    case "email":
      return (
        <svg {...commonProps}>
          <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5.5 8.5 12 13l6.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}


export default function PersonalWebsiteHomepage() {
  const photographyGroups = [
    {
      title: "建筑",
      photos: [
        { url: "/images/photography/architecture/aiwan_pavilion_winter.jpg", alt: "冬日的爱晚亭", width: 5328, height: 4000 },
        { url: "/images/photography/architecture/dacheng_hall.jpg", alt: "大成殿建筑", width: 5328, height: 4000 },
        { url: "/images/photography/architecture/hunan_university_courtyard.jpg", alt: "湖南大学庭院", width: 8640, height: 5760 },
        { url: "/images/photography/architecture/hunan_university_gate.jpg", alt: "湖南大学校门", width: 2732, height: 4096 },
        { url: "/images/photography/architecture/red_brick_building.jpg", alt: "红砖建筑", width: 4000, height: 6000 },
        { url: "/images/photography/architecture/seek_truth_building.jpg", alt: "求是楼", width: 5328, height: 4000 },
        { url: "/images/photography/architecture/sports_field_autumn.jpg", alt: "秋日操场", width: 6000, height: 4000 },
        { url: "/images/photography/architecture/yuelu_academy_entrance.jpg", alt: "岳麓书院入口", width: 5578, height: 3719 },
        { url: "/images/photography/architecture/zibei_pavilion.jpg", alt: "自卑亭", width: 6000, height: 4000 },
      ],
    },
    {
      title: "自然",
      photos: [
        { url: "/images/photography/nature/cherry_blossoms_modern_building.jpg", alt: "樱花与现代建筑", width: 5328, height: 4000 },
        { url: "/images/photography/nature/pink_blossoms_building.jpg", alt: "粉色花朵与建筑", width: 5328, height: 4000 },
        { url: "/images/photography/nature/plum_blossoms_closeup.jpg", alt: "梅花特写", width: 8640, height: 5760 },
        { url: "/images/photography/nature/traditional_buildings_forest.jpg", alt: "林中的传统建筑", width: 2731, height: 4096 },
        { url: "/images/photography/nature/yellow_flowers_wall.jpg", alt: "黄色花朵与墙面", width: 5328, height: 4000 },
      ],
    },
  ];

  const contactMethods = [
    { platform: "xiaohongshu", label: "小红书", value: "麓山南路88号" },
    { platform: "douyin", label: "抖音", value: "carry" },
    { platform: "weibo", label: "微博", value: "风云日记_" },
    { platform: "email", label: "邮箱", value: "fu_zeng99@163.com" },
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
                  src="/images/laboratory_scene.png"
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
            <motion.div variants={fadeInUp} className="mb-20 max-w-3xl">
              <p className="text-sm uppercase tracking-[0.25em] font-medium text-neutral-500">Photography</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">摄影作品</h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-600">
                按两组主题整理呈现，保留画面本身的节奏与留白。
              </p>
            </motion.div>
            <div className="space-y-20">
              {photographyGroups.map((group) => (
                <motion.section key={group.title} variants={fadeInUp}>
                  <div className="mb-8 flex items-center gap-4">
                    <h3 className="text-2xl font-semibold tracking-tight text-neutral-900">{group.title}</h3>
                    <div className="h-px flex-1 bg-neutral-200" />
                  </div>
                  <div className="columns-1 gap-6 md:columns-2 xl:columns-3">
                    {group.photos.map((photo) => (
                      <div
                        key={photo.url}
                        className="group mb-6 break-inside-avoid overflow-hidden rounded-[1.75rem] bg-white shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200/80"
                      >
                        <Image
                          src={photo.url}
                          alt={photo.alt}
                          width={photo.width}
                          height={photo.height}
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.02]"
                        />
                      </div>
                    ))}
                  </div>
                </motion.section>
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
            variants={staggerContainer}
            className="rounded-[3rem] bg-neutral-950 px-10 py-16 text-white md:px-20 md:py-24"
          >
            <motion.div variants={fadeInUp} className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.25em] font-medium text-white/55">Contact</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">联系方式</h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65">
                欢迎通过这些平台找到我。研究、摄影、写作和日常记录，都可以在不同的地方相遇。
              </p>
            </motion.div>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {contactMethods.map((item) => (
                <motion.div
                  key={item.label}
                  variants={fadeInUp}
                  className="group flex items-center gap-4 rounded-[2rem] border border-white/10 bg-white/6 px-5 py-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <PlatformIcon platform={item.platform} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/55">{item.label}</p>
                    <p className="mt-1 truncate text-base font-semibold tracking-tight text-white">{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-neutral-100 bg-white px-6 py-10 text-center text-sm text-neutral-500">
        © 2026 Carry. Built with passion for research, writing, and photography.
      </footer>
    </div>
  );
}
