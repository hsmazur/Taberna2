// Novo (com fetch)
let produtos = [];

async function carregarProdutos() {
    const response = await fetch('http://localhost:3000/produtos');
    produtos = await response.json();
    exibirProdutos(produtos, "produtosContainer");
}

window.onload = carregarProdutos;
// Carrinho (agora vazio inicialmente, será preenchido pelo backend)
let carrinho = {};

// Função para carregar o carrinho do backend
async function carregarCarrinho() {
    try {
        const response = await fetch('http://localhost:3000/carrinho');
        const dados = await response.json();
        
        // Converte o formato do CSV para { "nomeProduto": quantidade }
        dados.forEach(item => {
            carrinho[item.produto] = parseInt(item.quantidade);
        });
    } catch (error) {
        console.error("Erro ao carregar carrinho:", error);
    }
}

// Função para atualizar a quantidade no backend
async function atualizarQuantidade(nomeProduto, alteracao) {
    const novoValor = (carrinho[nomeProduto] || 0) + alteracao;
    
    if (novoValor >= 0) {
        try {
            // Envia para o backend
            await fetch('http://localhost:3000/carrinho', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    produto: nomeProduto,
                    quantidade: novoValor
                })
            });

            // Atualiza localmente
            carrinho[nomeProduto] = novoValor;
            
            // Atualiza a interface
            const contadores = document.querySelectorAll('.contador');
            contadores.forEach(contador => {
                if (contador.closest('.card').querySelector('h3').textContent === nomeProduto) {
                    contador.textContent = novoValor;
                }
            });
        } catch (error) {
            console.error("Erro ao atualizar carrinho:", error);
        }
    }
}

// Função para criar o card do produto (mantida igual)
function criarCard(item) {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
        <img src="${item.imagem}" alt="${item.nome}">
        <div class="card-info">
            <h3>${item.nome}</h3>
            <p>${item.ingredientes}</p>
            <div class="quantidade">
                <button class="btn-menos" onclick="atualizarQuantidade('${item.nome}', -1)">-</button>
                <span class="contador">${carrinho[item.nome] || 0}</span>
                <button class="btn-mais" onclick="atualizarQuantidade('${item.nome}', 1)">+</button>
            </div>
        </div>
        <div class="card-preco">R$ ${item.preco.toFixed(2)}</div>
    `;

    return card;
}

// Função para exibir produtos (mantida igual)
function exibirProdutos(lista, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    
    lista.forEach(item => {
        container.appendChild(criarCard(item));
    });
}

// Ao carregar a página: carrega o carrinho e exibe os produtos
window.onload = async function() {
    await carregarCarrinho(); // Busca os dados do backend
    exibirProdutos(produtos, "produtosContainer"); // Renderiza os produtos
    criarBotaoCarrinho(); // (Se essa função existir)
};