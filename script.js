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
    if (currentMode === 'visao-geral') {
        const sortedClass = [...DADOS.classificacao].sort((a, b) => b.pontos - a.pontos || b.gols - a.gols);
        const lider = sortedClass[0];
        const artilheiro = [...DADOS.classificacao, ...DADOS.goleiros].sort((a, b) => b.gols - a.gols)[0];
        const melhorGoleiro = [...DADOS.goleiros].sort((a, b) => b.pontos - a.pontos)[0];

        // Stats Gerais
        const rodadaAtual = Math.max(...DADOS.classificacao.map(p => p.jogos));
        const totalGols = [...DADOS.classificacao, ...DADOS.goleiros].reduce((sum, p) => sum + p.gols, 0);

        // Lógica do "Formômetro" (Tendência dos Top 3)
        let trendHTML = '';
        sortedClass.slice(0, 3).forEach((p, idx) => {
            // Pega os últimos 3 jogos (se existirem)
            const recentHistory = p.historico.slice(-3);
            let trendIcon = '<i class="fa-solid fa-minus trend-flat trend-arrow"></i>'; // Estável

            if (recentHistory.length >= 2) {
                // Lógica simples: mais vitórias recentes = subindo
                const wins = recentHistory.filter(h => h === 3).length;
                if (wins >= 2) trendIcon = '<i class="fa-solid fa-arrow-trend-up trend-up trend-arrow"></i>';
                else if (wins === 0 && recentHistory.includes(0)) trendIcon = '<i class="fa-solid fa-arrow-trend-down trend-down trend-arrow"></i>';
            }

            trendHTML += `
                <div class="trend-item hover-tilt click-shrink" onclick="openSheet('${p.nome}')">
                    <div class="trend-info">
                        <span class="trend-rank">#${idx + 1}</span>
                        <span class="trend-name">${p.nome}</span>
                    </div>
                    <div class="trend-graph">${trendIcon}</div>
                </div>`;
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

                <div>
                    <div class="widget-title"><i class="fa-solid fa-crown"></i> Os Titãs da Temporada</div>
                    <div class="titans-grid">
                        <div class="titan-card leader hover-tilt click-shrink" onclick="openSheet('${lider.nome}')">
                            <div class="titan-badge"><i class="fa-solid fa-trophy"></i> LÍDER ATUAL</div>
                            <div class="titan-content">
                                <div class="titan-val">${lider.pontos}</div>
                                <div class="titan-lbl">PONTOS CORRIDOS</div>
                                <div class="titan-name">${lider.nome}</div>
                            </div>
                        </div>
                        <div class="titan-card sniper hover-tilt click-shrink" onclick="openSheet('${artilheiro.nome}')">
                            <div class="titan-badge"><i class="fa-solid fa-crosshairs"></i> ARTILHEIRO</div>
                            <div class="titan-content">
                                <div class="titan-val">${artilheiro.gols}</div>
                                <div class="titan-lbl">GOLS MARCADOS</div>
                                <div class="titan-name">${artilheiro.nome}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dash-row-grid">
                    <div class="widget-card hover-tilt click-shrink" onclick="openSheet('${melhorGoleiro.nome}')">
                         <div class="widget-title"><i class="fa-solid fa-hand-fist"></i> Paredão</div>
                         <div class="goalie-spotlight">
                            <div class="goalie-avatar"><i class="fa-solid fa-shield-halved"></i></div>
                            <div class="goalie-data">
                                <h3>${melhorGoleiro.nome}</h3>
                                <div class="goalie-stats">
                                    <span><strong>${melhorGoleiro.pontos}</strong> Pts</span>
                                    <span><strong>${melhorGoleiro.jogos}</strong> Jogos</span>
                                </div>
                            </div>
                         </div>
                    </div>
                    
                    <div class="widget-card">
                        <div class="widget-title"><i class="fa-solid fa-chart-line"></i> Formômetro (Top 3)</div>
                        <div class="trend-list">
                            ${trendHTML}
                        </div>
                    </div>
                </div>

                 <div class="next-match-banner hover-tilt">
                    <div class="widget-title" style="justify-content: center;"><i class="fa-regular fa-calendar-days"></i> Próximo Confronto</div>
                    <div class="match-time">CALCULANDO...</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: 700; letter-spacing: 1px;">SÁBADO • 09:00 • </div>
                </div>

            </div>
        `;
        area.innerHTML = html;
        initInteractiveEffects(); // Nova função global de efeitos
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

    // Pódio com novas classes de interatividade
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

    // Lista com novas classes de interatividade
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
    initInteractiveEffects(); // Aplica efeitos nas tabelas também
}

// --- INTERATIVIDADE GLOBAL (Tilt 3D em tudo) ---
function initInteractiveEffects() {
    // Seleciona qualquer elemento com a classe .hover-tilt
    const tiltElements = document.querySelectorAll('.hover-tilt');

    tiltElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            // Cálculo mais sutil para elementos menores
            const xPct = (x / rect.width) - 0.5; const yPct = (y / rect.height) - 0.5;
            // Rotação reduzida para não ficar enjoativo
            el.style.transform = `perspective(1000px) rotateY(${xPct * 8}deg) rotateX(${yPct * -8}deg) scale(1.01)`;
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) scale(1)';
        });
    });
}


function openSheet(name) {
    const player = [...DADOS.classificacao, ...DADOS.goleiros].find(p => p.nome === name);
    if (!player) return;

    // Determina o ranking geral baseado em pontos
    let sortedList = [...DADOS.classificacao, ...DADOS.goleiros].sort((a, b) => b.pontos - a.pontos);
    const rank = sortedList.findIndex(p => p.nome === name) + 1;

    document.getElementById('sRank').innerText = `#${rank} GERAL`;
    document.getElementById('sName').innerText = player.nome;
    // Animação dos números no modal
    animateValue('sPoints', 0, player.pontos, 800);
    animateValue('sGames', 0, player.jogos, 600);
    animateValue('sGoals', 0, player.gols, 700);

    const hContainer = document.getElementById('sHistory');
    hContainer.innerHTML = '';
    if (player.historico) {
        player.historico.forEach((res, idx) => {
            let cls = res === 3 ? 'h-win' : (res === 0 ? 'h-loss' : 'h-draw');
            // Adiciona com delay para efeito cascata
            hContainer.innerHTML += `<div class="h-dot ${cls}" style="animation: slideUp 0.3s backwards ${idx * 0.05}s"></div>`;
        });
    }

    const sheetCard = document.getElementById('player-sheet').querySelector('.sheet-card');
    // ADICIONA A CLASSE LIGHT-MODE PARA O EFEITO BRANCO/GLASS
    sheetCard.classList.add('light-mode');

    document.getElementById('player-sheet').classList.add('open');
}

function closeSheet() {
    document.getElementById('player-sheet').classList.remove('open');
    // Remove a classe light-mode depois que fechar para não piscar
    setTimeout(() => {
        document.getElementById('player-sheet').querySelector('.sheet-card').classList.remove('light-mode');
    }, 400);
}

// Função utilitária para animar números
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


// Countdown (Mantido, apenas ajustado o seletor)
let timerInterval;
function startCountdown() {
    const timeDisplay = document.querySelector('.match-time');
    if (!timeDisplay) return;
    if (timerInterval) clearInterval(timerInterval);
    function updateTimer() {
        const now = new Date(); const nextGame = new Date();
        const daysUntilSat = (6 - now.getDay() + 7) % 7;
        nextGame.setDate(now.getDate() + daysUntilSat); nextGame.setHours(9, 0, 0, 0);
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

/* BACKGROUND (Mantido mas com blend mode screen no CSS) */
let particles = [];
function initParticles() { resizeCanvas(); window.addEventListener('resize', resizeCanvas); for (let i = 0; i < 35; i++) particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, size: Math.random() * 2.5 + 0.5 }); }
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > canvas.width) p.vx *= -1; if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        // Gradiente nas partículas
        let grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, 'rgba(0, 242, 255, 0.8)'); grad.addColorStop(1, 'rgba(0, 242, 255, 0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    requestAnimationFrame(animateParticles);
}