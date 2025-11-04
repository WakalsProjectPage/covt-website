// 工具：缓动滚动（非线性丝滑）
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function smoothScrollTo(targetY, duration = 900) {
  const startY = window.scrollY || window.pageYOffset;
  const startTime = performance.now();
  function frame(now) {
    const elapsed = (now - startTime) / duration;
    const t = Math.min(1, Math.max(0, elapsed));
    const eased = easeInOutCubic(t);
    window.scrollTo(0, startY + (targetY - startY) * eased);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// 侧边导航折叠 & 锚点平滑
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
sidebarToggle.addEventListener('click', () => {
  const isNarrow = window.innerWidth <= 860;
  if (isNarrow) {
    const opened = sidebar.classList.toggle('open');
    sidebarToggle.setAttribute('aria-expanded', String(opened));
  } else {
    const collapsed = document.body.classList.toggle('sidebar-collapsed');
    sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
  }
});

document.querySelectorAll('a[data-ease]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.pageYOffset - 20; // 上方留白
    smoothScrollTo(y, 900);
    sidebar.classList.remove('open');
  });
});

// 回到顶部按钮
const backToTop = document.getElementById('backToTop');
backToTop.addEventListener('click', () => smoothScrollTo(0, 900));

function updateBackToTop() {
  const show = window.scrollY > 600;
  backToTop.classList.toggle('show', show);
}
window.addEventListener('scroll', updateBackToTop);
updateBackToTop();

// 进场动画 & 侧边栏当前章节高亮
const tocLinks = Array.from(document.querySelectorAll('.toc a'));
const sectionIds = tocLinks.map(a => a.getAttribute('href'));
const sections = sectionIds.map(id => document.querySelector(id));

const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('show');
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

const spy = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (!isIntersecting) return;
    const id = '#' + target.id;
    tocLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === id));
  });
}, { rootMargin: '-35% 0% -60% 0%', threshold: 0 });

sections.forEach((s) => s && spy.observe(s));

// -------- 单图画廊：生成占位图、切换、caption 与进度条 --------
function placeholder(label, color = '#7dd3fc') {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">\n`+
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`+
    `<stop offset="0%" stop-color="${color}" stop-opacity="0.9"/>`+
    `<stop offset="100%" stop-color="#14b8a6" stop-opacity="0.9"/></linearGradient></defs>`+
    `<rect width="100%" height="100%" fill="url(#g)"/>`+
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Inter, system-ui" font-size="64" font-weight="800">${label}</text>`+
    `</svg>`
  );
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

const slides = [
  { src: placeholder('Scene · 1'), caption: '夜色城市的涟漪笔触。' },
  { src: placeholder('Scene · 2', '#60a5fa'), caption: '水晶球中的微缩生态。' },
  { src: placeholder('Scene · 3', '#22d3ee'), caption: '沙漠镜盒与烛火阴影。' },
  { src: placeholder('Scene · 4', '#2dd4bf'), caption: '美食静物的质感高光。' }
];

const track = document.getElementById('carouselTrack');
const viewport = track?.parentElement; // .viewport
const progressBar = document.getElementById('carouselProgress');
const captionEl = document.getElementById('carouselCaption');

slides.forEach((s, i) => {
  const slide = document.createElement('div');
  slide.className = 'slide';
  const img = document.createElement('img');
  img.src = s.src; img.alt = `slide-${i+1}`;
  slide.appendChild(img);
  slide.addEventListener('click', () => setIndex(i));
  track.appendChild(slide);
});

let index = 0;
function centerActive() {
  const slidesEls = Array.from(track.children);
  slidesEls.forEach((el, i) => el.classList.toggle('active', i === index));
  if (!viewport) return;
  const active = slidesEls[index];
  if (active) {
    const vpRect = viewport.getBoundingClientRect();
    const acRect = active.getBoundingClientRect();
    const delta = acRect.left - vpRect.left - (vpRect.width / 2 - acRect.width / 2);
    viewport.scrollBy({ left: delta, behavior: 'smooth' });
  }
}

function updateCarousel() {
  centerActive();
  progressBar.style.width = `${((index + 1) / slides.length) * 100}%`;
  captionEl.textContent = slides[index]?.caption || '';
}
function setIndex(i) { index = (i + slides.length) % slides.length; updateCarousel(); }

document.querySelector('[data-prev]').addEventListener('click', () => setIndex(index - 1));
document.querySelector('[data-next]').addEventListener('click', () => setIndex(index + 1));
updateCarousel();

// -------- 多图对比：版本选择 + 可拖动分割线 --------
// 复用到 compare-grid 的每个对比组件
const originalSrc = "static/image/demo-ori.png";
const editedSrc = {
  v1: placeholder('Edited · V1', '#22d3ee'),
  v2: placeholder('Edited · V2', '#60a5fa'),
  v3: placeholder('Edited · V3', '#2dd4bf')
};
function initCompare(compareEl) {
  const imgOriginal = compareEl.querySelector('.js-original');
  const imgEdited = compareEl.querySelector('.js-edited');
  const editedWrapper = compareEl.querySelector('.edited');
  const slider = compareEl.querySelector('.js-slider');
  imgOriginal.src = originalSrc;
  imgEdited.src = editedSrc.v1;
  const setClip = (percent) => {
    editedWrapper.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
  };
  setClip(50);
  slider.addEventListener('input', (e) => setClip(Number(e.target.value)));
}

document.querySelectorAll('.compare').forEach(initCompare);

document.getElementById('variantPicker').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-variant]');
  if (!btn) return;
  const v = btn.getAttribute('data-variant');
  document.querySelectorAll('.compare .js-edited').forEach((img) => { img.src = editedSrc[v]; });
  btn.parentElement.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
});

// 可拖拽（鼠标/触摸）控制 slider 到 compare 容器
function bindDrag(el, onMove) {
  let down = false;
  const rectFor = () => el.getBoundingClientRect();
  const handle = (clientX) => {
    const r = rectFor();
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const pct = Math.round(ratio * 100);
    const slider = el.querySelector('.js-slider');
    slider.value = pct;
    el.querySelector('.edited').style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    if (onMove) onMove(pct);
  };
  el.addEventListener('mousedown', (e) => { down = true; handle(e.clientX); });
  el.addEventListener('mousemove', (e) => { if (down) handle(e.clientX); });
  window.addEventListener('mouseup', () => down = false);
  el.addEventListener('touchstart', (e) => { handle(e.touches[0].clientX); });
  el.addEventListener('touchmove', (e) => { handle(e.touches[0].clientX); });
}
document.querySelectorAll('.compare').forEach((el) => bindDrag(el));


