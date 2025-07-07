// script.js COMPLETO para index.html
// Estado global
let carrinho = [];

// Elementos da interface
const produtosContainer = document.getElementById("produtosContainer");

// Função principal de inicialização
async function inicializarPagina() {
    try {
        // Mostra estado de carregamento
        produtosContainer.innerHTML = '<div class="loading">Carregando cardápio...</div>';
        
        // Carrega dados em paralelo
        await Promise.all([
            carregarProdutos(),
            carregarCarrinho(),
            verificarLogin()
        ]);
        
    } catch (error) {
        console.error("Erro na inicialização:", error);
        mostrarErroCarregamento();
    }
}

// Carrega produtos do servidor
async function carregarProdutos() {
    try {
        const response = await fetch('http://localhost:3000/produtos');
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        
        const produtos = await response.json();
        if (produtos.length === 0) throw new Error('Nenhum produto disponível');
        
        exibirProdutos(produtos);
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        throw error;
    }
}

// Exibe produtos na tela
function exibirProdutos(produtos) {
    produtosContainer.innerHTML = "";
    
    produtos.forEach(produto => {
        const itemCarrinho = carrinho.find(item => item.produtoId == produto.id);
        const quantidade = itemCarrinho ? itemCarrinho.quantidade : 0;
        
        const card = document.createElement("div");
        card.className = "card";
        card.dataset.id = produto.id;

        // Corrige o caminho da imagem - remove o '../' pois as imagens estão na mesma hierarquia
        const imagemSrc = `img/lanche${produto.id}.png`;
        
        card.innerHTML = `
            <img src="${imagemSrc}" alt="${produto.nome}" onerror="this.src='img/placeholder.png'">
            <div class="card-info">
                <h3>${produto.nome}</h3>
                <p>${produto.ingredientes}</p>
                <div class="quantidade">
                    <button class="btn-menos" onclick="alterarQuantidade(${produto.id}, -1)">-</button>
                    <span class="contador" id="qtd-${produto.id}">${quantidade}</span>
                    <button class="btn-mais" onclick="alterarQuantidade(${produto.id}, 1)">+</button>
                </div>
            </div>
            <div class="card-preco">R$ ${produto.preco.toFixed(2)}</div>
        `;

        produtosContainer.appendChild(card);
    });
}

// Carrega o carrinho do servidor
async function carregarCarrinho() {
    try {
        const response = await fetch('http://localhost:3000/carrinho');
        if (!response.ok) throw new Error('Erro ao carregar carrinho');
        
        carrinho = await response.json();
        carrinho = carrinho.filter(item => item.quantidade > 0);
        atualizarContadores();
    } catch (error) {
        console.error("Erro ao carregar carrinho:", error);
        carrinho = []; // Fallback para carrinho vazio
    }
}

// Altera quantidade de um item
async function alterarQuantidade(produtoId, alteracao) {
    try {
        const itemIndex = carrinho.findIndex(item => item.produtoId == produtoId);
        let novaQuantidade = (itemIndex >= 0 ? carrinho[itemIndex].quantidade : 0) + alteracao;
        novaQuantidade = Math.max(0, novaQuantidade);
        
        // Atualiza localmente primeiro
        if (itemIndex >= 0) {
            if (novaQuantidade > 0) {
                carrinho[itemIndex].quantidade = novaQuantidade;
            } else {
                carrinho.splice(itemIndex, 1);
            }
        } else if (novaQuantidade > 0) {
            carrinho.push({ produtoId, quantidade: novaQuantidade });
        }
        
        // Atualiza UI
        document.getElementById(`qtd-${produtoId}`).textContent = novaQuantidade;
        atualizarContadorCarrinho();
        
        // Envia para o servidor
        await fetch('http://localhost:3000/carrinho', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ produtoId, quantidade: novaQuantidade })
        });
        
    } catch (error) {
        console.error("Erro ao atualizar carrinho:", error);
        alert("Erro ao atualizar. Recarregando...");
        location.reload();
    }
}

// Atualiza todos os contadores
function atualizarContadores() {
    carrinho.forEach(item => {
        const elemento = document.getElementById(`qtd-${item.produtoId}`);
        if (elemento) elemento.textContent = item.quantidade;
    });
    atualizarContadorCarrinho();
}

// Atualiza o ícone do carrinho
function atualizarContadorCarrinho() {
    const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
    const contador = document.getElementById('carrinho-contador');
    if (contador) contador.textContent = totalItens;
}

// Cria o botão do carrinho
function criarBotaoCarrinho() {
    const btnCarrinho = document.getElementById('btn-carrinho');
    if (btnCarrinho) {
        btnCarrinho.innerHTML = `
            <span id="carrinho-contador">${carrinho.reduce((total, item) => total + item.quantidade, 0)}</span>
            <i class="fas fa-shopping-cart"></i>
        `;
    }
}

// Sistema de login/logout
async function verificarLogin() {
    try {
        const response = await fetch('http://localhost:3000/usuario', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const usuario = await response.json();
            mostrarUsuarioLogado(usuario);
            return true;
        } else {
            mostrarUsuarioDeslogado();
            return false;
        }
    } catch (error) {
        console.error('Erro ao verificar login:', error);
        mostrarUsuarioDeslogado();
        return false;
    }
}

function mostrarUsuarioLogado(usuario) {
    const elements = {
        usuarioDiv: document.getElementById('usuario-logado'),
        nomeSpan: document.getElementById('nome-usuario'),
        logoutBtn: document.getElementById('logout'),
        deslogadoDiv: document.getElementById('usuario-deslogado'),
        adminPanel: document.getElementById('admin-panel')
    };
    
    // Atualiza informações do usuário
    elements.nomeSpan.textContent = `Bem-vindo, ${usuario.nome}`;
    elements.usuarioDiv.style.display = 'flex';
    elements.deslogadoDiv.style.display = 'none';
    
    // Controle do painel de admin
    const isGerente = usuario.tipo === 'gerente';
    elements.adminPanel.style.display = isGerente ? 'flex' : 'none';
    
    if (isGerente) {
        elements.adminPanel.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 1rem;
            flex-wrap: wrap;
            margin: 0 auto 1.5rem;
            max-width: 1200px;
            padding: 0 1rem;
        `;
    }
    
    // Configura logout
    elements.logoutBtn.onclick = async (e) => {
        e.preventDefault();
        await logout();
    };
    
    // Armazena dados do usuário
    localStorage.setItem('usuario', JSON.stringify({
        nome: usuario.nome,
        tipo: usuario.tipo,
        email: usuario.email // Adicionado email se necessário
    }));
}

function mostrarUsuarioDeslogado() {
    document.getElementById('usuario-logado').style.display = 'none';
    document.getElementById('usuario-deslogado').style.display = 'block';
    localStorage.removeItem('usuario');
}

async function logout() {
    try {
        await fetch('http://localhost:3000/logout', {
            method: 'POST',
            credentials: 'include'
        });
        localStorage.removeItem('usuario');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao fazer logout');
    }
}

// Mostra erro de carregamento
function mostrarErroCarregamento() {
    produtosContainer.innerHTML = `
        <div class="error">
            <p>Falha ao carregar o cardápio</p>
            <button onclick="inicializarPagina()">Tentar novamente</button>
        </div>
    `;
}

// Inicializa a página
document.addEventListener('DOMContentLoaded', inicializarPagina);