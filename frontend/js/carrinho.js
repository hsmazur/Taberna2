// Configurações globais
const API_URL = 'http://localhost:3000';
const TAXA_ENTREGA = 5.00;

// Estado global
let carrinhoItens = [];

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

// ==============================================
// Funções Principais
// ==============================================

async function loadCart() {
    try {
        showLoading();
        
        const [produtos, itens] = await Promise.all([
            fetch(`${API_URL}/produtos`).then(handleResponse),
            fetch(`${API_URL}/carrinho`).then(handleResponse)
        ]);

        carrinhoItens = itens; // Atualiza o estado global

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
                        <button class="btn-diminuir" data-id="${produto.id}">−</button>
                        <span class="quantidade">${item.quantidade}</span>
                        <button class="btn-aumentar" data-id="${produto.id}">+</button>
                        <button class="btn-remover" data-id="${produto.id}">Remover</button>
                    </div>
                    <p class="preco">R$ ${produto.preco.toFixed(2)}</p>
                    <p class="subtotal">Subtotal: R$ ${subtotal.toFixed(2)}</p>
                </div>
            </div>
        `;
    });

    // Verifica se é entrega
    const isEntrega = document.querySelector('input[name="tipo-entrega"]:checked')?.value === 'entrega';
    if (isEntrega) total += TAXA_ENTREGA;

    listaCarrinho.innerHTML = html;
    totalCarrinho.innerHTML = `
        <div class="resumo-total">
            ${isEntrega ? `<p>Taxa de entrega: <strong>R$ ${TAXA_ENTREGA.toFixed(2)}</strong></p>` : ''}
            <p>Total: <strong>R$ ${total.toFixed(2)}</strong></p>
        </div>
    `;

    // Adiciona os event listeners após renderizar
    addItemEventListeners();
}

// ==============================================
// Manipulação do Carrinho
// ==============================================

function addItemEventListeners() {
    document.querySelectorAll('.btn-aumentar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            updateItemQuantity(id, 1);
        });
    });

    document.querySelectorAll('.btn-diminuir').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            updateItemQuantity(id, -1);
        });
    });

    document.querySelectorAll('.btn-remover').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            removeItemCompletely(id);
        });
    });
}

async function updateItemQuantity(id, change) {
    try {
        const item = carrinhoItens.find(item => item.produtoId == id);
        if (!item) return;

        const novaQuantidade = parseInt(item.quantidade) + change;
        
        if (novaQuantidade <= 0) {
            await removeItemCompletely(id);
            return;
        }

        await fetch(`${API_URL}/carrinho`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ produtoId: id, quantidade: novaQuantidade })
        });

        loadCart(); // Recarrega o carrinho

    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        alert('Erro ao atualizar quantidade');
    }
}

async function removeItemCompletely(id) {
    if (confirm('Remover este item do carrinho?')) {
        try {
            await fetch(`${API_URL}/carrinho`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ produtoId: id, quantidade: 0 })
            });
            loadCart();
        } catch (error) {
            console.error('Erro ao remover item:', error);
            alert('Erro ao remover item');
        }
    }
}

// ==============================================
// Entrega/Retirada
// ==============================================

function handleTipoEntregaChange(e) {
    const isEntrega = e.target.value === 'entrega';
    formularioEntrega.classList.toggle('hidden', !isEntrega);
    loadCart(); // Recarrega para atualizar o total
}

async function handleConfirmarPedido() {
    const isEntrega = document.querySelector('input[name="tipo-entrega"]:checked')?.value === 'entrega';
    
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

// ==============================================
// Funções Auxiliares
// ==============================================

function handleResponse(response) {
    if (!response.ok) throw new Error(`Erro ${response.status}`);
    return response.json();
}

function showLoading() {
    listaCarrinho.innerHTML = '<div class="loading"><p>Carregando seu carrinho...</p></div>';
    totalCarrinho.innerHTML = '';
}

function showEmptyCart() {
    listaCarrinho.innerHTML = `
        <div class="empty-cart">
            <img src="https://cdn-icons-png.flaticon.com/128/1288/1288704.png" alt="Carrinho vazio">
            <p>Seu carrinho está vazio</p>
            <a href="index.html" class="btn">Voltar ao cardápio</a>
        </div>
    `;
    totalCarrinho.innerHTML = '';
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
    totalCarrinho.innerHTML = '';
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