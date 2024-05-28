import { mergeImagesForArtDirection, moveInstrumentation } from '../../scripts/scripts.js';

let carouselCount = 1;

function calcIntersectionRatio(containerLeft, containerRight, slideLeft, slideRight) {
  // fully outside of container
  if (slideRight < containerLeft || slideLeft > containerRight) return 0;
  // fully inside container
  if (slideLeft >= containerLeft && slideRight <= containerRight) return 1;
  // partially inside container
  return (Math.min(slideRight, containerRight)
    - Math.max(slideLeft, containerLeft)) / (slideRight - slideLeft);
}

function calcSlideIntersection(slidesContainer, slides = [...slidesContainer.children]) {
  const {
    scrollLeft,
    clientWidth,
  } = slidesContainer;
  const scrollRight = scrollLeft + clientWidth;
  return slides.map((slide) => {
    const {
      offsetLeft,
      offsetWidth,
    } = slide;
    const offsetRight = offsetLeft + offsetWidth;
    // intersects?
    // eslint-disable-next-line max-len
    const intersectionRatio = calcIntersectionRatio(scrollLeft, scrollRight, offsetLeft, offsetRight);
    return {
      slide,
      intersectionRatio,
    };
  });
}

function updateSlideState(slidesContainer, activeSlide, setFocus = true) {
  if (setFocus) activeSlide.focus({ preventScroll: true });
  calcSlideIntersection(slidesContainer)
    .forEach(({
      slide,
      intersectionRatio,
    }) => {
      slide.ariaHidden = intersectionRatio < 0.5;
    });
}

function onceIntersecting(element, callback) {
  new IntersectionObserver((entries, observer) => {
    const [entry] = entries;
    if (entry.isIntersecting) {
      callback();
      observer.disconnect();
    }
  }, {
    threshold: 0.01,
  }).observe(element);
}

function updateIndicatorState(slidesContainer, indicators) {
  let scrollDone;
  const calculateActiveIndicator = (setFocus) => {
    const activeIndicators = calcSlideIntersection(
      slidesContainer,
      [...indicators.querySelectorAll('[data-target-slide]')].map((indicator) => slidesContainer.querySelector(`#${indicator.dataset.targetSlide}`)),
    )
      .filter(({ intersectionRatio }) => intersectionRatio > 0)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    const [activeIndicator] = activeIndicators;
    if (!activeIndicator) return;
    indicators.querySelector('.active')
      ?.classList
      .remove('active');
    indicators.querySelector(`[data-target-slide="${activeIndicator.slide.id}"]`)
      ?.classList
      .add('active');

    if (scrollDone) clearTimeout(scrollDone);
    scrollDone = setTimeout(() => {
      updateSlideState(slidesContainer, activeIndicator.slide, setFocus);
    }, 30);
  };

  slidesContainer.addEventListener('scroll', () => calculateActiveIndicator(true), { passive: true });

  onceIntersecting(indicators, () => calculateActiveIndicator(false));
}

/**
 * Calculate the number of visible indicators based on the number of
 * slides visible in the slides container.
 * Then create a indicator list with it, intentionally skipping
 * some slides to always scroll the full visible list.
 *
 * This is used for the .info and .info-stealth carousel.
 *
 * @param {*} slidesContainer
 * @param {*} slides
 * @param {*} indicatorsList
 * @returns
 */
function calculateIndicators(slidesContainer, indicatorsList) {
  if (slidesContainer.clientWidth > 0) {
    const slides = slidesContainer.children;
    const [firstSlide, secondSlide] = slides;
    const slideWidth = firstSlide.clientWidth;
    const gap = secondSlide.offsetLeft - firstSlide.offsetLeft - slideWidth;
    const visibleSlides = Math.floor(slidesContainer.clientWidth / (slideWidth + gap));
    const allSlides = slides.length;
    const targetIndicatorsLen = Math.ceil(allSlides / visibleSlides);
    const controls = indicatorsList.querySelectorAll('.prev,.next');
    if (targetIndicatorsLen === indicatorsList.children.length - controls.length) return;

    if (targetIndicatorsLen > 1) {
      const indicators = [];
      for (let i = 0; i < targetIndicatorsLen; i += 1) {
        const slideIndex = (slides.length / targetIndicatorsLen) * i;
        const slide = slides[Math.round(slideIndex)];
        const indicator = document.createElement('li');
        if (i === 0) indicator.classList.add('active');
        indicator.dataset.targetSlide = slide.id;
        indicator.innerHTML = `
                <button type="button">
                    <span>Show Slide ${i + 1} of ${slides.length}</span>
                </button>`;
        indicators.push(indicator);
      }
      // preserve controls if they are there
      const [prev, next] = controls;
      if (prev) indicators.unshift(prev);
      if (next) indicators.push(next);
      indicatorsList.replaceChildren(...indicators);
    } else {
      indicatorsList.innerHTML = '';
    }

    updateIndicatorState(slidesContainer, indicatorsList);
  }
}

function gotoNextPrev(slidesContainer, indicatorsList, direction) {
  const current = indicatorsList.querySelector('.active');
  if (current) {
    let next = current[direction === 'next' ? 'nextElementSibling' : 'previousElementSibling'];
    if (!next) next = direction === 'next' ? indicatorsList.firstElementChild : indicatorsList.lastElementChild;
    const nextSlide = slidesContainer.querySelector(`#${next.dataset.targetSlide}`);
    if (nextSlide) {
      slidesContainer.scrollTo({
        left: nextSlide.offsetLeft,
        behavior: 'smooth',
      });
    }
  }
}

function gotoSlide(slidesContainer, id) {
  const nextSlide = slidesContainer.querySelector(`#${id}`);
  slidesContainer.scrollTo({
    left: nextSlide.offsetLeft,
    behavior: 'smooth',
  });
}

/**
 * @param {HTMLDivElement} block
 */
export default async function decorate(block) {
  let additionalStyles$ = Promise.resolve();
  // simplify some classnames and load additional stylesheets
  if (block.matches('.sbs,.sbs-right')) {
    block.classList.add('sbs', 'ontop-controls');
    additionalStyles$ = import('./sbs.css');
  } else if (block.matches('.info,.info-stealth')) {
    block.classList.add('info');
    additionalStyles$ = import('./info.css');
  } else if (block.matches('.sactionals')) {
    block.classList.add('ontop-controls');
    additionalStyles$ = import('./sactionals.css');
  } else if (block.matches('.fullwidth')) {
    block.classList.add('ontop-controls');
    additionalStyles$ = import('./fullwidth.css');
  } else {
    block.classList.add('media');
    additionalStyles$ = import('./media.css');
  }

  // eslint-disable-next-line no-plusplus
  const carouselId = `carousel-${carouselCount++}`;
  const [firstRow, ...slides] = block.children;

  const slidesContainer = document.createElement('ol');
  slidesContainer.classList.add('slides');
  block.append(slidesContainer);

  slides.forEach((slideContainer, index) => {
    const slide = document.createElement('li');
    slide.classList.add('slide');
    slide.id = `${carouselId}-slide-${index + 1}`;
    slide.tabIndex = 0;
    moveInstrumentation(slideContainer, slide);
    slidesContainer.append(slide);

    const [image, titles, content] = slideContainer.children;
    slideContainer.remove();

    image.classList.add('image');
    titles.classList.add('titles');
    content.classList.add('content');

    // art direction
    mergeImagesForArtDirection(...image.querySelectorAll('picture> img'));

    // video
    const [videoLink, videoLinkMobile] = image.querySelectorAll('a');
    if (videoLink) {
      const video = document.createElement('video');
      const {
        title: options,
        href,
        textContent,
      } = videoLink;
      if (options && options !== textContent.trim()) {
        options.split(',')
          .forEach((option) => video.setAttribute(option, 'true'));
      }
      const img = image.querySelector('img');
      video.poster = img?.src;
      let source = document.createElement('source');
      source.src = href;
      source.media = '(min-width: 600px)';
      video.append(source);
      if (videoLinkMobile) {
        source = document.createElement('source');
        source.src = videoLinkMobile.href;
        video.append(source);
      } else {
        source.removeAttribute('media');
      }
      // for browsers that don't support the video fallback to the image
      if (img) video.append(img.parentElement);
      image.replaceChildren(video);
    }

    // content processing
    // if the 'titles' have an image, remove the pre-title
    if (block.matches('.info')) {
      const icon = titles.querySelector('picture');
      const heading = titles.querySelector('h2,h3,h4,h5,h6');
      const pretitle = heading?.previousElementSibling;
      if (pretitle && pretitle !== icon?.closest('p')) {
        pretitle.remove();
      }
    }

    // preserve only the image for sbs, everything for the others
    if (block.matches('.sbs')) {
      slide.append(image);
    } else if (block.matches('.sactionals')) {
      content.prepend(...titles.children);
      slide.append(image, content);
    } else {
      slide.append(image, titles, content);
    }

    // group the product options together
    const productOptImg = content.querySelector('picture');
    if (productOptImg) {
      const productOpts = document.createElement('ol');
      for (let currentPar = productOptImg.closest('p'), currentOpt; currentPar;) {
        const img = currentPar.querySelector('picture');
        if (img) {
          currentOpt = document.createElement('li');
          productOpts.append(currentOpt);
        }
        const nextPar = currentPar.nextElementSibling;
        currentOpt.append(currentPar);
        currentPar = nextPar;
      }
      if (block.matches('.sactionals')) {
        productOpts.classList.add('product-options', `product-options-${productOpts.children.length}`);
        content.after(productOpts);
      }
    }

    // label price paragraphs
    content.querySelectorAll('p')
      .forEach((p) => {
        const text = p.textContent.trim();
        // e.g. "$1,234.56" or "$1,234.56 $1,234.56"
        if (text.match(/(\$[0-9.,']*\s*)/)) {
          p.classList.add('price');
        }
      });
  });

  // if the block has no side-by-side content remove the first row,
  // otherwise it is a slide so prepend it back to the slides
  if (!block.matches('.sbs,.info')) {
    firstRow.remove();
  } else {
    firstRow.classList.add('sbs-content');
    const buttons = firstRow.querySelectorAll('.button-container');
    const div = document.createElement('div');
    div.className = 'buttons';
    div.append(...buttons);
    if (block.matches('.info')) {
      // for info append the buttons after the slides
      div.classList.add('sbs-content');
      firstRow.after(div);
    } else {
      firstRow.append(div);
    }
  }

  const indicatorsContainer = document.createElement('nav');
  const indicatorsList = document.createElement('ol');
  indicatorsContainer.append(indicatorsList);
  indicatorsContainer.classList.add('indicators');
  indicatorsContainer.addEventListener('click', (event) => {
    let indicator = event.target.closest('[data-target-slide]');
    if (indicator) {
      gotoSlide(slidesContainer, indicator.dataset.targetSlide);
      return;
    }
    indicator = event.target.closest('.control');
    if (indicator) {
      gotoNextPrev(slidesContainer, indicatorsList, indicator.matches('.prev') ? 'prev' : 'next');
    }
  });
  slidesContainer.before(indicatorsContainer);

  // add controls
  // todo i18n
  const goPrev = document.createElement('button');
  goPrev.type = 'button';
  goPrev.ariaLabel = 'Previous Slide';
  goPrev.addEventListener('click', () => gotoNextPrev(slidesContainer, indicatorsList, 'prev'));
  const goNext = document.createElement('button');
  goNext.type = 'button';
  goNext.ariaLabel = 'Next Slide';
  goNext.addEventListener('click', () => gotoNextPrev(slidesContainer, indicatorsList, 'next'));

  if (!block.matches('.info')) {
    const controls = document.createElement('div');
    controls.classList.add('controls');
    controls.append(goPrev);
    controls.append(goNext);
    indicatorsContainer.before(controls);
  } else {
    let li = document.createElement('li');
    li.className = 'control prev';
    li.append(goPrev);
    indicatorsList.append(li);
    li = document.createElement('li');
    li.className = 'control next';
    li.append(goNext);
    indicatorsList.append(li);
  }

  // dynamic indicators depending on the number of visible slides
  onceIntersecting(slidesContainer, () => calculateIndicators(slidesContainer, indicatorsList));
  window.addEventListener('resize', () => {
    calculateIndicators(slidesContainer, indicatorsList);
  });

  await additionalStyles$;
}
