// run with: npx tsx countpieces.ts <process_number_1>,<process_number_2>,...

// Direct API access without dependencies
import { config } from 'dotenv';
// import json from './cnis.json'

// Load environment variables
config({ path: '.env.local' });

// ===== Tipos de entrada =====
type NaturezaVinculo =
    | "EMPREGADO"
    | "CONTRIBUINTE_INDIVIDUAL"
    | "BENEFICIO_INCAPACIDADE"
    | "NAO_INFORMADO"
    | string;

interface PeriodoContribuicao {
    dataInicial: string; // "dd/MM/yyyy"
    dataFinal: string;   // "dd/MM/yyyy"
    descricao: string;
    formaContagem: "COMUM" | string;
    naturezaVinculo: NaturezaVinculo;
    contarCarencia: boolean;
    observacao?: string;
    prioritario?: boolean;
}

interface Salario {
    competencia: string; // "MM/yyyy"
    valor: number;
}

interface CnisJson {
    dadosSegurado: {
        nit: string;
        cpf: string;
        nome: string;
        nascimento: string;
        mae: string;
    };
    periodosContribuicao: PeriodoContribuicao[];
    salarios: Salario[];
}

// ===== Parâmetros =====
interface PoliticaParametros {
    referencia: string | Date;           // DII/DER
    carenciaExigida?: number;            // default 12
    isencaoCarencia?: boolean;           // default false
    mesesReaquisicaoCarenciaPosPerda?: number; // default 6 (art. 27-A)
    exigirPagamentoParaCI?: boolean;     // default true
    hasDesempregoComprovado?: () => boolean; // default () => false
    habilitarGraça24Se120?: boolean;     // default true
    diaVencimentoContribuicao?: number;  // default 15 (para “manteve QS até”)
}

// ===== Saída =====
type StatusQualidade = "contribuindo" | "em_graca" | "sem_qualidade";
type CarenciaStatus = "em_formacao" | "cumprida" | "isenta" | "nao_aplica";
type TipoIntervalo = "Recolhimentos" | "Benefício" | "Em graça" | "Sem qualidade" | "Ativo sem carência";

interface TimelineSegmento {
    // chaves mensais (internas)
    inicioYM: string; // "yyyy-MM"
    fimYM: string;    // "yyyy-MM"
    // datas com dia (para exibição)
    inicio: string;   // "dd/MM/yyyy"
    fim: string;      // "dd/MM/yyyy"

    tipo: TipoIntervalo;
    statusQS: StatusQualidade;
    statusCarencia: CarenciaStatus;
    naturezaVinculo?: NaturezaVinculo | string; // natureza predominante (ou BENEFICIO_INCAPACIDADE) no segmento

    mesesNoIntervalo: number;     // número de competências no segmento
    mesesContamCarencia: number;  // competências válidas p/ carência dentro do segmento
}

interface ResultadoElegibilidade {
    referencia: string; // "yyyy-MM"
    qualidadeNaReferencia: boolean;
    statusNaReferencia: StatusQualidade;

    // Carência
    carenciaMesesConsiderados: number;
    carenciaExigida: number;
    carenciaCumprida: boolean;
    isencaoCarencia: boolean;

    // Perdas / graça
    tevePerdaQualidadeNoHistorico: boolean;
    dataPerdaMaisRecente?: string; // "yyyy-MM"
    periodoGracaAtual?: { inicio: string; fim: string; meses: number };

    // Estatísticas
    totalCompetenciasContribuidas: number;
    totalCompetenciasDesdeUltimaPerda: number;
    tem120CompetenciasHistoricas: boolean;

    // Timeline final
    timeline: TimelineSegmento[];
}

// ===== Utils =====
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

function parseBrDate(d: string): Date {
    const [dd, mm, yyyy] = d.split("/").map(Number);
    return new Date(yyyy, mm - 1, dd);
}
function parseCompetencia(c: string): { y: number; m: number } {
    const [mm, yyyy] = c.split("/").map(Number);
    return { y: yyyy, m: mm };
}
function toYM(y: number, m: number) { return `${y}-${pad2(m)}`; }
function fromDateToYM(d: Date) { return { y: d.getFullYear(), m: d.getMonth() + 1 }; }
function firstDMY(y: number, m: number) { return `01/${pad2(m)}/${y}`; }
function lastDayOfMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); } // m:1..12
function lastDMY(y: number, m: number) { return `${pad2(lastDayOfMonth(y, m))}/${pad2(m)}/${y}`; }

function addMonths(y: number, m: number, delta: number) {
    const base = new Date(y, m - 1, 1);
    base.setMonth(base.getMonth() + delta);
    return { y: base.getFullYear(), m: base.getMonth() + 1 };
}
function* iterYM(inicio: { y: number; m: number }, fim: { y: number; m: number }) {
    let cur = { ...inicio };
    while (cur.y < fim.y || (cur.y === fim.y && cur.m <= fim.m)) {
        yield { ...cur };
        cur = addMonths(cur.y, cur.m, 1);
    }
}
function parseReferencia(ref: string | Date): { y: number; m: number } {
    if (ref instanceof Date) return fromDateToYM(ref);
    if (/^\d{4}-\d{2}$/.test(ref)) {
        const [yy, mm] = ref.split("-").map(Number);
        return { y: yy, m: mm };
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(ref as string)) return fromDateToYM(parseBrDate(ref as string));
    if (/^\d{2}\/\d{4}$/.test(ref as string)) {
        const { y, m } = parseCompetencia(ref as string);
        return { y, m };
    }
    return fromDateToYM(new Date());
}

// ===== Núcleo =====
export function calcularBeneficioIncapacidade(
    cnis: CnisJson,
    params: PoliticaParametros
): ResultadoElegibilidade {
    const {
        carenciaExigida = 12,
        isencaoCarencia = false,
        mesesReaquisicaoCarenciaPosPerda = 6,
        exigirPagamentoParaCI = true,
        hasDesempregoComprovado = () => false,
        habilitarGraça24Se120 = true,
        diaVencimentoContribuicao = 15,
    } = params;

    const ref = parseReferencia(params.referencia);

    // --- índices mensais ---
    const competenciasPagas = new Set<string>(
        cnis.salarios.map((s) => {
            const { y, m } = parseCompetencia(s.competencia);
            return toYM(y, m);
        })
    );

    const contaCarencia = new Set<string>(); // meses que contam carência
    const temVinculo = new Set<string>();    // meses com vínculo (exclui benefício)
    const ehBeneficio = new Set<string>();   // meses com benefício por incapacidade

    // Mapas de dia para benefício (bordas reais por mês)
    const beneficioStartDay = new Map<string, number>(); // ym -> dia inicial no mês
    const beneficioEndDay = new Map<string, number>();   // ym -> dia final no mês
    // Bordas para vínculos (não-benefício)
    const vinculoStartDay = new Map<string, number>();
    const vinculoEndDay = new Map<string, number>();
    // Naturezas por mês
    const naturezasPorMes = new Map<string, Set<NaturezaVinculo>>();

    // Indexação dos períodos
    for (const p of cnis.periodosContribuicao) {
        const iniDate = parseBrDate(p.dataInicial);
        const fimDate = parseBrDate(p.dataFinal);
        const ini = fromDateToYM(iniDate);
        const fim = fromDateToYM(fimDate);

        const isBenef = p.naturezaVinculo === "BENEFICIO_INCAPACIDADE";

        for (const c of iterYM(ini, fim)) {
            const ym = toYM(c.y, c.m);

            if (isBenef) {
                ehBeneficio.add(ym);
                // bordas por mês
                const firstMonth = (c.y === ini.y && c.m === ini.m);
                const lastMonth = (c.y === fim.y && c.m === fim.m);

                const sd = firstMonth ? iniDate.getDate() : 1;
                const ed = lastMonth ? fimDate.getDate() : lastDayOfMonth(c.y, c.m);

                // Se houver sobreposição de benefícios, consolida min/max
                beneficioStartDay.set(ym, Math.min(beneficioStartDay.get(ym) ?? sd, sd));
                beneficioEndDay.set(ym, Math.max(beneficioEndDay.get(ym) ?? ed, ed));

            } else {
                // vínculo "não-benefício"
                temVinculo.add(ym);
                // natureza para o mês
                if (!naturezasPorMes.has(ym)) naturezasPorMes.set(ym, new Set());
                naturezasPorMes.get(ym)!.add(p.naturezaVinculo as NaturezaVinculo);

                // bordas por mês do vínculo (para refletir datas reais na timeline)
                const firstMonth = (c.y === ini.y && c.m === ini.m);
                const lastMonth = (c.y === fim.y && c.m === fim.m);
                const sd = firstMonth ? iniDate.getDate() : 1;
                const ed = lastMonth ? fimDate.getDate() : lastDayOfMonth(c.y, c.m);
                vinculoStartDay.set(ym, Math.min(vinculoStartDay.get(ym) ?? sd, sd));
                vinculoEndDay.set(ym, Math.max(vinculoEndDay.get(ym) ?? ed, ed));

                if (!p.contarCarencia) continue;

                if (p.naturezaVinculo === "EMPREGADO" || p.naturezaVinculo === "NAO_INFORMADO") {
                    contaCarencia.add(ym);
                } else if (p.naturezaVinculo === "CONTRIBUINTE_INDIVIDUAL") {
                    if (!exigirPagamentoParaCI || competenciasPagas.has(ym)) {
                        contaCarencia.add(ym);
                    }
                } else {
                    if (competenciasPagas.has(ym)) contaCarencia.add(ym);
                }
            }
        }
    }

    // Se não há nenhum vínculo/benefício indexado
    const allCovered = Array.from(new Set([...temVinculo, ...ehBeneficio])).sort();
    if (allCovered.length === 0) {
        const refStr = toYM(ref.y, ref.m);
        return {
            referencia: refStr,
            qualidadeNaReferencia: false,
            statusNaReferencia: "sem_qualidade",
            carenciaMesesConsiderados: 0,
            carenciaExigida,
            carenciaCumprida: isencaoCarencia ? true : 0 >= carenciaExigida,
            isencaoCarencia,
            tevePerdaQualidadeNoHistorico: true,
            totalCompetenciasContribuidas: 0,
            totalCompetenciasDesdeUltimaPerda: 0,
            tem120CompetenciasHistoricas: false,
            timeline: [{
                inicioYM: refStr, fimYM: refStr,
                inicio: firstDMY(ref.y, ref.m), fim: lastDMY(ref.y, ref.m),
                tipo: "Sem qualidade",
                statusQS: "sem_qualidade",
                statusCarencia: isencaoCarencia ? "isenta" : "nao_aplica",
                mesesNoIntervalo: 1,
                mesesContamCarencia: 0,
            }],
        };
    }

    const [y0, m0] = allCovered[0].split("-").map(Number);
    const inicioGlobal = { y: y0, m: m0 };
    const lastKey = allCovered[allCovered.length - 1];
    const [yl, ml] = lastKey.split("-").map(Number);
    const ultimoCoberto = { y: yl, m: ml };

    const fimSimulacao = (() => {
        const plus36 = addMonths(ultimoCoberto.y, ultimoCoberto.m, 36);
        if (plus36.y > ref.y || (plus36.y === ref.y && plus36.m > ref.m)) return plus36;
        return ref;
    })();

    // --- Simulação mês a mês ---
    type Mes = {
        ym: string; y: number; m: number;
        conta: boolean;
        vinculo: boolean;
        beneficio: boolean;
        statusQS: StatusQualidade;
    naturezaVinculo?: NaturezaVinculo | string;
    };

    const meses: Mes[] = [];

    let contHist = 0;
    let contDesdePerda = 0;
    let estoqueGraca = 0;
    let tevePerda = false;
    let dataPerdaMaisRecente: string | undefined;

    // Abrir graça somente quando cessa contribuição E não há vínculo/benefício (QS passará a depender só da graça)
    const recomputaGraca = () => {
        let base = 12;
        if (habilitarGraça24Se120 && contHist >= 120) base = 24;
        if (hasDesempregoComprovado()) base += 12;
        return base;
    };

    let prevConta = false;

    for (const c of iterYM(inicioGlobal, fimSimulacao)) {
        const ym = toYM(c.y, c.m);
        const conta = contaCarencia.has(ym);
        const vinc = temVinculo.has(ym);
        const benef = ehBeneficio.has(ym);
        let naturezaVinculo: string | undefined;
        if (benef) naturezaVinculo = "BENEFICIO_INCAPACIDADE";
        else if (vinc) {
            const set = naturezasPorMes.get(ym);
            if (set) {
                if (set.size === 1) naturezaVinculo = Array.from(set)[0];
                else naturezaVinculo = Array.from(set).sort().join(","); // múltiplas naturezas no mesmo mês
            }
        }

        if (conta) { contHist++; contDesdePerda++; }

        // Abrir graça APENAS se parou de contribuir e também não há vínculo nem benefício no mês
        if (prevConta && !conta && !vinc && !benef) {
            estoqueGraca = recomputaGraca();
        }

        let statusQS: StatusQualidade;
        if (conta || vinc || benef) {
            statusQS = "contribuindo";
        } else if (estoqueGraca > 0) {
            statusQS = "em_graca";
            estoqueGraca -= 1;
        } else {
            statusQS = "sem_qualidade";
            if (!tevePerda) dataPerdaMaisRecente = dataPerdaMaisRecente ?? ym;
            tevePerda = true;
            contDesdePerda = 0;
        }

    meses.push({ ym, y: c.y, m: c.m, conta, vinculo: vinc, beneficio: benef, statusQS, naturezaVinculo });
        prevConta = conta;
    }

    const refYM = toYM(ref.y, ref.m);
    const mesRef = meses.find((x) => x.ym === refYM) ?? meses[meses.length - 1];
    const statusNaReferencia = mesRef.statusQS;
    const qualidadeNaReferencia = statusNaReferencia !== "sem_qualidade";

    // --- Carência até referência (art. 27-A parametrizado) ---
    const blocos: { inicioYM: string; fimYM: string; contribs: number }[] = [];
    let contando = false, inicioBlocoYM = "", contribs = 0, ultimaPerdaAntesRef: string | undefined;

    for (const m of meses) {
        if (m.ym > refYM) break;
        if (m.statusQS === "sem_qualidade") {
            if (contando) { blocos.push({ inicioYM: inicioBlocoYM, fimYM: m.ym, contribs }); contando = false; contribs = 0; }
            ultimaPerdaAntesRef = m.ym;
            continue;
        }
        if (!contando) { contando = true; inicioBlocoYM = m.ym; contribs = 0; }
        if (m.conta) contribs++;
    }
    if (contando) blocos.push({ inicioYM: inicioBlocoYM, fimYM: refYM, contribs });

    const blocoCorrente = blocos[blocos.length - 1] ?? { contribs: 0, inicioYM: refYM, fimYM: refYM };
    const contribsCorrente = blocoCorrente.contribs;

    let carenciaMesesConsiderados = contribsCorrente;
    if (ultimaPerdaAntesRef) {
        if (contribsCorrente >= mesesReaquisicaoCarenciaPosPerda) {
            for (let i = 0; i < blocos.length - 1; i++) carenciaMesesConsiderados += blocos[i].contribs;
        }
    } else {
        for (let i = 0; i < blocos.length - 1; i++) carenciaMesesConsiderados += blocos[i].contribs;
    }

    const carenciaCumprida = isencaoCarencia ? true : carenciaMesesConsiderados >= carenciaExigida;

    // --- Overlay de Carência mês a mês (até fimSimulacao, para fechar segmentos) ---
    const overlay: Record<string, CarenciaStatus> = {};
    if (isencaoCarencia) {
        for (const m of meses) overlay[m.ym] = "isenta";
    } else {
        const ateRef = meses.filter(x => x.ym <= refYM);
        const contribAntesDoCiclo = (inicioYM: string) =>
            ateRef.filter(x => x.conta && x.ym < inicioYM).length;

        let emCiclo = false;
        let inicioCicloYM = "";
        let houvePerdaAnterior = false;
        let contribDesdePerda = 0;
        let reab = false;

        for (const m of ateRef) {
            if (m.statusQS === "sem_qualidade") {
                overlay[m.ym] = "nao_aplica";
                houvePerdaAnterior = true;
                emCiclo = false; inicioCicloYM = ""; contribDesdePerda = 0; reab = false;
                continue;
            }
            if (!emCiclo) {
                emCiclo = true;
                inicioCicloYM = m.ym;
                contribDesdePerda = 0;
                reab = !houvePerdaAnterior; // 1º ciclo: reab=true
            }
            if (m.conta) contribDesdePerda++;
            if (!reab && contribDesdePerda >= mesesReaquisicaoCarenciaPosPerda) reab = true;

            const base = reab ? contribAntesDoCiclo(inicioCicloYM) : 0;
            const carNoMes = base + contribDesdePerda;

            if (m.statusQS === "contribuindo" || m.statusQS === "em_graca") {
                overlay[m.ym] = carNoMes >= carenciaExigida ? "cumprida" : "em_formacao";
            } else overlay[m.ym] = "nao_aplica";
        }
        for (const m of meses.filter(x => x.ym > refYM)) {
            overlay[m.ym] = (m.statusQS === "sem_qualidade") ? "nao_aplica" : (carenciaCumprida ? "cumprida" : "em_formacao");
        }
    }

    // --- Função para derivar o "tipo" do mês ---
    const tipoDoMes = (m: Mes): TipoIntervalo => {
        if (m.statusQS === "sem_qualidade") return "Sem qualidade";
        if (m.statusQS === "em_graca") return "Em graça";
        // statusQS === "contribuindo"
        if (m.beneficio) return "Benefício";
        if (m.conta) return "Recolhimentos";
        if (m.vinculo && !m.conta) return "Ativo sem carência";
        return "Recolhimentos"; // fallback conservador
    };

    // --- Montagem da timeline (agregando por tipo + statusCarencia) ---
    const timeline: TimelineSegmento[] = [];
    let seg: TimelineSegmento | null = null;

    const pushOrExtend = (m: Mes) => {
        const tipo = tipoDoMes(m);
        const sQS = m.statusQS;
        const sCar = overlay[m.ym] ?? "nao_aplica";
        const contrib = m.conta ? 1 : 0;
        const natureza = m.naturezaVinculo; // pode ser undefined em graça / sem qualidade

        const sameKey = seg
            && seg.tipo === tipo
            && seg.statusQS === sQS
            && seg.statusCarencia === sCar
            && seg.naturezaVinculo === natureza; // quebra quando muda natureza

        if (!sameKey) {
            // fecha anterior
            if (seg) timeline.push(seg);
            // abre novo
            const inicioYM = m.ym;
            const fimYM = m.ym;

            const { y, m: mm } = { y: m.y, m: m.m };
            let inicioDMY = firstDMY(y, mm);
            let fimDMY = lastDMY(y, mm);

            if (tipo === "Benefício") {
                const sd = beneficioStartDay.get(inicioYM) ?? 1;
                const ed = beneficioEndDay.get(fimYM) ?? lastDayOfMonth(y, mm);
                inicioDMY = `${pad2(sd)}/${pad2(mm)}/${y}`;
                fimDMY = `${pad2(ed)}/${pad2(mm)}/${y}`;
            } else if (tipo === "Recolhimentos" || tipo === "Ativo sem carência") {
                // usar bordas reais do(s) vínculo(s) no mês
                const sd = vinculoStartDay.get(inicioYM) ?? 1;
                const ed = vinculoEndDay.get(fimYM) ?? lastDayOfMonth(y, mm);
                inicioDMY = `${pad2(sd)}/${pad2(mm)}/${y}`;
                fimDMY = `${pad2(ed)}/${pad2(mm)}/${y}`;
            }

            seg = {
                inicioYM, fimYM,
                inicio: inicioDMY,
                fim: fimDMY,
                tipo, statusQS: sQS, statusCarencia: sCar,
                naturezaVinculo: natureza,
                mesesNoIntervalo: 1,
                mesesContamCarencia: contrib,
            };
            return;
        }

        // estende
        seg.fimYM = m.ym;
    seg.mesesNoIntervalo += 1;
    seg.mesesContamCarencia += contrib;

        // ajustar datas com dia (bordas)
        const { y, m: mm } = { y: m.y, m: m.m };
        if (tipo === "Benefício") {
            // início: manter o já calculado (do 1º mês); fim: pegar borda do último mês
            const ed = beneficioEndDay.get(m.ym) ?? lastDayOfMonth(y, mm);
            seg.fim = `${pad2(ed)}/${pad2(mm)}/${y}`;
        } else {
            if (tipo === "Recolhimentos" || tipo === "Ativo sem carência") {
                const ed = vinculoEndDay.get(m.ym) ?? lastDayOfMonth(y, mm);
                seg.fim = `${pad2(ed)}/${pad2(mm)}/${y}`;
            } else {
                // datas padrão (1º e último dia do mês)
                seg.fim = lastDMY(y, mm);
            }
        }
    };

    for (const m of meses) pushOrExtend(m);
    if (seg) timeline.push(seg);

    // período de graça "atual" se a referência estiver dentro de um segmento Em graça
    let periodoGracaAtual: ResultadoElegibilidade["periodoGracaAtual"] = undefined;
    if (statusNaReferencia === "em_graca") {
        const s = timeline.find(s => s.statusQS === "em_graca" && s.inicioYM <= refYM && s.fimYM >= refYM);
        if (s) periodoGracaAtual = { inicio: s.inicioYM, fim: s.fimYM, meses: s.mesesNoIntervalo };
    }

    // Estatísticas
    const totalCompetenciasContribuidas = Array.from(contaCarencia).length;
    const totalCompetenciasDesdeUltimaPerda = blocoCorrente.contribs;
    const tem120CompetenciasHistoricas = totalCompetenciasContribuidas >= 120;

    return {
        referencia: refYM,
        qualidadeNaReferencia,
        statusNaReferencia,

        carenciaMesesConsiderados,
        carenciaExigida,
        carenciaCumprida,
        isencaoCarencia,

        tevePerdaQualidadeNoHistorico: tevePerda,
        dataPerdaMaisRecente,
        periodoGracaAtual,

        totalCompetenciasContribuidas,
        totalCompetenciasDesdeUltimaPerda,
        tem120CompetenciasHistoricas,

        timeline,
    };
}

// ===== Formatter (nova versão) =====
interface FormatterOpts {
    diaVencimento?: number;         // p/ "Manteve QS até", default 15
    incluirAtivoSemCarencia?: boolean; // se true, imprime "Ativo sem carência"
}

export function formatarTimelineParaLaudo(
    r: ResultadoElegibilidade,
    opts: FormatterOpts = {}
): string[] {
    const { diaVencimento = 15, incluirAtivoSemCarencia = false } = opts;

    const linhas: string[] = [];
    let totalDesdeUltimaPerda = 0;
    let contador = 0;

    // helper: data dd/MM/yyyy do "15 do mês seguinte ao fim"
    const manteveAte = (fimYM: string) => {
        let [y, m] = fimYM.split("-").map(Number);
        m += 1; if (m === 13) { m = 1; y += 1; }
        return `${pad2(diaVencimento)}/${pad2(m)}/${y}`;
    };

    for (let i = 0; i < r.timeline.length; i++) {
        const seg = r.timeline[i];

        // Zera acumulado na perda (após um "Em graça" vem "Sem qualidade")
        if (seg.tipo === "Sem qualidade") {
            totalDesdeUltimaPerda = 0;
            continue;
        }

        // Imprime apenas Recolhimentos / Benefício (e opcionalmente "Ativo sem carência")
        const imprime =
            seg.tipo === "Recolhimentos" ||
            seg.tipo === "Benefício" ||
            (incluirAtivoSemCarencia && seg.tipo === "Ativo sem carência");

        if (imprime) {
            contador++;

            // "Contribuições": regra especial para Benefício (usa mesesNoIntervalo)
            const contribs = seg.tipo === "Benefício"
                ? seg.mesesNoIntervalo
                : seg.mesesContamCarencia;

            const palavra = contribs === 1 ? "Contribuição" : "Contribuições";

            // Total acumulado desde a última perda:
            if (seg.tipo === "Benefício") {
                totalDesdeUltimaPerda += seg.mesesNoIntervalo;
            } else if (seg.tipo === "Recolhimentos") {
                totalDesdeUltimaPerda += seg.mesesContamCarencia;
            } else if (seg.tipo === "Ativo sem carência") {
                // por padrão, NÃO soma no total; mude aqui se quiser incluir:
                // totalDesdeUltimaPerda += seg.mesesNoIntervalo;
            }

            linhas.push(
                `${contador} – ${seg.inicio} a ${seg.fim} – ${seg.tipo} – ` +
                `${contribs} ${palavra} - Total: ${totalDesdeUltimaPerda} sem perda QS.`
            );

            // Se o próximo segmento é "Em graça", imprime a linha de Período de Graça
            const prox = r.timeline[i + 1];
            if (prox && prox.tipo === "Em graça") {
                const mesesGraca = prox.mesesNoIntervalo;
                linhas.push(
                    `** Perda da qualidade de segurado - Período de Graça: ${mesesGraca} ` +
                    `meses / Manteve QS até: ${manteveAte(prox.fimYM)}.`
                );
            }
        }
    }

    return linhas;
}

export function formatarTimelineParaLaudoAgrupado(
    r: ResultadoElegibilidade,
    opts: FormatterOpts = {}
): string[] {
    const { diaVencimento = 15, incluirAtivoSemCarencia = false } = opts;

    const tl = r.timeline;
    const linhas: string[] = [];
    let totalDesdeUltimaPerda = 0;
    let contador = 0;

    const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const plural = (n: number, s: string, p: string) => (n === 1 ? s : p);

    const manteveAte = (fimYM: string) => {
        let [y, m] = fimYM.split("-").map(Number);
        m += 1; if (m === 13) { m = 1; y += 1; }
        return `${pad2(diaVencimento)}/${pad2(m)}/${y}`;
    };

    const add1MonthYM = (ym: string): string => {
        let [y, m] = ym.split("-").map(Number);
        ({ y, m } = ((): { y: number; m: number } => {
            const d = new Date(y, m - 1, 1);
            d.setMonth(d.getMonth() + 1);
            return { y: d.getFullYear(), m: d.getMonth() + 1 };
        })());
        return `${y}-${pad2(m)}`;
    };

    // Decide se imprimimos um tipo específico
    const aceitaTipo = (t: TipoIntervalo) =>
        t === "Recolhimentos" || t === "Benefício" || (incluirAtivoSemCarencia && t === "Ativo sem carência");

    for (let i = 0; i < tl.length; i++) {
        const seg = tl[i];

        // Reset de total ao entrar em "Sem qualidade"
        if (seg.tipo === "Sem qualidade") {
            totalDesdeUltimaPerda = 0;
            continue;
        }

        // "Em graça" não vira linha própria; a notificação é anexada ao bloco anterior
        if (seg.tipo === "Em graça") continue;

        if (!aceitaTipo(seg.tipo)) {
            // ignorar segmentos que não imprimimos
            continue;
        }

        // Inicia um bloco agrupado
        let blocoInicio = seg.inicio;
        let blocoFim = seg.fim;
        let blocoInicioYM = seg.inicioYM;
        let blocoFimYM = seg.fimYM;
        const blocoTipo = seg.tipo;
        const blocoQS = seg.statusQS; // deve ser "contribuindo"
        let viuCumprida = (seg.statusCarencia === "cumprida");

        // contribuições do bloco
        let contribsBloco = (blocoTipo === "Benefício")
            ? seg.mesesNoIntervalo
            : seg.mesesContamCarencia;

        // Estende enquanto:
        // - próximo é do mesmo tipo e statusQS,
        // - mês é contíguo,
        // - e a única diferença permitida é a troca "em_formacao" -> "cumprida".
        let j = i + 1;
        while (j < tl.length) {
            const nxt = tl[j];

            // Paradas naturais: fim, troca de tipo/QS, gap de meses, ou segmentos não-imprimíveis no meio
            if (nxt.tipo === "Sem qualidade") break;
            if (nxt.tipo === "Em graça") break; // não atravessa a graça
            if (!aceitaTipo(nxt.tipo)) break;
            if (nxt.tipo !== blocoTipo) break;
            if (nxt.statusQS !== blocoQS) break;
            if (nxt.inicioYM !== add1MonthYM(blocoFimYM)) break;

            // Regra da carência dentro do bloco:
            // - Pode permanecer igual;
            // - Pode mudar de "em_formacao" -> "cumprida";
            // - Não pode voltar de "cumprida" -> "em_formacao".
            const car = nxt.statusCarencia;
            if (car === "cumprida") {
                viuCumprida = true;
            } else if (car === "em_formacao") {
                if (viuCumprida) break; // não permitir regressão
            } else {
                // "isenta" / "nao_aplica" quebram o bloco (não são só a troca em_formacao->cumprida)
                break;
            }

            // Estende o bloco
            blocoFim = nxt.fim;
            blocoFimYM = nxt.fimYM;
            contribsBloco += (blocoTipo === "Benefício")
                ? nxt.mesesNoIntervalo
                : nxt.mesesContamCarencia;

            j++;
        }

        // Emite a linha do bloco
        contador++;
        const palavra = plural(contribsBloco, "Contribuição", "Contribuições");

        // Atualiza Total desde a última perda
        if (blocoTipo === "Recolhimentos") {
            totalDesdeUltimaPerda += contribsBloco;
        } else if (blocoTipo === "Benefício") {
            totalDesdeUltimaPerda += contribsBloco; // segue seu exemplo
        } else if (blocoTipo === "Ativo sem carência") {
            // por padrão não soma; altere se quiser:
            // totalDesdeUltimaPerda += (blocoMeses ?? 0);
        }

        linhas.push(
            `${contador} – ${blocoInicio} a ${blocoFim} – ${blocoTipo} – ` +
            `${contribsBloco} ${palavra} - Total: ${totalDesdeUltimaPerda} sem perda QS.`
        );

        // Se o primeiro segmento imediatamente após o bloco é "Em graça", imprime a linha de Período de Graça.
        const prox = tl[j];
        if (prox && prox.tipo === "Em graça") {
            const mesesGraca = prox.mesesNoIntervalo;
            linhas.push(
                `** Perda da qualidade de segurado - Período de Graça: ${mesesGraca} ` +
                `meses / Manteve QS até: ${manteveAte(prox.fimYM)}.`
            );
        }

        // Pula os segmentos consumidos no bloco
        i = j - 1;
    }

    return linhas;
}


// ===== Tabela Markdown da Timeline =====
interface MarkdownDetalhadoOpts {
    diaVencimento?: number;             // default 15
    incluirAtivoSemCarencia?: boolean;  // default false
    incluirSemQualidade?: boolean;      // default true (para ver perdas explícitas)
}

// Novo formato solicitado: Natureza | Início | Fim | Contribuições | Meses | Tipo | DataPerda
export function gerarMarkdownTimelineDetalhado(
    r: ResultadoElegibilidade,
    opts: MarkdownDetalhadoOpts = {}
): string {
    const {
        diaVencimento = 15,
        incluirAtivoSemCarencia = false,
        incluirSemQualidade = true // manter opção, mas agora não gera linha; apenas influencia perda se começar em Sem qualidade
    } = opts;

    const addMes = (ym: string) => {
        let [y, m] = ym.split('-').map(Number);
        m += 1; if (m === 13) { m = 1; y += 1; }
        return `${y}-${pad2(m)}`;
    };
    const manteveAte = (fimYM: string) => {
        const nxt = addMes(fimYM);
        const [y, m] = nxt.split('-').map(Number);
        return `${pad2(diaVencimento)}/${pad2(m)}/${y}`;
    };
    const addOneDay = (d: string) => {
        const [dd, mm, yyyy] = d.split('/').map(Number);
        const dt = new Date(yyyy, mm - 1, dd + 1);
        return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
    };

    type Linha = {
        Natureza: string;
        Inicio: string;
        Fim: string;
        Contribuicoes: string;
        Meses: string;
        Tipo: string;
        CarenciaAte: string;
        DataLimiteQS: string;
        PerdeuQS: string;
    };

    const linhas: Linha[] = [];
    const tl = r.timeline;
    // Controle de contribuições acumuladas para cálculo linha a linha
    const carenciaExigida = r.carenciaExigida;
    let contribAcumulada = 0; // soma de competências válidas antes da linha

    for (let i = 0; i < tl.length; i++) {
        const seg = tl[i];
        if (seg.tipo === 'Em graça' || seg.tipo === 'Sem qualidade') continue; // não gerar linha própria
        if (seg.tipo === 'Ativo sem carência' && !incluirAtivoSemCarencia) continue;

        // Contribuições conforme regras anteriores
        let contrib = 0;
        if (seg.tipo === 'Recolhimentos') contrib = seg.mesesContamCarencia;
        else if (seg.tipo === 'Benefício') contrib = seg.mesesNoIntervalo;

        // Procurar sequência de graça imediatamente após o segmento
        let j = i + 1;
        let ultimoGraca: TimelineSegmento | undefined;
        while (j < tl.length && tl[j].tipo === 'Em graça') {
            ultimoGraca = tl[j];
            j++;
        }
        const proxDepoisGraca = tl[j];

        let dataLimiteQS = '';
        let perdeu = 'Não';
        if (ultimoGraca) {
            dataLimiteQS = manteveAte(ultimoGraca.fimYM);
            if (proxDepoisGraca && proxDepoisGraca.tipo === 'Sem qualidade') {
                // Perda ocorre no dia seguinte à data limite
                perdeu = 'Sim';
                // Mantemos dataLimiteQS como requerido; perda sinalizada pela coluna
            }
        } else {
            // Sem bloco de graça: se em seguida vem Sem qualidade direto (caso raro)
            if (tl[i + 1] && tl[i + 1].tipo === 'Sem qualidade') {
                // Não há graça, perda no dia seguinte ao fim do segmento
                const [dd, mm, yyyy] = seg.fim.split('/').map(Number);
                const dt = new Date(yyyy, mm - 1, dd + 1);
                dataLimiteQS = seg.fim; // manteve até o fim do próprio segmento
                perdeu = 'Sim';
            }
        }

        const natureza = seg.naturezaVinculo ? String(seg.naturezaVinculo) : '-';

        // CarenciaAte: se ainda não cumpriu antes do início do segmento e este segmento inclui a competência que completa.
        let carenciaAte = '';
        if (seg.tipo === 'Recolhimentos') {
            if (contribAcumulada < carenciaExigida) {
                const faltam = carenciaExigida - contribAcumulada;
                if (faltam <= seg.mesesContamCarencia) {
                    // A carência se cumpre dentro deste segmento
                    // Calcular o YM da competência onde completa: adicionar (faltam-1) meses ao inicioYM
                    let [y, m] = seg.inicioYM.split('-').map(Number);
                    let add = faltam - 1;
                    while (add > 0) { m++; if (m === 13) { m = 1; y++; } add--; }
                    const lastDay = new Date(y, m, 0).getDate();
                    carenciaAte = `${pad2(lastDay)}/${pad2(m)}/${y}`;
                }
            }
            // Atualiza acumulado após processar a linha
            contribAcumulada += seg.mesesContamCarencia;
            if (contribAcumulada > carenciaExigida) contribAcumulada = carenciaExigida;
        }

        linhas.push({
            Natureza: natureza,
            Inicio: seg.inicio,
            Fim: seg.fim,
            Contribuicoes: String(contrib),
            Meses: String(seg.mesesNoIntervalo),
            Tipo: seg.tipo,
            CarenciaAte: carenciaAte,
            DataLimiteQS: dataLimiteQS,
            PerdeuQS: perdeu === 'Sim' ? 'Sim' : '',
        });
    }

    const headers: (keyof Linha)[] = ['Natureza', 'Inicio', 'Fim', 'Contribuicoes', 'Meses', 'Tipo', 'CarenciaAte', 'DataLimiteQS', 'PerdeuQS'];
    const widths: Record<keyof Linha, number> = {
        Natureza: 8, Inicio: 5, Fim: 3, Contribuicoes: 14, Meses: 5, Tipo: 4, CarenciaAte: 11, DataLimiteQS: 12, PerdeuQS: 8,
    };
    for (const h of headers) {
        for (const l of linhas) widths[h] = Math.max(widths[h], l[h].length, h.length);
    }
    const pad = (s: string, w: number) => s + ' '.repeat(w - s.length);
    const headerLine = '| ' + headers.map(h => pad(h, widths[h])).join(' | ') + ' |';
    const sepLine = '| ' + headers.map(h => '-'.repeat(widths[h])).join(' | ') + ' |';
    const body = linhas.map(l => '| ' + headers.map(h => pad(l[h], widths[h])).join(' | ') + ' |');
    return [headerLine, sepLine, ...body].join('\n');
}


// const resultado = calcularBeneficioIncapacidade(json, {
//     referencia: "06/2025",
//     carenciaExigida: 12,
//     isencaoCarencia: false,
//     mesesReaquisicaoCarenciaPosPerda: 6,
//     exigirPagamentoParaCI: true,
//     hasDesempregoComprovado: () => false,
//     habilitarGraça24Se120: true,
//     diaVencimentoContribuicao: 15,
// });

// // Apenas tabela Markdown detalhada
// const tabelaDetalhada = gerarMarkdownTimelineDetalhado(resultado, { diaVencimento: 15, incluirAtivoSemCarencia: false, incluirSemQualidade: true });
// console.log(tabelaDetalhada);


