// Configurações globais
const API_URL = 'http://localhost:3000';

// Elementos principais
let listaCarrinho, totalCarrinho;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    listaCarrinho = document.getElementById('lista-carrinho');
    totalCarrinho = document.getElementById('total-carrinho');
    
    // Verificação crítica de elementos
    if (!listaCarrinho || !totalCarrinho) {
        showCriticalError();
        return;
    }

    loadCart();
});

// Função para carregar o carrinho
async function loadCart() {
    try {
        showLoading();
        
        const [produtos, itens] = await Promise.all([
            fetch(`${API_URL}/produtos`).then(handleResponse),
            fetch(`${API_URL}/carrinho`).then(handleResponse)
        ]);

        if (itens.length === 0) {
            showEmptyCart();
        } else {
            renderCart(produtos, itens);
        }

    } catch (error) {
        showError(error);
    }
}

// Renderiza os itens do carrinho
function renderCart(produtos, itens) {
    let html = '';
    let total = 0;

    itens.forEach(item => {
        const produto = produtos.find(p => p.id == item.produtoId);
        if (!produto) return;

        const subtotal = produto.preco * item.quantidade;
        total += subtotal;

        html += `
            <div class="item-carrinho" data-id="${produto.id}">
                <img src="${produto.imagem}" alt="${produto.nome}" 
                     onerror="this.src='img/sem-imagem.png'">
                <div class="item-info">
                    <h3>${produto.nome}</h3>
                    <p class="ingredientes">${produto.ingredientes}</p>
                    <div class="item-controls">
                        <button onclick="updateItem(${produto.id}, -1)">−</button>
                        <span class="quantidade">${item.quantidade}</span>
                        <button onclick="updateItem(${produto.id}, 1)">+</button>
                        <button class="btn-remover" onclick="removeItem(${produto.id})">
                            Remover
                        </button>
                    </div>
                    <p class="preco">R$ ${produto.preco.toFixed(2)}</p>
                    <p class="subtotal">Subtotal: R$ ${subtotal.toFixed(2)}</p>
                </div>
            </div>
        `;
    });

    listaCarrinho.innerHTML = html;
    totalCarrinho.innerHTML = `
        <div class="resumo-total">
            <p>Total: <strong>R$ ${total.toFixed(2)}</strong></p>
            <a href="pagamento.html" class="btn-finalizar">Finalizar Pedido</a>
        </div>
    `;
}

// Funções de manipulação do carrinho
window.updateItem = async (id, change) => {
    try {
        const quantidadeElement = document.querySelector(`.item-carrinho[data-id="${id}"] .quantidade`);
        const novaQuantidade = parseInt(quantidadeElement.textContent) + change;

        if (novaQuantidade > 0) {
            await fetch(`${API_URL}/carrinho`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ produtoId: id, quantidade: novaQuantidade })
            });
            loadCart(); // Recarrega o carrinho
        }
    } catch (error) {
        alert('Erro ao atualizar: ' + error.message);
    }
};

window.removeItem = async (id) => {
    if (confirm('Remover este item do carrinho?')) {
        await updateItem(id, -999); // Força remoção
    }
};

// Funções auxiliares
function handleResponse(response) {
    if (!response.ok) throw new Error(`Erro ${response.status}`);
    return response.json();
}

function showLoading() {
    listaCarrinho.innerHTML = '<div class="loading"><p>Carregando seu carrinho...</p></div>';
}

function showEmptyCart() {
    listaCarrinho.innerHTML = `
        <div class="empty-cart">
            <img src="img/carrinho-vazio.png" alt="Carrinho vazio">
            <p>Seu carrinho está vazio</p>
            <a href="index.html" class="btn">Voltar ao cardápio</a>
        </div>
    `;
}

function showError(error) {
    console.error('Erro:', error);
    listaCarrinho.innerHTML = `
        <div class="error">
            <p>😕 Não foi possível carregar seu carrinho</p>
            <p class="error-detail">${error.message}</p>
            <button onclick="location.reload()">Tentar novamente</button>
        </div>
    `;
}

function showCriticalError() {
    document.body.innerHTML = `
        <div class="critical-error">
            <h2>ERRO CRÍTICO</h2>
            <p>A página não carregou corretamente</p>
            <button onclick="location.reload()">Recarregar</button>
            <a href="index.html">Voltar à página inicial</a>
        </div>
    `;
}