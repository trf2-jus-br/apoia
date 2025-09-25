import { matchDocuments } from '@/lib/utils/documentMatcher';
import { PecaType } from "@/lib/proc/process-types";



// Função auxiliar para criar documentos
const createDocument = (conteudo: string, descr: string): PecaType => ({
    id: "1",
    numeroDoProcesso: '',
    numeroDoEvento: "1",
    descricaoDoEvento: "",
    tipoDoConteudo: "text/plain",
    sigilo: "PUBLIC",
    pConteudo: undefined,
    pDocumento: undefined,
    documento: undefined,
    categoria: undefined,
    rotulo: undefined,
    dataHora: undefined,
    conteudo,
    descr
});

describe('matchDocuments', () => {
    const D1A = createDocument("Documento 1 do Tipo A com algumas palavras", "A")
    const D2A = createDocument("Documento 2 do Tipo A com conteúdo diferente", "A")
    const D3A = createDocument("Documento muito similar ao Tipo A", "A")
    const D1B = createDocument("Documento 1 do Tipo B", "B")
    const D2B = createDocument("Documento 2 do Tipo B", "B")
    const D1C = createDocument("Documento 1 do Tipo C", "C")

    test('deve retornar a correspondência correta e a similaridade de Jaccard', () => {
        const result = matchDocuments([D1A, D2A, D1B], [D1A, D3A, D1B]);

        expect(result).toHaveLength(3); // A lista de retorno deve ter o mesmo tamanho da lista de referência

        // Verificar o primeiro documento do tipo A
        expect(result[0]).toEqual({
            closestDocument: D1A,
            similarity: 1
        });

        // Verificar o segundo documento do tipo A (espera-se que tenha uma similaridade com outro documento de tipo A)
        expect(result[1].closestDocument).toEqual(
            D3A // Documento mais próximo devido à similaridade
        );

        // Verificar o documento do tipo B
        expect(result[2].closestDocument).toEqual(D1B);
    });

    test('não deve associar documentos de comparação mais de uma vez', () => {
        const result = matchDocuments([D1A, D2A, D1B], [D1A, D3A, D1B]);

        // Deve retornar a correspondência correta, mas cada documento da lista de comparação deve aparecer apenas uma vez
        const comparisonDocsUsed = new Set(result.map(r => r.closestDocument));
        expect(comparisonDocsUsed.size).toBe([D1A, D3A, D1B].length);
    });

    test('deve retornar a similaridade de Jaccard correta para documentos semelhantes', () => {
        const result = matchDocuments([D1A, D2A, D1B], [D1A, D3A, D1B]);

        // Esperamos que o primeiro documento tenha uma similaridade de 1
        expect(result[0].similarity).toBe(1);

        // O segundo documento deve ter uma similaridade menor que 1 (baseado no conteúdo semelhante)
        expect(result[1].similarity).toBeGreaterThan(0);
        expect(result[1].similarity).toBeLessThan(1);
    });

    test('deve retornar um objeto vazio se não houver correspondência', () => {
        const result = matchDocuments([D1A, D2A, D1B], [D1C]);

        // A similaridade deve ser 0, e deve ser retornado um objeto com a chave, mas o documento de comparação será "não encontrado"
        expect(result).toHaveLength(3); // Tamanho igual ao da lista de referência
        expect(result[0].similarity).toBe(-1);
        expect(result[1].similarity).toBe(-1);
        expect(result[2].similarity).toBe(-1);
    });
});