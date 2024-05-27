import { fetchPlaceholders } from '../../scripts/aem.js';

function updateIndicator(slideIndex, block) {
  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  // eslint-disable-next-line no-restricted-syntax
  for (const [idx, indicator] of indicators.entries()) {
    if (idx !== slideIndex) {
      indicator.querySelector('button')
        .removeAttribute('disabled');
    } else {
      indicator.querySelector('button')
        .setAttribute('disabled', '1');
    }
  }
}

function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  // eslint-disable-next-line no-restricted-syntax
  for (const link of activeSlide.querySelectorAll('a')) {
    link.removeAttribute('tabindex');
  }

  block.querySelector('.carousel-slides')
    .scrollTo({
      top: 0,
      left: activeSlide.offsetLeft,
      behavior: 'smooth',
    });

  updateIndicator(slideIndex, block);
}

const hideShowArrows = (slides, prevButton, nextButton, slideIndex) => {
  if (prevButton && slideIndex === 0) {
    prevButton.classList.add('is-hidden');
    nextButton.classList.remove('is-hidden');
  } else if (nextButton && slideIndex === slides.length - 1) {
    prevButton.classList.remove('is-hidden');
    nextButton.classList.add('is-hidden');
  } else {
    prevButton.classList.remove('is-hidden');
    nextButton.classList.remove('is-hidden');
  }
};

function updateActiveSlide(slide) {
  const block = slide.closest('.image-carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);

  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-slide');

  // eslint-disable-next-line no-restricted-syntax
  for (const [idx, aSlide] of slides.entries()) {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);

    // eslint-disable-next-line no-restricted-syntax
    for (const link of aSlide.querySelectorAll('a')) {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    }
  }

  updateIndicator(slideIndex, block);

  const prevButton = block.querySelector('.slide-prev');
  const nextButton = block.querySelector('.slide-next');
  hideShowArrows(slides, prevButton, nextButton, slideIndex);
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (!slideIndicators) return;

  // eslint-disable-next-line no-restricted-syntax
  for (const button of slideIndicators.querySelectorAll('button')) {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  }

  block.querySelector('.slide-prev')
    .addEventListener('click', () => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
    });
  block.querySelector('.slide-next')
    .addEventListener('click', () => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
    });

  const slideObserver = new IntersectionObserver((entries) => {
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (entry.isIntersecting) updateActiveSlide(entry.target);
    }
  }, { threshold: 0.5 });

  // eslint-disable-next-line no-restricted-syntax
  for (const slide of block.querySelectorAll('.carousel-slide')) {
    slideObserver.observe(slide);
  }
}

function createVideoSlide(row, slideIndex, carouselId, videoURL) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `image-carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  // eslint-disable-next-line no-restricted-syntax
  for (const [colIdx, column] of row.querySelectorAll(':scope > div')
    .entries()) {
    column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);

    if (colIdx === 1) {
      // eslint-disable-next-line no-restricted-syntax
      for (const [indx, para] of column.querySelectorAll('p')
        .entries()) {
        if (indx === 0) {
          para.classList.add('carousel-pre-title');
        } else {
          para.classList.add('carousel-description');
        }
      }
      const title = column.querySelector('h1, h2, h3, h4');
      if (title) {
        title.classList.add('carousel-title');
      }
    } else {
      column.innerHTML = `
<p>
<video id="image-carousel-${carouselId}-video-${slideIndex}"
    class="carousel-slide-video" width="100%"
    playsinline="" muted="" autoplay="" loop=""
    loading="lazy">
    <source type="video/mp4" src="${videoURL}" />
</video>
</p>
`;
    }

    slide.append(column);
  }

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

function createImageSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `image-carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  // eslint-disable-next-line no-restricted-syntax
  for (const [colIdx, column] of row.querySelectorAll(':scope > div')
    .entries()) {
    column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);

    if (colIdx === 1) {
      // eslint-disable-next-line no-restricted-syntax
      for (const [indx, para] of column.querySelectorAll('p')
        .entries()) {
        if (indx === 0) {
          para.classList.add('carousel-pre-title');
        } else {
          para.classList.add('carousel-description');
        }
      }
      const title = column.querySelector('h1, h2, h3, h4');
      if (title) {
        title.classList.add('carousel-title');
      }
    }

    slide.append(column);
  }

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

let carouselId = 0;
export default async function decorate(block) {
  const sectionMetadata = block.closest('.bg-dark');
  let isDarkBackground = false;
  if (sectionMetadata) {
    // we are in a dark bacjground section
    isDarkBackground = true;
  }

  carouselId += 1;
  block.setAttribute('id', `image-carousel-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');

  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', placeholders.carouselSlideControls || 'carousel-slide-controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);

    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button class="carousel-button slide-prev" aria-label="${placeholders.previousSlide || 'previous-slide'}" />
      <button class="carousel-button slide-next" aria-label="${placeholders.nextSlide || 'next-slide'}" />
    `;

    container.append(slideNavButtons);
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const [idx, row] of rows.entries()) {
    const videoAlt = row.querySelector('p.button-container');
    if (videoAlt && videoAlt.querySelector('a')) {
      const aElem = videoAlt.querySelector('a');
      const videoURL = aElem.href;
      const slide = createVideoSlide(row, idx, carouselId, videoURL);
      slidesWrapper.append(slide);
    } else {
      const slide = createImageSlide(row, idx, carouselId);
      slidesWrapper.append(slide);
    }

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;

      let setBackgroundColor = 'light-color';
      if (isDarkBackground) {
        setBackgroundColor = 'dark-color';
      }
      indicator.innerHTML = `<button type="button" class="${setBackgroundColor}"><span>${placeholders.showSlide || 'show-slide'} ${idx + 1} ${placeholders.of || 'of'} ${rows.length}</span></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  }

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    bindEvents(block);
  }
}
