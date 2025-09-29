import { getInternalPrompt } from "@/lib/ai/prompt"
import { maiusculasEMinusculas, slugify } from "../utils/utils"
import { InfoDeProduto, P, ProdutoCompleto, ProdutosValidos, TipoDeSinteseMap, TipoDeSinteseValido } from "./combinacoes"

export const infoDeProduto = (produto: P | ProdutoCompleto): InfoDeProduto => {
    let ip: InfoDeProduto
    if (typeof produto === 'object') {
        const complex = produto as any as ProdutoCompleto
        const tipos = Array.isArray(complex.dados) ? complex.dados : [complex.dados]
        ip = { produto: produto.produto, dados: tipos, ...ProdutosValidos[produto.produto] }
    } else
        ip = { produto, dados: [], ...ProdutosValidos[produto] }

    // Caso o produto seja um resumo de peça, vamos tentar localizar o melhor prompt e trocar o título
    if (ip.produto === P.RESUMO_PECA) {
        ip.titulo = maiusculasEMinusculas(ip.dados[0])
        const definition = getInternalPrompt(`resumo-${slugify(ip.dados[0])}`)
        ip.prompt = definition.kind
    }
    return ip
}

export const TiposDeSinteseValido: TipoDeSinteseValido[] =
    Object.keys(TipoDeSinteseMap).map(ts => ({ id: ts, ...TipoDeSinteseMap[ts], produtos: TipoDeSinteseMap[ts].produtos.map(p => infoDeProduto(p)), relatorioDeAcervo: TipoDeSinteseMap[ts].relatorioDeAcervo })).sort((a, b) => a.sort - b.sort)

