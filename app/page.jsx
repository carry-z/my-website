import { categories, originalPaperId, photoUrl } from "../lib/site-content.mjs";
import { publicSiteContent } from "../lib/site-content.server.mjs";

export const dynamic = "force-dynamic";

const navItems = [
  ["关于我", "#about"],
  ["科研", "#research"],
  ["实验工作台", "/lab"],
  ["摄影", "#photography"],
  ["联系方式", "#contact"],
  ["网站管理", "/admin/site"],
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
        {photos.map((photo) => (
          <figure className="photo-card" key={photo.id}>
            <img src={photoUrl(photo)} alt={photo.caption} loading="lazy" />
            <figcaption>{photo.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export default async function Home() {
  const content = await publicSiteContent();
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
              {content.intro}
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
          <div className="paper-list">
          {content.papers.map(paper => <a
            key={paper.id}
            className="paper-card reveal"
            href={paper.link}
            target="_blank"
            rel="noreferrer"
          >
            {paper.id === originalPaperId && <div className="paper-image">
              <img src="/images/photography/paper.PNG" alt="科研论文截图" />
            </div>}
            <div>
              <p className="eyebrow">{[paper.venue || "Paper", paper.year].filter(Boolean).join(" · ")}</p>
              <h3>{paper.title}</h3>
              {paper.authors && <p>{paper.authors}</p>}
              {paper.summary && <p>{paper.summary}</p>}
              <span className="text-link">查看论文 →</span>
            </div>
          </a>)}
          </div>
        </section>

        <section className="photography" id="photography">
          <div className="section-heading reveal">
            <p className="eyebrow">Photography</p>
            <h2>摄影作品</h2>
            <p>行走于校园与山水之间，用影像保存建筑、季节和光线。</p>
          </div>
          {categories.map(category => {
            const photos = content.photos.filter(photo => photo.category === category);
            return photos.length ? <PhotoGrid key={category} title={category} photos={photos} /> : null;
          })}
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
