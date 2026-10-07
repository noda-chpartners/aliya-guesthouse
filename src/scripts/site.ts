import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HOLD = 5;
const FADE = 1.6;

const lenis = new Lenis({
	lerp: 0.085,
	anchors: { offset: -76 },
	autoRaf: false,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
	lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

const header = document.querySelector<HTMLElement>('[data-header]');
const menu = document.querySelector<HTMLElement>('[data-menu]');
const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menuLabel = menuToggle?.querySelector('.sr-only');

const heroEl = document.querySelector<HTMLElement>('.hero');

const onHeaderScroll = () => {
	const limit = Math.max((heroEl?.offsetHeight ?? window.innerHeight) - 80, 24);
	header?.classList.toggle('is-solid', lenis.animatedScroll > limit);
};

lenis.on('scroll', onHeaderScroll);
onHeaderScroll();

const setMenuOpen = (open: boolean, immediate = false) => {
	if (!menu || !menuToggle || !header) return;

	menuToggle.setAttribute('aria-expanded', String(open));
	if (menuLabel) menuLabel.textContent = open ? 'メニューを閉じる' : 'メニューを開く';
	header.classList.toggle('is-open', open);
	document.documentElement.classList.toggle('is-locked', open);

	if (open) {
		lenis.stop();
		menu.classList.add('is-open');
		menu.setAttribute('aria-hidden', 'false');
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		gsap.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0 : 0.45, ease: 'power2.out' });
		gsap.fromTo(
			menu.querySelectorAll('[data-menu-item]'),
			{ autoAlpha: 0, y: reduced ? 0 : 18 },
			{
				autoAlpha: 1,
				y: 0,
				duration: reduced ? 0 : 0.55,
				stagger: reduced ? 0 : 0.05,
				delay: reduced ? 0 : 0.06,
				ease: 'power3.out',
			},
		);
		menu.querySelector<HTMLElement>('a')?.focus();
		return;
	}

	lenis.start();
	const finish = () => {
		menu.classList.remove('is-open');
		menu.setAttribute('aria-hidden', 'true');
	};

	if (immediate) {
		gsap.set(menu, { autoAlpha: 0 });
		finish();
		return;
	}

	gsap.to(menu, {
		autoAlpha: 0,
		duration: 0.3,
		ease: 'power2.in',
		onComplete: finish,
	});
};

menuToggle?.addEventListener('click', () => {
	const open = menuToggle.getAttribute('aria-expanded') === 'true';
	setMenuOpen(!open);
});

menu?.querySelectorAll('a').forEach((link) => {
	link.addEventListener('click', () => setMenuOpen(false));
});

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
		setMenuOpen(false);
		menuToggle.focus();
	}
});

const desktopNav = window.matchMedia('(min-width: 800px)');
desktopNav.addEventListener('change', (event) => {
	if (event.matches) setMenuOpen(false, true);
});

const motionQuery = gsap.matchMedia();

motionQuery.add('(prefers-reduced-motion: reduce)', () => {
	gsap.set('[data-reveal], .hero__reveal', { opacity: 1, y: 0, visibility: 'visible' });
	return initHero(true);
});

motionQuery.add('(prefers-reduced-motion: no-preference)', () => {
	const cleanup = initHero(false);
	initReveals();
	return cleanup;
});

motionQuery.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
	initParallax();
});

window.addEventListener('load', () => {
	ScrollTrigger.refresh();
});

function initReveals() {
	gsap.set('[data-reveal]', { opacity: 0, y: 28 });
	ScrollTrigger.batch('[data-reveal]', {
		start: 'top 88%',
		once: true,
		onEnter: (batch) => {
			gsap.to(batch, {
				opacity: 1,
				y: 0,
				duration: 1,
				stagger: 0.08,
				ease: 'power3.out',
				overwrite: true,
			});
		},
	});

	gsap.fromTo(
		'.hero__reveal',
		{ opacity: 0, y: 22 },
		{ opacity: 1, y: 0, duration: 1.05, stagger: 0.08, delay: 0.15, ease: 'power3.out' },
	);
}

function initParallax() {
	gsap.utils.toArray<HTMLElement>('.media').forEach((frame) => {
		const img = frame.querySelector('img');
		if (!img) return;
		gsap.fromTo(
			img,
			{ yPercent: -6, scale: 1.12 },
			{
				yPercent: 6,
				scale: 1.12,
				ease: 'none',
				scrollTrigger: {
					trigger: frame,
					start: 'top bottom',
					end: 'bottom top',
					scrub: true,
				},
			},
		);
	});
}

function initHero(reduced: boolean) {
	const root = document.querySelector<HTMLElement>('[data-hero]');
	const slides = gsap.utils.toArray<HTMLElement>('[data-hero-slide]');
	const dots = gsap.utils.toArray<HTMLButtonElement>('[data-hero-dot]');
	const current = document.querySelector<HTMLElement>('[data-hero-current]');
	const toggle = document.querySelector<HTMLButtonElement>('[data-hero-toggle]');
	if (!root || slides.length === 0) return () => {};

	let index = 0;
	let paused = reduced;
	let motion = gsap.timeline();
	let timer: gsap.core.Tween | null = null;

	const updateUI = () => {
		if (current) current.textContent = String(index + 1).padStart(2, '0');
		dots.forEach((dot, i) => {
			dot.classList.toggle('is-active', i === index);
			dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
		});
		slides.forEach((slide, i) => {
			slide.setAttribute('aria-hidden', i === index ? 'false' : 'true');
		});
		if (toggle) {
			toggle.setAttribute('aria-pressed', String(paused));
			toggle.textContent = paused ? '再生' : '停止';
		}
	};

	slides.forEach((slide, i) => {
		gsap.set(slide, { autoAlpha: i === 0 ? 1 : 0, zIndex: i === 0 ? 1 : 0 });
	});
	updateUI();

	const schedule = () => {
		timer?.kill();
		if (paused || reduced) return;
		timer = gsap.delayedCall(HOLD, () => {
			goTo((index + 1) % slides.length);
			schedule();
		});
	};

	const goTo = (next: number) => {
		if (next === index) return;
		const prev = index;
		index = next;
		motion.kill();

		slides.forEach((slide, i) => {
			if (i !== prev && i !== next) gsap.set(slide, { autoAlpha: 0, zIndex: 0 });
		});

		const previous = slides[prev];
		const upcoming = slides[next];
		const img = upcoming.querySelector('img');
		gsap.set(previous, { zIndex: 1, autoAlpha: 1 });
		gsap.set(upcoming, { zIndex: 2 });

		motion = gsap.timeline();
		if (reduced) {
			motion.set(upcoming, { autoAlpha: 1 });
			motion.set(previous, { autoAlpha: 0, zIndex: 0 });
			if (img) motion.set(img, { scale: 1 });
		} else {
			if (img) {
				motion.fromTo(img, { scale: 1.08 }, { scale: 1, duration: HOLD + FADE, ease: 'none' }, 0);
			}
			motion.to(upcoming, { autoAlpha: 1, duration: FADE, ease: 'power2.inOut' }, 0);
			motion.to(previous, { autoAlpha: 0, duration: FADE, ease: 'power2.inOut' }, 0);
		}
		updateUI();
	};

	if (!reduced) {
		const firstImg = slides[0].querySelector('img');
		if (firstImg) {
			motion.fromTo(firstImg, { scale: 1.08 }, { scale: 1, duration: HOLD + FADE, ease: 'none' });
		}
		schedule();
	} else {
		slides.forEach((slide) => {
			const img = slide.querySelector('img');
			if (img) gsap.set(img, { scale: 1 });
		});
	}

	const onDot = (event: Event) => {
		const button = event.currentTarget;
		if (!(button instanceof HTMLButtonElement)) return;
		const next = dots.indexOf(button);
		if (next < 0) return;
		goTo(next);
		schedule();
	};
	dots.forEach((dot) => dot.addEventListener('click', onDot));

	const onToggle = () => {
		paused = !paused;
		updateUI();
		if (paused) timer?.pause();
		else schedule();
	};
	toggle?.addEventListener('click', onToggle);

	const onKey = (event: KeyboardEvent) => {
		if (!root.contains(document.activeElement)) return;
		if (event.key === 'ArrowRight') {
			goTo((index + 1) % slides.length);
			schedule();
		}
		if (event.key === 'ArrowLeft') {
			goTo((index - 1 + slides.length) % slides.length);
			schedule();
		}
	};
	root.addEventListener('keydown', onKey);

	const onVisibility = () => {
		if (document.hidden) timer?.pause();
		else if (!paused) timer?.resume();
	};
	document.addEventListener('visibilitychange', onVisibility);

	const observer = new IntersectionObserver(
		([entry]) => {
			if (!entry) return;
			if (!entry.isIntersecting) timer?.pause();
			else if (!paused && !document.hidden) timer?.resume();
		},
		{ threshold: 0.3 },
	);
	observer.observe(root);

	return () => {
		timer?.kill();
		motion.kill();
		observer.disconnect();
		dots.forEach((dot) => dot.removeEventListener('click', onDot));
		toggle?.removeEventListener('click', onToggle);
		root.removeEventListener('keydown', onKey);
		document.removeEventListener('visibilitychange', onVisibility);
	};
}
