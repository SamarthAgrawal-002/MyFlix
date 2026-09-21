/* ============================================================
   MovieStream — Application Logic
   Movie catalog rendering, search, filtering, and player modal
   ============================================================ */

(function () {
  'use strict';

  // ---- DOM Elements ----
  const searchInput = document.getElementById('search-input');
  const genreFilter = document.getElementById('genre-filter');
  const movieGrid = document.getElementById('movie-grid');
  const heroSection = document.getElementById('hero');
  const playerModal = document.getElementById('player-modal');
  const playerIframe = document.getElementById('player-iframe');
  const playerTitle = document.getElementById('player-title');
  const playerMeta = document.getElementById('player-meta');
  const playerDescription = document.getElementById('player-description');
  const closePlayerBtn = document.getElementById('close-player');
  const heroPlayBtn = document.getElementById('hero-play-btn');
  const heroInfoBtn = document.getElementById('hero-info-btn');
  const noResults = document.getElementById('no-results');
  const navbar = document.querySelector('.navbar');

  // ---- State ----
  let movies = [];
  let filteredMovies = [];
  let featuredMovie = null;
  const STORAGE_KEY = 'moviestream_last_watched';

  // ---- Initialize ----
  async function init() {
    showSkeletons();
    await loadMovies();
    populateGenreFilter();
    renderHero();
    renderMovies(movies);
    setupEventListeners();
    markContinueWatching();
  }

  // ---- Load Movies ----
  async function loadMovies() {
    try {
      const response = await fetch('/data/movies.json');
      if (!response.ok) throw new Error('Failed to load movies');
      movies = await response.json();
      filteredMovies = [...movies];
      featuredMovie = movies.find(m => m.featured) || movies[0];
    } catch (error) {
      console.error('Error loading movies:', error);
      movieGrid.innerHTML = `
        <div class="no-results">
          <div class="no-results__icon">⚠️</div>
          <p class="no-results__text">Failed to load movies. Make sure <code>data/movies.json</code> exists.</p>
        </div>`;
    }
  }

  // ---- Skeleton Loading ----
  function showSkeletons() {
    let html = '';
    for (let i = 0; i < 8; i++) {
      html += '<div class="skeleton skeleton-card"></div>';
    }
    movieGrid.innerHTML = html;
  }

  // ---- Populate Genre Filter ----
  function populateGenreFilter() {
    const genres = new Set();
    movies.forEach(movie => {
      if (movie.genre) {
        movie.genre.forEach(g => genres.add(g));
      }
    });

    const sorted = [...genres].sort();
    sorted.forEach(genre => {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      genreFilter.appendChild(option);
    });
  }

  // ---- Render Hero ----
  function renderHero() {
    if (!featuredMovie) return;

    heroSection.style.backgroundImage = `url('${featuredMovie.thumbnail}')`;

    document.getElementById('hero-title').textContent = featuredMovie.title;
    document.getElementById('hero-year').textContent = featuredMovie.year;
    document.getElementById('hero-rating').textContent = `★ ${featuredMovie.rating}`;
    document.getElementById('hero-duration').textContent = featuredMovie.duration;
    document.getElementById('hero-description').textContent = featuredMovie.description;

    const genreBadges = document.getElementById('hero-genres');
    genreBadges.textContent = featuredMovie.genre.join(' • ');
  }

  // ---- Render Movie Cards ----
  function renderMovies(moviesToRender) {
    if (moviesToRender.length === 0) {
      movieGrid.innerHTML = '';
      noResults.style.display = 'block';
      return;
    }

    noResults.style.display = 'none';
    const lastWatched = getLastWatched();

    const html = moviesToRender.map(movie => {
      const isLastWatched = lastWatched && lastWatched === movie.id;
      return `
        <div class="movie-card" data-id="${movie.id}" role="button" tabindex="0" aria-label="Play ${movie.title}">
          ${isLastWatched ? '<span class="continue-badge">Continue</span>' : ''}
          <img
            class="movie-card__poster"
            src="${movie.thumbnail}"
            alt="${movie.title} poster"
            loading="lazy"
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%231a1a1a%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23555%22 font-size=%2218%22%3E🎬%3C/text%3E%3C/svg%3E'"
          />
          <div class="movie-card__overlay">
            <div class="movie-card__play-icon">
              <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
            </div>
            <div class="movie-card__title">${movie.title}</div>
            <div class="movie-card__info">
              <span class="rating">★ ${movie.rating}</span>
              <span>${movie.year}</span>
              <span>${movie.duration}</span>
            </div>
          </div>
          <div class="movie-card__bottom">
            <div class="movie-card__bottom-title">${movie.title}</div>
            <div class="movie-card__bottom-meta">${movie.year} • ${movie.duration}</div>
          </div>
        </div>`;
    }).join('');

    movieGrid.innerHTML = html;
  }

  // ---- Filter & Search ----
  function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    const genre = genreFilter.value;

    filteredMovies = movies.filter(movie => {
      const matchesSearch = !query ||
        movie.title.toLowerCase().includes(query) ||
        movie.description.toLowerCase().includes(query);
      const matchesGenre = !genre || (movie.genre && movie.genre.includes(genre));
      return matchesSearch && matchesGenre;
    });

    renderMovies(filteredMovies);
  }

  // ---- Player Modal ----
  function openPlayer(movie) {
    if (!movie || movie.driveFileId === 'REPLACE_WITH_YOUR_DRIVE_FILE_ID') {
      alert('Please replace the driveFileId in data/movies.json with your actual Google Drive file ID.\n\nTo get the ID:\n1. Upload the movie to Google Drive\n2. Right-click → Share → "Anyone with the link"\n3. Copy the link — the ID is the long string between /d/ and /view');
      return;
    }

    const embedUrl = `https://drive.google.com/file/d/${movie.driveFileId}/preview`;
    playerIframe.src = embedUrl;
    playerTitle.textContent = movie.title;
    playerMeta.innerHTML = `
      <span class="rating">★ ${movie.rating}</span>
      <span>${movie.year}</span>
      <span>${movie.duration}</span>
      <span>${movie.genre.join(', ')}</span>`;
    playerDescription.textContent = movie.description;

    playerModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    saveLastWatched(movie.id);
  }

  function closePlayer() {
    playerModal.classList.remove('active');
    playerIframe.src = '';
    document.body.style.overflow = '';
  }

  // ---- LocalStorage: Continue Watching ----
  function saveLastWatched(movieId) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movieId));
    } catch (e) { /* ignore */ }
  }

  function getLastWatched() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  function markContinueWatching() {
    // Re-render to add "Continue" badge — already handled in renderMovies
  }

  // ---- Event Listeners ----
  function setupEventListeners() {
    // Search
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applyFilters, 250);
    });

    // Genre filter
    genreFilter.addEventListener('change', applyFilters);

    // Movie card click
    movieGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.movie-card');
      if (!card) return;
      const movieId = parseInt(card.dataset.id, 10);
      const movie = movies.find(m => m.id === movieId);
      if (movie) openPlayer(movie);
    });

    // Movie card keyboard
    movieGrid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.movie-card');
        if (!card) return;
        e.preventDefault();
        const movieId = parseInt(card.dataset.id, 10);
        const movie = movies.find(m => m.id === movieId);
        if (movie) openPlayer(movie);
      }
    });

    // Hero play button
    heroPlayBtn.addEventListener('click', () => {
      if (featuredMovie) openPlayer(featuredMovie);
    });

    // Hero info button — scroll to the movie in grid
    heroInfoBtn.addEventListener('click', () => {
      document.getElementById('movies-section').scrollIntoView({ behavior: 'smooth' });
    });

    // Close player
    closePlayerBtn.addEventListener('click', closePlayer);

    // Click backdrop to close (only the outer modal overlay, not the body/iframe area)
    playerModal.addEventListener('click', (e) => {
      if (e.target === playerModal) {
        closePlayer();
      }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && playerModal.classList.contains('active')) {
        closePlayer();
      }
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  // ---- Start ----
  document.addEventListener('DOMContentLoaded', init);
})();
