let currentMode = 'visao-geral';
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

document.addEventListener("DOMContentLoaded", () => {
    initParticles();
    animateParticles();
    switchTab('visao-geral');

    // Fechar modal ao clicar fora
    document.getElementById('player-sheet').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeSheet();
    });
});

function switchTab(mode) {
    currentMode = mode;
    const buttons = document.querySelectorAll('.seg-btn');
    const glider = document.querySelector('.seg-glider');

    buttons.forEach((btn, index) => {
        if (btn.getAttribute('onclick').includes(mode)) {
            btn.classList.add('active');
            // Movimento mais elástico do glider
            glider.style.transform = `translateX(${index * 100}%) scaleX(1.1)`;
            setTimeout(() => { glider.style.transform = `translateX(${index * 100}%) scaleX(1)`; }, 200);
        } else {
            btn.classList.remove('active');
        }
    });
    renderContent();
}

function renderContent() {
    const area = document.getElementById('content-area');
    area.innerHTML = '';

    // --- DASHBOARD RICO ---
    // --- DASHBOARD RICO ---
    // --- DASHBOARD RICO ---
    if (currentMode === 'visao-geral') {
        const sortedClass = [...DADOS.classificacao].sort((a, b) => b.pontos - a.pontos || b.gols - a.gols);
        const lider = sortedClass[0];
        const artilheiro = [...DADOS.classificacao, ...DADOS.goleiros].sort((a, b) => b.gols - a.gols)[0];

        // Stats Gerais
        const rodadaAtual = 5;
        const totalGols = [...DADOS.classificacao, ...DADOS.goleiros].reduce((sum, p) => sum + p.gols, 0);

        // --- DADOS MANUAIS DA RODADA & HISTÓRICO ---

        // 1. Destaque da Última Rodada (Dados de 31/Jan)
        const mvpData = {
            nome: "Edgar",
            gols: 6,
            jogos: 3
        };

        // 2. Histórico de Partidas
        const matches = [
            { date: "03/JAN", score: "11 x 3", winner: "CHELSEA", winClass: "win-chelsea", rowClass: "h-chelsea" },
            { date: "10/JAN", score: "3 x 11", winner: "MANCHESTER", winClass: "win-manchester", rowClass: "h-manchester" },
            { date: "17/JAN", score: "8 x 8", winner: "EMPATE", winClass: "win-draw", rowClass: "h-draw" },
            { date: "24/JAN", score: "6 x 4", winner: "CHELSEA", winClass: "win-chelsea", rowClass: "h-chelsea" },
            { date: "31/JAN", score: "9 x 8", winner: "CHELSEA", winClass: "win-chelsea", rowClass: "h-chelsea" }
        ];

        let historyHTML = '';
        // Inverter para mostrar o mais recente no topo
        [...matches].reverse().forEach(m => {
            historyHTML += `
                <div class="history-row ${m.rowClass}">
                    <span class="h-date">${m.date}</span>
                    <span class="h-winner ${m.winClass}">${m.winner}</span>
                    <span class="h-score">${m.score}</span>
                </div>
            `;
        });

        const html = `
            <div class="dash-container">
                
                <div class="widget-card big-stat-flex">
                    <div class="bs-item">
                        <div class="num">${rodadaAtual}ª</div>
                        <div class="lbl">RODADA ATUAL</div>
                    </div>
                    <div class="bs-item">
                        <div class="num">${totalGols}</div>
                        <div class="lbl">GOLS TOTAIS</div>
                    </div>
                </div>

                <div class="section-title" style="margin-top:10px">Líderes Gerais <i class="fa-solid fa-crown"></i></div>
                <div class="titans-grid">
                    <div class="titan-card leader hover-tilt click-shrink" onclick="openSheet('${lider.nome}')">
                        <div class="titan-badge"><i class="fa-solid fa-trophy"></i> LÍDER</div>
                        <div class="titan-content">
                            <div class="titan-val">${lider.pontos}</div>
                            <div class="titan-lbl">PONTOS</div>
                            <div class="titan-name">${lider.nome}</div>
                        </div>
                    </div>
                    <div class="titan-card sniper hover-tilt click-shrink" onclick="openSheet('${artilheiro.nome}')">
                        <div class="titan-badge"><i class="fa-solid fa-crosshairs"></i> ARTILHEIRO</div>
                        <div class="titan-content">
                            <div class="titan-val">${artilheiro.gols}</div>
                            <div class="titan-lbl">GOLS</div>
                            <div class="titan-name">${artilheiro.nome}</div>
                        </div>
                    </div>
                </div>

                <div class="mvp-section">
                    <div class="widget-title"><i class="fa-solid fa-star"></i> Destaque da Última Rodada</div>
                    <div class="mvp-card hover-tilt" onclick="openSheet('${mvpData.nome}')">
                        <div class="mvp-info">
                            <div class="mvp-label"><i class="fa-solid fa-fire"></i> MVP DA SEMANA</div>
                            <div class="mvp-name">${mvpData.nome}</div>
                            <div class="mvp-stat">Marcou <strong>${mvpData.gols}</strong> gols na Sexta</div>
                        </div>
                        <div class="mvp-icon">
                            <i class="fa-solid fa-futbol"></i>
                        </div>
                    </div>
                </div>

                <div>
                    <div class="widget-title"><i class="fa-solid fa-timeline"></i> Histórico de Partidas</div>
                    <div class="match-history-card">
                        <div class="history-list">
                            ${historyHTML}
                        </div>
                    </div>
                </div>


            </div>
        `;
        area.innerHTML = html;
        initInteractiveEffects();
        startCountdown();
        return;
    }

    // --- TABELAS (Classificação, Artilharia, Goleiros) ---
    let list = [];
    let valueKey = 'pontos';
    let unitLabel = 'PTS';

    if (currentMode === 'classificacao') {
        list = [...DADOS.classificacao].sort((a, b) => b.pontos - a.pontos || b.gols - a.gols);
    } else if (currentMode === 'artilharia') {
        list = [...DADOS.classificacao, ...DADOS.goleiros].sort((a, b) => b.gols - a.gols);
        valueKey = 'gols'; unitLabel = 'GOLS';
    } else {
        list = [...DADOS.goleiros].sort((a, b) => b.pontos - a.pontos);
    }

    // Pódio
    const top3 = list.slice(0, 3);
    let html = '<div class="podium-container">';
    [1, 0, 2].forEach(idx => {
        if (!top3[idx]) return;
        const p = top3[idx]; const rank = idx + 1;
        html += `
            <div class="podium-card rank-${rank} hover-tilt click-shrink" onclick="openSheet('${p.nome}')">
                ${rank === 1 ? '<i class="fa-solid fa-crown crown"></i>' : ''}
                <div class="p-avatar">#${rank}</div>
                <div class="p-val">${p[valueKey]}</div>
                <div class="p-name">${p.nome}</div>
            </div>`;
    });
    html += '</div>';

    // Lista Restante
    const rest = list.slice(3);
    html += `<div class="list-container" style="padding-bottom: 20px;">`;
    rest.forEach((p, idx) => {
        const rank = idx + 4;
        html += `
            <div class="list-row hover-tilt click-shrink" onclick="openSheet('${p.nome}')">
                <div style="display:flex; align-items:center; gap:15px;">
                    <span class="r-pos">${rank}</span>
                    <span class="r-name">${p.nome}</span>
                </div>
                <span class="r-val">${p[valueKey]} <span style="font-size:0.7rem; opacity:0.6;">${unitLabel}</span></span>
            </div>`;
    });
    html += '</div>';
    area.innerHTML = html;
    initInteractiveEffects();
}

// --- INTERATIVIDADE E FUNÇÕES AUXILIARES MANTIDAS IGUAIS ---
function initInteractiveEffects() {
    const tiltElements = document.querySelectorAll('.hover-tilt');
    tiltElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xPct = (x / rect.width) - 0.5; const yPct = (y / rect.height) - 0.5;
            el.style.transform = `perspective(1000px) rotateY(${xPct * 8}deg) rotateX(${yPct * -8}deg) scale(1.01)`;
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) scale(1)';
        });
    });
}

function openSheet(name) {
    const allPlayers = [...DADOS.classificacao, ...DADOS.goleiros];
    const player = allPlayers.find(p => p.nome === name);
    if (!player) return;

    const sortedList = allPlayers.sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        return b.gols - a.gols;
    });

    const rank = sortedList.findIndex(p => p.nome === name) + 1;
    const rankElement = document.getElementById('sRank');
    rankElement.innerText = `#${rank} GERAL`;
    rankElement.className = 'player-rank-badge';
    if (rank === 1) rankElement.classList.add('rank-gold');
    else if (rank === 2) rankElement.classList.add('rank-silver');
    else if (rank === 3) rankElement.classList.add('rank-bronze');

    document.getElementById('sName').innerText = player.nome;
    animateValue('sPoints', 0, player.pontos, 800);
    animateValue('sGames', 0, player.jogos, 600);
    animateValue('sGoals', 0, player.gols, 700);

    const hContainer = document.getElementById('sHistory');
    hContainer.innerHTML = '';
    if (player.historico) {
        player.historico.forEach((res, idx) => {
            let cls = 'h-loss';
            if (res === 3) cls = 'h-win';
            else if (res === 1) cls = 'h-draw';
            else if (res === 'F') cls = 'h-absent';
            hContainer.innerHTML += `<div class="h-dot ${cls}" style="animation: slideUp 0.3s backwards ${idx * 0.1}s"></div>`;
        });
    }

    const sheetCard = document.getElementById('player-sheet').querySelector('.sheet-card');
    sheetCard.classList.add('light-mode');
    document.getElementById('player-sheet').classList.add('open');
}

function closeSheet() {
    document.getElementById('player-sheet').classList.remove('open');
    setTimeout(() => {
        document.getElementById('player-sheet').querySelector('.sheet-card').classList.remove('light-mode');
    }, 400);
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (end === 0) { obj.innerText = "0"; return; }
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerText = Math.floor(progress * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerText = end;
    };
    window.requestAnimationFrame(step);
}

let timerInterval;
function startCountdown() {
    const timeDisplay = document.querySelector('.match-time');
    if (!timeDisplay) return;
    if (timerInterval) clearInterval(timerInterval);
    function updateTimer() {
        const now = new Date(); const nextGame = new Date();
        const daysUntilFri = (5 - now.getDay() + 7) % 7; // Ajustado para Sexta (5)
        nextGame.setDate(now.getDate() + daysUntilFri); nextGame.setHours(19, 0, 0, 0); // Ajustado para 19h
        if (now > nextGame) nextGame.setDate(nextGame.getDate() + 7);
        const diff = nextGame - now;
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        if (d > 0) timeDisplay.innerHTML = `${d}D ${h}H ${m}M`;
        else timeDisplay.innerHTML = `<span style="color:var(--fire)">${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}</span>`;
    }
    timerInterval = setInterval(updateTimer, 1000); updateTimer();
}

let particles = [];
function initParticles() { resizeCanvas(); window.addEventListener('resize', resizeCanvas); for (let i = 0; i < 35; i++) particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, size: Math.random() * 2.5 + 0.5 }); }
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > canvas.width) p.vx *= -1; if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        let grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, 'rgba(0, 242, 255, 0.8)'); grad.addColorStop(1, 'rgba(0, 242, 255, 0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    requestAnimationFrame(animateParticles);
}