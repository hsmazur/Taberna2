let listaProduto = [];
let oQueEstaFazendo = '';
let produto = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await carregarProdutos();
    bloquearAtributos(true);
});

async function carregarProdutos() {
    try {
        const response = await fetch('http://localhost:3000/produtos');
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        listaProduto = await response.json();
        listar();
    } catch (error) {
        mostrarAviso(`Erro: ${error.message}`);
    }
}

// Removemos a função de uploadImagem pois não será mais necessária
// Já que as imagens seguem um padrão fixo

function procurePorChavePrimaria(chave) {
    for (let i = 0; i < listaProduto.length; i++) {
        const produto = listaProduto[i];
        if (produto.id == chave) {
            produto.posicaoNaLista = i;
            return produto;
        }
    }
    return null;
}

function procure() {
    const id = document.getElementById("id").value;
    if (isNaN(id) || !Number.isInteger(Number(id))) {
        mostrarAviso("Precisa ser um número inteiro");
        document.getElementById("id").focus();
        return;
    }

    if (id) { 
        produto = procurePorChavePrimaria(id);
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

function inserir() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'inserindo';
    mostrarAviso("INSERINDO - Digite os dados e clique em Salvar");
    document.getElementById("nome").focus();
}

function alterar() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'alterando';
    mostrarAviso("ALTERANDO - Modifique os dados e clique em Salvar");
    document.getElementById("nome").focus();
}

function excluir() {
    bloquearAtributos(true);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'excluindo';
    mostrarAviso("EXCLUINDO - Clique em Salvar para confirmar");
}

async function salvar() {
    const id = produto ? produto.id : parseInt(document.getElementById("id").value);
    const nome = document.getElementById("nome").value;
    const ingredientes = document.getElementById("ingredientes").value;
    const preco = parseFloat(document.getElementById("preco").value);

    if (!id || !nome || !ingredientes || isNaN(preco)) {
        mostrarAviso("Preencha todos os campos corretamente!");
        return;
    }

    try {
        // Gera automaticamente o nome da imagem baseado no ID
        const imagem = `lanche${id}.png`;
        
        const novoProduto = { id, imagem, nome, ingredientes, preco };
        let metodo = 'POST';
        let url = 'http://localhost:3000/produtos';

        switch (oQueEstaFazendo) {
            case 'inserindo':
                await fetch(url, {
                    method: metodo,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novoProduto)
                });
                mostrarAviso("Produto inserido com sucesso!");
                break;

            case 'alterando':
                await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novoProduto)
                });
                mostrarAviso("Produto alterado com sucesso!");
                break;

            case 'excluindo':
                await fetch(`${url}/${id}`, { method: 'DELETE' });
                mostrarAviso("Produto excluído com sucesso!");
                break;
        }

        await carregarProdutos();
        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
        limparAtributos();
        document.getElementById("id").focus();
        
    } catch (error) {
        mostrarAviso(`Erro: ${error.message}`);
    }
}

// Funções auxiliares
function mostrarDadosProduto(produto) {
    document.getElementById("nome").value = produto.nome;
    document.getElementById("ingredientes").value = produto.ingredientes;
    document.getElementById("preco").value = produto.preco;
    bloquearAtributos(true);
}

function limparAtributos() {
    document.getElementById("nome").value = "";
    document.getElementById("ingredientes").value = "";
    document.getElementById("preco").value = "";
    bloquearAtributos(true);
}

function bloquearAtributos(soLeitura) {
    document.getElementById("nome").readOnly = soLeitura;
    document.getElementById("ingredientes").readOnly = soLeitura;
    document.getElementById("preco").readOnly = soLeitura;
}

function visibilidadeDosBotoes(btProcure, btInserir, btAlterar, btExcluir, btSalvar) {
    document.getElementById("btProcure").style.display = btProcure;
    document.getElementById("btInserir").style.display = btInserir;
    document.getElementById("btAlterar").style.display = btAlterar;
    document.getElementById("btExcluir").style.display = btExcluir;
    document.getElementById("btSalvar").style.display = btSalvar;
    document.getElementById("btCancelar").style.display = btSalvar;
}

function mostrarAviso(mensagem) {
    document.getElementById("divAviso").textContent = mensagem;
}

function listar() {
    let html = "";
    listaProduto.forEach(produto => {
        // Usa o padrão lanche+id.png para as imagens
        const imagemSrc = `../img/lanche${produto.id}.png`;
        
        html += `
            <div class="produto-item">
                <img src="${imagemSrc}" alt="${produto.nome}" onerror="this.src='../img/sem-imagem.png'" width="100">
                <div>
                    <strong>ID: ${produto.id}</strong> - ${produto.nome}<br>
                    <small>Ingredientes: ${produto.ingredientes}</small><br>
                    <span class="preco">R$ ${produto.preco.toFixed(2)}</span>
                </div>
            </div>
        `;
    });
    document.getElementById("outputSaida").innerHTML = html;
}

function cancelarOperacao() {
    if (produto) {
        mostrarDadosProduto(produto);
    } else {
        limparAtributos();
    }
    bloquearAtributos(true);
    visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
    mostrarAviso("Operação cancelada");
}

// Funções para CSV (mantidas as originais)
function prepararESalvarCSV() {
    let nomeDoArquivoDestino = "produtos.csv";
    let textoCSV = "id,nome,preco,imagem,ingredientes\n";
    
    listaProduto.forEach(produto => {
        textoCSV += `${produto.id},${produto.nome},${produto.preco},lanche${produto.id}.png,"${produto.ingredientes}"\n`;
    });
    
    const blob = new Blob([textoCSV], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nomeDoArquivoDestino;
    link.click();
    mostrarAviso("CSV exportado com sucesso!");
}

function abrirArquivoSalvoEmLocalPermanente() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = async (event) => {
        const arquivo = event.target.files[0];
        if (!arquivo) return;
        
        const leitor = new FileReader();
        leitor.onload = async (e) => {
            try {
                const texto = e.target.result;
                const linhas = texto.split('\n').slice(1); // Ignora cabeçalho
                
                for (const linha of linhas) {
                    if (!linha.trim()) continue;
                    
                    const [id, nome, preco, imagem, ingredientes] = linha.split(',');
                    const produto = {
                        id: parseInt(id),
                        nome,
                        preco: parseFloat(preco),
                        imagem: `img/lanche${id}.png`, // Força o padrão de nome
                        ingredientes: ingredientes.replace(/^"|"$/g, '')
                    };
                    
                    await fetch('http://localhost:3000/produtos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(produto)
                    });
                }
                
                await carregarProdutos();
                mostrarAviso("CSV importado com sucesso!");
            } catch (error) {
                mostrarAviso(`Erro ao importar CSV: ${error.message}`);
            }
        };
        leitor.readAsText(arquivo);
    };
    input.click();
}