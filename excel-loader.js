(function () {
    const DEFAULT_EXCEL_FILES = [
        'Pontua\u00e7\u00e3o 2026.xlsx',
        './Pontua\u00e7\u00e3o 2026.xlsx',
    ];
    const XLSX_CDN_URLS = [
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    ];
    const FIRST_ROUND_COL = 8; // Column I in Excel.

    window.carregarDadosDaPlanilha = async function carregarDadosDaPlanilha(fileName = DEFAULT_EXCEL_FILES) {
        if (!window.XLSX) {
            await carregarBibliotecaXlsx();
        }

        const response = await buscarPlanilha(Array.isArray(fileName) ? fileName : [fileName]);
        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
        const sheetName = escolherAbaMaisRecente(workbook.SheetNames);
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: null,
            raw: true,
        });

        return montarDados(rows, sheetName);
    };

    async function carregarBibliotecaXlsx() {
        for (const url of XLSX_CDN_URLS) {
            try {
                await carregarScript(url);
                if (window.XLSX) return;
            } catch (error) {
                console.warn(`Falha ao carregar XLSX em ${url}`, error);
            }
        }

        throw new Error('Biblioteca XLSX nao carregada.');
    }

    function carregarScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Nao foi possivel carregar ${src}`));
            document.head.appendChild(script);
        });
    }

    async function buscarPlanilha(fileNames) {
        const candidates = fileNames.flatMap((name) => {
            const encoded = encodeURI(name);
            return encoded === name ? [name] : [name, encoded];
        });

        let lastError = null;
        for (const candidate of candidates) {
            try {
                const response = await fetch(candidate, { cache: 'no-store' });
                if (response.ok) {
                    window.DADOS_PLANILHA_ARQUIVO = candidate;
                    return response;
                }

                lastError = new Error(`${candidate}: HTTP ${response.status}`);
            } catch (error) {
                lastError = error;
            }
        }

        throw new Error(`Nao foi possivel carregar a planilha. ${lastError?.message || ''}`);
    }

    function escolherAbaMaisRecente(sheetNames) {
        const numericSheets = sheetNames
            .map((name) => ({ name, year: Number(String(name).match(/\d{4}/)?.[0]) }))
            .filter((item) => Number.isFinite(item.year))
            .sort((a, b) => b.year - a.year);

        return numericSheets[0]?.name || sheetNames[sheetNames.length - 1];
    }

    function montarDados(rows, sheetName) {
        const pontosHeader = findRow(rows, 0, (row) => isAtletas(row[1]) && includesNorm(row[2], 'pontuacao'));
        const goleirosHeader = findRow(rows, pontosHeader + 1, (row) => includesNorm(row[1], 'goleiros'));
        const artilhariaTitle = findRow(rows, goleirosHeader + 1, (row) => includesNorm(row[1], 'artilharia'));
        const golsHeader = findRow(rows, artilhariaTitle + 1, (row) => isAtletas(row[1]) && includesNorm(row[2], 'gols'));
        const goleirosGolsHeader = findRow(rows, golsHeader + 1, (row) => includesNorm(row[1], 'goleiros'));

        if ([pontosHeader, goleirosHeader, artilhariaTitle, golsHeader, goleirosGolsHeader].some((idx) => idx < 0)) {
            throw new Error('Formato da planilha nao reconhecido.');
        }

        const classificacaoBase = parseBlock(rows, pontosHeader, goleirosHeader);
        const goleirosBase = parseBlock(rows, goleirosHeader, artilhariaTitle);
        const artilharia = parseBlock(rows, golsHeader, goleirosGolsHeader, 'gols');
        const artilhariaGoleiros = parseBlock(rows, goleirosGolsHeader, rows.length, 'gols');

        const rodadaAtual = Math.max(
            ...classificacaoBase.map((p) => p.historico.length),
            ...goleirosBase.map((p) => p.historico.length),
            0
        );

        const golsPorNome = toMap(artilharia, (p) => p.nome, (p) => p);
        const golsGoleirosPorNome = toMap(artilhariaGoleiros, (p) => p.nome, (p) => p);

        const classificacao = classificacaoBase.map((player) => {
            const gols = golsPorNome.get(key(player.nome));
            return {
                ...player,
                gols: gols?.gols || 0,
            };
        });

        artilharia.forEach((player) => {
            if (classificacao.some((item) => mesmoNome(item.nome, player.nome))) return;

            classificacao.push({
                nome: player.nome,
                pontos: 0,
                jogos: player.jogos || 0,
                historico: player.historico.map((value) => value === 'F' ? 'F' : 0),
                gols: player.gols || 0,
            });
        });

        const goleiros = goleirosBase.map((player) => {
            const gols = golsGoleirosPorNome.get(key(player.nome));
            return {
                ...player,
                gols: gols?.gols || 0,
            };
        });

        return {
            classificacao,
            goleiros,
            meta: {
                aba: sheetName,
                rodadaAtual,
                destaque: calcularDestaque(artilharia),
            },
        };
    }

    function parseBlock(rows, headerIndex, endIndex, totalKey = 'pontos') {
        const dataRows = rows.slice(headerIndex + 1, endIndex);
        const activeLength = getActiveHistoryLength(dataRows);

        return dataRows
            .filter((row) => isPlayerRow(row))
            .map((row) => ({
                nome: cleanName(row[1]),
                [totalKey]: toNumber(row[2]),
                jogos: toNumber(row[7]),
                historico: readHistory(row, activeLength),
            }));
    }

    function getActiveHistoryLength(rows) {
        return rows.reduce((max, row) => {
            if (!isPlayerRow(row)) return max;

            for (let col = row.length - 1; col >= FIRST_ROUND_COL; col -= 1) {
                if (isFilled(row[col])) return Math.max(max, col - FIRST_ROUND_COL + 1);
            }

            return max;
        }, 0);
    }

    function readHistory(row, length) {
        const history = [];

        for (let i = 0; i < length; i += 1) {
            const value = row[FIRST_ROUND_COL + i];
            history.push(normalizeResult(value));
        }

        return history;
    }

    function normalizeResult(value) {
        if (typeof value === 'string' && value.trim().toUpperCase() === 'F') return 'F';
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
        return 'F';
    }

    function calcularDestaque(artilharia) {
        const maxLength = Math.max(...artilharia.map((p) => p.historico.length), 0);

        for (let round = maxLength - 1; round >= 0; round -= 1) {
            const rodada = artilharia
                .map((player) => ({
                    nome: player.nome,
                    gols: typeof player.historico[round] === 'number' ? player.historico[round] : null,
                    jogos: player.jogos,
                    rodada: round + 1,
                }))
                .filter((player) => player.gols !== null);

            if (rodada.length) {
                return rodada.sort((a, b) => b.gols - a.gols || a.nome.localeCompare(b.nome))[0];
            }
        }

        return null;
    }

    function findRow(rows, startIndex, predicate) {
        for (let i = Math.max(startIndex, 0); i < rows.length; i += 1) {
            if (predicate(rows[i] || [])) return i;
        }

        return -1;
    }

    function isPlayerRow(row) {
        const name = cleanName(row?.[1]);
        if (!name) return false;
        if (includesNorm(name, 'goleiros')) return false;
        if (includesNorm(name, 'atletas')) return false;
        if (includesNorm(name, 'artilharia')) return false;
        return typeof row[2] === 'number' || !Number.isNaN(Number(row[2]));
    }

    function isAtletas(value) {
        return normalize(value) === 'atletas';
    }

    function includesNorm(value, search) {
        return normalize(value).includes(normalize(search));
    }

    function normalize(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    function cleanName(value) {
        return String(value || '').trim();
    }

    function key(value) {
        return normalize(value);
    }

    function mesmoNome(a, b) {
        return key(a) === key(b);
    }

    function toNumber(value) {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function isFilled(value) {
        return value !== null && value !== undefined && String(value).trim() !== '';
    }

    function toMap(items, keySelector, valueSelector) {
        const map = new Map();
        items.forEach((item) => map.set(key(keySelector(item)), valueSelector(item)));
        return map;
    }
})();

