

// Elementos globais
const produtosContainer = document.getElementById("produtosContainer");
let carrinho = {};

/**
 * Carrega produtos do backend e exibe na tela
 */
async function carregarProdutos() {
  try {
    produtosContainer.innerHTML = '<div class="loading">Carregando cardápio...</div>';
    
    const response = await fetch('http://localhost:3000/produtos');
    
    if (!response.ok) {
      throw new Error(`Erro: ${response.status}`);
    }

    const produtos = await response.json();
    
    if (!produtos || produtos.length === 0) {
      throw new Error("Nenhum produto encontrado");
    }

    exibirProdutos(produtos);
    await carregarCarrinho(); // Carrega o carrinho após os produtos
    
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    produtosContainer.innerHTML = `
      <div class="error">
        <p>Falha ao carregar o cardápio</p>
        <button onclick="carregarProdutos()">Tentar novamente</button>
      </div>
    `;
  }
}

/**
 * Exibe produtos na interface
 */
function exibirProdutos(produtos) {
  produtosContainer.innerHTML = "";
  
  produtos.forEach(produto => {
    const card = criarCard(produto);
    produtosContainer.appendChild(card);
  });
}

/**
 * Cria o HTML de um card de produto
 */
function criarCard(produto) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = produto.id;

  card.innerHTML = `
    <img src="${produto.imagem}" alt="${produto.nome}" onerror="this.src='img/placeholder.png'">
    <div class="card-info">
      <h3>${produto.nome}</h3>
      <p>${produto.ingredientes}</p>
      <div class="quantidade">
        <button class="btn-menos" onclick="atualizarQuantidade(${produto.id}, -1)">-</button>
        <span class="contador" id="qtd-${produto.id}">${carrinho[produto.id]?.quantidade || 0}</span>
        <button class="btn-mais" onclick="atualizarQuantidade(${produto.id}, 1)">+</button>
      </div>
    </div>
    <div class="card-preco">R$ ${produto.preco.toFixed(2)}</div>
  `;

  return card;
}

/**
 * Carrega o carrinho do backend
 */
async function carregarCarrinho() {
  try {
    const response = await fetch('http://localhost:3000/carrinho');
    const itens = await response.json();
    
    // Converte array para formato { id: { quantidade, produto } }
    carrinho = {};
    itens.forEach(item => {
      carrinho[item.produtoId] = {
        quantidade: parseInt(item.quantidade),
        produto: item.produto
      };
    });
    
    atualizarContadores();
    
  } catch (error) {
    console.error("Erro ao carregar carrinho:", error);
  }
}

/**
 * Atualiza quantidade no carrinho (front + backend)
 */
async function atualizarQuantidade(produtoId, alteracao) {
  try {
    const novaQuantidade = (carrinho[produtoId]?.quantidade || 0) + alteracao;
    
    if (novaQuantidade < 0) return;
    
    // Atualiza frontend primeiro para resposta rápida
    carrinho[produtoId] = {
      quantidade: novaQuantidade,
      produto: carrinho[produtoId]?.produto || { id: produtoId }
    };
    
    document.getElementById(`qtd-${produtoId}`).textContent = novaQuantidade;
    
    // Envia para o backend
    await fetch('http://localhost:3000/carrinho', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        produtoId: produtoId,
        quantidade: novaQuantidade
      })
    });
    
  } catch (error) {
    console.error("Erro ao atualizar carrinho:", error);
    alert("Erro ao atualizar. Recarregando...");
    location.reload();
  }
}

async function atualizarCarrinho(produtoId, quantidade) {
    await fetch('/carrinho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtoId, quantidade })
    });
}

async function calcularTotalItens() {
    const response = await fetch('/carrinho');
    const itens = await response.json();
    return itens.reduce((total, item) => total + parseInt(item.quantidade), 0);
}
// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos();
  criarBotaoCarrinho();
});