// Global state variables
let currentBusinessId = '';
let authToken = '';
let isSuperAdminEditing = false;
let superAdminSavedId = 'admin';
let activeCarouselInterval = null;

// Editor State (WordPress Schema)
let editorState = {
  theme: {
    primaryColor: '#52750f',
    secondaryColor: '#84cc16',
    backgroundColor: '#f8fafc',
    textColor: '#0f172a',
    navBgColor: '#ffffff',
    footerBgColor: '#0f172a',
    cardBgColor: '#ffffff',
    fontFamily: 'Plus Jakarta Sans',
    buttonStyle: 'rounded',
    carouselType: 'fade',
    visibleSections: {
      features: true,
      carousel: true,
      products: true,
      reviews: true
    }
  },
  info: {
    title: '',
    subtitle: '',
    logoUrl: '',
    description: '',
    email: '',
    phone: '',
    address: '',
    heroBgType: 'color',
    heroBgImage: '',
    heroTextAlign: 'center',
    ctaText: 'Ver Catálogo',
    socialFacebook: '',
    socialInstagram: '',
    socialWhatsapp: '',
    socialTwitter: ''
  },
  features: [],
  carouselImages: [],
  products: [],
  reviews: []
};

// State for carousel in active document
let carouselCurrentIndex = 0;

// On document load
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// App Router
function initApp() {
  const path = window.location.pathname;

  if (path === '/admin' || path === '/admin/') {
    setupAdminView();
  } else {
    const businessId = path.substring(1).replace(/\/$/, '');
    if (businessId) {
      setupPublicClientView(businessId);
    }
  }
}

// Get the iframe document in admin mode
function getPreviewDocument() {
  const iframe = document.getElementById('preview-iframe');
  return iframe ? (iframe.contentDocument || iframe.contentWindow.document) : null;
}

// ==========================================================
// CLIENT VIEW LOGIC (PUBLIC VIEW)
// ==========================================================
async function setupPublicClientView(businessId) {
  document.getElementById('admin-view').style.display = 'none';
  document.getElementById('client-view').style.display = 'flex';
  
  showLoading(true, 'Cargando landing page...');
  
  try {
    const response = await fetch(`/api/business/${businessId}`);
    if (!response.ok) {
      throw new Error('Negocio no encontrado');
    }
    const data = await response.json();
    
    currentBusinessId = businessId;
    editorState = data;
    
    renderClientPage(document);
    setupMobileMenu(document);
    setupReviewForm(document);
    
    showLoading(false);
  } catch (error) {
    showLoading(false);
    showToast(error.message || 'Error al cargar la página', 'error');
    
    const isNetworkError = error.message === 'Failed to fetch' || error.message.includes('network') || error.message.includes('fetch');
    const title = isNetworkError ? 'Error de Conexión' : 'Error 404';
    const message = isNetworkError 
      ? 'No se pudo conectar con el servidor. Por favor, reintenta en unos segundos.' 
      : `El negocio "${businessId}" no existe o ha sido desactivado.`;
    
    document.body.innerHTML = `
      <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 20px;">
        <h1 style="color: #ef4444; margin-bottom: 12px;">${title}</h1>
        <p style="color: #64748b; margin-bottom: 24px;">${message}</p>
        <button onclick="window.location.reload()" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Reintentar</button>
      </div>
    `;
  }
}

function isColorLight(hexColor) {
  if (!hexColor || hexColor.trim() === '') return false;
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 170; // Brightness threshold (light background if >= 170)
}

// Render dynamic elements in targeted document context (main vs iframe)
function renderClientPage(targetDoc = document) {
  const { theme, info, features, carouselImages, products, reviews, videos } = editorState;
  if (!targetDoc) return;

  // Re-arrange layout sections based on layout template selection
  const clientView = targetDoc.getElementById('client-view');
  if (clientView) {
    const sections = {
      hero: targetDoc.getElementById('inicio'),
      features: targetDoc.getElementById('ventajas'),
      carousel: targetDoc.getElementById('carrusel'),
      products: targetDoc.getElementById('servicios'),
      videos: targetDoc.getElementById('videos'),
      reviews: targetDoc.getElementById('opiniones'),
      contact: targetDoc.getElementById('contacto')
    };
    
    if (sections.hero) {
      const order = getLayoutOrder(theme.pageLayout || 'classic');
      
      const headerEl = targetDoc.querySelector('.header');
      if (headerEl) {
        clientView.appendChild(headerEl);
      }
      
      order.forEach(key => {
        const el = sections[key];
        if (el) {
          clientView.appendChild(el);
        }
      });
      
      const footerEl = targetDoc.querySelector('.footer');
      if (footerEl) {
        clientView.appendChild(footerEl);
      }
    }
  }

  // 1. Apply Stylesheet variables
  const root = targetDoc.documentElement;
  root.style.setProperty('--primary-color', theme.primaryColor);
  root.style.setProperty('--primary-hover', adjustColorBrightness(theme.primaryColor, -15));
  root.style.setProperty('--secondary-color', theme.secondaryColor);
  root.style.setProperty('--bg-color', theme.backgroundColor);
  root.style.setProperty('--text-color', theme.textColor);
  root.style.setProperty('--nav-bg', theme.navBgColor);
  root.style.setProperty('--footer-bg', theme.footerBgColor);
  root.style.setProperty('--card-bg', theme.cardBgColor);
  
  // Font
  root.style.setProperty('--font-main', `'${theme.fontFamily}', sans-serif`);
  root.style.setProperty('--font-headings', `'${theme.fontFamily}', sans-serif`);
  
  // Button Border Radius
  let btnRadius = '12px';
  if (theme.buttonStyle === 'pill') btnRadius = '9999px';
  if (theme.buttonStyle === 'sharp') btnRadius = '0px';
  root.style.setProperty('--button-radius', btnRadius);

  // Sizing and Dimensions
  applyCustomSizingStyles(theme, targetDoc);
  
  // 2. Title & Combined Logo (Image + Text)
  if (targetDoc === document) {
    document.title = `${info.title} | Muestrate`;
  }
  
  const logoContainer = targetDoc.getElementById('view-logo-container');
  if (logoContainer) {
    let logoImgHTML = '';
    if (theme.logoType !== 'text' && info.logoUrl && info.logoUrl.trim() !== '') {
      logoImgHTML = `<img src="${info.logoUrl}" class="logo-img" alt="${info.title}" onerror="this.remove()">`;
    }
    
    let logoTextHTML = '';
    if (theme.logoType !== 'logo' || !info.logoUrl || info.logoUrl.trim() === '') {
      logoTextHTML = `<span class="logo-text">${info.title}</span>`;
    }
    
    logoContainer.innerHTML = logoImgHTML + logoTextHTML;
  }
  
  const heroLogoContainer = targetDoc.getElementById('view-hero-logo-container');
  if (heroLogoContainer) {
    let logoImgHTML = '';
    if (theme.logoType !== 'text' && info.logoUrl && info.logoUrl.trim() !== '') {
      logoImgHTML = `<img src="${info.logoUrl}" class="hero-logo-img" alt="${info.title}" onerror="this.remove()">`;
    }
    
    heroLogoContainer.innerHTML = logoImgHTML;
    heroLogoContainer.style.display = (theme.logoType !== 'text' && info.logoUrl && info.logoUrl.trim() !== '') ? 'block' : 'none';
  }
  
  const headerLogoContainer = targetDoc.getElementById('header-logo-container');
  if (headerLogoContainer) {
    let logoImgHTML = '';
    if (theme.logoType !== 'text' && info.logoUrl && info.logoUrl.trim() !== '') {
      logoImgHTML = `<img src="${info.logoUrl}" class="logo-img" alt="${info.title}" onerror="this.remove()">`;
    }
    
    let logoTextHTML = '';
    if (theme.logoType !== 'logo' || !info.logoUrl || info.logoUrl.trim() === '') {
      logoTextHTML = `<span class="logo-text">${info.title}</span>`;
    }
    
    headerLogoContainer.innerHTML = logoImgHTML + logoTextHTML;
  }
  
  const brandNameEl = targetDoc.getElementById('view-brand-name');
  if (brandNameEl) brandNameEl.textContent = info.title;
  
  const subtitleEl = targetDoc.getElementById('view-subtitle');
  if (subtitleEl) subtitleEl.textContent = info.subtitle;
  
  const heroTitleEl = targetDoc.getElementById('view-hero-title');
  if (heroTitleEl) heroTitleEl.textContent = info.title;
  
  const heroSubtitleEl = targetDoc.getElementById('view-hero-subtitle');
  if (heroSubtitleEl) heroSubtitleEl.textContent = info.subtitle;
  
  const copyrightEl = targetDoc.getElementById('view-copyright-name');
  if (copyrightEl) copyrightEl.textContent = info.title;
  
  const footerTitleEl = targetDoc.getElementById('view-footer-title');
  if (footerTitleEl) footerTitleEl.textContent = info.title || 'Mi Negocio';
  
  const footerDescEl = targetDoc.getElementById('view-footer-desc');
  if (footerDescEl) footerDescEl.textContent = info.subtitle || '';
  
  const yearEl = targetDoc.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  
  // 3. Hero Customization
  const heroElement = targetDoc.getElementById('inicio');
  const heroContent = targetDoc.getElementById('view-hero-content');
  const ctaBtn = targetDoc.getElementById('view-cta-hero');
  const overlayEl = targetDoc.getElementById('view-hero-overlay');
  
  if (overlayEl) {
    if (info.heroBgType === 'image') {
      overlayEl.style.display = 'block';
      overlayEl.style.background = 'rgba(15, 23, 42, 0.65)';
    } else {
      overlayEl.style.display = 'none';
    }
  }
  
  if (heroContent) {
    heroContent.className = `hero-content align-${info.heroTextAlign || 'center'}`;
  }
  if (ctaBtn) {
    ctaBtn.textContent = info.ctaText || 'Ver Catálogo';
  }
  if (heroElement) {
    let isLight = false;
    if (info.heroBgType === 'gradient') {
      const gradStart = info.heroGradientStart || '#52750f';
      const gradEnd = info.heroGradientEnd || '#0f172a';
      heroElement.style.background = `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`;
      heroElement.style.backgroundImage = '';
      isLight = isColorLight(gradStart);
    } else if (info.heroBgType === 'image' && info.heroBgImage && info.heroBgImage.trim() !== '') {
      heroElement.style.backgroundImage = `url('${info.heroBgImage}')`;
      heroElement.style.backgroundSize = 'cover';
      heroElement.style.backgroundPosition = 'center';
      heroElement.style.backgroundColor = 'transparent';
      isLight = false;
    } else {
      const solidColor = info.heroBgColor || '#0f172a';
      heroElement.style.background = solidColor;
      heroElement.style.backgroundImage = '';
      isLight = isColorLight(solidColor);
    }
    
    if (isLight) {
      heroElement.classList.add('hero-light-theme');
    } else {
      heroElement.classList.remove('hero-light-theme');
    }
  }
  
  // 4. Social Links, Visibilities & Section Renders
  renderSocialIcons(info, targetDoc);
  renderHeroSocialIcons(info, targetDoc);
  toggleSectionVisibility(theme.visibleSections, targetDoc);
  
  if (theme.visibleSections.features) {
    renderFeaturesSection(features, targetDoc);
  }
  if (theme.visibleSections.carousel) {
    renderCarouselSection(carouselImages, theme.carouselType, targetDoc);
  }
  if (theme.visibleSections.products) {
    renderProductsSection(products, targetDoc);
  }
  if (theme.visibleSections.videos !== false) {
    renderVideosSection(videos, targetDoc);
  }
  if (theme.visibleSections.reviews) {
    renderReviewsSection(reviews, targetDoc);
  }
}

// Helper to define order of page layout structures
function getLayoutOrder(layoutType) {
  switch (layoutType) {
    case 'gallery':
      // Portfolio Focused: Hero -> Carousel -> Videos -> Products -> Features -> Reviews -> Contact
      return ['hero', 'carousel', 'videos', 'products', 'features', 'reviews', 'contact'];
    case 'products':
      // Sales Focused: Hero -> Products -> Features -> Carousel -> Videos -> Reviews -> Contact
      return ['hero', 'products', 'features', 'carousel', 'videos', 'reviews', 'contact'];
    case 'minimal':
      // Corporate Focused: Hero -> Features -> Videos -> Reviews -> Products -> Carousel -> Contact
      return ['hero', 'features', 'videos', 'reviews', 'products', 'carousel', 'contact'];
    case 'classic':
    default:
      // Classic Sequential: Hero -> Features -> Carousel -> Products -> Videos -> Reviews -> Contact
      return ['hero', 'features', 'carousel', 'products', 'videos', 'reviews', 'contact'];
  }
}

// Helper to apply sizing configuration options dynamically
function applyCustomSizingStyles(theme, targetDoc) {
  if (!targetDoc) return;
  const root = targetDoc.documentElement;
  
  // 1. Logo Size
  let logoHeight = '50px';
  if (theme.logoSize === 'small') logoHeight = '35px';
  if (theme.logoSize === 'large') logoHeight = '70px';
  root.style.setProperty('--logo-height', logoHeight);
  
  // 1.5. Hero Logo Size
  let heroLogoHeight = '180px';
  if (theme.heroLogoSize === 'small') heroLogoHeight = '120px';
  if (theme.heroLogoSize === 'large') heroLogoHeight = '250px';
  root.style.setProperty('--hero-logo-size', heroLogoHeight);
  
  // 2. Card Size
  let cardMin = '280px', cardPad = '24px', cardImg = '220px';
  if (theme.cardSize === 'small') {
    cardMin = '220px'; cardPad = '16px'; cardImg = '160px';
  } else if (theme.cardSize === 'large') {
    cardMin = '340px'; cardPad = '32px'; cardImg = '280px';
  }
  root.style.setProperty('--card-min-width', cardMin);
  root.style.setProperty('--card-padding', cardPad);
  root.style.setProperty('--card-img-height', cardImg);
  
  // 3. Font Size
  let baseFont = '16px';
  if (theme.fontSize === 'small') baseFont = '14px';
  if (theme.fontSize === 'large') baseFont = '18px';
  root.style.setProperty('--base-font-size', baseFont);
  
  // 4. Carousel Height
  const wrapper = targetDoc.querySelector('.carousel-wrapper');
  if (wrapper) {
    if (theme.carouselHeight && theme.carouselHeight !== 'aspect') {
      wrapper.classList.add('has-custom-height');
      root.style.setProperty('--gallery-height', theme.carouselHeight);
    } else {
      wrapper.classList.remove('has-custom-height');
      root.style.removeProperty('--gallery-height');
    }
  }
}

// Get the correct document context of an element
function getTargetDoc(element) {
  return element.ownerDocument;
}

// Toggle visibility of landing page sections
function toggleSectionVisibility(visibleObj, targetDoc = document) {
  const mapping = {
    features: { sec: 'ventajas', link: 'nav-link-features' },
    carousel: { sec: 'carrusel', link: 'nav-link-carousel' },
    products: { sec: 'servicios', link: 'nav-link-products' },
    videos: { sec: 'videos', link: 'nav-link-videos' },
    reviews: { sec: 'opiniones', link: 'nav-link-reviews' }
  };
  
  for (const [key, config] of Object.entries(mapping)) {
    const isVisible = visibleObj[key] !== false;
    const secEl = targetDoc.getElementById(config.sec);
    const linkEl = targetDoc.getElementById(config.link);
    
    if (secEl) secEl.style.display = isVisible ? 'block' : 'none';
    if (linkEl) linkEl.style.display = isVisible ? 'block' : 'none';
  }
}

// Render Social Media Icons in Footer
function renderSocialIcons(info, targetDoc = document) {
  const container = targetDoc.getElementById('view-footer-social');
  if (!container) return;
  container.innerHTML = '';
  
  const networks = [
    { key: 'socialWhatsapp', icon: 'fa-whatsapp', prefix: 'https://wa.me/' },
    { key: 'socialFacebook', icon: 'fa-facebook-f', prefix: '' },
    { key: 'socialInstagram', icon: 'fa-instagram', prefix: '' },
    { key: 'socialTwitter', icon: 'fa-twitter', prefix: '' }
  ];
  
  networks.forEach(net => {
    const val = info[net.key];
    if (val && val.trim() !== '') {
      const url = net.prefix ? `${net.prefix}${val.replace(/\s+/g, '')}` : val;
      const link = targetDoc.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.className = 'social-icon';
      link.innerHTML = `<i class="fa-brands ${net.icon}"></i>`;
      container.appendChild(link);
    }
  });
}

// Render Social Media Icon Buttons inside Hero
function renderHeroSocialIcons(info, targetDoc = document) {
  const container = targetDoc.getElementById('view-hero-social');
  if (!container) return;
  container.innerHTML = '';
  
  const networks = [
    { key: 'socialWhatsapp', icon: 'fa-whatsapp', prefix: 'https://wa.me/' },
    { key: 'socialFacebook', icon: 'fa-facebook-f', prefix: '' },
    { key: 'socialInstagram', icon: 'fa-instagram', prefix: '' },
    { key: 'socialTwitter', icon: 'fa-twitter', prefix: '' }
  ];
  
  let hasAny = false;
  networks.forEach(net => {
    const val = info[net.key];
    if (val && val.trim() !== '') {
      hasAny = true;
      const url = net.prefix ? `${net.prefix}${val.replace(/\s+/g, '')}` : val;
      const link = targetDoc.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.className = 'hero-social-btn';
      link.innerHTML = `<i class="fa-brands ${net.icon}"></i>`;
      container.appendChild(link);
    }
  });
  
  container.style.display = hasAny ? 'flex' : 'none';
}

// Render Video Gallery Section
function renderVideosSection(videos, targetDoc = document) {
  const container = targetDoc.getElementById('videos-list-container');
  if (!container) return;
  container.innerHTML = '';
  
  if (!videos || videos.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-film" style="font-size: 3rem; margin-bottom: 12px;"></i>
        <p>No hay videos de demostración disponibles por el momento.</p>
      </div>
    `;
    return;
  }
  
  videos.forEach(vid => {
    const card = targetDoc.createElement('div');
    card.className = 'video-card';
    
    const embedHTML = getEmbedVideoHTML(vid.url);
    
    card.innerHTML = `
      <div class="video-container">
        ${embedHTML}
      </div>
      <div class="video-info">
        <h3>${vid.title}</h3>
        <p>${vid.description || ''}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

function getEmbedVideoHTML(url) {
  if (!url) return '';
  url = url.trim();
  
  // YouTube Watch Link
  if (url.includes('youtube.com/watch')) {
    try {
      const urlObj = new URL(url);
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        return `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      }
    } catch(e) {}
  }
  
  // YouTube Share Link
  if (url.includes('youtu.be/')) {
    const parts = url.split('youtu.be/');
    if (parts.length > 1) {
      const videoId = parts[1].split(/[?#]/)[0];
      return `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
  }
  
  // Vimeo Link
  if (url.includes('vimeo.com/')) {
    const parts = url.split('vimeo.com/');
    if (parts.length > 1) {
      const videoId = parts[1].split(/[?#]/)[0];
      return `<iframe src="https://player.vimeo.com/video/${videoId}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }
  }
  
  // Local video or direct file link
  return `<video src="${url}" controls preload="metadata" style="object-fit: cover;"></video>`;
}

// Features Section Renderer
function renderFeaturesSection(features, targetDoc = document) {
  const container = targetDoc.getElementById('features-list-container');
  if (!container) return;
  container.innerHTML = '';
  
  if (!features || features.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No se han agregado ventajas competitivas.</p>';
    return;
  }
  
  features.forEach(feat => {
    const card = targetDoc.createElement('div');
    card.className = 'feature-card';
    card.innerHTML = `
      <div class="feature-icon"><i class="fa-solid ${feat.icon || 'fa-star'}"></i></div>
      <h3>${feat.title}</h3>
      <p>${feat.description || ''}</p>
    `;
    container.appendChild(card);
  });
}

// Adjust brightness of hex color for hover state
function adjustColorBrightness(hex, percent) {
  if (!hex || !hex.startsWith('#')) return hex;
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = parseInt(R * (100 + percent) / 100);
  G = parseInt(G * (100 + percent) / 100);
  B = parseInt(B * (100 + percent) / 100);

  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;

  R = (R > 0) ? R : 0;
  G = (G > 0) ? G : 0;
  B = (B > 0) ? B : 0;

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

// Carousel Rendering logic
function renderCarouselSection(images, type, targetDoc = document) {
  const track = targetDoc.getElementById('carousel-track');
  const dotsContainer = targetDoc.getElementById('carousel-dots-container');
  const wrapper = targetDoc.querySelector('.carousel-wrapper');
  
  if (!track || !dotsContainer || !wrapper) return;
  
  track.innerHTML = '';
  dotsContainer.innerHTML = '';
  
  if (activeCarouselInterval) {
    clearInterval(activeCarouselInterval);
  }
  
  const validImages = images.filter(img => img && img.trim() !== '');
  if (validImages.length === 0) {
    track.innerHTML = `
      <div class="carousel-item active" style="display: flex; align-items: center; justify-content: center; background: #334155; color: white;">
        <div style="text-align: center; padding: 20px;">
          <i class="fa-solid fa-images" style="font-size: 3rem; margin-bottom: 12px; color: #94a3b8;"></i>
          <p>No hay imágenes en la galería. Agrega algunas en el panel de control.</p>
        </div>
      </div>
    `;
    const prevBtn = targetDoc.getElementById('carousel-prev');
    const nextBtn = targetDoc.getElementById('carousel-next');
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    return;
  }
  
  const prevBtn = targetDoc.getElementById('carousel-prev');
  const nextBtn = targetDoc.getElementById('carousel-next');
  if (prevBtn) prevBtn.style.display = 'flex';
  if (nextBtn) nextBtn.style.display = 'flex';
  
  // Clean wrapper classes
  wrapper.classList.remove('fade-mode', 'gallery-grid-mode', 'gallery-showcase-mode');
  
  if (type === 'grid') {
    wrapper.classList.add('gallery-grid-mode');
    validImages.forEach((imgUrl, index) => {
      const item = targetDoc.createElement('div');
      item.className = 'carousel-item active';
      item.innerHTML = `<img src="${imgUrl}" alt="Galería trabajo ${index + 1}" />`;
      track.appendChild(item);
    });
    return;
  }
  
  if (type === 'showcase') {
    wrapper.classList.add('gallery-showcase-mode');
    
    const item = targetDoc.createElement('div');
    item.className = 'carousel-item active';
    item.innerHTML = `<img src="${validImages[carouselCurrentIndex] || validImages[0]}" alt="Galería trabajo" />`;
    track.appendChild(item);
    
    validImages.forEach((imgUrl, index) => {
      const thumb = targetDoc.createElement('button');
      thumb.className = `carousel-thumbnail ${index === carouselCurrentIndex ? 'active' : ''}`;
      thumb.innerHTML = `<img src="${imgUrl}" alt="miniatura ${index + 1}" />`;
      thumb.addEventListener('click', () => {
        goToSlide(index, type, validImages.length, targetDoc);
      });
      dotsContainer.appendChild(thumb);
    });
  } else {
    if (type === 'fade') {
      wrapper.classList.add('fade-mode');
    }
    
    validImages.forEach((imgUrl, index) => {
      const item = targetDoc.createElement('div');
      item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
      
      const img = targetDoc.createElement('img');
      img.src = imgUrl;
      img.alt = `Galería trabajo ${index + 1}`;
      img.onerror = () => {
        img.src = 'https://images.unsplash.com/photo-1562408590-e32931084e23?q=80&w=600';
      };
      
      item.appendChild(img);
      track.appendChild(item);
      
      const dot = targetDoc.createElement('button');
      dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`;
      dot.addEventListener('click', () => {
        goToSlide(index, type, validImages.length, targetDoc);
      });
      dotsContainer.appendChild(dot);
    });
  }
  
  if (prevBtn && nextBtn) {
    const newPrev = prevBtn.cloneNode(true);
    const newNext = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrev, prevBtn);
    nextBtn.parentNode.replaceChild(newNext, nextBtn);
    
    newPrev.addEventListener('click', () => {
      navigateCarousel(-1, type, validImages.length, targetDoc);
    });
    newNext.addEventListener('click', () => {
      navigateCarousel(1, type, validImages.length, targetDoc);
    });
  }
  
  activeCarouselInterval = setInterval(() => {
    navigateCarousel(1, type, validImages.length, targetDoc);
  }, 5000);
}

function navigateCarousel(direction, type, total, targetDoc) {
  carouselCurrentIndex = (carouselCurrentIndex + direction + total) % total;
  updateCarouselVisuals(type, total, targetDoc);
}

function goToSlide(index, type, total, targetDoc) {
  carouselCurrentIndex = index;
  updateCarouselVisuals(type, total, targetDoc);
  clearInterval(activeCarouselInterval);
  activeCarouselInterval = setInterval(() => {
    navigateCarousel(1, type, total, targetDoc);
  }, 5000);
}

function updateCarouselVisuals(type, total, targetDoc) {
  const items = targetDoc.querySelectorAll('#carousel-track .carousel-item');
  const dots = targetDoc.querySelectorAll('#carousel-dots-container .carousel-dot');
  const thumbs = targetDoc.querySelectorAll('#carousel-dots-container .carousel-thumbnail');
  
  if (type === 'showcase') {
    const track = targetDoc.getElementById('carousel-track');
    const validImages = editorState.carouselImages.filter(img => img && img.trim() !== '');
    if (track && validImages[carouselCurrentIndex]) {
      track.innerHTML = `
        <div class="carousel-item active">
          <img src="${validImages[carouselCurrentIndex]}" alt="Galería trabajo" />
        </div>
      `;
    }
    
    thumbs.forEach((thumb, idx) => {
      if (idx === carouselCurrentIndex) {
        thumb.classList.add('active');
      } else {
        thumb.classList.remove('active');
      }
    });
    return;
  }
  
  if (type === 'grid') return;
  
  if (items.length === 0) return;
  
  items.forEach(item => item.classList.remove('active'));
  dots.forEach(dot => dot.classList.remove('active'));
  
  if (dots[carouselCurrentIndex]) {
    dots[carouselCurrentIndex].classList.add('active');
  }
  
  if (type === 'fade') {
    if (items[carouselCurrentIndex]) {
      items[carouselCurrentIndex].classList.add('active');
    }
  } else {
    const track = targetDoc.getElementById('carousel-track');
    if (track) {
      track.style.transform = `translateX(-${carouselCurrentIndex * 100}%)`;
    }
    if (items[carouselCurrentIndex]) {
      items[carouselCurrentIndex].classList.add('active');
    }
  }
}

// Products section render
function renderProductsSection(products, targetDoc = document) {
  const container = targetDoc.getElementById('products-list-container');
  if (!container) return;
  container.innerHTML = '';
  
  if (!products || products.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 12px;"></i>
        <p>No hay productos disponibles por el momento.</p>
      </div>
    `;
    return;
  }
  
  products.forEach(prod => {
    const card = targetDoc.createElement('div');
    card.className = 'product-card';
    const imgUrl = prod.image && prod.image.trim() !== '' ? prod.image : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=500';
    
    card.innerHTML = `
      <div class="product-image">
        <img src="${imgUrl}" alt="${prod.name}" onerror="this.src='https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=500'">
        <div class="product-price">$${parseFloat(prod.price).toFixed(2)}</div>
      </div>
      <div class="product-info">
        <h3>${prod.name}</h3>
        <p>${prod.description || ''}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

// Reviews section render
function renderReviewsSection(reviews, targetDoc = document) {
  const container = targetDoc.getElementById('reviews-list-container');
  const avgRatingText = targetDoc.getElementById('view-average-rating');
  const avgStarsContainer = targetDoc.getElementById('view-average-stars');
  const totalReviewsCount = targetDoc.getElementById('view-total-reviews-count');
  
  if (!container) return;
  container.innerHTML = '';
  
  if (!reviews || reviews.length === 0) {
    if (avgRatingText) avgRatingText.textContent = '0.0';
    if (avgStarsContainer) avgStarsContainer.innerHTML = '<i class="fa-regular fa-star"></i>'.repeat(5);
    if (totalReviewsCount) totalReviewsCount.textContent = 'Sin reseñas aún';
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-comments" style="font-size: 3rem; margin-bottom: 12px;"></i>
        <p>Aún no hay opiniones. ¡Sé el primero en dejar una!</p>
      </div>
    `;
    return;
  }
  
  const totalReviews = reviews.length;
  const ratingSum = reviews.reduce((sum, r) => sum + parseFloat(r.rating), 0);
  const avgRating = (ratingSum / totalReviews).toFixed(1);
  
  if (avgRatingText) avgRatingText.textContent = avgRating;
  if (totalReviewsCount) totalReviewsCount.textContent = `Basado en ${totalReviews} reseña${totalReviews > 1 ? 's' : ''}`;
  if (avgStarsContainer) avgStarsContainer.innerHTML = generateStarsHTML(parseFloat(avgRating));
  
  reviews.forEach(rev => {
    const card = targetDoc.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
      <div class="review-header">
        <span class="review-author">${rev.name}</span>
        <div class="review-stars">
          ${generateStarsHTML(rev.rating)}
        </div>
      </div>
      <p class="review-text">"${rev.comment}"</p>
    `;
    container.appendChild(card);
  });
}

function generateStarsHTML(rating) {
  let html = '';
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  html += '<i class="fa-solid fa-star"></i>'.repeat(fullStars);
  if (hasHalfStar) {
    html += '<i class="fa-solid fa-star-half-stroke"></i>';
  }
  html += '<i class="fa-regular fa-star"></i>'.repeat(emptyStars);
  return html;
}

function setupMobileMenu(targetDoc = document) {
  const btn = targetDoc.getElementById('mobile-menu-btn');
  const menu = targetDoc.getElementById('nav-menu');
  if (!btn || !menu) return;
  
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  
  newBtn.addEventListener('click', () => {
    menu.classList.toggle('active');
  });
  
  const links = menu.querySelectorAll('a');
  links.forEach(l => {
    l.addEventListener('click', () => {
      menu.classList.remove('active');
    });
  });
}

function setupReviewForm(targetDoc = document) {
  const form = targetDoc.getElementById('add-review-form');
  if (!form) return;
  
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  
  newForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const targetDocContext = getTargetDoc(newForm);
    const name = targetDocContext.getElementById('rev-name').value;
    const contact = targetDocContext.getElementById('rev-contact').value;
    const comment = targetDocContext.getElementById('rev-comment').value;
    
    const ratingInput = targetDocContext.querySelector('input[name="rating-input"]:checked');
    if (!ratingInput) {
      alert('Por favor, selecciona una calificación de estrellas.');
      return;
    }
    const rating = ratingInput.value;
    
    if (window.parent && window.parent.showLoading) {
      window.parent.showLoading(true, 'Enviando reseña...');
    } else {
      showLoading(true, 'Enviando reseña...');
    }
    
    try {
      const response = await fetch(`/api/business/${currentBusinessId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rating, comment, contact })
      });
      
      if (!response.ok) {
        throw new Error('Error al enviar la reseña');
      }
      
      const result = await response.json();
      
      if (window.parent && window.parent.showLoading) {
        window.parent.showLoading(false);
      } else {
        showLoading(false);
      }
      
      if (window.parent && window.parent !== window && window.parent.editorState) {
        window.parent.editorState.reviews.unshift(result.review);
        window.parent.renderEditorReviews();
        window.parent.showToast('¡Nueva reseña recibida y actualizada!', 'success');
      } else {
        showToast('Reseña publicada con éxito.', 'success');
      }
      
      newForm.reset();
      editorState.reviews.unshift(result.review);
      renderReviewsSection(editorState.reviews, targetDocContext);
    } catch (error) {
      if (window.parent && window.parent.showLoading) {
        window.parent.showLoading(false);
        window.parent.showToast(error.message, 'error');
      } else {
        showLoading(false);
        showToast(error.message, 'error');
      }
    }
  });
}

// ==========================================================
// ADMIN VIEW LOGIC (EDITOR WORKSPACE)
// ==========================================================
function setupAdminView() {
  document.getElementById('client-view').style.display = 'none';
  document.getElementById('admin-view').style.display = 'flex';
  
  const savedToken = sessionStorage.getItem('auth_token');
  const savedBusinessId = sessionStorage.getItem('business_id');
  
  if (savedToken && savedBusinessId) {
    authToken = savedToken;
    currentBusinessId = savedBusinessId;
    loadAdminDashboard();
  } else {
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('editor-workspace').style.display = 'none';
    setupAuthForms();
  }
}

function setupAuthForms() {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const showRegLink = document.getElementById('show-register');
  const showLoginLink = document.getElementById('show-login');
  
  if (showRegLink && regForm) {
    showRegLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      regForm.style.display = 'block';
    });
  }
  
  if (showLoginLink && regForm) {
    showLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      regForm.style.display = 'none';
      loginForm.style.display = 'block';
    });
  }
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const businessId = document.getElementById('login-businessId').value.trim();
      const password = document.getElementById('login-password').value;
      
      showLoading(true, 'Iniciando sesión...');
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, password })
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Credenciales incorrectas');
        }
        
        authToken = result.token;
        currentBusinessId = result.businessId;
        sessionStorage.setItem('auth_token', authToken);
        sessionStorage.setItem('business_id', currentBusinessId);
        
        showLoading(false);
        showToast('Inicio de sesión exitoso', 'success');
        loadAdminDashboard();
      } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
      }
    });
  }
  
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const businessId = document.getElementById('reg-businessId').value.trim();
      const password = document.getElementById('reg-password').value;
      const title = document.getElementById('reg-title').value.trim();
      const subtitle = document.getElementById('reg-subtitle').value.trim();
      
      showLoading(true, 'Registrando negocio...');
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, password, title, subtitle })
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Error al registrar el negocio');
        }
        
        showLoading(false);
        showToast(result.message, 'success');
        regForm.reset();
        regForm.style.display = 'none';
        loginForm.style.display = 'block';
        document.getElementById('login-businessId').value = businessId;
      } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
      }
    });
  }
}

// Client uploader handler: Reads local file, uploads to API, fills text URL
function setupFileUpload(fileInputId, textInputId, callback) {
  const fileInput = document.getElementById(fileInputId);
  const textInput = document.getElementById(textInputId);
  
  if (!fileInput || !textInput) return;
  
  // Clone to remove duplicate event listeners
  const newFileInput = fileInput.cloneNode(true);
  fileInput.parentNode.replaceChild(newFileInput, fileInput);
  
  newFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      showToast('Por favor, selecciona únicamente archivos de imagen o video.', 'error');
      return;
    }
    
    const isVideoFile = isVideo;
    showLoading(true, isVideoFile ? 'Subiendo video...' : 'Subiendo foto...');
    
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            type: file.type,
            data: reader.result
          })
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Error al subir el archivo');
        }
        
        showLoading(false);
        showToast(isVideoFile ? 'Video subido y guardado en AWS.' : 'Imagen subida y guardada en AWS.', 'success');
        
        // Write url into input field
        textInput.value = result.url;
        
        // Dispatch input event to fire live preview update!
        textInput.dispatchEvent(new Event('input'));
        
        if (callback) callback(result.url);
      } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
      }
    };
    reader.onerror = () => {
      showLoading(false);
      showToast('Error al leer el archivo local.', 'error');
    };
    reader.readAsDataURL(file);
  });
}

async function loadAdminDashboard() {
  document.getElementById('login-section').style.display = 'none';
  
  if (currentBusinessId.toLowerCase() === 'admin') {
    document.getElementById('editor-workspace').style.display = 'none';
    document.getElementById('superadmin-workspace').style.display = 'grid';
    loadSuperAdminDashboard();
    return;
  }
  
  document.getElementById('superadmin-workspace').style.display = 'none';
  document.getElementById('editor-workspace').style.display = 'grid';
  
  const currentHost = window.location.host;
  document.getElementById('preview-url-text').textContent = `${currentHost}/${currentBusinessId}`;
  const previewLink = document.getElementById('preview-url-link');
  if (previewLink) {
    previewLink.href = `/${currentBusinessId}`;
  }
  document.getElementById('admin-business-title').textContent = currentBusinessId;
  
  showLoading(true, 'Cargando tu editor...');
  
  try {
    const response = await fetch(`/api/business/${currentBusinessId}`);
    if (!response.ok) {
      throw new Error('Error al cargar datos de negocio.');
    }
    editorState = await response.json();
    
    // Default fallbacks
    if (!editorState.features) editorState.features = [];
    if (!editorState.theme.navBgColor) editorState.theme.navBgColor = '#ffffff';
    if (!editorState.theme.footerBgColor) editorState.theme.footerBgColor = '#0f172a';
    if (!editorState.theme.cardBgColor) editorState.theme.cardBgColor = '#ffffff';
    if (!editorState.theme.fontFamily) editorState.theme.fontFamily = 'Plus Jakarta Sans';
    if (!editorState.theme.buttonStyle) editorState.theme.buttonStyle = 'rounded';
    if (!editorState.theme.logoType) editorState.theme.logoType = 'both';
    if (!editorState.theme.logoSize) editorState.theme.logoSize = 'medium';
    if (!editorState.theme.heroLogoSize) editorState.theme.heroLogoSize = 'medium';
    if (!editorState.theme.cardSize) editorState.theme.cardSize = 'medium';
    if (!editorState.theme.fontSize) editorState.theme.fontSize = 'medium';
    if (!editorState.theme.carouselHeight) editorState.theme.carouselHeight = 'aspect';
    if (!editorState.videos) editorState.videos = [];
    if (!editorState.theme.visibleSections) {
      editorState.theme.visibleSections = { features: true, carousel: true, products: true, reviews: true, heroLogo: true, videos: true };
    }
    if (editorState.theme.visibleSections.heroLogo === undefined) {
      editorState.theme.visibleSections.heroLogo = true;
    }
    if (editorState.theme.visibleSections.videos === undefined) {
      editorState.theme.visibleSections.videos = true;
    }
    if (!editorState.info.heroBgType) editorState.info.heroBgType = 'color';
    if (!editorState.info.heroBgImage) editorState.info.heroBgImage = '';
    if (!editorState.info.heroBgColor) editorState.info.heroBgColor = '#0f172a';
    if (!editorState.info.heroGradientStart) editorState.info.heroGradientStart = '#52750f';
    if (!editorState.info.heroGradientEnd) editorState.info.heroGradientEnd = '#0f172a';
    if (!editorState.info.heroTextAlign) editorState.info.heroTextAlign = 'center';
    if (!editorState.info.ctaText) editorState.info.ctaText = 'Ver Catálogo';
    
    setupPreviewPane();
    populateEditorInputs();
    setupLiveListeners();
    
    // Initialize File Uploaders
    setupFileUpload('upload-logo-file', 'edit-logo-url', (url) => { editorState.info.logoUrl = url; });
    setupFileUpload('upload-hero-file', 'edit-hero-bg-image', (url) => { editorState.info.heroBgImage = url; });
    setupFileUpload('upload-product-file', 'edit-product-image');
    setupFileUpload('upload-video-file', 'edit-video-url');
    
    setupTabs();
    setupFeaturesCRUD();
    setupProductCRUD();
    setupVideosCRUD();
    setupGalleryImagesCRUD();
    setupWizard();
    
    renderEditorFeatures();
    renderEditorProducts();
    renderEditorVideos();
    renderEditorReviews();
    
    setupWorkspaceActions();
    
    showLoading(false);
  } catch (error) {
    showLoading(false);
    showToast(error.message, 'error');
    logout();
  }
}

function setupPreviewPane() {
  const iframe = document.getElementById('preview-iframe');
  const previewFrame = document.getElementById('preview-frame-container');
  previewFrame.className = 'preview-frame-container desktop-mode';
  
  iframe.onload = () => {
    const iframeDoc = getPreviewDocument();
    if (!iframeDoc) return;
    
    renderClientPage(iframeDoc);
    setupMobileMenu(iframeDoc);
    setupReviewForm(iframeDoc);
  };
  
  iframe.src = `/${currentBusinessId}`;
}

function populateEditorInputs() {
  const { theme, info } = editorState;
  
  document.getElementById('edit-font-family').value = theme.fontFamily;
  document.getElementById('edit-button-style').value = theme.buttonStyle;
  document.getElementById('edit-page-layout').value = theme.pageLayout || 'classic';
  
  document.getElementById('edit-logo-size').value = theme.logoSize || 'medium';
  document.getElementById('edit-hero-logo-size').value = theme.heroLogoSize || 'medium';
  document.getElementById('edit-card-size').value = theme.cardSize || 'medium';
  document.getElementById('edit-font-size').value = theme.fontSize || 'medium';
  document.getElementById('edit-carousel-height').value = theme.carouselHeight || 'aspect';
  
  document.getElementById('edit-primary-color').value = theme.primaryColor;
  document.getElementById('edit-primary-color-text').value = theme.primaryColor;
  document.getElementById('edit-secondary-color').value = theme.secondaryColor;
  document.getElementById('edit-secondary-color-text').value = theme.secondaryColor;
  document.getElementById('edit-bg-color').value = theme.backgroundColor;
  document.getElementById('edit-bg-color-text').value = theme.backgroundColor;
  document.getElementById('edit-text-color').value = theme.textColor || '#0f172a';
  document.getElementById('edit-text-color-text').value = theme.textColor || '#0f172a';
  
  document.getElementById('edit-nav-bg').value = theme.navBgColor;
  document.getElementById('edit-nav-bg-text').value = theme.navBgColor;
  document.getElementById('edit-footer-bg').value = theme.footerBgColor;
  document.getElementById('edit-footer-bg-text').value = theme.footerBgColor;
  document.getElementById('edit-card-bg').value = theme.cardBgColor;
  document.getElementById('edit-card-bg-text').value = theme.cardBgColor;
  
  document.getElementById('edit-carousel-type').value = theme.carouselType;
  renderEditorGalleryImages();
  
  document.getElementById('sec-visible-features').checked = theme.visibleSections.features !== false;
  document.getElementById('sec-visible-carousel').checked = theme.visibleSections.carousel !== false;
  document.getElementById('sec-visible-products').checked = theme.visibleSections.products !== false;
  document.getElementById('sec-visible-reviews').checked = theme.visibleSections.reviews !== false;
  document.getElementById('sec-visible-videos').checked = theme.visibleSections.videos !== false;
  document.getElementById('sec-visible-herologo').checked = theme.visibleSections.heroLogo !== false;
  
  document.getElementById('edit-title').value = info.title || '';
  document.getElementById('edit-logo-url').value = info.logoUrl || '';
  document.getElementById('edit-logo-type').value = theme.logoType || 'both';
  document.getElementById('edit-subtitle').value = info.subtitle || '';
  document.getElementById('edit-description').value = info.description || '';
  
  document.getElementById('edit-hero-bg-type').value = info.heroBgType;
  document.getElementById('edit-hero-bg-image').value = info.heroBgImage;
  document.getElementById('edit-hero-bg-color').value = info.heroBgColor || '#0f172a';
  document.getElementById('edit-hero-bg-color-text').value = info.heroBgColor || '#0f172a';
  document.getElementById('edit-hero-grad-start').value = info.heroGradientStart || '#52750f';
  document.getElementById('edit-hero-grad-start-text').value = info.heroGradientStart || '#52750f';
  document.getElementById('edit-hero-grad-end').value = info.heroGradientEnd || '#0f172a';
  document.getElementById('edit-hero-grad-end-text').value = info.heroGradientEnd || '#0f172a';
  document.getElementById('edit-hero-align').value = info.heroTextAlign;
  document.getElementById('edit-cta-text').value = info.ctaText;
  toggleHeroBgFields(info.heroBgType);
  
  document.getElementById('edit-email').value = info.email || '';
  document.getElementById('edit-phone').value = info.phone || '';
  document.getElementById('edit-address').value = info.address || '';
  
  document.getElementById('edit-social-whatsapp').value = info.socialWhatsapp || '';
  document.getElementById('edit-social-facebook').value = info.socialFacebook || '';
  document.getElementById('edit-social-instagram').value = info.socialInstagram || '';
  document.getElementById('edit-social-twitter').value = info.socialTwitter || '';
}

function toggleHeroBgFields(type) {
  const imageGroup = document.getElementById('group-hero-bg-image');
  const colorGroup = document.getElementById('group-hero-bg-color');
  const gradGroup = document.getElementById('group-hero-bg-gradient');
  
  if (imageGroup) imageGroup.style.display = type === 'image' ? 'block' : 'none';
  if (colorGroup) colorGroup.style.display = type === 'color' ? 'block' : 'none';
  if (gradGroup) gradGroup.style.display = type === 'gradient' ? 'block' : 'none';
}

// Live typing sync listeners
function setupLiveListeners() {
  const root = document.documentElement;
  
  function updatePreviewStyle(variable, value) {
    const previewDoc = getPreviewDocument();
    if (previewDoc) {
      previewDoc.documentElement.style.setProperty(variable, value);
    }
  }

  function bindColorInputs(pickerId, textId, themeProperty, cssVariable) {
    const picker = document.getElementById(pickerId);
    const text = document.getElementById(textId);
    
    picker.addEventListener('input', (e) => {
      const val = e.target.value;
      text.value = val;
      editorState.theme[themeProperty] = val;
      updatePreviewStyle(cssVariable, val);
      if (cssVariable === '--primary-color') {
        updatePreviewStyle('--primary-hover', adjustColorBrightness(val, -15));
      }
    });
    
    text.addEventListener('input', (e) => {
      const val = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        picker.value = val;
        editorState.theme[themeProperty] = val;
        updatePreviewStyle(cssVariable, val);
        if (cssVariable === '--primary-color') {
          updatePreviewStyle('--primary-hover', adjustColorBrightness(val, -15));
        }
      }
    });
  }
  
  bindColorInputs('edit-primary-color', 'edit-primary-color-text', 'primaryColor', '--primary-color');
  bindColorInputs('edit-secondary-color', 'edit-secondary-color-text', 'secondaryColor', '--secondary-color');
  bindColorInputs('edit-bg-color', 'edit-bg-color-text', 'backgroundColor', '--bg-color');
  bindColorInputs('edit-text-color', 'edit-text-color-text', 'textColor', '--text-color');
  bindColorInputs('edit-nav-bg', 'edit-nav-bg-text', 'navBgColor', '--nav-bg');
  bindColorInputs('edit-footer-bg', 'edit-footer-bg-text', 'footerBgColor', '--footer-bg');
  bindColorInputs('edit-card-bg', 'edit-card-bg-text', 'cardBgColor', '--card-bg');
  
  const bindHeroColor = (pickerId, textId, infoProperty) => {
    const picker = document.getElementById(pickerId);
    const text = document.getElementById(textId);
    if (picker && text) {
      picker.addEventListener('input', (e) => {
        const val = e.target.value;
        text.value = val;
        editorState.info[infoProperty] = val;
        const iframeDoc = getPreviewDocument();
        if (iframeDoc) renderClientPage(iframeDoc);
      });
      text.addEventListener('input', (e) => {
        const val = e.target.value;
        if (/^#[0-9A-F]{6}$/i.test(val)) {
          picker.value = val;
          editorState.info[infoProperty] = val;
          const iframeDoc = getPreviewDocument();
          if (iframeDoc) renderClientPage(iframeDoc);
        }
      });
    }
  };
  
  bindHeroColor('edit-hero-bg-color', 'edit-hero-bg-color-text', 'heroBgColor');
  bindHeroColor('edit-hero-grad-start', 'edit-hero-grad-start-text', 'heroGradientStart');
  bindHeroColor('edit-hero-grad-end', 'edit-hero-grad-end-text', 'heroGradientEnd');
  
  document.getElementById('edit-font-family').addEventListener('change', (e) => {
    const val = e.target.value;
    editorState.theme.fontFamily = val;
    updatePreviewStyle('--font-main', `'${val}', sans-serif`);
    updatePreviewStyle('--font-headings', `'${val}', sans-serif`);
  });
  
  document.getElementById('edit-button-style').addEventListener('change', (e) => {
    const val = e.target.value;
    editorState.theme.buttonStyle = val;
    let radius = '12px';
    if (val === 'pill') radius = '9999px';
    if (val === 'sharp') radius = '0px';
    updatePreviewStyle('--button-radius', radius);
  });
  
  document.getElementById('edit-logo-size').addEventListener('change', (e) => {
    editorState.theme.logoSize = e.target.value;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) applyCustomSizingStyles(editorState.theme, iframeDoc);
  });
  
  document.getElementById('edit-hero-logo-size').addEventListener('change', (e) => {
    editorState.theme.heroLogoSize = e.target.value;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) applyCustomSizingStyles(editorState.theme, iframeDoc);
  });
  
  document.getElementById('edit-card-size').addEventListener('change', (e) => {
    editorState.theme.cardSize = e.target.value;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) applyCustomSizingStyles(editorState.theme, iframeDoc);
  });
  
  document.getElementById('edit-font-size').addEventListener('change', (e) => {
    editorState.theme.fontSize = e.target.value;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) applyCustomSizingStyles(editorState.theme, iframeDoc);
  });
  
  document.getElementById('edit-carousel-height').addEventListener('change', (e) => {
    editorState.theme.carouselHeight = e.target.value;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) {
      applyCustomSizingStyles(editorState.theme, iframeDoc);
      renderCarouselSection(editorState.carouselImages, editorState.theme.carouselType, iframeDoc);
    }
  });
  
  document.getElementById('edit-page-layout').addEventListener('change', (e) => {
    editorState.theme.pageLayout = e.target.value;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) {
      renderClientPage(iframeDoc);
    }
  });
  
  document.getElementById('edit-carousel-type').addEventListener('change', (e) => {
    editorState.theme.carouselType = e.target.value;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) {
      renderCarouselSection(editorState.carouselImages, editorState.theme.carouselType, iframeDoc);
    }
  });

  
  const toggleCheckbox = (id, key) => {
    document.getElementById(id).addEventListener('change', (e) => {
      editorState.theme.visibleSections[key] = e.target.checked;
      const iframeDoc = getPreviewDocument();
      if (iframeDoc) {
        renderClientPage(iframeDoc);
      }
    });
  };
  
  toggleCheckbox('sec-visible-features', 'features');
  toggleCheckbox('sec-visible-carousel', 'carousel');
  toggleCheckbox('sec-visible-products', 'products');
  toggleCheckbox('sec-visible-reviews', 'reviews');
  toggleCheckbox('sec-visible-videos', 'videos');
  toggleCheckbox('sec-visible-herologo', 'heroLogo');
  
  document.getElementById('edit-logo-type').addEventListener('change', (e) => {
    editorState.theme.logoType = e.target.value;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) renderClientPage(iframeDoc);
  });

  document.getElementById('edit-title').addEventListener('input', (e) => {
    editorState.info.title = e.target.value;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) renderClientPage(iframeDoc);
  });
  
  document.getElementById('edit-logo-url').addEventListener('input', (e) => {
    editorState.info.logoUrl = e.target.value;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) renderClientPage(iframeDoc);
  });
  
  document.getElementById('edit-subtitle').addEventListener('input', (e) => {
    const val = e.target.value;
    editorState.info.subtitle = val;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) {
      const sub = iframeDoc.getElementById('view-hero-subtitle');
      if (sub) sub.textContent = val;
      const fDesc = iframeDoc.getElementById('view-footer-desc');
      if (fDesc) fDesc.textContent = val;
    }
  });
  
  document.getElementById('edit-description').addEventListener('input', (e) => {
    const val = e.target.value;
    editorState.info.description = val;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) {
      const desc = iframeDoc.getElementById('view-about-desc');
      if (desc) desc.textContent = val;
    }
  });
  
  document.getElementById('edit-hero-bg-type').addEventListener('change', (e) => {
    const val = e.target.value;
    editorState.info.heroBgType = val;
    toggleHeroBgFields(val);
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) renderClientPage(iframeDoc);
  });
  
  document.getElementById('edit-hero-bg-image').addEventListener('input', (e) => {
    editorState.info.heroBgImage = e.target.value;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) renderClientPage(iframeDoc);
  });
  
  document.getElementById('edit-hero-align').addEventListener('change', (e) => {
    editorState.info.heroTextAlign = e.target.value;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) renderClientPage(iframeDoc);
  });
  
  document.getElementById('edit-cta-text').addEventListener('input', (e) => {
    const val = e.target.value;
    editorState.info.ctaText = val;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) {
      const btn = iframeDoc.getElementById('view-cta-hero');
      if (btn) btn.textContent = val;
    }
  });
  
  document.getElementById('edit-email').addEventListener('input', (e) => {
    const val = e.target.value;
    editorState.info.email = val;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) {
      const el = iframeDoc.getElementById('view-contact-email');
      if (el) el.textContent = val || 'No proporcionado';
    }
  });
  document.getElementById('edit-phone').addEventListener('input', (e) => {
    const val = e.target.value;
    editorState.info.phone = val;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) {
      const el = iframeDoc.getElementById('view-contact-phone');
      if (el) el.textContent = val || 'No proporcionado';
    }
  });
  document.getElementById('edit-address').addEventListener('input', (e) => {
    const val = e.target.value;
    editorState.info.address = val;
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) {
      const el = iframeDoc.getElementById('view-contact-address');
      if (el) el.textContent = val || 'No proporcionado';
    }
  });
  
  const bindSocial = (id, key) => {
    document.getElementById(id).addEventListener('input', (e) => {
      editorState.info[key] = e.target.value;
      const iframeDoc = getPreviewDocument();
      if (iframeDoc) {
        renderSocialIcons(editorState.info, iframeDoc);
        renderHeroSocialIcons(editorState.info, iframeDoc);
      }
    });
  };
  bindSocial('edit-social-whatsapp', 'socialWhatsapp');
  bindSocial('edit-social-facebook', 'socialFacebook');
  bindSocial('edit-social-instagram', 'socialInstagram');
  bindSocial('edit-social-twitter', 'socialTwitter');
}

function setupTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// ==========================================================
// CRUD FEATURES LOGIC (ADMIN)
// ==========================================================
function setupFeaturesCRUD() {
  const addBtn = document.getElementById('add-feature-btn');
  const cancelBtn = document.getElementById('cancel-feature-btn');
  const saveBtn = document.getElementById('save-feature-btn');
  const formContainer = document.getElementById('feature-form-container');
  
  addBtn.addEventListener('click', () => {
    document.getElementById('feature-form-title').textContent = 'Agregar Ventaja';
    document.getElementById('edit-feature-id').value = '';
    document.getElementById('edit-feature-title').value = '';
    document.getElementById('edit-feature-icon').value = 'fa-star';
    document.getElementById('edit-feature-desc').value = '';
    formContainer.style.display = 'block';
  });
  
  cancelBtn.addEventListener('click', () => {
    formContainer.style.display = 'none';
  });
  
  saveBtn.addEventListener('click', () => {
    const id = document.getElementById('edit-feature-id').value;
    const title = document.getElementById('edit-feature-title').value.trim();
    const icon = document.getElementById('edit-feature-icon').value;
    const description = document.getElementById('edit-feature-desc').value.trim();
    
    if (!title) {
      showToast('Por favor, ingresa el título de la ventaja.', 'error');
      return;
    }
    
    if (id) {
      const idx = editorState.features.findIndex(f => f.id === id);
      if (idx !== -1) {
        editorState.features[idx] = { id, title, icon, description };
        showToast('Ventaja actualizada en la previsualización.', 'success');
      }
    } else {
      const newId = 'feat_' + Date.now();
      editorState.features.push({ id: newId, title, icon, description });
      showToast('Ventaja agregada a la previsualización.', 'success');
    }
    
    formContainer.style.display = 'none';
    renderEditorFeatures();
    
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) renderFeaturesSection(editorState.features, iframeDoc);
  });
}

function renderEditorFeatures() {
  const container = document.getElementById('admin-features-list');
  container.innerHTML = '';
  
  if (!editorState.features || editorState.features.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 12px 0;">No hay ventajas competitivas agregadas.</p>';
    return;
  }
  
  editorState.features.forEach(feat => {
    const card = document.createElement('div');
    card.className = 'admin-item-card';
    
    card.innerHTML = `
      <div class="admin-item-icon-preview">
        <i class="fa-solid ${feat.icon || 'fa-star'}"></i>
      </div>
      <div class="admin-item-details">
        <h5>${feat.title}</h5>
        <span>Icono: ${feat.icon || 'Estrella'}</span>
      </div>
      <div class="admin-item-actions">
        <button class="btn-edit" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-delete" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    
    card.querySelector('.btn-edit').addEventListener('click', () => {
      document.getElementById('feature-form-title').textContent = 'Editar Ventaja';
      document.getElementById('edit-feature-id').value = feat.id;
      document.getElementById('edit-feature-title').value = feat.title;
      document.getElementById('edit-feature-icon').value = feat.icon || 'fa-star';
      document.getElementById('edit-feature-desc').value = feat.description || '';
      document.getElementById('feature-form-container').style.display = 'block';
    });
    
    card.querySelector('.btn-delete').addEventListener('click', () => {
      editorState.features = editorState.features.filter(f => f.id !== feat.id);
      showToast('Ventaja eliminada de la previsualización.', 'success');
      renderEditorFeatures();
      const iframeDoc = getPreviewDocument();
      if (iframeDoc) renderFeaturesSection(editorState.features, iframeDoc);
    });
    
    container.appendChild(card);
  });
}

// ==========================================================
// CRUD PRODUCTS LOGIC (ADMIN)
// ==========================================================
function setupProductCRUD() {
  const addBtn = document.getElementById('add-product-btn');
  const cancelBtn = document.getElementById('cancel-product-btn');
  const saveBtn = document.getElementById('save-product-btn');
  const formContainer = document.getElementById('product-form-container');
  
  addBtn.addEventListener('click', () => {
    document.getElementById('product-form-title').textContent = 'Agregar Producto';
    document.getElementById('edit-product-id').value = '';
    document.getElementById('edit-product-name').value = '';
    document.getElementById('edit-product-price').value = '';
    document.getElementById('edit-product-image').value = '';
    document.getElementById('edit-product-desc').value = '';
    formContainer.style.display = 'block';
  });
  
  cancelBtn.addEventListener('click', () => {
    formContainer.style.display = 'none';
  });
  
  saveBtn.addEventListener('click', () => {
    const id = document.getElementById('edit-product-id').value;
    const name = document.getElementById('edit-product-name').value.trim();
    const price = parseFloat(document.getElementById('edit-product-price').value);
    const image = document.getElementById('edit-product-image').value.trim();
    const description = document.getElementById('edit-product-desc').value.trim();
    
    if (!name || isNaN(price)) {
      showToast('Por favor, ingresa el nombre y un precio válido.', 'error');
      return;
    }
    
    if (id) {
      const productIndex = editorState.products.findIndex(p => p.id === id);
      if (productIndex !== -1) {
        editorState.products[productIndex] = { id, name, price, image, description };
        showToast('Producto actualizado en la previsualización.', 'success');
      }
    } else {
      const newId = 'prod_' + Date.now();
      editorState.products.push({ id: newId, name, price, image, description });
      showToast('Producto agregado a la previsualización.', 'success');
    }
    
    formContainer.style.display = 'none';
    renderEditorProducts();
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) renderProductsSection(editorState.products, iframeDoc);
  });
}

function renderEditorProducts() {
  const container = document.getElementById('admin-products-list');
  container.innerHTML = '';
  
  if (editorState.products.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 12px 0;">No hay productos agregados.</p>';
    return;
  }
  
  editorState.products.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'admin-item-card';
    const fallbackImg = prod.image && prod.image.trim() !== '' ? prod.image : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=100';
    
    card.innerHTML = `
      <img src="${fallbackImg}" class="admin-item-img" onerror="this.src='https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=100'">
      <div class="admin-item-details">
        <h5>${prod.name}</h5>
        <span>$${parseFloat(prod.price).toFixed(2)}</span>
      </div>
      <div class="admin-item-actions">
        <button class="btn-edit" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-delete" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    
    card.querySelector('.btn-edit').addEventListener('click', () => {
      document.getElementById('product-form-title').textContent = 'Editar Producto';
      document.getElementById('edit-product-id').value = prod.id;
      document.getElementById('edit-product-name').value = prod.name;
      document.getElementById('edit-product-price').value = prod.price;
      document.getElementById('edit-product-image').value = prod.image || '';
      document.getElementById('edit-product-desc').value = prod.description || '';
      document.getElementById('product-form-container').style.display = 'block';
    });
    
    card.querySelector('.btn-delete').addEventListener('click', () => {
      editorState.products = editorState.products.filter(p => p.id !== prod.id);
      showToast('Producto eliminado de la previsualización.', 'success');
      renderEditorProducts();
      const iframeDoc = getPreviewDocument();
      if (iframeDoc) renderProductsSection(editorState.products, iframeDoc);
    });
    
    container.appendChild(card);
  });
}

function renderEditorReviews() {
  const container = document.getElementById('admin-reviews-list');
  container.innerHTML = '';
  
  if (!editorState.reviews || editorState.reviews.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 12px 0;">No tienes reseñas de clientes aún.</p>';
    return;
  }
  
  editorState.reviews.forEach(rev => {
    const card = document.createElement('div');
    card.className = 'admin-mod-review-card';
    
    card.innerHTML = `
      <div class="admin-mod-review-header">
        <div class="admin-mod-review-meta">
          <h5>${rev.name}</h5>
          <span>Contacto: <strong>${rev.contact}</strong></span>
        </div>
        <div class="admin-mod-review-stars">
          ${generateStarsHTML(rev.rating)}
        </div>
      </div>
      <p class="admin-mod-review-body">"${rev.comment}"</p>
      <button class="btn-delete-review"><i class="fa-solid fa-trash-can"></i> Eliminar Reseña</button>
    `;
    
    card.querySelector('.btn-delete-review').addEventListener('click', async () => {
      if (confirm(`¿Estás seguro de que deseas eliminar la reseña de "${rev.name}"?`)) {
        showLoading(true, 'Eliminando reseña...');
        try {
          const response = await fetch(`/api/business/${currentBusinessId}/reviews/${rev.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': authToken }
          });
          
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Error al borrar reseña');
          }
          
          showLoading(false);
          showToast('Reseña eliminada correctamente.', 'success');
          editorState.reviews = editorState.reviews.filter(r => r.id !== rev.id);
          renderEditorReviews();
          const iframeDoc = getPreviewDocument();
          if (iframeDoc) renderReviewsSection(editorState.reviews, iframeDoc);
        } catch (error) {
          showLoading(false);
          showToast(error.message, 'error');
        }
      }
    });
    
    container.appendChild(card);
  });
}

function setupWorkspaceActions() {
  const deviceBtns = document.querySelectorAll('.device-btn');
  const previewFrame = document.getElementById('preview-frame-container');
  
  deviceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      deviceBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const device = btn.getAttribute('data-device');
      if (device === 'mobile') {
        previewFrame.className = 'preview-frame-container mobile-mode';
      } else {
        previewFrame.className = 'preview-frame-container desktop-mode';
      }
    });
  });
  
  document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
  });
  
  const superadminBackBtn = document.getElementById('superadmin-back-btn');
  if (superadminBackBtn) {
    superadminBackBtn.addEventListener('click', () => {
      isSuperAdminEditing = false;
      currentBusinessId = 'admin';
      
      // Hide editor workspace, show superadmin workspace
      document.getElementById('editor-workspace').style.display = 'none';
      document.getElementById('superadmin-workspace').style.display = 'grid';
      
      // Hide back button
      superadminBackBtn.style.display = 'none';
      
      // Reload superadmin dashboard
      loadSuperAdminDashboard();
    });
  }
  
  document.getElementById('save-changes-btn').addEventListener('click', async () => {
    showLoading(true, 'Guardando cambios en la base de datos...');
    try {
      const response = await fetch(`/api/business/${currentBusinessId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken
        },
        body: JSON.stringify({
          theme: editorState.theme,
          info: editorState.info,
          features: editorState.features,
          carouselImages: editorState.carouselImages,
          products: editorState.products,
          videos: editorState.videos
        })
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar cambios.');
      }
      
      showLoading(false);
      showToast('¡Cambios guardados con éxito en AWS!', 'success');
      
      editorState = result.data;
      const iframeDoc = getPreviewDocument();
      if (iframeDoc) renderClientPage(iframeDoc);
    } catch (error) {
      showLoading(false);
      showToast(error.message, 'error');
    }
  });
  
  document.getElementById('export-page-btn').addEventListener('click', () => {
    exportStandaloneHTML();
  });
}

function logout() {
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('business_id');
  authToken = '';
  currentBusinessId = '';
  window.location.reload();
}

// EXPORT STANDALONE HTML FILE
async function exportStandaloneHTML() {
  showLoading(true, 'Generando código para exportación...');
  
  try {
    const styleRes = await fetch('/css/style.css');
    if (!styleRes.ok) throw new Error('No se pudo leer style.css');
    const cssContent = await styleRes.text();
    
    // Read clean document context or clone main view
    const clientViewClone = document.getElementById('client-view').cloneNode(true);
    
    const adminLink = clientViewClone.querySelector('.admin-login-link');
    if (adminLink) adminLink.remove();
    
    const clientHTML = clientViewClone.outerHTML;
    const serverOrigin = window.location.origin;
    
    const standaloneHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${editorState.info.title} | Catálogo</title>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <!-- Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <style>
    /* Embedded Design System */
    ${cssContent}
    
    /* Dynamic Theme Overrides */
    :root {
      --primary-color: ${editorState.theme.primaryColor};
      --primary-hover: ${adjustColorBrightness(editorState.theme.primaryColor, -15)};
      --secondary-color: ${editorState.theme.secondaryColor};
      --bg-color: ${editorState.theme.backgroundColor};
      --text-color: ${editorState.theme.textColor};
      --nav-bg: ${editorState.theme.navBgColor};
      --footer-bg: ${editorState.theme.footerBgColor};
      --card-bg: ${editorState.theme.cardBgColor};
      --font-main: '${editorState.theme.fontFamily}', sans-serif;
      --font-headings: '${editorState.theme.fontFamily}', sans-serif;
      --button-radius: ${editorState.theme.buttonStyle === 'pill' ? '9999px' : (editorState.theme.buttonStyle === 'sharp' ? '0px' : '12px')};
    }
    
    .client-container {
      display: flex !important;
      min-height: 100vh;
      width: 100%;
    }
  </style>
</head>
<body>

  ${clientHTML}

  <script>
    const businessId = "${currentBusinessId}";
    const apiOrigin = "${serverOrigin}";
    let carouselIndex = 0;
    let carouselTimer = null;
    
    document.addEventListener('DOMContentLoaded', () => {
      setupCarousel();
      setupMobileMenu();
      setupReviewForm();
    });
    
    function setupMobileMenu() {
      const btn = document.getElementById('mobile-menu-btn');
      const menu = document.getElementById('nav-menu');
      if (btn && menu) {
        btn.addEventListener('click', () => {
          menu.classList.toggle('active');
        });
        menu.querySelectorAll('a').forEach(l => {
          l.addEventListener('click', () => menu.classList.remove('active'));
        });
      }
    }
    
    function setupCarousel() {
      const track = document.getElementById('carousel-track');
      const dots = document.querySelectorAll('#carousel-dots-container .carousel-dot');
      const prev = document.getElementById('carousel-prev');
      const next = document.getElementById('carousel-next');
      const wrapper = document.querySelector('.carousel-wrapper');
      
      const total = dots.length;
      if (total <= 1) {
        if(prev) prev.style.display = 'none';
        if(next) next.style.display = 'none';
        return;
      }
      
      const isFade = wrapper.classList.contains('fade-mode');
      
      function showSlide(idx) {
        carouselIndex = (idx + total) % total;
        dots.forEach(d => d.classList.remove('active'));
        if (dots[carouselIndex]) dots[carouselIndex].classList.add('active');
        
        const items = track.querySelectorAll('.carousel-item');
        items.forEach(it => it.classList.remove('active'));
        
        if (isFade) {
          if (items[carouselIndex]) items[carouselIndex].classList.add('active');
        } else {
          track.style.transform = \`translateX(-\${carouselIndex * 100}%)\`;
          if (items[carouselIndex]) items[carouselIndex].classList.add('active');
        }
      }
      
      if (prev) prev.addEventListener('click', () => {
        showSlide(carouselIndex - 1);
        resetAutoplay();
      });
      
      if (next) next.addEventListener('click', () => {
        showSlide(carouselIndex + 1);
        resetAutoplay();
      });
      
      dots.forEach((d, i) => {
        d.addEventListener('click', () => {
          showSlide(i);
          resetAutoplay();
        });
      });
      
      function startAutoplay() {
        carouselTimer = setInterval(() => {
          showSlide(carouselIndex + 1);
        }, 5000);
      }
      
      function resetAutoplay() {
        clearInterval(carouselTimer);
        startAutoplay();
      }
      
      startAutoplay();
    }
    
    function setupReviewForm() {
      const form = document.getElementById('add-review-form');
      if (!form) return;
      
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('rev-name').value;
        const contact = document.getElementById('rev-contact').value;
        const comment = document.getElementById('rev-comment').value;
        
        const ratingInput = document.querySelector('input[name="rating-input"]:checked');
        if (!ratingInput) {
          alert('Por favor, selecciona una calificación de estrellas.');
          return;
        }
        const rating = ratingInput.value;
        
        try {
          const res = await fetch(\`\${apiOrigin}/api/business/\${businessId}/reviews\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, rating, comment, contact })
          });
          
          if (!res.ok) throw new Error('Error al publicar reseña');
          
          const result = await res.json();
          alert('¡Gracias! Tu reseña ha sido publicada con éxito.');
          form.reset();
          addReviewLocally(result.review);
        } catch (err) {
          alert('No se pudo enviar la reseña: ' + err.message);
        }
      });
    }
    
    function addReviewLocally(newReview) {
      const grid = document.getElementById('reviews-list-container');
      const emptyStateMsg = grid.querySelector('p');
      if (emptyStateMsg) {
        grid.innerHTML = '';
      }
      
      const card = document.createElement('div');
      card.className = 'review-card';
      
      let starsHtml = '';
      const full = Math.floor(newReview.rating);
      starsHtml += '<i class="fa-solid fa-star"></i>'.repeat(full);
      starsHtml += '<i class="fa-regular fa-star"></i>'.repeat(5 - full);
      
      card.innerHTML = \`
        <div class="review-header">
          <span class="review-author">\${newReview.name}</span>
          <div class="review-stars">
            \${starsHtml}
          </div>
        </div>
        <p class="review-text">"\${newReview.comment}"</p>
      \`;
      
      grid.insertBefore(card, grid.firstChild);
    }
  </script>
</body>
</html>`;

    const blob = new Blob([standaloneHTML], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentBusinessId}_landing_page.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showLoading(false);
    showToast('Código exportado y descargado.', 'success');
  } catch (error) {
    showLoading(false);
    showToast(error.message, 'error');
  }
}

// ==========================================================
// SYSTEM FEEDBACK HELPERS
// ==========================================================
function showLoading(show, text = 'Cargando...') {
  const overlay = document.getElementById('loading-overlay');
  const txtElement = document.getElementById('loading-text');
  
  if (show) {
    txtElement.textContent = text;
    overlay.style.display = 'flex';
  } else {
    overlay.style.display = 'none';
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ==========================================================
// CRUD VIDEOS GALLERY LOGIC (ADMIN)
// ==========================================================
function setupVideosCRUD() {
  const addBtn = document.getElementById('add-video-btn');
  const cancelBtn = document.getElementById('cancel-video-btn');
  const saveBtn = document.getElementById('save-video-btn');
  const formContainer = document.getElementById('video-form-container');
  
  if (!addBtn || !cancelBtn || !saveBtn || !formContainer) return;
  
  addBtn.addEventListener('click', () => {
    document.getElementById('video-form-title').textContent = 'Agregar Video';
    document.getElementById('edit-video-id').value = '';
    document.getElementById('edit-video-title').value = '';
    document.getElementById('edit-video-url').value = '';
    document.getElementById('edit-video-desc').value = '';
    formContainer.style.display = 'block';
  });
  
  cancelBtn.addEventListener('click', () => {
    formContainer.style.display = 'none';
  });
  
  saveBtn.addEventListener('click', () => {
    const id = document.getElementById('edit-video-id').value;
    const title = document.getElementById('edit-video-title').value.trim();
    const url = document.getElementById('edit-video-url').value.trim();
    const description = document.getElementById('edit-video-desc').value.trim();
    
    if (!title || !url) {
      showToast('Por favor, ingresa el título y la URL del video.', 'error');
      return;
    }
    
    if (id) {
      const videoIndex = editorState.videos.findIndex(v => v.id === id);
      if (videoIndex !== -1) {
        editorState.videos[videoIndex] = { id, title, url, description };
        showToast('Video actualizado en la previsualización.', 'success');
      }
    } else {
      const newId = 'vid_' + Date.now();
      editorState.videos.push({ id: newId, title, url, description });
      showToast('Video agregado a la previsualización.', 'success');
    }
    
    formContainer.style.display = 'none';
    renderEditorVideos();
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) renderVideosSection(editorState.videos, iframeDoc);
  });
}

function renderEditorVideos() {
  const container = document.getElementById('admin-videos-list');
  if (!container) return;
  container.innerHTML = '';
  
  if (!editorState.videos || editorState.videos.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 12px 0;">No hay videos agregados.</p>';
    return;
  }
  
  editorState.videos.forEach(vid => {
    const card = document.createElement('div');
    card.className = 'admin-item-card';
    
    card.innerHTML = `
      <div class="admin-item-icon-preview">
        <i class="fa-solid fa-play" style="font-size: 1.2rem; color: var(--secondary-color);"></i>
      </div>
      <div class="admin-item-details">
        <h5>${vid.title}</h5>
        <span style="display: block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${vid.url}</span>
      </div>
      <div class="admin-item-actions">
        <button class="btn-edit" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-delete" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    
    card.querySelector('.btn-edit').addEventListener('click', () => {
      document.getElementById('video-form-title').textContent = 'Editar Video';
      document.getElementById('edit-video-id').value = vid.id;
      document.getElementById('edit-video-title').value = vid.title;
      document.getElementById('edit-video-url').value = vid.url;
      document.getElementById('edit-video-desc').value = vid.description || '';
      document.getElementById('video-form-container').style.display = 'block';
    });
    
    card.querySelector('.btn-delete').addEventListener('click', () => {
      editorState.videos = editorState.videos.filter(v => v.id !== vid.id);
      showToast('Video eliminado de la previsualización.', 'success');
      renderEditorVideos();
      const iframeDoc = getPreviewDocument();
      if (iframeDoc) renderVideosSection(editorState.videos, iframeDoc);
    });
    
    container.appendChild(card);
  });
}

// ==========================================================
// CRUD GALLERY IMAGES LOGIC (ADMIN)
// ==========================================================
function setupGalleryImagesCRUD() {
  const addBtn = document.getElementById('add-gallery-image-btn');
  if (!addBtn) return;
  
  addBtn.addEventListener('click', () => {
    editorState.carouselImages.push('');
    renderEditorGalleryImages();
    const iframeDoc = getPreviewDocument();
    if (iframeDoc) {
      renderCarouselSection(editorState.carouselImages, editorState.theme.carouselType, iframeDoc);
    }
  });
}

function renderEditorGalleryImages() {
  const container = document.getElementById('admin-gallery-images-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!editorState.carouselImages || editorState.carouselImages.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 12px 0;">No hay imágenes agregadas.</p>';
    return;
  }
  
  editorState.carouselImages.forEach((imgUrl, index) => {
    const item = document.createElement('div');
    item.className = 'input-list-item';
    item.setAttribute('data-index', index);
    
    // Unique IDs for upload triggers
    const uploadInputId = `upload-carousel-dynamic-${index}`;
    const textInputId = `edit-carousel-img-dynamic-${index}`;
    
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-size: 0.8rem; font-weight: 600; color: #cbd5e1;">Foto ${index + 1}</span>
        <button type="button" class="btn-delete-gallery-img" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 2px 6px;" title="Eliminar foto">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      <div class="file-upload-wrapper">
        <input type="text" id="${textInputId}" class="gallery-img-url-input" value="${imgUrl || ''}" placeholder="URL o sube foto">
        <input type="file" id="${uploadInputId}" accept="image/*" class="file-input-hidden" style="display: none;">
        <button type="button" class="btn-upload-trigger" title="Subir foto" onclick="document.getElementById('${uploadInputId}').click()">
          <i class="fa-solid fa-cloud-arrow-up"></i>
        </button>
      </div>
    `;
    
    // 1. Text input listener (URL typing)
    const textInput = item.querySelector('.gallery-img-url-input');
    textInput.addEventListener('input', (e) => {
      editorState.carouselImages[index] = e.target.value;
      const iframeDoc = getPreviewDocument();
      if (iframeDoc) {
        renderCarouselSection(editorState.carouselImages, editorState.theme.carouselType, iframeDoc);
      }
    });
    
    // 2. Delete button listener
    item.querySelector('.btn-delete-gallery-img').addEventListener('click', () => {
      editorState.carouselImages.splice(index, 1);
      renderEditorGalleryImages();
      const iframeDoc = getPreviewDocument();
      if (iframeDoc) {
        renderCarouselSection(editorState.carouselImages, editorState.theme.carouselType, iframeDoc);
      }
    });
    
    container.appendChild(item);
    
    // 3. Initialize file uploader for this item dynamically
    setupFileUpload(uploadInputId, textInputId, (url) => {
      editorState.carouselImages[index] = url;
      const iframeDoc = getPreviewDocument();
      if (iframeDoc) {
        renderCarouselSection(editorState.carouselImages, editorState.theme.carouselType, iframeDoc);
      }
    });
  });
}

// ==========================================================
// MASTER ADMIN (SUPER-ADMIN) PORTAL FRONTEND
// ==========================================================
let masterBusinesses = [];

async function loadSuperAdminDashboard() {
  // Bind master logout button
  const masterLogoutBtn = document.getElementById('master-logout-btn');
  if (masterLogoutBtn) {
    masterLogoutBtn.replaceWith(masterLogoutBtn.cloneNode(true)); // remove listeners
    document.getElementById('master-logout-btn').addEventListener('click', () => {
      logout();
    });
  }

  // Bind create account form submit
  const createForm = document.getElementById('master-create-account-form');
  if (createForm) {
    createForm.replaceWith(createForm.cloneNode(true)); // remove listeners
    document.getElementById('master-create-account-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const businessId = document.getElementById('master-new-business-id').value.trim();
      const title = document.getElementById('master-new-business-title').value.trim();
      const subtitle = document.getElementById('master-new-business-subtitle').value.trim();
      const password = document.getElementById('master-new-business-password').value;
      
      showLoading(true, 'Creando cuenta de cliente...');
      try {
        const response = await fetch('/api/admin/businesses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken
          },
          body: JSON.stringify({ businessId, password, title, subtitle })
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Error al crear la cuenta.');
        }
        
        showLoading(false);
        showToast(result.message, 'success');
        document.getElementById('master-create-account-form').reset();
        await fetchMasterBusinesses();
      } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
      }
    });
  }

  // Bind password reset form submit
  const resetForm = document.getElementById('master-reset-password-form');
  if (resetForm) {
    resetForm.replaceWith(resetForm.cloneNode(true)); // remove listeners
    document.getElementById('master-reset-password-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const businessId = document.getElementById('reset-modal-business-id').textContent;
      const newPassword = document.getElementById('master-reset-new-password').value;
      
      showLoading(true, 'Actualizando contraseña...');
      try {
        const response = await fetch(`/api/admin/businesses/${businessId}/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken
          },
          body: JSON.stringify({ newPassword })
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Error al actualizar contraseña.');
        }
        
        showLoading(false);
        showToast(result.message, 'success');
        closeResetPasswordModal();
      } catch (error) {
        showLoading(false);
        showToast(error.message, 'error');
      }
    });
  }

  // Bind close modal button
  const closeModalBtn = document.getElementById('close-reset-modal-btn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeResetPasswordModal);
  }

  // Fetch accounts list
  await fetchMasterBusinesses();
}

function superAdminEditBusiness(businessId) {
  isSuperAdminEditing = true;
  superAdminSavedId = 'admin';
  currentBusinessId = businessId;
  
  // Hide superadmin workspace, show editor workspace
  document.getElementById('superadmin-workspace').style.display = 'none';
  document.getElementById('editor-workspace').style.display = 'grid';
  
  // Show back button
  const backBtn = document.getElementById('superadmin-back-btn');
  if (backBtn) backBtn.style.display = 'inline-flex';
  
  // Load workspace data for this client business
  setupAdminEditorWorkspace();
}

async function fetchMasterBusinesses() {
  try {
    const response = await fetch('/api/admin/businesses', {
      headers: {
        'Authorization': authToken
      }
    });
    
    if (!response.ok) {
      throw new Error('No se pudo cargar la lista de cuentas.');
    }
    
    masterBusinesses = await response.json();
    renderMasterBusinessList();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderMasterBusinessList() {
  const tbody = document.getElementById('master-business-list-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (masterBusinesses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #94a3b8; padding: 24px 8px;">
          No hay cuentas de cliente registradas todavía. ¡Crea la primera usando el formulario lateral!
        </td>
      </tr>
    `;
    return;
  }
  
  masterBusinesses.forEach(business => {
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
      <td style="font-weight: 600; color: #ffffff;">
        <a href="/${business.businessId}" target="_blank" style="color: var(--primary-color); text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
          ${business.businessId} <i class="fa-solid fa-square-arrow-up-right" style="font-size: 0.75rem;"></i>
        </a>
      </td>
      <td style="color: #cbd5e1;">
        <div style="font-weight: 500;">${business.title}</div>
        <div style="font-size: 0.75rem; color: #64748b;">${business.subtitle || ''}</div>
      </td>
      <td style="text-align: center; color: #94a3b8; font-size: 0.85rem;">
        <span style="background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 9999px;">${business.productsCount}</span>
      </td>
      <td style="text-align: center; color: #94a3b8; font-size: 0.85rem;">
        <span style="background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 9999px;">${business.reviewsCount}</span>
      </td>
      <td style="text-align: right; white-space: nowrap;">
        <button class="btn-action-sm btn-edit-page" data-id="${business.businessId}" style="background-color: #82b225; color: #090d16; border: none; font-weight: 600; margin-right: 4px; padding: 4px 10px; border-radius: 4px; cursor: pointer;">
          <i class="fa-solid fa-pen"></i> Editar
        </button>
        <button class="btn-action-sm btn-warning btn-reset-pass" data-id="${business.businessId}">
          <i class="fa-solid fa-key"></i> Llave
        </button>
        <button class="btn-action-sm btn-danger btn-delete-account" data-id="${business.businessId}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    
    // Bind edit page
    tr.querySelector('.btn-edit-page').addEventListener('click', () => {
      superAdminEditBusiness(business.businessId);
    });
    
    // Bind reset password
    tr.querySelector('.btn-reset-pass').addEventListener('click', () => {
      openResetPasswordModal(business.businessId);
    });
    
    // Bind delete account
    tr.querySelector('.btn-delete-account').addEventListener('click', async () => {
      if (confirm(`¿Estás completamente seguro de que deseas eliminar permanentemente la cuenta "${business.businessId}" y todos sus productos, fotos y opiniones? Esta acción no se puede deshacer.`)) {
        showLoading(true, 'Eliminando cuenta...');
        try {
          const response = await fetch(`/api/admin/businesses/${business.businessId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': authToken
            }
          });
          
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Error al eliminar cuenta.');
          }
          
          showLoading(false);
          showToast(result.message, 'success');
          await fetchMasterBusinesses();
        } catch (error) {
          showLoading(false);
          showToast(error.message, 'error');
        }
      }
    });
    
    tbody.appendChild(tr);
  });
}

function openResetPasswordModal(businessId) {
  document.getElementById('reset-modal-business-id').textContent = businessId;
  document.getElementById('master-reset-new-password').value = '';
  document.getElementById('master-reset-password-modal').style.display = 'flex';
}

function closeResetPasswordModal() {
  document.getElementById('master-reset-password-modal').style.display = 'none';
}

// ==========================================================
// GUIDED SETUP WIZARD (ADMIN)
// ==========================================================
let currentWizardStep = 1;

function fastUpdateWizardPreviewStyle(variable, value) {
  const previewDoc = getPreviewDocument();
  if (previewDoc) {
    previewDoc.documentElement.style.setProperty(variable, value);
  }
}

function fastUpdateWizardHeroBg() {
  const previewDoc = getPreviewDocument();
  if (!previewDoc) return;
  const heroEl = previewDoc.getElementById('inicio');
  const overlayEl = previewDoc.getElementById('view-hero-overlay');
  if (!heroEl) return;

  const bgType = editorState.info.heroBgType || 'color';
  if (overlayEl) {
    if (bgType === 'image') {
      overlayEl.style.display = 'block';
      overlayEl.style.background = 'rgba(15, 23, 42, 0.65)';
    } else {
      overlayEl.style.display = 'none';
    }
  }

  let isLight = false;
  if (bgType === 'gradient') {
    const gradStart = editorState.info.heroGradientStart || '#52750f';
    const gradEnd = editorState.info.heroGradientEnd || '#0f172a';
    heroEl.style.background = `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`;
    heroEl.style.backgroundImage = '';
    isLight = isColorLight(gradStart);
  } else if (bgType === 'image' && editorState.info.heroBgImage && editorState.info.heroBgImage.trim() !== '') {
    heroEl.style.backgroundImage = `url('${editorState.info.heroBgImage}')`;
    heroEl.style.backgroundSize = 'cover';
    heroEl.style.backgroundPosition = 'center';
    heroEl.style.backgroundColor = 'transparent';
    isLight = false;
  } else {
    const solidColor = editorState.info.heroBgColor || '#0f172a';
    heroEl.style.background = solidColor;
    heroEl.style.backgroundImage = '';
    isLight = isColorLight(solidColor);
  }

  if (isLight) {
    heroEl.classList.add('hero-light-theme');
  } else {
    heroEl.classList.remove('hero-light-theme');
  }
}

function updateWizardComponentPreview() {
  const fontSelect = document.getElementById('wizard-font');
  const pColorInput = document.getElementById('wizard-color-primary');
  const sColorInput = document.getElementById('wizard-color-secondary');
  
  if (!fontSelect || !pColorInput || !sColorInput) return;
  
  const font = fontSelect.value;
  const pColor = pColorInput.value;
  const sColor = sColorInput.value;
  
  const title = document.getElementById('wizard-preview-card-title');
  const text = document.getElementById('wizard-preview-card-text');
  const badge = document.getElementById('wizard-preview-card-badge');
  const btn = document.getElementById('wizard-preview-card-button');
  
  if (title) title.style.fontFamily = `'${font}', sans-serif`;
  if (text) text.style.fontFamily = `'${font}', sans-serif`;
  if (btn) {
    btn.style.fontFamily = `'${font}', sans-serif`;
    btn.style.backgroundColor = pColor;
  }
  if (badge) {
    badge.style.backgroundColor = sColor;
    const isLight = isColorLight(sColor);
    badge.style.color = isLight ? '#0f172a' : '#ffffff';
  }
}

function setupWizard() {
  const triggerBtn = document.getElementById('wizard-trigger-btn');
  const overlay = document.getElementById('wizard-overlay');
  const closeBtn = document.getElementById('close-wizard-btn');
  const prevBtn = document.getElementById('wizard-prev-btn');
  const nextBtn = document.getElementById('wizard-next-btn');

  if (!triggerBtn || !overlay) return;

  // Open Wizard
  triggerBtn.addEventListener('click', () => {
    currentWizardStep = 1;
    
    // Populate Wizard fields with current editorState values
    document.getElementById('wizard-title').value = editorState.info.title || '';
    document.getElementById('wizard-subtitle').value = editorState.info.subtitle || '';
    document.getElementById('wizard-logo').value = editorState.info.logoUrl || '';
    
    // Font selection & preview
    const fontSelect = document.getElementById('wizard-font');
    fontSelect.value = editorState.theme.fontFamily || 'Plus Jakarta Sans';
    
    const pColor = editorState.theme.primaryColor || '#52750f';
    const sColor = editorState.theme.secondaryColor || '#a3e635';
    document.getElementById('wizard-color-primary').value = pColor;
    document.getElementById('wizard-color-primary-text').value = pColor;
    document.getElementById('wizard-color-secondary').value = sColor;
    document.getElementById('wizard-color-secondary-text').value = sColor;
    
    // Hero Section
    const bgType = editorState.info.heroBgType || 'color';
    document.getElementById('wizard-hero-bg-type').value = bgType;
    updateWizardHeroBgFields(bgType);
    document.getElementById('wizard-cta-text').value = editorState.info.ctaText || 'Ver Catálogo';
    
    // Social Links
    document.getElementById('wizard-phone').value = editorState.info.phone || '';
    document.getElementById('wizard-whatsapp').value = editorState.info.socialWhatsapp || '';
    document.getElementById('wizard-facebook').value = editorState.info.socialFacebook || '';
    document.getElementById('wizard-instagram').value = editorState.info.socialInstagram || '';
    document.getElementById('wizard-twitter').value = editorState.info.socialTwitter || '';
    
    // Set active step view and local component preview
    updateWizardStepView(1);
    updateWizardComponentPreview();
    overlay.style.display = 'flex';
  });

  // Font change listener for live preview in wizard
  const fontSelect = document.getElementById('wizard-font');
  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      editorState.theme.fontFamily = e.target.value;
      updateWizardComponentPreview();
      refreshPreviewAndInputs();
    });
  }

  // Hero BG Type change listener
  const heroBgTypeSelect = document.getElementById('wizard-hero-bg-type');
  if (heroBgTypeSelect) {
    heroBgTypeSelect.addEventListener('change', (e) => {
      editorState.info.heroBgType = e.target.value;
      updateWizardHeroBgFields(e.target.value);
      refreshPreviewAndInputs();
    });
  }

  // Close Wizard
  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  // Previous Step
  prevBtn.addEventListener('click', () => {
    saveWizardStepData(currentWizardStep);
    if (currentWizardStep > 1) {
      currentWizardStep--;
      updateWizardStepView(currentWizardStep);
    }
  });

  // Next Step / Finish
  nextBtn.addEventListener('click', () => {
    saveWizardStepData(currentWizardStep);
    if (currentWizardStep < 4) {
      currentWizardStep++;
      updateWizardStepView(currentWizardStep);
    } else {
      overlay.style.display = 'none';
      showToast('¡Asistente completado! No olvides presionar "Guardar Cambios" para salvar tu progreso.', 'success');
    }
  });

  // Double-sync wizard color pickers (Step 2) - OPTIMIZED FOR 60FPS
  const bindWizardColor = (pickerId, textId, stateKey, cssVar) => {
    const picker = document.getElementById(pickerId);
    const text = document.getElementById(textId);
    if (!picker || !text) return;

    picker.addEventListener('input', (e) => {
      const val = e.target.value;
      text.value = val;
      editorState.theme[stateKey] = val;
      
      // Fast, lightweight style injection
      fastUpdateWizardPreviewStyle(cssVar, val);
      if (cssVar === '--primary-color') {
        fastUpdateWizardPreviewStyle('--primary-hover', adjustColorBrightness(val, -15));
      }
      updateWizardComponentPreview(); // Refresh modal card colors
    });

    picker.addEventListener('change', () => {
      refreshPreviewAndInputs(); // Complete redraw only when user releases mouse
    });

    text.addEventListener('input', (e) => {
      const val = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        picker.value = val;
        editorState.theme[stateKey] = val;
        fastUpdateWizardPreviewStyle(cssVar, val);
        if (cssVar === '--primary-color') {
          fastUpdateWizardPreviewStyle('--primary-hover', adjustColorBrightness(val, -15));
        }
        updateWizardComponentPreview();
        refreshPreviewAndInputs();
      }
    });
  };

  bindWizardColor('wizard-color-primary', 'wizard-color-primary-text', 'primaryColor', '--primary-color');
  bindWizardColor('wizard-color-secondary', 'wizard-color-secondary-text', 'secondaryColor', '--secondary-color');

  // Set file uploader inside Wizard (Step 1)
  setupFileUpload('wizard-upload-logo', 'wizard-logo', (url) => {
    editorState.info.logoUrl = url;
    document.getElementById('wizard-logo').value = url;
    refreshPreviewAndInputs();
  });
}

function updateWizardHeroBgFields(bgType) {
  const container = document.getElementById('wizard-hero-bg-fields');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (bgType === 'color') {
    container.innerHTML = `
      <div class="form-group" style="margin-top: 12px;">
        <label style="color: #cbd5e1 !important;">Color de Fondo de Portada</label>
        <div style="display: flex; gap: 8px;">
          <input type="color" id="wizard-hero-bg-color" style="width: 42px; height: 42px; padding: 0; border: none; border-radius: 6px; cursor: pointer; background: transparent;">
          <input type="text" id="wizard-hero-bg-color-text" style="flex: 1; background: #0f172a; border: 1px solid #334155; color: white; padding: 8px; border-radius: 6px; font-family: monospace;">
        </div>
      </div>
    `;
    
    const picker = document.getElementById('wizard-hero-bg-color');
    const text = document.getElementById('wizard-hero-bg-color-text');
    const val = editorState.info.heroBgColor || '#0f172a';
    picker.value = val;
    text.value = val;
    
    picker.addEventListener('input', (e) => {
      text.value = e.target.value;
      editorState.info.heroBgColor = e.target.value;
      fastUpdateWizardHeroBg(); // Optimized update
    });
    
    picker.addEventListener('change', () => {
      refreshPreviewAndInputs();
    });

    text.addEventListener('input', (e) => {
      const v = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(v)) {
        picker.value = v;
        editorState.info.heroBgColor = v;
        fastUpdateWizardHeroBg();
        refreshPreviewAndInputs();
      }
    });
    
  } else if (bgType === 'gradient') {
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
        <div class="form-group">
          <label style="color: #cbd5e1 !important;">Color Inicio (Gradiente)</label>
          <div style="display: flex; gap: 8px;">
            <input type="color" id="wizard-hero-grad-start" style="width: 42px; height: 42px; padding: 0; border: none; border-radius: 6px; cursor: pointer; background: transparent;">
            <input type="text" id="wizard-hero-grad-start-text" style="flex: 1; background: #0f172a; border: 1px solid #334155; color: white; padding: 8px; border-radius: 6px; font-family: monospace;">
          </div>
        </div>
        <div class="form-group">
          <label style="color: #cbd5e1 !important;">Color Fin (Gradiente)</label>
          <div style="display: flex; gap: 8px;">
            <input type="color" id="wizard-hero-grad-end" style="width: 42px; height: 42px; padding: 0; border: none; border-radius: 6px; cursor: pointer; background: transparent;">
            <input type="text" id="wizard-hero-grad-end-text" style="flex: 1; background: #0f172a; border: 1px solid #334155; color: white; padding: 8px; border-radius: 6px; font-family: monospace;">
          </div>
        </div>
      </div>
    `;
    
    const pStart = document.getElementById('wizard-hero-grad-start');
    const tStart = document.getElementById('wizard-hero-grad-start-text');
    const valStart = editorState.info.heroGradientStart || '#52750f';
    pStart.value = valStart;
    tStart.value = valStart;
    
    const pEnd = document.getElementById('wizard-hero-grad-end');
    const tEnd = document.getElementById('wizard-hero-grad-end-text');
    const valEnd = editorState.info.heroGradientEnd || '#0f172a';
    pEnd.value = valEnd;
    tEnd.value = valEnd;
    
    pStart.addEventListener('input', (e) => {
      tStart.value = e.target.value;
      editorState.info.heroGradientStart = e.target.value;
      fastUpdateWizardHeroBg();
    });
    pStart.addEventListener('change', () => {
      refreshPreviewAndInputs();
    });

    tStart.addEventListener('input', (e) => {
      const v = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(v)) {
        pStart.value = v;
        editorState.info.heroGradientStart = v;
        fastUpdateWizardHeroBg();
        refreshPreviewAndInputs();
      }
    });
    
    pEnd.addEventListener('input', (e) => {
      tEnd.value = e.target.value;
      editorState.info.heroGradientEnd = e.target.value;
      fastUpdateWizardHeroBg();
    });
    pEnd.addEventListener('change', () => {
      refreshPreviewAndInputs();
    });

    tEnd.addEventListener('input', (e) => {
      const v = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(v)) {
        pEnd.value = v;
        editorState.info.heroGradientEnd = v;
        fastUpdateWizardHeroBg();
        refreshPreviewAndInputs();
      }
    });
    
  } else if (bgType === 'image') {
    container.innerHTML = `
      <div class="form-group" style="margin-top: 12px;">
        <label style="color: #cbd5e1 !important;">Imagen de Fondo (URL o Sube foto)</label>
        <div class="file-upload-wrapper">
          <input type="text" id="wizard-hero-bg-image" placeholder="Pega URL o sube archivo" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: white; padding: 10px; border-radius: 6px;">
          <input type="file" id="wizard-upload-hero" accept="image/*" style="display: none;">
          <button type="button" class="btn-upload-trigger" onclick="document.getElementById('wizard-upload-hero').click()">
            <i class="fa-solid fa-cloud-arrow-up"></i>
          </button>
        </div>
      </div>
    `;
    
    const textImg = document.getElementById('wizard-hero-bg-image');
    textImg.value = editorState.info.heroBgImage || '';
    
    textImg.addEventListener('input', (e) => {
      editorState.info.heroBgImage = e.target.value;
      fastUpdateWizardHeroBg();
    });
    textImg.addEventListener('change', () => {
      refreshPreviewAndInputs();
    });
    
    setupFileUpload('wizard-upload-hero', 'wizard-hero-bg-image', (url) => {
      editorState.info.heroBgImage = url;
      document.getElementById('wizard-hero-bg-image').value = url;
      refreshPreviewAndInputs();
    });
  }
}

function refreshPreviewAndInputs() {
  const iframeDoc = getPreviewDocument();
  if (iframeDoc) renderClientPage(iframeDoc);
  populateEditorInputs();
}

function updateWizardStepView(step) {
  // Show active content, hide others
  const contents = document.querySelectorAll('.wizard-step-content');
  contents.forEach(content => {
    if (parseInt(content.getAttribute('data-step')) === step) {
      content.style.display = 'block';
    } else {
      content.style.display = 'none';
    }
  });

  // Progress Bar width
  const progressLine = document.getElementById('wizard-progress-line');
  if (progressLine) {
    progressLine.style.width = `${(step - 1) * 33.33}%`;
  }

  // Active step node indicators
  const nodes = document.querySelectorAll('.wizard-step-node');
  nodes.forEach(node => {
    const nodeStep = parseInt(node.getAttribute('data-step'));
    if (nodeStep <= step) {
      node.style.background = 'var(--primary-color)';
      node.style.color = 'white';
    } else {
      node.style.background = '#334155';
      node.style.color = '#94a3b8';
    }
  });

  // Nav buttons
  const prevBtn = document.getElementById('wizard-prev-btn');
  const nextBtn = document.getElementById('wizard-next-btn');
  const indicator = document.getElementById('wizard-step-indicator');

  if (prevBtn) prevBtn.style.display = step === 1 ? 'none' : 'inline-block';
  if (indicator) indicator.textContent = `Paso ${step} de 4`;
  
  if (nextBtn) {
    if (step === 4) {
      nextBtn.innerHTML = 'Finalizar <i class="fa-solid fa-circle-check"></i>';
    } else {
      nextBtn.innerHTML = 'Siguiente <i class="fa-solid fa-arrow-right"></i>';
    }
  }
}

function saveWizardStepData(step) {
  if (step === 1) {
    editorState.info.title = document.getElementById('wizard-title').value.trim();
    editorState.info.subtitle = document.getElementById('wizard-subtitle').value.trim();
    editorState.info.logoUrl = document.getElementById('wizard-logo').value.trim();
  } else if (step === 2) {
    editorState.theme.fontFamily = document.getElementById('wizard-font').value;
    editorState.theme.primaryColor = document.getElementById('wizard-color-primary').value;
    editorState.theme.secondaryColor = document.getElementById('wizard-color-secondary').value;
  } else if (step === 3) {
    editorState.info.heroBgType = document.getElementById('wizard-hero-bg-type').value;
    editorState.info.ctaText = document.getElementById('wizard-cta-text').value.trim();
    
    // Save dynamic bg fields
    if (editorState.info.heroBgType === 'color') {
      const el = document.getElementById('wizard-hero-bg-color');
      if (el) editorState.info.heroBgColor = el.value;
    } else if (editorState.info.heroBgType === 'gradient') {
      const elS = document.getElementById('wizard-hero-grad-start');
      const elE = document.getElementById('wizard-hero-grad-end');
      if (elS) editorState.info.heroGradientStart = elS.value;
      if (elE) editorState.info.heroGradientEnd = elE.value;
    } else if (editorState.info.heroBgType === 'image') {
      const el = document.getElementById('wizard-hero-bg-image');
      if (el) editorState.info.heroBgImage = el.value.trim();
    }
  } else if (step === 4) {
    editorState.info.phone = document.getElementById('wizard-phone').value.trim();
    editorState.info.socialWhatsapp = document.getElementById('wizard-whatsapp').value.trim();
    editorState.info.socialFacebook = document.getElementById('wizard-facebook').value.trim();
    editorState.info.socialInstagram = document.getElementById('wizard-instagram').value.trim();
    editorState.info.socialTwitter = document.getElementById('wizard-twitter').value.trim();
  }

  refreshPreviewAndInputs();
}
