let currentMode = 'visao-geral';
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

document.addEventListener("DOMContentLoaded", () => {
    initParticles();
    animateParticles();

    // Injeta os estilos da Arena VS dinamicamente
    injectVSStyles();

    switchTab('visao-geral');

    // Fechar modal ao clicar fora
    document.getElementById('player-sheet').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeSheet();
    });
});

function injectVSStyles() {
    if (document.getElementById('vs-arena-styles')) return;
    const style = document.createElement('style');
    style.id = 'vs-arena-styles';
    style.innerHTML = `
        .vs-arena {
            background: linear-gradient(180deg, #111 0%, #050505 100%);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 25px 15px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.6);
            position: relative;
            overflow: hidden;
        }
        .vs-arena::before {
            content: ''; position: absolute; top: -50px; left: 50%; transform: translateX(-50%);
            width: 200px; height: 100px; background: radial-gradient(circle, rgba(255,77,0,0.15) 0%, transparent 70%); pointer-events: none;
        }
        .vs-header {
            display: flex; justify-content: space-between; align-items: center; margin-bottom: 35px; position: relative;
        }
        .vs-player-box {
            width: 40%; text-align: center; position: relative;
        }
        .vs-select {
            width: 100%; appearance: none; background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.1);
            color: white; padding: 12px 10px; border-radius: 12px; font-weight: 900; font-family: 'Space Grotesk';
            font-size: 0.95rem; text-align: center; cursor: pointer; outline: none; transition: 0.3s;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        /* Correção para o seletor não ficar todo branco */
        .vs-select option {
            background-color: #111; 
            color: white;
            font-weight: bold;
        }
        
        .p1-box .vs-select { border-color: rgba(0, 242, 255, 0.4); text-shadow: 0 0 10px rgba(0, 242, 255, 0.5); }
        .p2-box .vs-select { border-color: rgba(255, 204, 0, 0.4); text-shadow: 0 0 10px rgba(255, 204, 0, 0.5); }
        .p1-box .vs-select:focus { border-color: var(--accent); box-shadow: 0 0 20px rgba(0, 242, 255, 0.3); }
        .p2-box .vs-select:focus { border-color: var(--gold); box-shadow: 0 0 20px rgba(255, 204, 0, 0.3); }
        
        .vs-badge {
            font-family: 'Space Grotesk'; font-weight: 900; color: var(--fire); font-size: 1.8rem;
            text-shadow: 0 0 20px rgba(255, 77, 0, 0.8), 0 0 40px rgba(255, 77, 0, 0.4);
            animation: pulseVS 2s infinite; z-index: 2;
        }
        
        .stat-row {
            display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
        }
        .stat-label-center {
            width: 70px; text-align: center; font-size: 0.65rem; color: #888; font-weight: 800;
            text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;
        }
        .bar-container {
            flex: 1; height: 22px; background: rgba(255,255,255,0.03); display: flex; align-items: center;
            border-radius: 6px; position: relative;
        }
        .bar-left { justify-content: flex-end; border-right: 1px solid rgba(255,255,255,0.1); }
        .bar-right { justify-content: flex-start; border-left: 1px solid rgba(255,255,255,0.1); }
        
        .bar-fill {
            height: 100%; display: flex; align-items: center; font-family: 'Space Grotesk'; font-weight: 900; font-size: 0.85rem;
            color: #000; transition: width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .fill-p1 { background: linear-gradient(90deg, #0088ff, var(--accent)); justify-content: flex-start; padding-left: 8px; border-radius: 6px 0 0 6px; box-shadow: 0 0 15px rgba(0, 242, 255, 0.4); overflow:hidden;}
        .fill-p2 { background: linear-gradient(90deg, var(--gold), #ff8800); justify-content: flex-end; padding-right: 8px; border-radius: 0 6px 6px 0; box-shadow: 0 0 15px rgba(255, 204, 0, 0.4); overflow:hidden;}
        
        @keyframes pulseVS {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.15); opacity: 1; text-shadow: 0 0 30px rgba(255, 77, 0, 1); }
            100% { transform: scale(1); opacity: 0.8; }
        }
    `;
    document.head.appendChild(style);
}

function switchTab(mode) {
    currentMode = mode;
    const buttons = document.querySelectorAll('.seg-btn');
    const glider = document.querySelector('.seg-glider');

    buttons.forEach((btn, index) => {
        if (btn.getAttribute('onclick').includes(mode)) {
            btn.classList.add('active');
            glider.style.transform = `translateX(${index * 100}%) scaleX(1.1)`;
            setTimeout(() => { glider.style.transform = `translateX(${index * 100}%) scaleX(1)`; }, 200);
        } else {
            btn.classList.remove('active');
        }
    });
    renderContent();
}

// --- LÓGICA DA BATALHA INTERATIVA ---
window.updateBatalha = function () {
    if (!window.APP_PLAYERS) return;
    const p1Name = document.getElementById('vs-p1').value;
    const p2Name = document.getElementById('vs-p2').value;

    // Busca os jogadores apenas se a seleção não for vazia
    const p1 = p1Name ? window.APP_PLAYERS.find(p => p.nome === p1Name) : null;
    const p2 = p2Name ? window.APP_PLAYERS.find(p => p.nome === p2Name) : null;

    // Se nenhum jogador for selecionado de um lado, os status desse lado ficam 0
    const stats1 = p1 ? {
        pts: p1.pontos,
        gols: p1.gols || 0,
        jogos: p1.jogos,
        aprov: p1.jogos > 0 ? ((p1.pontos / (p1.jogos * 3)) * 100) : 0
    } : { pts: 0, gols: 0, jogos: 0, aprov: 0 };

    const stats2 = p2 ? {
        pts: p2.pontos,
        gols: p2.gols || 0,
        jogos: p2.jogos,
        aprov: p2.jogos > 0 ? ((p2.pontos / (p2.jogos * 3)) * 100) : 0
    } : { pts: 0, gols: 0, jogos: 0, aprov: 0 };

    const maxPts = Math.max(stats1.pts, stats2.pts, 1);
    const maxGols = Math.max(stats1.gols, stats2.gols, 1);
    const maxJogos = Math.max(stats1.jogos, stats2.jogos, 1);
    const maxAprov = 100; // Aproveitamento máximo é sempre 100%

    // Atualiza as barras
    updateBar('pts', stats1.pts, stats2.pts, maxPts, false);
    updateBar('gols', stats1.gols, stats2.gols, maxGols, false);
    updateBar('jogos', stats1.jogos, stats2.jogos, maxJogos, false);
    updateBar('aprov', stats1.aprov, stats2.aprov, maxAprov, true);
};

function updateBar(statId, val1, val2, maxVal, isPercent) {
    const bar1 = document.getElementById(`bar-p1-${statId}`);
    const bar2 = document.getElementById(`bar-p2-${statId}`);

    // Se não há valor, a barra fica invisível em 0%. 
    // Se há, garante um mínimo de 5% de largura para o número caber no visual
    const pct1 = val1 === 0 ? 0 : Math.max((val1 / maxVal) * 100, 5);
    const pct2 = val2 === 0 ? 0 : Math.max((val2 / maxVal) * 100, 5);

    bar1.style.width = pct1 + '%';
    bar2.style.width = pct2 + '%';

    // Se o valor for 0, oculta o número na tela inicial para ficar "limpo"
    const display1 = val1 === 0 ? "" : (isPercent ? val1.toFixed(1) + '%' : val1);
    const display2 = val2 === 0 ? "" : (isPercent ? val2.toFixed(1) + '%' : val2);

    bar1.innerText = display1;
    bar2.innerText = display2;
}

function renderContent() {
    const area = document.getElementById('content-area');
    area.innerHTML = '';

    const classificacaoSegura = DADOS.classificacao || [];
    const goleirosSeguros = DADOS.goleiros || [];
    const todosJogadores = [...classificacaoSegura, ...goleirosSeguros];
    window.APP_PLAYERS = todosJogadores;

    if (currentMode === 'visao-geral') {
        const sortedClass = [...classificacaoSegura].sort((a, b) => b.pontos - a.pontos || b.gols - a.gols);
        const lider = sortedClass[0] || { nome: "N/A", pontos: 0, gols: 0 };
        const artilheiro = [...todosJogadores].sort((a, b) => b.gols - a.gols)[0] || { nome: "N/A", gols: 0 };

        const rodadaAtual = 15;
        const totalGols = todosJogadores.reduce((sum, p) => sum + (p.gols || 0), 0);

        // Atualizado para o Andrey com 4 gols na rodada 15
        const mvpData = { nome: "Andrey", gols: 4, jogos: 11 };

        const jogadoresAtivos = [...classificacaoSegura].filter(p => p.jogos > 0);
        const top5 = jogadoresAtivos.map(p => {
            const aproveitamentoPts = (p.pontos / (p.jogos * 3)) * 100;
            const mediaGols = p.gols / p.jogos;
            const indice = (p.pontos + p.gols) / p.jogos;
            return { ...p, aproveitamentoPts, mediaGols, indice };
        }).sort((a, b) => b.indice - a.indice).slice(0, 5);

        let top5HTML = '';
        top5.forEach((p, idx) => {
            top5HTML += `
                <div class="list-row hover-tilt click-shrink" onclick="openSheet('${p.nome}')" style="margin-bottom: 10px; padding: 12px 15px;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span class="r-pos" style="background: rgba(0, 242, 255, 0.15); color: var(--primary); font-size: 1.1rem; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: 800;">${idx + 1}</span>
                        <div style="display:flex; flex-direction:column; gap: 4px;">
                            <span class="r-name" style="font-size: 1rem; line-height: 1;">${p.nome}</span>
                            <span style="font-size: 0.75rem; color: #a0a0a0; line-height: 1;">
                                <i class="fa-solid fa-chart-simple" style="color:var(--primary)"></i> ${p.aproveitamentoPts.toFixed(1)}% Pts &nbsp;|&nbsp; 
                                <i class="fa-solid fa-futbol" style="color:#fff"></i> ${p.mediaGols.toFixed(2)} Gols/J
                            </span>
                        </div>
                    </div>
                    <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end;">
                        <span class="r-val" style="color: var(--primary); font-size: 1.2rem; line-height: 1;">${p.indice.toFixed(2)}</span>
                        <span style="font-size: 0.6rem; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Índice</span>
                    </div>
                </div>
            `;
        });

        // Configuração Menu Arena VS: Começa com opção "Selecione..." vazia
        let optionsHTML = '<option value="" disabled selected>Selecione...</option>';
        const playersForSelect = [...todosJogadores].sort((a, b) => b.nome.localeCompare(a.nome));
        playersForSelect.forEach(p => {
            optionsHTML += `<option value="${p.nome}">${p.nome}</option>`;
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
                            <div class="mvp-stat">Marcou impressionantes <strong>${mvpData.gols}</strong> gols na última rodada!</div>
                        </div>
                        <div class="mvp-icon">
                            <i class="fa-solid fa-futbol"></i>
                        </div>
                    </div>
                </div>

                <div class="top5-section" style="margin-top: 25px;">
                    <div class="widget-title"><i class="fa-solid fa-chart-pie"></i> Top 5 Aproveitamento</div>
                    <div style="background: transparent;">
                        ${top5HTML}
                    </div>
                </div>

                <div style="margin-top: 35px; margin-bottom: 30px;">
                    <div class="widget-title"><i class="fa-solid fa-gamepad"></i> Arena Head-to-Head</div>
                    
                    <div class="vs-arena">
                        <div class="vs-header">
                            <div class="vs-player-box p1-box">
                                <select id="vs-p1" class="vs-select" onchange="window.updateBatalha()">
                                    ${optionsHTML}
                                </select>
                            </div>
                            <div class="vs-badge">VS</div>
                            <div class="vs-player-box p2-box">
                                <select id="vs-p2" class="vs-select" onchange="window.updateBatalha()">
                                    ${optionsHTML}
                                </select>
                            </div>
                        </div>

                        <div class="stat-row">
                            <div class="bar-container bar-left">
                                <div id="bar-p1-pts" class="bar-fill fill-p1" style="width: 0%;"></div>
                            </div>
                            <div class="stat-label-center">Pontos<br>Totais</div>
                            <div class="bar-container bar-right">
                                <div id="bar-p2-pts" class="bar-fill fill-p2" style="width: 0%;"></div>
                            </div>
                        </div>

                        <div class="stat-row">
                            <div class="bar-container bar-left">
                                <div id="bar-p1-gols" class="bar-fill fill-p1" style="width: 0%;"></div>
                            </div>
                            <div class="stat-label-center">Bolas na<br>Rede</div>
                            <div class="bar-container bar-right">
                                <div id="bar-p2-gols" class="bar-fill fill-p2" style="width: 0%;"></div>
                            </div>
                        </div>

                        <div class="stat-row">
                            <div class="bar-container bar-left">
                                <div id="bar-p1-aprov" class="bar-fill fill-p1" style="width: 0%;"></div>
                            </div>
                            <div class="stat-label-center">Aprov.<br>Pts (%)</div>
                            <div class="bar-container bar-right">
                                <div id="bar-p2-aprov" class="bar-fill fill-p2" style="width: 0%;"></div>
                            </div>
                        </div>
                        
                        <div class="stat-row" style="margin-bottom: 0;">
                            <div class="bar-container bar-left">
                                <div id="bar-p1-jogos" class="bar-fill fill-p1" style="width: 0%;"></div>
                            </div>
                            <div class="stat-label-center">Presença<br>(Jogos)</div>
                            <div class="bar-container bar-right">
                                <div id="bar-p2-jogos" class="bar-fill fill-p2" style="width: 0%;"></div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        `;
        area.innerHTML = html;
        initInteractiveEffects();
        startCountdown();

        // Roda a batalha uma vez para garantir que as barras iniciem vazias e bonitas
        setTimeout(() => {
            window.updateBatalha();
        }, 150);
        return;
    }

    // --- TABELAS (Classificação, Artilharia, Goleiros) ---
    let list = [];
    let valueKey = 'pontos';
    let unitLabel = 'PTS';

    if (currentMode === 'classificacao') {
        list = [...classificacaoSegura].sort((a, b) => b.pontos - a.pontos || b.gols - a.gols);
    } else if (currentMode === 'artilharia') {
        list = [...todosJogadores].sort((a, b) => b.gols - a.gols);
        valueKey = 'gols'; unitLabel = 'GOLS';
    } else {
        list = [...goleirosSeguros].sort((a, b) => b.pontos - a.pontos);
    }

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
    const classificacaoSegura = DADOS.classificacao || [];
    const goleirosSeguros = DADOS.goleiros || [];
    const allPlayers = [...classificacaoSegura, ...goleirosSeguros];
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
    animateValue('sGoals', 0, player.gols || 0, 700);

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
    if (end === 0 || !end) { obj.innerText = "0"; return; }
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
        const daysUntilFri = (5 - now.getDay() + 7) % 7;
        nextGame.setDate(now.getDate() + daysUntilFri); nextGame.setHours(19, 0, 0, 0);
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