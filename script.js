/* =========================
   Odisha School Finder – Enhanced JS
   ========================= */

// API base URL
const API_BASE_URL = 'http://localhost:8080/api';

// DOM Elements
const searchInput     = document.getElementById('searchInput');
const searchBtn       = document.getElementById('searchBtn');
const cityFilter      = document.getElementById('cityFilter');
const boardFilter     = document.getElementById('boardFilter');
const typeFilter      = document.getElementById('typeFilter');
const resetFiltersBtn = document.getElementById('resetFilters');
const sortFilter      = document.getElementById('sortFilter');
const schoolsList     = document.getElementById('schoolsList');
const resultsCount    = document.getElementById('resultsCount');
const modal           = document.getElementById('schoolModal');
const modalBody       = document.getElementById('modalBody');
const closeModalBtn   = document.querySelector('.close');
const mobileMenuBtn   = document.getElementById('mobileMenuBtn');
const mainNav         = document.getElementById('mainNav');

// Local cache of last result (so sorting is instant)
let currentSchools = [];

// Add these variables at the top
const SCHOOLS_PER_PAGE = 6; // Number to show initially
let displayedSchoolsCount = SCHOOLS_PER_PAGE;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  loadFilterOptions();
  loadAllSchools();

  // Events
  searchBtn.addEventListener('click', handleSearch);
  resetFiltersBtn.addEventListener('click', resetFilters);
  closeModalBtn.addEventListener('click', () => (modal.style.display = 'none'));
  mobileMenuBtn?.addEventListener('click', () => mainNav.classList.toggle('active'));
  sortFilter?.addEventListener('change', () => {
    currentSchools = sortSchools([...currentSchools], sortFilter.value);
    displaySchools(currentSchools);
  });

  // Close modal on backdrop click or ESC
  window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.style.display = 'none'; });

  // Enter to search
  [searchInput, cityFilter, boardFilter, typeFilter].forEach(el => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
  });

  // Footer city links search
  document.querySelectorAll('.footer-links a').forEach(link => {
    link.addEventListener('click', function(e) {
      const match = this.textContent.match(/Schools in (.+)/i);
      if (match) {
        e.preventDefault();
        const city = match[1].trim();
        cityFilter.value = city;
        displayedSchoolsCount = SCHOOLS_PER_PAGE; // Reset count
        handleSearch();
        window.scrollTo({ top: document.querySelector('.search-section').offsetTop, behavior: 'smooth' });
      }
    });
  });
});

/* ---------- Filters ---------- */
async function loadFilterOptions() {
  try {
    const [cities, boards, types] = await Promise.all([
      fetchJSON(`${API_BASE_URL}/schools/cities`),
      fetchJSON(`${API_BASE_URL}/schools/boards`),
      fetchJSON(`${API_BASE_URL}/schools/types`)
    ]);

    populateFilterOptions(cityFilter,   cities);
    populateFilterOptions(boardFilter,  boards);
    populateFilterOptions(typeFilter,   types);
  } catch (err) {
    console.error(err);
    showError('Failed to load filter options.');
  }
}

function populateFilterOptions(select, options) {
  if (!Array.isArray(options)) return;
  // Keep the first "All ..." option as-is
  select.length = 1; // <-- This keeps only the first option, removes others
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    select.appendChild(o);
  });
}

/* ---------- Data fetchers ---------- */
async function loadAllSchools() {
  try {
    showLoading();
    displayedSchoolsCount = SCHOOLS_PER_PAGE; // Reset count
    const data = await fetchJSON(`${API_BASE_URL}/schools`);
    currentSchools = sortSchools(data, sortFilter?.value || 'name');
    displaySchools(currentSchools);
  } catch (err) {
    console.error(err);
    showError('Failed to load schools.');
  }
}

function handleSearch() {
  const name  = searchInput.value.trim();
  const city  = cityFilter.value;
  const board = boardFilter.value;
  const type  = typeFilter.value;
  displayedSchoolsCount = SCHOOLS_PER_PAGE; // Reset count
  searchSchools(name, city, board, type);
}

async function searchSchools(name, city, board, type) {
  try {
    showLoading();
    const params = new URLSearchParams();
    if (name)  params.append('name', name);
    if (city)  params.append('city', city);
    if (board) params.append('board', board);
    if (type)  params.append('type', type);

    const data = await fetchJSON(`${API_BASE_URL}/schools/search?${params.toString()}`);
    currentSchools = sortSchools(data, sortFilter?.value || 'name');
    displaySchools(currentSchools);
  } catch (err) {
    console.error(err);
    showError('Failed to search schools.');
  }
}

/* ---------- Rendering ---------- */
function displaySchools(schools) {
  resultsCount.textContent = `${schools.length} ${schools.length === 1 ? 'school' : 'schools'} found`;

  if (!schools.length) {
    schoolsList.innerHTML = `
      <div class="no-results" style="grid-column: 1 / -1; text-align:center; padding:3rem;">
        <i class="fas fa-search fa-3x" style="color: var(--gray); margin-bottom: 1rem;"></i>
        <h3>No schools found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    `;
    return;
  }

  schoolsList.innerHTML = '';
  const frag = document.createDocumentFragment();

  // Only show up to displayedSchoolsCount schools
  const toDisplay = schools.slice(0, displayedSchoolsCount);
  toDisplay.forEach(s => frag.appendChild(createSchoolCard(s)));
  schoolsList.appendChild(frag);

  // Add Show More button if there are more schools to show
  if (schools.length > displayedSchoolsCount) {
    const showMoreBtn = document.createElement('button');
    showMoreBtn.textContent = 'Show More';
    showMoreBtn.className = 'show-more-btn';
    showMoreBtn.style.margin = '2rem auto';
    showMoreBtn.style.display = 'block';
    showMoreBtn.addEventListener('click', () => {
      displayedSchoolsCount += SCHOOLS_PER_PAGE;
      displaySchools(schools);
    });
    schoolsList.appendChild(showMoreBtn);
  }
}

function createSchoolCard(school) {
  const card = document.createElement('div');
  card.className = 'school-card';

  const hasRating = typeof school.rating === 'number' && !Number.isNaN(school.rating);

  card.innerHTML = `
    <div class="school-header">
      ${hasRating ? `<div class="school-badge"><i class="fas fa-star"></i> ${school.rating.toFixed(1)}</div>` : ''}
      <h3 class="school-name">${escapeHTML(school.name || '')}</h3>
      <div class="school-location">
        <i class="fas fa-map-marker-alt"></i>
        <span>${escapeHTML([school.city, school.district].filter(Boolean).join(', '))}</span>
      </div>
    </div>
    <div class="school-details">
      <div class="school-info">
        <i class="fas fa-graduation-cap"></i>
        <span>${escapeHTML(school.board || '—')}</span>
      </div>
      <div class="school-info">
        <i class="fas fa-building"></i>
        <span>${escapeHTML(school.type || '—')}</span>
      </div>
      <div class="school-info">
        <i class="fas fa-phone"></i>
        <span>${escapeHTML(school.contact || '—')}</span>
      </div>
      <button class="view-more-btn" data-id="${school.id}">
        <i class="fas fa-info-circle"></i> View More Details
      </button>
    </div>
  `;

  card.querySelector('.view-more-btn').addEventListener('click', () => showSchoolDetails(school.id));
  return card;
}

/* ---------- Modal ---------- */
async function showSchoolDetails(id) {
  try {
    const s = await fetchJSON(`${API_BASE_URL}/schools/${id}`);

    modalBody.innerHTML = `
      <h2 class="modal-school-name">${escapeHTML(s.name || '')}</h2>
      <div class="modal-school-info">
        <p><i class="fas fa-map-marker-alt"></i> <strong>Location:</strong> ${escapeHTML([s.city, s.district].filter(Boolean).join(', '))}</p>
        <p><i class="fas fa-graduation-cap"></i> <strong>Board:</strong> ${escapeHTML(s.board || '—')}</p>
        <p><i class="fas fa-building"></i> <strong>Type:</strong> ${escapeHTML(s.type || '—')}</p>
        <p><i class="fas fa-address-card"></i> <strong>Address:</strong> ${escapeHTML(s.address || '—')}</p>
        <p><i class="fas fa-phone"></i> <strong>Contact:</strong> ${escapeHTML(s.contact || '—')}</p>
      </div>
      ${
        s.website
          ? `<a href="${encodeURI(s.website)}" target="_blank" rel="noopener" class="website-link">
               <i class="fas fa-globe"></i> Visit Website
             </a>`
          : ''
      }
    `;
    modal.style.display = 'block';
  } catch (err) {
    console.error(err);
    showError('Failed to load school details.');
  }
}

/* ---------- Sorting, reset, helpers ---------- */
function sortSchools(arr, by = 'name') {
  const copy = Array.isArray(arr) ? arr.slice() : [];
  if (by === 'rating') {
    // Highest rating first; items without rating go to bottom
    copy.sort((a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : -Infinity;
      const rb = typeof b.rating === 'number' ? b.rating : -Infinity;
      return rb - ra;
    });
  } else if (by === 'location') {
    copy.sort((a, b) => {
      const la = `${a.city || ''} ${a.district || ''}`.toLowerCase();
      const lb = `${b.city || ''} ${b.district || ''}`.toLowerCase();
      return la.localeCompare(lb);
    });
  } else { // name
    copy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  return copy;
}

function resetFilters() {
  searchInput.value = '';
  cityFilter.value  = '';
  boardFilter.value = '';
  typeFilter.value  = '';
  sortFilter.value  = 'name';
  displayedSchoolsCount = SCHOOLS_PER_PAGE; // Reset count
  loadAllSchools();
}

function showLoading() {
  schoolsList.innerHTML = `
    <div style="grid-column:1/-1; padding:3rem; text-align:center;">
      <i class="fas fa-spinner fa-spin fa-2x" style="margin-bottom:1rem;"></i>
      <p>Loading schools...</p>
    </div>
  `;
}

function showError(message) {
  schoolsList.innerHTML = `
    <div class="error" style="grid-column:1 / -1; text-align:center; padding:3rem;">
      <i class="fas fa-exclamation-triangle fa-2x" style="margin-bottom:1rem;"></i>
      <h3>Error</h3>
      <p>${escapeHTML(message || 'Something went wrong')}</p>
    </div>
  `;
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}