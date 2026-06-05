/* ============================================================
   THE BUNGALOWS — Main JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Page Loader ─────────────────────────────────────── */
  const loader = document.getElementById('page-loader');
  window.addEventListener('load', () => {
    loader.classList.add('loaded');
  });
  // Fallback if load event already fired
  if (document.readyState === 'complete') loader.classList.add('loaded');


  /* ── 2. Scroll Reveal (Intersection Observer) ────────────── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });

  document.querySelectorAll('[data-reveal], [data-stagger], .img-reveal, .line-grow').forEach(el => {
    revealObserver.observe(el);
  });


  /* ── 4. Nav: scroll opacity + active section ─────────────── */
  const nav      = document.getElementById('global-nav');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id], header[id]');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => sectionObserver.observe(s));

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.style.backgroundColor = 'rgba(251, 249, 248, 0.97)';
      nav.classList.add('shadow-sm');
    } else {
      nav.style.backgroundColor = 'rgba(251, 249, 248, 0.80)';
      nav.classList.remove('shadow-sm');
    }
  }, { passive: true });


  /* ── 5. Mobile Menu ──────────────────────────────────────── */
  const menuBtn    = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuIcon   = document.getElementById('menu-icon');

  menuBtn.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    menuIcon.textContent = open ? 'close' : 'menu';
  });

  // Close on link click
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      menuIcon.textContent = 'menu';
    });
  });


  /* ── 6. Parallax on Gallery Images ───────────────────────── */
  const parallaxImgs = document.querySelectorAll('.parallax-img');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    parallaxImgs.forEach(img => {
      const rect   = img.closest('.gallery-item').getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      img.style.transform = `translateY(${center * 0.06}px)`;
    });
  }, { passive: true });


  /* ── 7. Form Submission → Supabase ───────────────────────── */
  const { createClient } = supabase;
  const db = createClient(
    'https://vcwkqkghfjsulsnuvdzy.supabase.co',
    'sb_publishable_YRiSQ98nqhetj9D4IGwIag_7kClHVkg'
  );

  const form        = document.getElementById('enquiry-form');
  const formWrap    = document.getElementById('form-wrap');
  const formSuccess = document.getElementById('form-success');

  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    btn.textContent = 'Sending…';
    btn.disabled    = true;

    const { error } = await db.from('sell_enquiries').insert({
      name:  document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim() || null,
    });

    if (error) {
      console.error('Supabase error:', error.message);
      btn.textContent = 'Something went wrong — please try again.';
      btn.disabled    = false;
      return;
    }

    gtag('event', 'conversion', { 'send_to': 'AW-18190056053/zcw2CIzhk7UcEPX02OFD' });

    formWrap.style.display = 'none';
    formSuccess.classList.add('show');
  });


  /* ── 8. Scroll-to-top button ──────────────────────────────── */
  const scrollTopBtn = document.getElementById('scroll-top');

  window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 600);
  }, { passive: true });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });




  /* ── 10. Magnetic button effect ────────────────────────────── */
  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect   = btn.getBoundingClientRect();
      const dx     = e.clientX - (rect.left + rect.width  / 2);
      const dy     = e.clientY - (rect.top  + rect.height / 2);
      btn.style.transform = `translate(${dx * 0.2}px, ${dy * 0.2}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0,0)';
      btn.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
    });
  });


});
