import "lite-youtube-embed";
import BasePage from "./base-page";
import Lightbox from "fslightbox";
window.fslightbox = Lightbox;

class Home extends BasePage {
    onReady() {
        this.initFeaturedTabs();
        this.initEnhancedCarousel();
    }

    /**
     * used in views/components/home/featured-products-style*.twig
     */
    initFeaturedTabs() {
        app.all('.tab-trigger', el => {
            el.addEventListener('click', ({ currentTarget: btn }) => {
                let id = btn.dataset.componentId;
                // btn.setAttribute('fill', 'solid');
                app.toggleClassIf(`#${id} .tabs-wrapper>div`, 'is-active opacity-0 translate-y-3', 'inactive', tab => tab.id == btn.dataset.target)
                    .toggleClassIf(`#${id} .tab-trigger`, 'is-active', 'inactive', tabBtn => tabBtn == btn);

                // fadeIn active tabe
                setTimeout(() => app.toggleClassIf(`#${id} .tabs-wrapper>div`, 'opacity-100 translate-y-0', 'opacity-0 translate-y-3', tab => tab.id == btn.dataset.target), 100);
            })
        });
        document.querySelectorAll('.s-block-tabs').forEach(block => block.classList.add('tabs-initialized'));
    }

    initEnhancedCarousel() {
        const carousels = document.querySelectorAll('[data-enhanced-carousel]');
        if (!carousels.length) {
            return;
        }

        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isRTL = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl';

        carousels.forEach(component => {
            const track = component.querySelector('[data-carousel-track]');
            if (!track) {
                return;
            }

            const slides = Array.from(track.children);
            const slideCount = slides.length;
            if (slideCount <= 1) {
                component.querySelectorAll('[data-carousel-prev], [data-carousel-next], [data-carousel-dots]').forEach(control => {
                    if (control) {
                        control.classList.add('hidden');
                    }
                });
                return;
            }

            if (reduceMotion) {
                track.style.transitionDuration = '0ms';
            }

            let current = 0;
            let isTransitioning = false;
            let fallbackTimeout;
            const prevBtn = component.querySelector('[data-carousel-prev]');
            const nextBtn = component.querySelector('[data-carousel-next]');
            const dots = Array.from(component.querySelectorAll('[data-carousel-dot]'));

            const updateDots = () => {
                dots.forEach((dot, index) => {
                    const isActive = index === current;
                    dot.classList.toggle('bg-white', isActive);
                    dot.classList.toggle('bg-white/40', !isActive);
                    dot.setAttribute('aria-current', isActive ? 'true' : 'false');
                });
            };

            const updateSlides = () => {
                slides.forEach((slide, index) => {
                    slide.setAttribute('aria-hidden', index === current ? 'false' : 'true');
                });
            };

            const applyTransform = () => {
                track.style.transform = `translate3d(-${current * 100}%, 0, 0)`;
            };

            const goTo = targetIndex => {
                const normalized = ((targetIndex % slideCount) + slideCount) % slideCount;
                if (normalized === current || isTransitioning) {
                    return;
                }
                isTransitioning = true;
                current = normalized;
                applyTransform();
                updateDots();
                updateSlides();
                window.clearTimeout(fallbackTimeout);
                fallbackTimeout = window.setTimeout(() => {
                    isTransitioning = false;
                }, reduceMotion ? 0 : 600);
            };

            applyTransform();
            updateDots();
            updateSlides();

            track.addEventListener('transitionend', () => {
                window.clearTimeout(fallbackTimeout);
                isTransitioning = false;
            });

            prevBtn?.addEventListener('click', () => {
                goTo(isRTL ? current + 1 : current - 1);
            });

            nextBtn?.addEventListener('click', () => {
                goTo(isRTL ? current - 1 : current + 1);
            });

            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    goTo(index);
                });
            });

            let touchStartX = null;

            component.addEventListener('touchstart', event => {
                const touch = event.touches[0];
                touchStartX = touch ? touch.clientX : null;
            }, { passive: true });

            component.addEventListener('touchend', event => {
                if (touchStartX === null) {
                    return;
                }
                const touch = event.changedTouches[0];
                if (!touch) {
                    touchStartX = null;
                    return;
                }
                const deltaX = touch.clientX - touchStartX;
                if (Math.abs(deltaX) > 60) {
                    if (deltaX > 0) {
                        goTo(isRTL ? current + 1 : current - 1);
                    } else {
                        goTo(isRTL ? current - 1 : current + 1);
                    }
                }
                touchStartX = null;
            }, { passive: true });
        });
    }
}

Home.initiateWhenReady(['index']);
