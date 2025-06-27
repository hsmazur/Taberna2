// Configurações globais
const API_URL = 'http://localhost:3000';
const TAXA_ENTREGA = 5.00;

// Elementos principais
let listaCarrinho, totalCarrinho, opcoesEntrega, formularioEntrega, btnConfirmar;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    listaCarrinho = document.getElementById('lista-carrinho');
    totalCarrinho = document.getElementById('total-carrinho');
    opcoesEntrega = document.querySelectorAll('input[name="tipo-entrega"]');
    formularioEntrega = document.getElementById('formulario-entrega');
    btnConfirmar = document.getElementById('btn-confirmar');

    if (!listaCarrinho || !totalCarrinho) {
        showCriticalError();
        return;
    }

    // Event listeners
    opcoesEntrega.forEach(opcao => {
        opcao.addEventListener('change', handleTipoEntregaChange);
    });

    btnConfirmar.addEventListener('click', handleConfirmarPedido);

    loadCart();
});

// Funções principais
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
                <img src="${produto.imagem}" alt="${produto.nome}" onerror="this.src='img/sem-imagem.png'">
                <div class="item-info">
                    <h3>${produto.nome}</h3>
                    <p class="ingredientes">${produto.ingredientes}</p>
                    <div class="item-controls">
                        <button onclick="updateItem(${produto.id}, -1)">−</button>
                        <span class="quantidade">${item.quantidade}</span>
                        <button onclick="updateItem(${produto.id}, 1)">+</button>
                        <button class="btn-remover" onclick="removeItem(${produto.id})">Remover</button>
                    </div>
                    <p class="preco">R$ ${produto.preco.toFixed(2)}</p>
                    <p class="subtotal">Subtotal: R$ ${subtotal.toFixed(2)}</p>
                </div>
            </div>
        `;
    });

    // Verifica se é entrega
    const isEntrega = document.querySelector('input[name="tipo-entrega"]:checked').value === 'entrega';
    if (isEntrega) total += TAXA_ENTREGA;

    listaCarrinho.innerHTML = html;
    totalCarrinho.innerHTML = `
        <div class="resumo-total">
            ${isEntrega ? `<p>Taxa de entrega: <strong>R$ ${TAXA_ENTREGA.toFixed(2)}</strong></p>` : ''}
            <p>Total: <strong>R$ ${total.toFixed(2)}</strong></p>
        </div>
    `;
}

// Handlers
function handleTipoEntregaChange(e) {
    const isEntrega = e.target.value === 'entrega';
    formularioEntrega.classList.toggle('hidden', !isEntrega);
    loadCart(); // Recarrega para atualizar o total
}

async function handleConfirmarPedido() {
    const isEntrega = document.querySelector('input[name="tipo-entrega"]:checked').value === 'entrega';
    
    if (isEntrega) {
        const nome = document.getElementById('nome').value;
        const telefone = document.getElementById('telefone').value;
        const endereco = document.getElementById('endereco').value;
        const bairro = document.getElementById('bairro').value;

        if (!nome || !telefone || !endereco || !bairro) {
            alert('Preencha todos os campos para entrega!');
            return;
        }
    }

    // Redireciona para pagamento
    window.location.href = 'pagamento.html';
}

// Funções do carrinho (mantidas do código original)
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
            loadCart();
        }
    } catch (error) {
        alert('Erro ao atualizar: ' + error.message);
    }
};

window.removeItem = async (id) => {
    if (confirm('Remover este item do carrinho?')) {
        await updateItem(id, -999);
    }
};

// Funções auxiliares (mantidas do código original)
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
    totalCarrinho.innerHTML = '';
}

function showError(error) {
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