let currentMode = 'visao-geral';
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

document.addEventListener("DOMContentLoaded", async () => {
    await carregarDadosTemporada();

    initParticles();
    animateParticles();

    switchTab('visao-geral');

    // Fechar modal ao clicar fora
    document.getElementById('player-sheet').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeSheet();
    });
});

async function carregarDadosTemporada() {
    if (window.location.protocol === 'file:') {
        window.DADOS_ORIGEM = 'dados-js-gerado';
        return;
    }

    if (typeof window.carregarDadosDaPlanilha !== 'function') {
        window.DADOS_ORIGEM = 'fallback-dados-js';
        return;
    }

    try {
        const dadosDaPlanilha = await window.carregarDadosDaPlanilha();
        if (dadosDaPlanilha) {
            DADOS = dadosDaPlanilha;
            window.DADOS = dadosDaPlanilha;
            window.DADOS_ORIGEM = 'planilha';
            console.info('Dados carregados da planilha:', window.DADOS_PLANILHA_ARQUIVO || 'Pontuação 2026.xlsx', DADOS.meta);
        }
    } catch (error) {
        window.DADOS_ORIGEM = 'fallback-dados-js';
        console.warn('Usando dados.js como fallback:', error);
    }
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

        const rodadaAtual = DADOS.meta?.rodadaAtual || Math.max(...todosJogadores.map(p => p.historico?.length || 0), 0);
        const totalGols = todosJogadores.reduce((sum, p) => sum + (p.gols || 0), 0);

        // Destaque da rodada mais recente
        const mvpData = DADOS.meta?.destaque || { nome: artilheiro.nome, gols: artilheiro.gols || 0, jogos: artilheiro.jogos || 0 };
        const mvpTexto = mvpData.gols === 1
            ? 'Marcou <strong>1</strong> gol na última rodada!'
            : `Marcou impressionantes <strong>${mvpData.gols}</strong> gols na última rodada!`;

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
                            <div class="mvp-stat">${mvpTexto}</div>
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
                <div class="draft-section">
                    <div class="widget-title"><i class="fa-solid fa-clipboard-list"></i> Sorteio dos Times</div>
                    <a class="draft-card hover-tilt click-shrink" href="https://app.pelada-draft.com.br/peladas" target="_blank" rel="noopener noreferrer">
                        <div class="draft-icon">
                            <i class="fa-solid fa-people-arrows"></i>
                        </div>
                        <div class="draft-copy">
                            <span>Pelada Draft</span>
                            <strong>Montar times da rodada</strong>
                            <small>Use como apoio para organizar a pelada e separar os times.</small>
                        </div>
                        <div class="draft-action">
                            <span>Abrir</span>
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </div>
                    </a>
                </div></div>
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
    let boardTitle = 'Tabela Geral';
    let boardIcon = 'fa-table-list';

    if (currentMode === 'classificacao') {
        list = [...classificacaoSegura].sort((a, b) => b.pontos - a.pontos || b.gols - a.gols);
    } else if (currentMode === 'artilharia') {
        list = [...todosJogadores].sort((a, b) => b.gols - a.gols);
        valueKey = 'gols'; unitLabel = 'GOLS'; boardTitle = 'Artilharia'; boardIcon = 'fa-futbol';
    } else {
        list = [...goleirosSeguros].sort((a, b) => b.pontos - a.pontos);
        boardTitle = 'Goleiros'; boardIcon = 'fa-shield-halved';
    }

    const top3 = list.slice(0, 3);
    const mediaPontos = list.length ? (list.reduce((sum, p) => sum + (p.pontos || 0), 0) / list.length).toFixed(1) : '0.0';
    const totalJogos = list.reduce((sum, p) => sum + (p.jogos || 0), 0);
    const totalValor = list.reduce((sum, p) => sum + (p[valueKey] || 0), 0);

    let podiumHTML = '<div class="podium-container">';
    [1, 0, 2].forEach(idx => {
        if (!top3[idx]) return;
        const p = top3[idx]; const rank = idx + 1;
        podiumHTML += `
            <div class="podium-card rank-${rank} hover-tilt click-shrink" onclick="openSheet('${p.nome}')">
                ${rank === 1 ? '<i class="fa-solid fa-crown crown"></i>' : ''}
                <div class="p-avatar">#${rank}</div>
                <div class="p-val">${p[valueKey]}</div>
                <div class="p-name">${p.nome}</div>
            </div>`;
    });
    podiumHTML += '</div>';

    const html = `
        <section class="board-shell">
            <div class="board-hero">
                <div class="board-title-wrap">
                    <div class="board-kicker"><i class="fa-solid ${boardIcon}"></i> TEMPORADA 2026</div>
                    <h2>${boardTitle}</h2>
                </div>
                <div class="board-summary">
                    <div><span>${list.length}</span><small>Atletas</small></div>
                    <div><span>${totalValor}</span><small>${unitLabel}</small></div>
                    <div><span>${totalJogos}</span><small>Jogos</small></div>
                    <div><span>${mediaPontos}</span><small>Media Pts</small></div>
                </div>
            </div>

            <div class="board-grid">
                <aside class="board-podium-panel">
                    ${podiumHTML}
                </aside>
                ${renderMacroTable(list, valueKey, unitLabel, currentMode)}
            </div>
        </section>
    `;
    area.innerHTML = html;
    initInteractiveEffects();
}

function renderMacroTable(list, valueKey, unitLabel, mode) {
    const leaderValue = Math.max(...list.map(p => p[valueKey] || 0), 1);
    const rows = list.map((p, idx) => {
        const rank = idx + 1;
        const aproveitamento = getAproveitamento(p);
        const mediaGols = p.jogos > 0 ? ((p.gols || 0) / p.jogos).toFixed(2) : '0.00';
        const barWidth = Math.max(((p[valueKey] || 0) / leaderValue) * 100, 4);
        const rankClass = rank <= 3 ? `rank-top-${rank}` : '';

        return `
            <tr class="macro-row click-shrink ${rankClass}" onclick="openSheet('${p.nome}')">
                <td class="macro-rank">#${rank}</td>
                <td class="macro-player">
                    <span class="macro-avatar">${getInitials(p.nome)}</span>
                    <span>
                        <strong>${p.nome}</strong>
                        <small>${renderRecentForm(p.historico)}</small>
                    </span>
                </td>
                <td class="macro-main">
                    <strong>${p[valueKey] || 0}</strong>
                    <span>${unitLabel}</span>
                    <div class="macro-meter"><i style="width:${barWidth}%"></i></div>
                </td>
                <td data-label="Pts">${p.pontos || 0}</td>
                <td data-label="J">${p.jogos || 0}</td>
                <td data-label="G">${p.gols || 0}</td>
                <td data-label="%">${aproveitamento}%</td>
                <td data-label="${mode === 'artilharia' ? 'G/J' : 'Ult'}">${mode === 'artilharia' ? mediaGols : getLastNumeric(p.historico)}</td>
            </tr>
        `;
    }).join('');

    const lastHeader = mode === 'artilharia' ? 'G/J' : 'Ult.';

    return `
        <div class="macro-table-card">
            <div class="macro-table-head">
                <span class="widget-title"><i class="fa-solid fa-ranking-star"></i> Ranking completo</span>
            </div>
            <div class="macro-table-scroll">
                <table class="macro-table">
                    <thead>
                        <tr>
                            <th>Pos</th>
                            <th>Atleta</th>
                            <th>${unitLabel}</th>
                            <th>Pts</th>
                            <th>J</th>
                            <th>Gols</th>
                            <th>Aprov.</th>
                            <th>${lastHeader}</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function getAproveitamento(player) {
    if (!player.jogos) return '0.0';
    return (((player.pontos || 0) / (player.jogos * 3)) * 100).toFixed(1);
}

function getInitials(name) {
    return String(name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase();
}

function renderRecentForm(history = []) {
    return history.slice(-5).map(result => {
        let cls = 'mini-loss';
        let label = result;
        if (result === 3) { cls = 'mini-win'; label = 'V'; }
        else if (result === 1) { cls = 'mini-draw'; label = 'E'; }
        else if (result === 'F') { cls = 'mini-absent'; label = 'F'; }
        return `<i class="${cls}">${label}</i>`;
    }).join('');
}

function getLastNumeric(history = []) {
    for (let i = history.length - 1; i >= 0; i--) {
        if (typeof history[i] === 'number') return history[i];
    }
    return '-';
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
    const isGoalkeeper = goleirosSeguros.some(p => p.nome === name);

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
    document.getElementById('sInitials').innerText = getInitials(player.nome);
    document.getElementById('sRole').innerHTML = isGoalkeeper
        ? '<i class="fa-solid fa-shield-halved"></i> GOLEIRO'
        : '<i class="fa-solid fa-person-running"></i> ATLETA';
    animateValue('sPoints', 0, player.pontos, 800);
    animateValue('sGames', 0, player.jogos, 600);
    animateValue('sGoals', 0, player.gols || 0, 700);

    const aproveitamento = player.jogos > 0 ? ((player.pontos / (player.jogos * 3)) * 100) : 0;
    const golsJogo = player.jogos > 0 ? ((player.gols || 0) / player.jogos) : 0;
    document.getElementById('sAprov').innerText = `${aproveitamento.toFixed(1)}%`;
    document.getElementById('sAprovBar').style.width = `${Math.min(aproveitamento, 100)}%`;
    document.getElementById('sGolsJogo').innerText = golsJogo.toFixed(2);

    const hContainer = document.getElementById('sHistory');
    hContainer.innerHTML = '';
    const recent = (player.historico || []).slice(-8);
    const recentNumbers = recent.filter(res => typeof res === 'number');
    const wins = recentNumbers.filter(res => res === 3).length;
    const draws = recentNumbers.filter(res => res === 1).length;
    const losses = recentNumbers.filter(res => res === 0).length;
    const absences = recent.filter(res => res === 'F').length;

    if (player.historico) {
        recent.forEach((res, idx) => {
            let cls = 'h-loss';
            let label = res;
            if (res === 3) cls = 'h-win';
            else if (res === 1) cls = 'h-draw';
            else if (res === 'F') cls = 'h-absent';
            if (res === 3) label = 'V';
            else if (res === 1) label = 'E';
            else if (res === 0) label = 'D';
            hContainer.innerHTML += `<div class="h-dot ${cls}" style="animation: slideUp 0.3s backwards ${idx * 0.06}s">${label}</div>`;
        });
    }
    document.getElementById('sTrend').innerText = wins >= 3 ? 'Momento forte' : absences >= 3 ? 'Baixa presenca' : 'Ritmo estavel';
    document.getElementById('sHistorySummary').innerHTML = `
        <span><strong>${wins}</strong> V</span>
        <span><strong>${draws}</strong> E</span>
        <span><strong>${losses}</strong> D</span>
        <span><strong>${absences}</strong> F</span>
    `;

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


