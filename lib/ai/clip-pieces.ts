import { T } from "../proc/combinacoes";
import { TEXTO_INDICACAO_PARCIAL } from "../proc/process-types";
import devLog from "../utils/log";
import { Model, ModelValeuType } from "./model-types";
import { TextoType } from "./prompt-types";

const UNCLIPPABLE_PIECES: string[] = [
    T.PETICAO_INICIAL,
    // T.PETICAO,
    T.EMENDA_DA_INICIAL,
    // T.CONTESTACAO,
    // T.DEFESA_PREVIA_DEFESA_PRELIMINAR_RESPOSTA_DO_REU,
    // T.INFORMACAO_EM_MANDADO_DE_SEGURANCA,
    // T.REPLICA,
    T.DESPACHO_DECISAO,
    T.SENTENCA,
    // T.EMBARGOS_DE_DECLARACAO,
    // T.APELACAO,
    // T.CONTRARRAZOES_AO_RECURSO_DE_APELACAO,
    // T.AGRAVO,
    // T.AGRAVO_INTERNO,
    // T.RECURSO,
    // T.RECURSO_INOMINADO,
    // T.CONTRARRAZOES,
    T.VOTO,
    T.ACORDAO,
]


/**
 * Representa uma peça com seu tamanho e sua posição original na lista.
 */
interface IndexedPiece {
    size: number;
    originalIndex: number;
}

/**
 * Analisa uma lista de tamanhos de peças e um limite máximo de caracteres,
 * e determina o novo tamanho de cada peça para que o total se ajuste ao limite.
 * A estratégia prioriza "clipar" (reduzir) as peças maiores primeiro de forma justa.
 *
 * @param pieceSizes Uma lista de números representando o tamanho de cada peça.
 * @param maxTotalSize O número máximo de caracteres que a soma de todas as peças pode ter.
 * @returns Uma lista com os novos tamanhos para cada peça, na ordem original.
 */
function computePiecesClipping(pieceSizes: number[], maxTotalSize: number): number[] {
    const numPieces = pieceSizes.length;
    const currentTotalSize = pieceSizes.reduce((sum, size) => sum + size, 0);

    // Se o tamanho total já está dentro do limite, não há nada a fazer.
    if (currentTotalSize <= maxTotalSize) {
        return [...pieceSizes]; // Retorna uma cópia da lista original.
    }

    let overflow = currentTotalSize - maxTotalSize;

    // Mapeia para um objeto para manter o controle do índice original após a ordenação.
    const indexedPieces: IndexedPiece[] = pieceSizes.map((size, index) => ({
        size,
        originalIndex: index,
    }));

    // Ordena as peças em ordem decrescente de tamanho.
    indexedPieces.sort((a, b) => b.size - a.size);

    // Itera pelas peças ordenadas para encontrar o ponto de corte.
    for (let i = 0; i < numPieces; i++) {
        // O número de peças que estamos considerando clipar neste nível.
        const numPiecesInLevel = i + 1;

        // O tamanho da próxima peça na lista (ou 0 se esta for a última).
        // Este é o "piso" para o qual vamos tentar nivelar.
        const nextPieceSize = i + 1 < numPieces ? indexedPieces[i + 1].size : 0;

        // A diferença de altura entre o nível atual e o próximo.
        const heightDifference = indexedPieces[i].size - nextPieceSize;

        // A quantidade total de caracteres que podemos remover ao nivelar todas as peças
        // deste nível para o tamanho da próxima peça.
        const potentialReduction = numPiecesInLevel * heightDifference;

        if (overflow <= potentialReduction) {
            // Encontramos o nível final de clipagem.
            // O excesso restante será distribuído igualmente entre as peças deste nível.
            const amountToClipPerPiece = Math.ceil(overflow / numPiecesInLevel);
            const finalClippedSize = indexedPieces[i].size - amountToClipPerPiece;

            // Preenche a lista de resultados na ordem original.
            const result = new Array(numPieces).fill(0);

            // Aplica o tamanho final às peças que foram clipadas.
            for (let j = 0; j <= i; j++) {
                const piece = indexedPieces[j];
                result[piece.originalIndex] = finalClippedSize;
            }

            // As peças restantes mantêm seu tamanho original.
            for (let j = i + 1; j < numPieces; j++) {
                const piece = indexedPieces[j];
                result[piece.originalIndex] = piece.size;
            }

            return result;

        } else {
            // Ainda não removemos o suficiente. Subtrai a redução deste nível
            // e continua para o próximo, tratando mais peças como parte do "bloco" superior.
            overflow -= potentialReduction;
        }
    }

    // Caso de fallback (não deveria acontecer com a lógica acima, mas é bom ter).
    // Se chegarmos aqui, significa que precisamos clipar todas as peças para um tamanho médio.
    const finalSize = Math.floor(maxTotalSize / numPieces);
    return new Array(numPieces).fill(finalSize);
}

/**
 * Analisa uma lista de peças de texto e, para aquelas que consistem em mais de 90%
 * de números, símbolos e espaços em branco, limita seu tamanho a 10.000 caracteres.
 *
 * @param textos Uma lista de objetos TextoType.
 * @returns Uma nova lista de objetos TextoType com as peças potencialmente clipadas.
 */
function clipNumericAndSymbolicPieces(textos: TextoType[]): TextoType[] {
    const CLIP_LIMIT = 5000;
    const THRESHOLD = 0.9;

    return textos.map((piece, index) => {
        const text = piece.texto;

        // Ignora peças sem texto ou com texto vazio.
        if (!text || text.length === 0) {
            return piece;
        }

        // Conta caracteres que não são letras (ou seja, números, símbolos, espaços).
        const nonAlphabeticMatches = text.match(/[^a-zA-Z]/g);
        const nonAlphabeticCount = nonAlphabeticMatches ? nonAlphabeticMatches.length : 0;

        const ratio = nonAlphabeticCount / text.length;

        // Se a proporção for maior que o limiar e o texto for maior que o limite, clipa.
        if (ratio > THRESHOLD && text.length > CLIP_LIMIT) {
            devLog(`Clipando peça com pouco texto ${index + 1} de ${textos.length} com tamanho ${text.length} para ${CLIP_LIMIT} caracteres.`);
            return {
                ...piece,
                texto: text.slice(0, CLIP_LIMIT) + TEXTO_INDICACAO_PARCIAL,
            };
        }

        return piece;
    });
}

export function clipPieces(model: string, textos: TextoType[]): TextoType[] {
    // Primeiro, aplica o clip para peças numéricas/simbólicas, respeitando as unclippables.
    const initialClipedTextos = clipNumericAndSymbolicPieces(textos);

    const K_TOKENS_TO_CHARS = 1500; // Aproximadamente 0.75 tokens por caractere
    const modelDetails: ModelValeuType = Object.values(Model).find(m => m.name === model);
    const maxTotalSize = modelDetails?.clip ? modelDetails.clip * K_TOKENS_TO_CHARS : null;

    // Se não há limite de tamanho, retorna as peças após o primeiro clip.
    if (maxTotalSize === null) {
        return initialClipedTextos;
    }

    const currentTotalSize = initialClipedTextos.reduce((sum, p) => sum + (p.texto?.length || 0), 0);

    // Se o tamanho total já está dentro do limite, não há mais nada a fazer.
    if (currentTotalSize <= maxTotalSize) {
        return initialClipedTextos;
    }

    // Separa as peças em "clippable" e "unclippable".
    const clippablePieces: { piece: TextoType; index: number }[] = [];
    const unclippablePieces: { piece: TextoType; index: number }[] = [];

    initialClipedTextos.forEach((piece, index) => {
        if (UNCLIPPABLE_PIECES.includes(piece.descr)) {
            unclippablePieces.push({ piece, index });
        } else {
            clippablePieces.push({ piece, index });
        }
    });

    // Calcula o tamanho total das peças que não podem ser cortadas.
    const unclippableSize = unclippablePieces.reduce((sum, p) => sum + (p.piece.texto?.length || 0), 0);

    // O novo limite de tamanho para as peças que podem ser cortadas.
    const clippableMaxTotalSize = maxTotalSize - unclippableSize;

    // Se o tamanho das peças que não podem ser cortadas já excede o limite total, não há o que fazer.
    if (clippableMaxTotalSize <= 0) {
        throw new Error('O tamanho das peças que não podem ser cortadas excede o limite total permitido pelo modelo.');
    }

    // Se não há peças para cortar, não podemos prosseguir.
    if (clippablePieces.length === 0) {
        throw new Error('Não há peças que possam ser cortadas para ajustar ao limite do modelo.');
    }

    // Extrai os tamanhos das peças que podem ser cortadas.
    const clippablePieceSizes = clippablePieces.map(p => p.piece.texto?.length || 0);

    // Calcula os novos tamanhos apenas para as peças "clippable".
    const newClippableSizes = computePiecesClipping(clippablePieceSizes, clippableMaxTotalSize);

    // Monta o resultado final na ordem original.
    const resultTextos = [...initialClipedTextos];

    clippablePieces.forEach(({ piece, index }, i) => {
        const originalSize = piece.texto?.length || 0;
        const newSize = newClippableSizes[i];

        if (newSize < originalSize) {
            devLog(`Clipando peça ${index + 1} de ${textos.length} de tamanho ${originalSize} para ${newSize} caracteres.`);
            resultTextos[index] = {
                ...piece,
                texto: piece.texto.slice(0, newSize) + TEXTO_INDICACAO_PARCIAL,
            };
        }
    });

    return resultTextos;
}
