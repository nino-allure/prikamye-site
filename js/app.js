document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // 1. Инициализация идеального скролла Lenis
    if (typeof Lenis !== 'undefined') {
        const lenis = new Lenis({
            duration: 1, // Длительность инерции (чем больше, тем более "тягучий" скролл)
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Формула плавного замедления
            smoothWheel: true,
            wheelMultiplier: 1,
            smoothTouch: false, // На телефонах лучше оставлять нативный скролл (так привычнее пользователям)
            touchMultiplier: 2,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#' || targetId.length < 2) return;
                const target = document.querySelector(targetId);
                if (!target) return;
                e.preventDefault();
                lenis.scrollTo(target, { offset: -70, duration: 1.5 });
            });
        });

        // Остановка скролла, если открыто мобильное меню
        const header = document.querySelector('.js-header');
        if (header) {
            lenis.on('scroll', () => {
                header.classList.toggle('is-scrolled', window.scrollY > 20);
            });
        }
        window.lenis = lenis; 
    }

    const videos = document.querySelectorAll('video[autoplay]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        videos.forEach(video => {
            video.pause();
            video.removeAttribute('autoplay');
        });
    }

    // 2. Анимации при скролле (IntersectionObserver)
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    
    document.querySelectorAll('.js-reveal').forEach(el => observer.observe(el));

    // 3. Шапка
    const header = document.querySelector('.js-header');
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Проверка при загрузке

    // 4. Мобильное меню
    const burger = document.querySelector('.js-burger');
    const nav = document.querySelector('.js-nav');
    if (burger && nav) {
        const toggleMenu = (forceClose = false) => {
            const isActive = forceClose ? false : !nav.classList.contains('is-active');
            nav.classList.toggle('is-active', isActive);
            burger.classList.toggle('is-active', isActive);
            burger.setAttribute('aria-expanded', String(isActive));
            document.body.style.overflow = isActive ? 'hidden' : '';
        };

        burger.addEventListener('click', () => toggleMenu());
        
        document.querySelectorAll('.js-nav-link').forEach(link => {
            link.addEventListener('click', () => toggleMenu(true));
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('is-active')) toggleMenu(true);
        });
    }

    // 5. Карточки команды — раскрытие информации по наведению/тапу/клавиатуре
    const teamToggles = document.querySelectorAll('.js-team-toggle');
    if (teamToggles.length) {
        const closeAll = (except) => {
            teamToggles.forEach(el => {
                if (el !== except) {
                    el.classList.remove('is-active');
                    el.setAttribute('aria-expanded', 'false');
                }
            });
        };

        const toggle = (el) => {
            const willOpen = !el.classList.contains('is-active');
            closeAll(el);
            el.classList.toggle('is-active', willOpen);
            el.setAttribute('aria-expanded', String(willOpen));
        };

        teamToggles.forEach(el => {
            el.addEventListener('click', () => toggle(el));
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle(el);
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.js-team-toggle')) closeAll(null);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAll(null);
        });
    }

    // 6. Форма
    const form = document.getElementById('app-form');
    const statusBox = document.getElementById('form-status');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.querySelector('.btn-loader');
    const submitBtn = document.getElementById('submit-btn');


    const API_URL = 'https://script.google.com/macros/s/AKfycbwqWHNYe3QUZVocuqBL50cRCXkI1OD0xtKRlv6_ySi1jc0Rihw6sHkYyouZeArsJ-T2qQ/exec';
    const PHONE_RE = /^[\d+()\s-]{10,18}$/;

    function setStatus(message, type) {
        statusBox.textContent = message;
        statusBox.classList.remove('form__status--success', 'form__status--error', 'form__status--warning');
        statusBox.classList.add(`form__status--${type}`);
        statusBox.style.display = 'flex';
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            let isValid = true;
            form.querySelectorAll('.form__group').forEach(g => g.classList.remove('is-error'));

            // Проверка обязательных полей
            form.querySelectorAll('[required]').forEach(f => {
                if (!f.value.trim()) {
                    f.closest('.form__group').classList.add('is-error');
                    isValid = false;
                }
            });

            // Проверка телефона
            const phoneField = form.querySelector('[name="phone"]');
            if (phoneField && phoneField.value.trim() && !PHONE_RE.test(phoneField.value.trim())) {
                phoneField.closest('.form__group').classList.add('is-error');
                isValid = false;
            }

            if (!isValid) return;

            if (API_URL.includes('СЮДА_ВСТАВИТЬ')) {
                setStatus('Форма ещё не подключена к серверу.', 'warning');
                return;
            }

            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            statusBox.style.display = 'none';

            try {
                const response = await fetch(API_URL, { method: 'POST', body: new FormData(form) });
                const result = await response.json();
                if (result.result === 'success') {
                    setStatus('Заявка отправлена! Мы скоро свяжемся с вами.', 'success');
                    form.reset();
                } else {
                    throw new Error(result.message || 'Unknown error');
                }
            } catch {
                setStatus('Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.', 'error');
            } finally {
                submitBtn.disabled = false;
                btnText.style.display = 'inline-block';
                btnLoader.style.display = 'none';
            }
        });

        // Убираем ошибку при вводе
        form.querySelectorAll('.form__input, .form__select').forEach(input => {
            input.addEventListener('input', function () { 
                this.closest('.form__group').classList.remove('is-error'); 
            });
        });
    }
});
