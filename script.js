
/* -----------------------
   CONFIG / VARIABLES
   ----------------------- */
const API_BASE = 'https://de1.api.radio-browser.info/json';
const genres = ["lofi","jazz","classical","electronic","ambient","chillout","rock","pop","funk","blues","hip-hop"];
const genresGrid = document.getElementById('genresGrid');

const stationPanel = document.getElementById('stationPanel');
const stationCover = document.getElementById('stationCover');
const stationName = document.getElementById('stationName');
const stationTags = document.getElementById('stationTags');
const enterBtn = document.getElementById('enterBtn');
const backToGenres = document.getElementById('backToGenres');

const miniPlayer = document.getElementById('mini-player');
const miniCover = document.getElementById('mini-cover');
const miniTitle = document.getElementById('mini-title');
const miniPlay = document.getElementById('mini-play');
const miniStop = document.getElementById('mini-stop');
const miniVolume = document.getElementById('mini-volume');

const audio = document.getElementById('audio');

const largePlayerModal = document.getElementById('large-player-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCover = document.getElementById('modal-cover');
const modalStationName = document.getElementById('modal-station-name');
const modalPlayBtn = document.getElementById('modal-play-btn');
const modalPrevBtn = document.getElementById('modal-prev-btn');
const modalNextBtn = document.getElementById('modal-next-btn');
const modalVolumeSlider = document.getElementById('modal-volume-slider');

let lastStation = null;       // info de la estación actual seleccionada
let hasListened = false;      // si el usuario ya entró a una estación alguna vez
let isPlaying = false;

/* -----------------------
   UTIL / UI BUILD
   ----------------------- */
function createGenreCards(){
  genres.forEach(g => {
    const card = document.createElement('div');
    card.className = 'genre-card';
    card.innerHTML = `
      <div class="genre-title">${capitalize(g)}</div>
      <div class="genre-sub">Estaciones con tag: ${g}</div>
    `;
    card.addEventListener('click', ()=> openGenre(g));
    genresGrid.appendChild(card);
  });
}

function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

/* -----------------------
   API: buscar estaciones por tag
   ----------------------- */
async function openGenre(tag){
  // fetch top stations (limit)
  try{
    const res = await fetch(`${API_BASE}/stations/bytag/${encodeURIComponent(tag)}?limit=20`);
    if(!res.ok) throw new Error('API error');
    const stations = await res.json();
    if(!stations || stations.length === 0){
      alert('No se encontraron estaciones para este género.');
      return;
    }
    // open a small chooser: we'll just pick the first few and let user pick via panel
    // show first station by default in right panel
    showStationPanel(stations[0], tag, stations);
  }catch(err){
    console.error(err);
    alert('Error al cargar estaciones.');
  }
}

/* -----------------------
   Mostrar panel de estación
   ----------------------- */
function showStationPanel(station, tag, list=[]) {
  lastStation = { station, tag, list };
  stationCover.src = station.favicon && station.favicon.trim() !== "" ? station.favicon : placeholderCover();
  stationName.textContent = station.name || 'Estación';
  stationTags.textContent = tag + (station.country ? ` • ${station.country}` : '');
  stationPanel.style.display = 'block';
  stationPanel.scrollIntoView({behavior:'smooth', block:'center'});

  // When enterBtn clicked, start playback (but still hide mini-player while inside)
  enterBtn.onclick = () => {
    playStation(station);
    // mark that user has listened (so mini player will show when returning)
    hasListened = true;
    // remain in station view, mini-player hidden
    hideMiniPlayer();
  };

  // Also provide quick picker: replace enterBtn text to include station list length
  enterBtn.textContent = `Escuchar: ${station.name}`;
}

/* -----------------------
   PLAYBACK LOGIC
   ----------------------- */
function playStation(station){
  // set src and play
  // Use station.url_resolved for better reliability
  audio.src = station.url_resolved;
  audio.play().then(()=> {
    isPlaying = true;
    updatePlayerUI(station);
    // While inside station view, mini-player stays hidden (per requirement)
    // But playback continues (audio element is hidden)
  }).catch(err=>{
    console.warn('Play failed (autoplay policies?)', err);
    // still update info
    updatePlayerUI(station);
  });
}

/* -----------------------
   MINI PLAYER CONTROL
   ----------------------- */
function updatePlayerUI(station) {
  const coverUrl = station?.favicon && station.favicon.trim() !== "" ? station.favicon : placeholderCover();
  const stationNameText = station?.name || 'Reproduciendo';

  // Mini player
  miniCover.src = coverUrl;
  miniTitle.textContent = stationNameText;

  // Large player modal
  modalCover.src = coverUrl;
  modalStationName.textContent = stationNameText;
}

/* show/hide mini player with smooth transition */
function showMiniPlayer(){
  if(!hasListened) return; // do not show if never listened
  miniPlayer.classList.add('show');
  miniPlayer.setAttribute('aria-hidden','false');
}
function hideMiniPlayer(){
  miniPlayer.classList.remove('show');
  miniPlayer.setAttribute('aria-hidden','true');
}

/* -----------------------
   NAVIGATION: volver a géneros
   ----------------------- */
backToGenres.onclick = () => {
  stationPanel.style.display = 'none';
  // show mini-player only if user already listened
  if(hasListened){
    // update cover/title to lastStation if available
    if(lastStation && lastStation.station) updatePlayerUI(lastStation.station);
    showMiniPlayer();
  } else {
    hideMiniPlayer();
  }
};

/* -----------------------
   LARGE PLAYER MODAL CONTROL
   ----------------------- */

function openLargePlayer() {
  if (!lastStation || !lastStation.station) return;

  // Populate modal with current station data
  updatePlayerUI(lastStation.station);

  // Sync play/pause button state
  modalPlayBtn.textContent = isPlaying ? '⏸' : '▶';

  // Sync volume slider
  modalVolumeSlider.value = audio.volume;

  // Show the modal
  largePlayerModal.style.display = 'flex';
  setTimeout(() => {
    largePlayerModal.classList.add('show');
  }, 10); // Small delay to allow CSS transition
}

function closeLargePlayer() {
  largePlayerModal.classList.remove('show');
  setTimeout(() => {
    largePlayerModal.style.display = 'none';
  }, 300); // Wait for transition to finish
}

function playNextStation() {
  if (!lastStation || !lastStation.list || lastStation.list.length === 0) return;
  const currentIndex = lastStation.list.findIndex(s => s.stationuuid === lastStation.station.stationuuid);
  const nextIndex = (currentIndex + 1) % lastStation.list.length;
  const nextStation = lastStation.list[nextIndex];

  lastStation.station = nextStation; // Update current station
  playStation(nextStation);
}

function playPrevStation() {
  if (!lastStation || !lastStation.list || lastStation.list.length === 0) return;
  const currentIndex = lastStation.list.findIndex(s => s.stationuuid === lastStation.station.stationuuid);
  const prevIndex = (currentIndex - 1 + lastStation.list.length) % lastStation.list.length;
  const prevStation = lastStation.list[prevIndex];

  lastStation.station = prevStation; // Update current station
  playStation(prevStation);
}


// Event listeners for modal
miniCover.addEventListener('click', openLargePlayer); // Open modal on mini player cover click
modalCloseBtn.addEventListener('click', closeLargePlayer);
largePlayerModal.querySelector('.large-player-overlay').addEventListener('click', closeLargePlayer);

modalPlayBtn.addEventListener('click', () => {
  if(audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});

modalNextBtn.addEventListener('click', playNextStation);
modalPrevBtn.addEventListener('click', playPrevStation);


/* -----------------------
   Mini controls behavior
   ----------------------- */
miniPlay.addEventListener('click', () => {
  if(audio.paused){
    audio.play().then(()=> {
      isPlaying = true;
      miniPlay.textContent = '⏸';
    }).catch(()=>{ /* ignore autoplay fails */ });
  } else {
    audio.pause();
    isPlaying = false;
    miniPlay.textContent = '▶';
  }
});

miniStop.addEventListener('click', () => {
  audio.pause();
  audio.currentTime = 0;
  audio.src = '';
  isPlaying = false;
  hasListened = false;
  hideMiniPlayer();
  miniTitle.textContent = 'Sin reproducción';
  miniCover.src = placeholderCover();
});

miniVolume.addEventListener('input', () => {
  audio.volume = parseFloat(miniVolume.value);
  modalVolumeSlider.value = miniVolume.value;
});

modalVolumeSlider.addEventListener('input', () => {
  audio.volume = parseFloat(modalVolumeSlider.value);
  miniVolume.value = modalVolumeSlider.value;
});

/* Sync play/pause icon with audio events */
audio.addEventListener('play', ()=> {
  miniPlay.textContent = '⏸';
  modalPlayBtn.textContent = '⏸';
  isPlaying = true;
});
audio.addEventListener('pause', ()=> {
  miniPlay.textContent = '▶';
  modalPlayBtn.textContent = '▶';
  isPlaying = false;
});
audio.addEventListener('ended', ()=> {
  miniPlay.textContent = '▶';
  modalPlayBtn.textContent = '▶';
  isPlaying = false;
});

/* -----------------------
   Helpers and init
   ----------------------- */
function placeholderCover(){ return 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#071021"/><text x="50%" y="50%" fill="#7ea6c7" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial" font-size="28">PixelWave</text></svg>`); }

function init(){
  createGenreCards();
  // ensure mini player hidden initially
  hideMiniPlayer();
  // set default volume
  audio.volume = parseFloat(miniVolume.value);
}

/* init app */
init();

