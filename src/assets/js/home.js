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

        carousels.forEach(component => {
            const track = component.querySelector('[data-carousel-track]');
            if (!track) {
                return;
            }

            const animationType = component.dataset.animationType || 'slide';
            const autoplay = component.dataset.autoplay === 'true';
            const autoplayDelay = parseInt(component.dataset.autoplayDelay) || 5000;
            const slides = Array.from(track.querySelectorAll('[data-carousel-slide]'));
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
            let autoplayInterval;
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

            const animateText = (slide) => {
                const textElements = slide.querySelectorAll('[data-carousel-text]');
                textElements.forEach((element, index) => {
                    // Reset animation
                    element.classList.remove('animate-slide-in-left', 'animate-fade-in-up');
                    element.style.opacity = '0';
                    element.style.transform = '';

                    // Force reflow to ensure the reset takes effect
                    void element.offsetWidth;

                    // Apply animation with staggered delay
                    setTimeout(() => {
                        // Remove inline opacity to let animation control it
                        element.style.opacity = '';

                        if (index === 0) {
                            element.classList.add('animate-slide-in-left');
                        } else {
                            element.classList.add('animate-fade-in-up');
                        }
                    }, index * 250);
                });
            };

            const updateSlides = () => {
                slides.forEach((slide, index) => {
                    const isActive = index === current;
                    slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');

                    if (animationType === 'fade') {
                        slide.style.opacity = isActive ? '1' : '0';
                        slide.style.zIndex = isActive ? '1' : '0';
                    }

                    // Animate text for active slide
                    if (isActive) {
                        animateText(slide);
                    } else {
                        // Reset text opacity for inactive slides
                        const textElements = slide.querySelectorAll('[data-carousel-text]');
                        textElements.forEach(el => {
                            el.classList.remove('animate-slide-in-left', 'animate-fade-in-up');
                            el.style.opacity = '0';
                        });
                    }
                });
            };

            const applyTransform = () => {
                if (animationType === 'slide') {
                    track.style.transform = `translate3d(-${current * 100}%, 0, 0)`;
                }
            };

            const goTo = targetIndex => {
                const normalized = ((targetIndex % slideCount) + slideCount) % slideCount;
                if (normalized === current || isTransitioning) {
                    return;
                }
                isTransitioning = true;
                pauseAllVideos();
                current = normalized;
                applyTransform();
                updateDots();
                updateSlides();
                playCurrentVideo();
                window.clearTimeout(fallbackTimeout);
                fallbackTimeout = window.setTimeout(() => {
                    isTransitioning = false;
                }, reduceMotion ? 0 : 600);
            };

            // Lazy load videos
            const lazyLoadVideo = (video) => {
                if (!video || video.dataset.loaded === 'true') return;

                const source = video.querySelector('source[data-src]');
                if (source) {
                    source.src = source.dataset.src;
                    video.load();
                    video.play().catch(() => {
                        // Auto-play failed, video will be paused
                    });
                    video.dataset.loaded = 'true';
                }
            };

            const pauseAllVideos = () => {
                component.querySelectorAll('video').forEach(video => {
                    if (!video.paused) {
                        video.pause();
                    }
                });
            };

            const playCurrentVideo = () => {
                const currentSlide = slides[current];
                if (!currentSlide) return;

                const video = currentSlide.querySelector('video[data-lazy-video]');
                if (video) {
                    lazyLoadVideo(video);
                }
            };

            applyTransform();
            updateDots();
            updateSlides();

            // Animate the initial slide text and load video if present
            if (slides[0]) {
                animateText(slides[0]);
                playCurrentVideo();
            }

            // Auto-play functionality
            const startAutoplay = () => {
                if (!autoplay || slideCount <= 1) return;

                stopAutoplay();
                autoplayInterval = window.setInterval(() => {
                    goTo(current + 1);
                }, autoplayDelay);
            };

            const stopAutoplay = () => {
                if (autoplayInterval) {
                    window.clearInterval(autoplayInterval);
                    autoplayInterval = null;
                }
            };

            // Pause autoplay on hover
            if (autoplay) {
                component.addEventListener('mouseenter', stopAutoplay);
                component.addEventListener('mouseleave', startAutoplay);

                // Start autoplay initially
                startAutoplay();
            }

            track.addEventListener('transitionend', () => {
                window.clearTimeout(fallbackTimeout);
                isTransitioning = false;
            });

            prevBtn?.addEventListener('click', () => {
                stopAutoplay();
                goTo(current - 1);
                if (autoplay) {
                    startAutoplay();
                }
            });

            nextBtn?.addEventListener('click', () => {
                stopAutoplay();
                goTo(current + 1);
                if (autoplay) {
                    startAutoplay();
                }
            });

            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    stopAutoplay();
                    goTo(index);
                    if (autoplay) {
                        startAutoplay();
                    }
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
                    stopAutoplay();
                    if (deltaX > 0) {
                        goTo(current - 1);
                    } else {
                        goTo(current + 1);
                    }
                    if (autoplay) {
                        startAutoplay();
                    }
                }
                touchStartX = null;
            }, { passive: true });
        });
    }
}

Home.initiateWhenReady(['index']);
