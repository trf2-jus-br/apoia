// run with: npx tsx countpieces.ts <process_number_1>,<process_number_2>,...

// Direct API access without dependencies
import { config } from 'dotenv';
import json from './cnis.json'

// Load environment variables
config({ path: '.env.local' });

// ===== Tipos de entrada (CNIS) =====
type NaturezaVinculo =
  | "EMPREGADO"
  | "CONTRIBUINTE_INDIVIDUAL"
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

// ===== Tipos de saída =====
type StatusQualidade = "contribuindo" | "em_graca" | "sem_qualidade";

interface SegmentoQualidade {
  inicio: string;       // "yyyy-MM"
  fim: string;          // "yyyy-MM" (inclusive)
  status: StatusQualidade;
}

interface ResultadoElegibilidade {
  referencia: string; // "yyyy-MM" da DII/DER (ou data de corte)
  qualidadeNaReferencia: boolean;
  statusNaReferencia: StatusQualidade;

  // Carência
  carenciaMesesConsiderados: number;
  carenciaExigida: number;       // normalmente 12
  carenciaCumprida: boolean;
  isencaoCarencia: boolean;      // param: acidente/doença grave, etc.

  // Perda de qualidade & período de graça
  tevePerdaQualidadeNoHistorico: boolean;
  dataPerdaMaisRecente?: string; // "yyyy-MM" (primeiro mês sem qualidade após fim da graça)
  periodoGracaAtual?: { inicio: string; fim: string; meses: number };

  // Estatísticas úteis
  totalCompetenciasContribuidas: number;
  totalCompetenciasDesdeUltimaPerda: number;
  tem120CompetenciasHistoricas: boolean;

  // Linha do tempo (segmentos agregados)
  timeline: SegmentoQualidade[];
}

// ===== Parâmetros de política =====
interface PoliticaParametros {
  // Data de referência para avaliação (DII/DER). Aceita "dd/MM/yyyy" ou "yyyy-MM" ou Date.
  referencia: string | Date;

  // Exigência de carência (meses) para benefício por incapacidade (padrão: 12).
  carenciaExigida?: number;

  // Há isenção de carência (acidente/doença do trabalho ou doença grave)?
  isencaoCarencia?: boolean;

  // Após perda de qualidade, nº mínimo de novas contribuições para voltar a contar períodos antigos na carência (art. 27-A).
  // Muitos cenários práticos consideram 6 para benefícios por incapacidade. Deixe configurável.
  mesesReaquisicaoCarenciaPosPerda?: number; // default: 6

  // Para CI (contribuinte individual), exigir salário/competência paga para contar carência?
  exigirPagamentoParaCI?: boolean; // default: true

  // Função para indicar se há desemprego comprovado no intervalo em que a graça é calculada.
  // Se retornar true para o "ciclo" atual (após cessação), soma-se +12 meses de graça.
  // Se não tiver ainda, retorne sempre false por padrão ou implemente sua heurística.
  hasDesempregoComprovado?: () => boolean;

  // Deve aplicar extensão de 24 meses de graça quando houver >= 120 contribuições históricas?
  habilitarGraça24Se120?: boolean; // default: true
}

// ===== Utilidades de data/competência =====
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

function parseBrDate(d: string): Date {
  // "dd/MM/yyyy"
  const [dd, mm, yyyy] = d.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function parseCompetencia(c: string): { y: number; m: number } {
  // "MM/yyyy"
  const [mm, yyyy] = c.split("/").map(Number);
  return { y: yyyy, m: mm };
}

function toCompetenciaStr(y: number, m: number): string {
  return `${y}-${pad2(m)}`;
}

function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const base = new Date(y, m - 1, 1);
  base.setMonth(base.getMonth() + delta);
  return { y: base.getFullYear(), m: base.getMonth() + 1 };
}

function* iterCompetencias(inicio: { y: number; m: number }, fim: { y: number; m: number }) {
  let cur = { ...inicio };
  while (cur.y < fim.y || (cur.y === fim.y && cur.m <= fim.m)) {
    yield { ...cur };
    cur = addMonths(cur.y, cur.m, 1);
  }
}

function maxCompetencia(a: { y: number; m: number }, b: { y: number; m: number }) {
  if (a.y > b.y) return a;
  if (a.y < b.y) return b;
  return a.m >= b.m ? a : b;
}

function minCompetencia(a: { y: number; m: number }, b: { y: number; m: number }) {
  if (a.y < b.y) return a;
  if (a.y > b.y) return b;
  return a.m <= b.m ? a : b;
}

function fromDateToCompetencia(d: Date) {
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

function parseReferencia(ref: string | Date): { y: number; m: number } {
  if (ref instanceof Date) return fromDateToCompetencia(ref);
  if (/^\d{4}-\d{2}$/.test(ref)) {
    const [yy, mm] = ref.split("-").map(Number);
    return { y: yy, m: mm };
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(ref as string)) {
    return fromDateToCompetencia(parseBrDate(ref as string));
  }
  if (/^\d{2}\/\d{4}$/.test(ref as string)) {
    const { y, m } = parseCompetencia(ref as string);
    return { y, m };
  }
  // fallback: hoje
  const today = new Date();
  return fromDateToCompetencia(today);
}

// ===== Núcleo: cálculo =====
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
  } = params;

  const ref = parseReferencia(params.referencia);

  // 1) Construir conjunto de competências com contribuição "válida" para CARÊNCIA.
  //    Regras:
  //    - Empregado: conta mês de vínculo (contarCarencia=true), independentemente de valor em salários;
  //    - CI: por padrão exigimos haver salário na competência (exigirPagamentoParaCI=true);
  //    - Outros: se contarCarencia=true, conta competência.
  const competenciasPagas = new Set<string>(
    cnis.salarios.map((s) => {
      const { y, m } = parseCompetencia(s.competencia);
      return toCompetenciaStr(y, m);
    })
  );

  // Mapa: competencia => se conta para carência
  const contribuiParaCarencia = new Set<string>();

  // Também marcamos "há vínculo" (útil para status "contribuindo")
  const haVinculo = new Set<string>();

  for (const p of cnis.periodosContribuicao) {
    const ini = fromDateToCompetencia(parseBrDate(p.dataInicial));
    const fim = fromDateToCompetencia(parseBrDate(p.dataFinal));
    for (const c of iterCompetencias(ini, fim)) {
      const key = toCompetenciaStr(c.y, c.m);
      haVinculo.add(key);

      if (!p.contarCarencia) continue;

      if (p.naturezaVinculo === "EMPREGADO") {
        contribuiParaCarencia.add(key);
      } else if (p.naturezaVinculo === "CONTRIBUINTE_INDIVIDUAL") {
        if (!exigirPagamentoParaCI || competenciasPagas.has(key)) {
          contribuiParaCarencia.add(key);
        }
      } else {
        // NAO_INFORMADO / outros
        // critério conservador: se houver salário OR explicitamente desejar contar
        if (competenciasPagas.has(key)) {
          contribuiParaCarencia.add(key);
        } else {
          // opcionalmente, pode-se contar todo vínculo se desejar:
          // contribuiParaCarencia.add(key);
        }
      }
    }
  }

  // 2) Determinar faixa temporal principal
  //    Do primeiro mês com qualquer vínculo até a referência (no mínimo),
  //    expandindo 36 meses além do último vínculo para fechar um ciclo de graça.
  if (haVinculo.size === 0) {
    const refStr = toCompetenciaStr(ref.y, ref.m);
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
      timeline: [
        { inicio: refStr, fim: refStr, status: "sem_qualidade" }
      ],
    };
  }

  const allKeys = Array.from(haVinculo);
  allKeys.sort();
  const [y0, m0] = allKeys[0].split("-").map(Number);
  const inicioGlobal = { y: y0, m: m0 };

  // Última competência com qualquer vínculo
  const lastKey = allKeys[allKeys.length - 1];
  const [yl, ml] = lastKey.split("-").map(Number);
  const ultimoVinculo = { y: yl, m: ml };

  // Vamos simular até o máx( referência, último vínculo + 36 meses )
  const fimSimulacao = maxCompetencia(ref, addMonths(ultimoVinculo.y, ultimoVinculo.m, 36));

  // 3) Simulação mês a mês: status e perdas
  type MesInfo = {
    key: string; // yyyy-MM
    contribui: boolean;    // conta para carência
    temVinculo: boolean;   // houve vínculo/emprego no mês
    status: StatusQualidade;
  };

  let contHistoricoTotal = 0;     // total de competências contribuídas (histórico inteiro)
  let contDesdeUltimaPerda = 0;   // competências contribuídas desde a última perda
  let emGraçaAposCessar = 0;      // "estoque" de meses em graça após cessar contribuições
  let emCicloSemQualidade = false;
  let tevePerdaQualidade = false;
  let dataPerdaMaisRecente: string | undefined;

  const meses: MesInfo[] = [];

  // Para carência na referência: precisamos identificar a última perda antes/até a referência
  let ultimaPerdaAntesDaReferencia: string | undefined;

  // Função auxiliar para recomputar estoque de graça quando cessar contribuição:
  const recomputaGraca = (qtdContribDesdeUltimaPerda: number) => {
    // Regra base: 12
    let base = 12;
    if (habilitarGraça24Se120 && contHistoricoTotal >= 120) base = 24;
    if (hasDesempregoComprovado()) base += 12;
    return base;
  };

  // Vamos varrer mês a mês
  let anteriorContribuiu = false;
  let estoqueGraça = 0;

  for (const c of iterCompetencias(inicioGlobal, fimSimulacao)) {
    const key = toCompetenciaStr(c.y, c.m);
    const temVinculo = haVinculo.has(key);
    const contribui = contribuiParaCarencia.has(key);

    // Atualiza contadores quando há contribuição que conta
    if (contribui) {
      contHistoricoTotal++;
      contDesdeUltimaPerda++;
      anteriorContribuiu = true;
      estoqueGraça = 0; // enquanto contribui, não “consome” graça
    } else {
      // se no mês passado contribuiu e agora não contribui, abrimos novo ciclo de graça
      if (anteriorContribuiu) {
        estoqueGraça = recomputaGraca(contDesdeUltimaPerda);
        anteriorContribuiu = false;
      }
    }

    let status: StatusQualidade;

    if (contribui || temVinculo) {
      // Critério prático para status "contribuindo": houve contribuição (carência) OU vínculo ativo
      status = "contribuindo";
      emCicloSemQualidade = false;
    } else if (estoqueGraça > 0) {
      status = "em_graca";
      estoqueGraça -= 1;
      emCicloSemQualidade = false;
    } else {
      // sem qualidade a partir daqui até nova contribuição
      status = "sem_qualidade";
      if (!emCicloSemQualidade) {
        // marca início de uma perda
        tevePerdaQualidade = true;
        dataPerdaMaisRecente = dataPerdaMaisRecente ?? key;
        // se esta perda ocorre antes/até a referência, guardamos
        const refKey = toCompetenciaStr(ref.y, ref.m);
        if (!ultimaPerdaAntesDaReferencia && key <= refKey) {
          ultimaPerdaAntesDaReferencia = key;
        }
      }
      emCicloSemQualidade = true;
      // em ciclo sem qualidade: contribuições anteriores só voltarão a contar para carência
      // depois que houver "mesesReaquisicaoCarenciaPosPerda" novas contribuições futuramente.
      contDesdeUltimaPerda = 0;
    }

    meses.push({ key, contribui, temVinculo, status });
  }

  // 4) Agregar timeline por segmentos
  const timeline: SegmentoQualidade[] = [];
  let cur: SegmentoQualidade | null = null;
  for (const m of meses) {
    if (!cur) {
      cur = { inicio: m.key, fim: m.key, status: m.status };
      continue;
    }
    if (m.status === cur.status) {
      cur.fim = m.key;
    } else {
      timeline.push(cur);
      cur = { inicio: m.key, fim: m.key, status: m.status };
    }
  }
  if (cur) timeline.push(cur);

  // 5) Status e período de graça "vigente" na referência
  const refKey = toCompetenciaStr(ref.y, ref.m);
  const mesRef = meses.find((m) => m.key === refKey) ?? meses[meses.length - 1];
  const statusNaReferencia = mesRef.status;
  const qualidadeNaReferencia = statusNaReferencia !== "sem_qualidade";

  // encontro o segmento que contém a referência, para expor período de graça atual (se for o caso)
  let periodoGracaAtual: ResultadoElegibilidade["periodoGracaAtual"] = undefined;
  if (statusNaReferencia === "em_graca") {
    const seg = timeline.find((s) => s.inicio <= refKey && s.fim >= refKey && s.status === "em_graca");
    if (seg) {
      // meses no segmento
      let count = 0;
      for (const c of iterCompetencias(
        { y: Number(seg.inicio.slice(0, 4)), m: Number(seg.inicio.slice(5, 7)) },
        { y: Number(seg.fim.slice(0, 4)), m: Number(seg.fim.slice(5, 7)) }
      )) count++;
      periodoGracaAtual = { inicio: seg.inicio, fim: seg.fim, meses: count };
    }
  }

  // 6) Cálculo de carência até a referência com regra de perda/reaquisição (art. 27-A parametrizado)
  //    Estratégia: dividimos em "blocos" separados por períodos "sem_qualidade".
  //    O bloco corrente (que contém a referência) conta integralmente.
  //    Os blocos anteriores só contam se, APÓS a última perda pré-referência,
  //    houver >= mesesReaquisicaoCarenciaPosPerda contribuições (no bloco corrente).
  const blocos: { inicio: string; fim: string; contribs: number }[] = [];
  let contando = false;
  let inicioBloco = "";
  let contribsNoBloco = 0;

  for (const m of meses) {
    if (m.key > refKey) break;
    const contaEsteMes = m.contribui; // só meses que contam para carência
    if (m.status === "sem_qualidade") {
      // fecha bloco se estava contando
      if (contando) {
        blocos.push({ inicio: inicioBloco, fim: m.key, contribs: contribsNoBloco });
        contando = false;
        contribsNoBloco = 0;
      }
      continue;
    }
    // em "contribuindo" ou "em_graca", mas apenas "contribui" soma carência
    if (!contando) {
      contando = true;
      inicioBloco = m.key;
      contribsNoBloco = 0;
    }
    if (contaEsteMes) contribsNoBloco++;
  }
  if (contando) {
    blocos.push({ inicio: inicioBloco, fim: refKey, contribs: contribsNoBloco });
  }

  // Identifica o último bloco (corrente)
  const blocoCorrente = blocos[blocos.length - 1] ?? { contribs: 0, inicio: refKey, fim: refKey };
  const contribsCorrente = blocoCorrente.contribs;

  // Se houve perda antes da referência, somar blocos anteriores depende de ter atingido o limiar de reaquisição no bloco corrente
  let carenciaMesesConsiderados = contribsCorrente;
  if (ultimaPerdaAntesDaReferencia) {
    if (contribsCorrente >= mesesReaquisicaoCarenciaPosPerda) {
      // reabilita blocos anteriores
      for (let i = 0; i < blocos.length - 1; i++) carenciaMesesConsiderados += blocos[i].contribs;
    } else {
      // não soma blocos anteriores
    }
  } else {
    // nunca perdeu qualidade: soma tudo
    if (blocos.length > 1) {
      for (let i = 0; i < blocos.length - 1; i++) carenciaMesesConsiderados += blocos[i].contribs;
    }
  }

  // Isenção de carência anula exigência
  const carenciaCumprida = isencaoCarencia ? true : carenciaMesesConsiderados >= carenciaExigida;

  // 7) Estatísticas auxiliares
  const totalCompetenciasContribuidas = Array.from(contribuiParaCarencia).length;

  // contribuições desde a última perda (antes da referência)
  let totalCompetenciasDesdeUltimaPerda = contribsCorrente;
  if (!ultimaPerdaAntesDaReferencia) {
    // nunca perdeu
    totalCompetenciasDesdeUltimaPerda = carenciaMesesConsiderados;
  }

  const tem120CompetenciasHistoricas = totalCompetenciasContribuidas >= 120;

  return {
    referencia: refKey,
    qualidadeNaReferencia,
    statusNaReferencia,

    carenciaMesesConsiderados,
    carenciaExigida,
    carenciaCumprida,
    isencaoCarencia,

    tevePerdaQualidadeNoHistorico: tevePerdaQualidade,
    dataPerdaMaisRecente: dataPerdaMaisRecente,
    periodoGracaAtual,

    totalCompetenciasContribuidas,
    totalCompetenciasDesdeUltimaPerda,
    tem120CompetenciasHistoricas,

    timeline,
  };
}

const resultado = calcularBeneficioIncapacidade(json, {
  referencia: "06/2025",             // DII ou DER (pode ser "dd/MM/yyyy" também)
  carenciaExigida: 12,
  isencaoCarencia: false,            // true em caso de acidente/doença do trabalho ou doença grave
  mesesReaquisicaoCarenciaPosPerda: 6,
  exigirPagamentoParaCI: true,
  hasDesempregoComprovado: () => false, // plugue sua verificação (ex.: SINE/CAGED/CadÚnico)
  habilitarGraça24Se120: true,
});

console.log(resultado);


