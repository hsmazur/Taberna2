const API_URL = 'http://localhost:3000';
let listaProduto = [];
let oQueEstaFazendo = '';
let produto = null;

// Função para carregar produtos do servidor
async function carregarProdutos() {
    try {
        const response = await fetch(`${API_URL}/produtos`);
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        listaProduto = await response.json();
        listar();
    } catch (error) {
        mostrarAviso(`Erro: ${error.message}`);
    }
}

// Função para procurar produto
async function procurePorChavePrimaria(chave) {
    try {
        const response = await fetch(`${API_URL}/produtos/${chave}`);
        if (!response.ok) return null;
        produto = await response.json();
        produto.posicaoNaLista = listaProduto.findIndex(p => p.id == chave);
        return produto;
    } catch (error) {
        mostrarAviso(`Erro: ${error.message}`);
        return null;
    }
}

// Função para salvar no servidor
async function salvarNoServidor(produto, metodo) {
    try {
        const response = await fetch(`${API_URL}/produtos`, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(produto)
        });
        
        if (!response.ok) throw new Error('Erro ao salvar produto');
        await carregarProdutos();
        return true;
    } catch (error) {
        mostrarAviso(`Erro: ${error.message}`);
        return false;
    }
}

// Modifique a função procure()
async function procure() {
    const id = document.getElementById("id").value;
    if (isNaN(id) || !Number.isInteger(Number(id))) {
        mostrarAviso("Precisa ser um número inteiro");
        document.getElementById("id").focus();
        return;
    }

    if (id) { 
        produto = await procurePorChavePrimaria(id);
        if (produto) { 
            mostrarDadosProduto(produto);
            visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');
            mostrarAviso("Produto encontrado, pode alterar ou excluir");
        } else { 
            limparAtributos();
            visibilidadeDosBotoes('inline', 'inline', 'none', 'none', 'none');
            mostrarAviso("Produto não encontrado, pode inserir");
        }
    } else {
        document.getElementById("id").focus();
        return;
    }
}

// Modifique a função salvar()
async function salvar() {
    const id = produto ? produto.id : parseInt(document.getElementById("id").value);
    const imagem = document.getElementById("imagem").value;
    const nome = document.getElementById("nome").value;
    const ingredientes = document.getElementById("ingredientes").value;
    const preco = parseFloat(document.getElementById("preco").value);

    if (!id || !imagem || !nome || !ingredientes || isNaN(preco)) {
        mostrarAviso("Preencha todos os campos corretamente");
        return;
    }

    const novoProduto = {
        id,
        imagem,
        nome,
        ingredientes,
        preco
    };

    try {
        switch (oQueEstaFazendo) {
            case 'inserindo':
                if (await salvarNoServidor(novoProduto, 'POST')) {
                    mostrarAviso("Produto inserido com sucesso");
                }
                break;
            case 'alterando':
                if (await salvarNoServidor(novoProduto, 'PUT')) {
                    mostrarAviso("Produto alterado com sucesso");
                }
                break;
            case 'excluindo':
                if (await excluirDoServidor(id)) {
                    mostrarAviso("Produto excluído com sucesso");
                }
                break;
            default:
                mostrarAviso("Operação inválida");
        }
        
        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
        limparAtributos();
        document.getElementById("id").focus();
    } catch (error) {
        mostrarAviso(`Erro: ${error.message}`);
    }
}

// Função para excluir do servidor
async function excluirDoServidor(id) {
    try {
        const response = await fetch(`${API_URL}/produtos/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Erro ao excluir produto');
        await carregarProdutos();
        return true;
    } catch (error) {
        mostrarAviso(`Erro: ${error.message}`);
        return false;
    }
}

// Função para persistir no CSV (opcional)
async function prepararESalvarCSV() {
    try {
        const response = await fetch(`${API_URL}/produtos`);
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        const produtos = await response.json();
        
        let textoCSV = "id,nome,preco,imagem,ingredientes\n";
        produtos.forEach(produto => {
            textoCSV += `${produto.id},${produto.nome},${produto.preco},${produto.imagem},${produto.ingredientes}\n`;
        });
        
        const blob = new Blob([textoCSV], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'produtos.csv';
        link.click();
        URL.revokeObjectURL(link.href);
        
        mostrarAviso("CSV gerado com sucesso");
    } catch (error) {
        mostrarAviso(`Erro: ${error.message}`);
    }
}

// Carrega os produtos ao iniciar
document.addEventListener('DOMContentLoaded', carregarProdutos);

// Mantenha todas as outras funções como estão (mostrarAviso, mostrarDadosProduto, limparAtributos, etc.)