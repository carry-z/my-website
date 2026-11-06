const navItems = [
  ["关于我", "#about"],
  ["科研", "#research"],
  ["实验记录", "/lab"],
  ["摄影", "#photography"],
  ["联系方式", "#contact"],
];

const aboutCards = [
  {
    title: "身份",
    text: "材料科学研究者，也持续练习清晰、准确而有温度的表达。",
    meta: "Materials",
  },
  {
    title: "兴趣",
    text: "研究、写作与摄影。在实验之外，用文字和影像保存真实的感受。",
    meta: "Writing & Images",
  },
  {
    title: "方向",
    text: "让科研的理性、表达的温度与视觉的秩序，在长期创作中彼此照亮。",
    meta: "Portfolio",
  },
];

const architecturePhotos = [
  ["湖南大学校碑", "/images/photography/architecture/hunan_university_stone_sign.jpg"],
  ["特藏分馆", "/images/photography/architecture/hunan_university_red_building_front.jpg"],
  ["东方红广场", "/images/photography/architecture/campus_statue_square.jpg"],
  ["冬日的爱晚亭", "/images/photography/architecture/aiwan_pavilion_winter.jpg"],
  ["大成殿建筑", "/images/photography/architecture/dacheng_hall.jpg"],
  ["孔庙", "/images/photography/architecture/hunan_university_courtyard.jpg"],
  ["沁园春长沙诗词", "/images/photography/architecture/hunan_university_gate.jpg"],
  ["绿荫红楼", "/images/photography/architecture/red_brick_building_garden.jpg"],
  ["红砖建筑", "/images/photography/architecture/red_brick_building.jpg"],
  ["书院雪景", "/images/photography/architecture/seek_truth_building.jpg"],
  ["秋日操场", "/images/photography/architecture/sports_field_autumn.jpg"],
  ["岳麓书院大门", "/images/photography/architecture/yuelu_academy_entrance.jpg"],
  ["春日岳麓书院", "/images/photography/architecture/yuelu_academy_spring_gate.jpg"],
  ["岳麓书院正门", "/images/photography/architecture/yuelu_academy_front_wide.jpg"],
  ["岳麓书院门庭", "/images/photography/architecture/yuelu_academy_gate_layers.jpg"],
  ["书院讲堂前坪", "/images/photography/architecture/yuelu_academy_hall_courtyard.jpg"],
  ["御书阁", "/images/photography/architecture/yuelu_academy_tree_framed_hall.jpg"],
  ["时物轩", "/images/photography/architecture/yuelu_academy_sunny_roofline.jpg"],
  ["胜利斋", "/images/photography/architecture/campus_rooftop_courtyard.jpg"],
  ["山景校园庭院", "/images/photography/architecture/campus_courtyard_mountain_view.jpg"],
  ["自卑亭", "/images/photography/architecture/zibei_pavilion.jpg"],
  ["樱花与现代建筑", "/images/photography/nature/cherry_blossoms_modern_building.jpg"],
  ["林中的传统建筑", "/images/photography/nature/traditional_buildings_forest.jpg"],
];

const naturePhotos = [
  ["桂花与屋檐", "/images/photography/nature/osmanthus_roof_bokeh.jpg"],
  ["春日紫藤", "/images/photography/nature/wisteria_spring.jpg"],
  ["粉色樱花", "/images/photography/nature/pink_cherry_blossoms.jpg"],
  ["粉色花朵与建筑", "/images/photography/nature/pink_blossoms_building.jpg"],
  ["梅花特写", "/images/photography/nature/plum_blossoms_closeup.jpg"],
  ["黄色花朵与墙面", "/images/photography/nature/yellow_flowers_wall.jpg"],
];

const contacts = [
  ["小红书", "麓山南路88号", "note"],
  ["抖音", "carry", "douyin"],
  ["微博", "风云日记_", "weibo"],
  ["邮箱", "fu_zeng99@163.com", "mail"],
];

function Icon({ type }) {
  if (type === "mail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2.5" />
        <path d="M5.5 8.5 12 13l6.5-4.5" />
      </svg>
    );
  }

  if (type === "douyin") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 4v9.2a3.8 3.8 0 1 1-2.8-3.66" />
        <path d="M14 6.2c.8 1.9 2.3 3.3 4.2 4" />
      </svg>
    );
  }

  if (type === "weibo") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.1 17.5c-2.6 0-4.7-1.5-4.7-3.5 0-2.2 2.5-4.1 5.6-4.1 2.7 0 4.3 1.2 4.3 2.9 0 2.6-2.5 4.7-5.2 4.7Z" />
        <path d="M15.5 8.2c1.6.2 3 1.5 3.2 3.1" />
        <path d="M14.8 5.4c2.6.3 4.7 2.4 5 5" />
        <circle cx="9.4" cy="13.7" r="0.9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="4" />
      <path d="M7 9.5H11" />
      <path d="M7 13H10" />
      <path d="M13.5 10L17 13.5" />
      <path d="M17 10L13.5 13.5" />
    </svg>
  );
}

function PhotoGrid({ title, photos }) {
  return (
    <section className="photo-section">
      <div className="section-rule">
        <h3>{title}</h3>
        <span />
      </div>
      <div className="photo-columns">
        {photos.map(([alt, src]) => (
          <figure className="photo-card" key={src}>
            <img src={src} alt={alt} loading="lazy" />
            <figcaption>{alt}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#home">
            Carry
          </a>
          <nav>
            {navItems.map(([label, href]) => (
              <a href={href} key={href}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-copy reveal">
            <p className="eyebrow">Personal Website</p>
            <h1>
              <span>以探针探索光电前沿，</span>
              <span>用镜头记录时代故事。</span>
            </h1>
            <p className="lead">
              你好，我是 Carry。这里收录我的科研探索、文字思考与摄影作品，也记录我理解世界的方式。
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#research">
                查看科研 <span>→</span>
              </a>
              <a className="secondary-button" href="#about">
                了解我
              </a>
            </div>
            <div className="hero-notes" aria-label="网站内容概览">
              <span>Research</span>
              <span>Photography</span>
              <span>Writing</span>
            </div>
          </div>

          <div className="hero-media reveal">
            <div className="hero-frame">
              <img src="/images/laboratory_scene.png" alt="实验室场景" />
            </div>
            <div className="focus-card">
              <p>Research Focus</p>
              <strong>Conductive Polymers & Photovoltaics</strong>
            </div>
          </div>
        </section>

        <section className="about" id="about">
          <div className="section-heading centered reveal">
            <p className="eyebrow">About Me</p>
            <h2>在科研与表达之间</h2>
          </div>
          <div className="about-grid">
            {aboutCards.map((card, index) => (
              <article className="about-card reveal" key={card.title}>
                <span className="card-number">{String(index + 1).padStart(2, "0")}</span>
                <p className="card-meta">{card.meta}</p>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="research" id="research">
          <div className="section-heading reveal">
            <p className="eyebrow">Research</p>
            <h2>科研</h2>
            <p>关注材料科学与光电领域，收录近期成果与代表性论文。</p>
          </div>
          <a
            className="paper-card reveal"
            href="https://pubs.acs.org/doi/10.1021/jacs.5c17758"
            target="_blank"
            rel="noreferrer"
          >
            <div className="paper-image">
              <img src="/images/photography/paper.PNG" alt="科研论文截图" />
            </div>
            <div>
              <p className="eyebrow">Paper</p>
              <h3>JACS 代表性论文</h3>
              <p>点击进入期刊页面，查看论文摘要与完整内容。</p>
              <span className="text-link">查看论文 →</span>
            </div>
          </a>
        </section>

        <section className="photography" id="photography">
          <div className="section-heading reveal">
            <p className="eyebrow">Photography</p>
            <h2>摄影作品</h2>
            <p>行走于校园与山水之间，用影像保存建筑、季节和光线。</p>
          </div>
          <PhotoGrid title="建筑" photos={architecturePhotos} />
          <PhotoGrid title="自然" photos={naturePhotos} />
        </section>

        <section className="contact" id="contact">
          <div className="contact-panel">
            <div className="section-heading reveal">
              <p className="eyebrow">Contact</p>
              <h2>联系方式</h2>
              <p>欢迎与我交流科研、摄影与写作，也欢迎分享新的想法。</p>
            </div>
            <div className="contact-grid">
              {contacts.map(([label, value, type]) => (
                <div className="contact-item reveal" key={label}>
                  <span className="contact-icon">
                    <Icon type={type} />
                  </span>
                  <div>
                    <p>{label}</p>
                    <strong>{value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer>© 2026 Carry. Built with passion for research, writing, and photography.</footer>
    </div>
  );
}
