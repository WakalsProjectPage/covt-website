// -------- 1. 工具函数与基础交互 --------

function smoothScrollTo(targetY, duration = 800) {
  const startY = window.scrollY || window.pageYOffset;
  const startTime = performance.now();
  function frame(now) {
    const elapsed = (now - startTime) / duration;
    const t = Math.min(1, Math.max(0, elapsed));
    // easeInOutCubic
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    window.scrollTo(0, startY + (targetY - startY) * eased);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// 侧边栏逻辑：默认 collapsed
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const body = document.body;

sidebarToggle.addEventListener('click', () => {
  // 切换 class，CSS 负责动画
  const isCollapsed = body.classList.toggle('sidebar-collapsed');
  // 更新 aria 状态 (expanded = !collapsed)
  sidebarToggle.setAttribute('aria-expanded', String(!isCollapsed));
});

// 锚点跳转平滑滚动
document.querySelectorAll('a[data-ease]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const id = a.getAttribute('href');
    const el = document.querySelector(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.pageYOffset - 80; // 顶部留白
    smoothScrollTo(y);
    
    // 移动端点击后自动收起
    if (window.innerWidth <= 860) {
      body.classList.add('sidebar-collapsed');
      sidebarToggle.setAttribute('aria-expanded', 'false');
    }
  });
});

// 回到顶部逻辑
const backToTop = document.getElementById('backToTop');
backToTop.addEventListener('click', () => smoothScrollTo(0));
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('show', window.scrollY > 500);
});

// 进场动画 Observer
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('show');
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// 目录高亮 Spy
const tocLinks = document.querySelectorAll('.toc a');
const sectionIds = Array.from(tocLinks).map(a => a.getAttribute('href'));
const sectionEls = sectionIds.map(id => document.querySelector(id));

const spy = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = '#' + entry.target.id;
      tocLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === id);
      });
    }
  });
}, { rootMargin: '-20% 0% -60% 0%' });
sectionEls.forEach(el => el && spy.observe(el));


// -------- 2. Method 部分：淡入淡出切换 --------
document.addEventListener('DOMContentLoaded', () => {
  const methodButtons = document.querySelectorAll('.method-node');
  const contentWrapper = document.getElementById('methodContent'); // 动画容器
  
  // 数据源
  const methodData = {
    sam: {
      badge: '01 · Structured Perception',
      title: 'Segment Anything · SAM',
      copy: 'SAM tokens capture object-level masks, letting CoMT reason over compact descriptors instead of raw pixels.',
      bullets: ['Instance-aware masks delineate shapes.', 'Mask-guided latents route attention to fine structures.']
    },
    depth: {
      badge: '02 · Metric Awareness',
      title: 'DepthAnything · Depth',
      copy: 'Depth latents encode ordinal and metric cues so CoMT can reason about near/far ordering or geometric constraints.',
      bullets: ['Stabilizes physical plausibility for counting.', 'Supplies global 3D context from limited tokens.']
    },
    pidinet: {
      badge: '03 · Structural Edges',
      title: 'PIDINet · Edge',
      copy: 'Edge tokens capture layout primitives such as vanishing lines and silhouettes that sharpen localization.',
      bullets: ['Highlights high-frequency details.', 'Improves reasoning on text and thin structures.']
    },
    dino: {
      badge: '04 · Semantic Memory',
      title: 'DINO · Holistic Features',
      copy: 'DINO features compress global semantics and category-level cues that guide the final textual answer.',
      bullets: ['Acts as memory for object-level semantics.', 'Complements geometric tokens with high-level context.']
    }
  };

  const updateContent = (key) => {
    const data = methodData[key];
    if (!data) return;
    document.getElementById('methodBadge').textContent = data.badge;
    document.getElementById('methodTitle').textContent = data.title;
    document.getElementById('methodCopy').textContent = data.copy;
    document.getElementById('methodBullets').innerHTML = data.bullets.map(t => `<li>${t}</li>`).join('');
  };

  methodButtons.forEach(btn => {
    btn.addEventListener('mouseenter', () => { // 也可以是 click
      if (btn.classList.contains('active')) return;
      
      // UI State
      methodButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Animation sequence
      const key = btn.getAttribute('data-method');
      contentWrapper.classList.remove('fade-in'); // 触发 fade-out
      
      // 等待 CSS transition (300ms) 后更新内容再 fade-in
      setTimeout(() => {
        updateContent(key);
        contentWrapper.classList.add('fade-in');
      }, 300);
    });
  });
});


// -------- 3. Anchor Visualization: Tab 切换 & 丝滑 Slider --------
document.addEventListener('DOMContentLoaded', () => {
  // 3.1 Tab 切换
  const picker = document.getElementById('variantPicker');
  const panels = document.querySelectorAll('.vc-panel');
  
  // 图片资源映射
  const assetMap = {
    v1: { orig: "static/image/demo1.png", a: "static/image/demo1-A.png", b: "static/image/demo1-B.png", l1: "SAM", l2: "Depth" },
    v2: { orig: "static/image/demo2.png", a: "static/image/demo2-A.png", b: "static/image/demo2-B.png", l1: "Depth", l2: "Edge" },
    v3: { orig: "static/image/demo3.png", a: "static/image/demo3-A.png", b: "static/image/demo3-B.png", l1: "Depth", l2: "Edge" }
  };

  function updateSliderImages(variant) {
    const data = assetMap[variant];
    if (!data) return;
    
    // 更新所有 slider 里的图片
    document.querySelectorAll('.js-original').forEach(img => img.src = data.orig);
    document.querySelectorAll('.js-editedA').forEach(img => img.src = data.a);
    document.querySelectorAll('.js-editedB').forEach(img => img.src = data.b);
    
    // 更新 Label
    document.querySelectorAll('.js-visualTokenTag').forEach(tag => {
      const slot = tag.getAttribute('data-slot'); // primary or secondary
      tag.textContent = (slot === 'primary' ? data.l1 : data.l2) + " Token";
    });
  }

  // 初始化图片
  updateSliderImages('v1');

  if (picker) {
    picker.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-variant]');
      if (!btn) return;
      
      // Button UI
      picker.querySelectorAll('[role="tab"]').forEach(b => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      
      const variant = btn.getAttribute('data-variant');
      
      // Panel Animation: Hide all -> Show target
      panels.forEach(p => {
        if (p.getAttribute('data-variant') === variant) {
          p.classList.add('visible');
        } else {
          p.classList.remove('visible');
        }
      });

      // Update Slider Images
      updateSliderImages(variant);
    });
  }

  // 3.2 丝滑 Slider (JS 驱动)
  const compareContainers = document.querySelectorAll('.js-compare-container');
  
  compareContainers.forEach(container => {
    const frontWrapper = container.querySelector('.js-front-wrapper');
    const handle = container.querySelector('.js-handle');
    let isDragging = false;

    const updatePosition = (clientX) => {
      const rect = container.getBoundingClientRect();
      let percentage = (clientX - rect.left) / rect.width;
      percentage = Math.max(0, Math.min(1, percentage)) * 100;
      
      // 1. 改变裁剪区域
      frontWrapper.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
      // 2. 移动手柄
      handle.style.left = `${percentage}%`;
    };

    // Mouse Events
    container.addEventListener('mousedown', (e) => { isDragging = true; updatePosition(e.clientX); });
    window.addEventListener('mousemove', (e) => { if (isDragging) updatePosition(e.clientX); });
    window.addEventListener('mouseup', () => { isDragging = false; });

    // Touch Events
    container.addEventListener('touchstart', (e) => { isDragging = true; updatePosition(e.touches[0].clientX); });
    container.addEventListener('touchmove', (e) => { 
        if (isDragging) {
            e.preventDefault(); // 防止页面滚动
            updatePosition(e.touches[0].clientX); 
        }
    });
    window.addEventListener('touchend', () => { isDragging = false; });
  });
});


// -------- 4. More Results Carousel (Logic fix) --------
document.addEventListener('DOMContentLoaded', () => {
  const moreResults = [
    {
      src: 'static/image/demos/only%20answer/benz.jpg',
      q: 'Which car brand logo is highlighted?',
      reasoning: `<code class="tag tag-think">&lt;Think&gt;</code> The <code class="token token-sam">&lt;SAM Token&gt;</code> cuts out the grille, the <code class="token token-edge">&lt;EDGE Token&gt;</code> sharpens the star lines, and <code class="token token-dino">&lt;DINO Token&gt;</code> links the tri-star to Mercedes. <code class="tag tag-think">&lt;/Think&gt;</code>`,
      answer: `<code class="tag tag-answer">&lt;Answer&gt;</code> It is the Mercedes-Benz emblem. <code class="tag tag-answer">&lt;/Answer&gt;</code>`
    },
    {
      src: 'static/image/demos/only%20answer/nyc.jpeg',
      q: 'Which skyline is this?',
      reasoning: `<code class="tag tag-think">&lt;Think&gt;</code> <code class="token token-depth">&lt;DEPTH Token&gt;</code> orders the towers, <code class="token token-edge">&lt;EDGE Token&gt;</code> highlights the spire silhouettes, and <code class="token token-dino">&lt;DINO Token&gt;</code> retrieves the NYC prior. <code class="tag tag-think">&lt;/Think&gt;</code>`,
      answer: `<code class="tag tag-answer">&lt;Answer&gt;</code> The skyline matches Manhattan in New York City. <code class="tag tag-answer">&lt;/Answer&gt;</code>`
    },
    {
      src: 'static/image/demos/only%20answer/horses.jpg',
      q: 'What subjects are tracked?',
      reasoning: `<code class="tag tag-think">&lt;Think&gt;</code> <code class="token token-sam">&lt;SAM Token&gt;</code> separates each animal mask, <code class="token token-flow">&lt;FLOW Token&gt;</code> explains the motion blur, and <code class="token token-depth">&lt;DEPTH Token&gt;</code> keeps herd ordering. <code class="tag tag-think">&lt;/Think&gt;</code>`,
      answer: `<code class="tag tag-answer">&lt;Answer&gt;</code> Several galloping horses are being followed. <code class="tag tag-answer">&lt;/Answer&gt;</code>`
    },
    {
      src: 'static/image/demos/only%20answer/Christmas.jpg',
      q: 'Which holiday is inferred?',
      reasoning: `<code class="tag tag-think">&lt;Think&gt;</code> <code class="token token-edge">&lt;EDGE Token&gt;</code> outlines the ornament hooks, <code class="token token-dino">&lt;DINO Token&gt;</code> recalls seasonal trees, and <code class="token token-depth">&lt;DEPTH Token&gt;</code> isolates the glowing lights. <code class="tag tag-think">&lt;/Think&gt;</code>`,
      answer: `<code class="tag tag-answer">&lt;Answer&gt;</code> The cues correspond to Christmas celebrations. <code class="tag tag-answer">&lt;/Answer&gt;</code>`
    },
    {
      src: 'static/image/demos/only%20answer/sit.jpeg',
      q: 'What posture does the subject maintain?',
      reasoning: `<code class="tag tag-think">&lt;Think&gt;</code> <code class="token token-depth">&lt;DEPTH Token&gt;</code> confirms the bent knees, <code class="token token-sam">&lt;SAM Token&gt;</code> segments the chair, and <code class="token token-edge">&lt;EDGE Token&gt;</code> locks the spine alignment. <code class="tag tag-think">&lt;/Think&gt;</code>`,
      answer: `<code class="tag tag-answer">&lt;Answer&gt;</code> The person is seated in a relaxed upright pose. <code class="tag tag-answer">&lt;/Answer&gt;</code>`
    }
  ];

  const track = document.getElementById('resultsTrack');
  const stage = document.querySelector('.results-stage');
  const qEl = document.getElementById('resultsQuestion');
  const aEl = document.getElementById('resultsAnswer');
  
  // 渲染 DOM
  moreResults.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'result-card';
    div.innerHTML = `<img src="${item.src}" draggable="false" />`;
    div.addEventListener('click', () => { activeIndex = i; render(); });
    track.appendChild(div);
  });

  const cards = Array.from(track.children);
  let activeIndex = 0; // 默认第一个高亮

  function centerActiveCard() {
    if (!stage) return;
    const activeCard = cards[activeIndex];
    if (!activeCard) return;
    const stageCenter = stage.clientWidth / 2;
    const cardCenter = activeCard.offsetLeft + activeCard.offsetWidth / 2;
    const translateX = stageCenter - cardCenter;
    track.style.transform = `translateX(${translateX}px)`;
  }

  function render() {
    // 1. 设置 active class
    cards.forEach((card, i) => {
      card.className = 'result-card'; // reset
      if (i === activeIndex) card.classList.add('active');
    });

    // 2. 更新文字
    const info = moreResults[activeIndex];
    qEl.textContent = info.q;
    aEl.innerHTML = `
      <p class="qa-text">${info.reasoning}</p>
      <p class="qa-text qa-text-strong">${info.answer}</p>
    `;

    centerActiveCard();

    if (window.innerWidth < 768) {
      cards[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  document.querySelector('[data-results-prev]').addEventListener('click', () => {
    activeIndex = (activeIndex - 1 + moreResults.length) % moreResults.length;
    render();
  });

  document.querySelector('[data-results-next]').addEventListener('click', () => {
    activeIndex = (activeIndex + 1) % moreResults.length;
    render();
  });

  render();
  window.addEventListener('resize', centerActiveCard);
});