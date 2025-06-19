// Novo (com fetch)
let produtos = [];

async function carregarProdutos() {
    const response = await fetch('http://localhost:3000/produtos');
    produtos = await response.json();
    exibirProdutos(produtos, "produtosContainer");
}

window.onload = carregarProdutos;

const todosProdutos = [...produtos];
let carrinho = {}; // Agora vazio, será preenchido pelo backend
const container = document.getElementById("lista-carrinho");
const totalDiv = document.getElementById("total-carrinho");
let total = 0;

// ==============================================
// 1. Carrega o carrinho do backend ao iniciar
// ==============================================
async function carregarCarrinho() {
    try {
        const response = await fetch('http://localhost:3000/carrinho');
        const dados = await response.json();
        
        // Converte o formato do CSV para { "nomeProduto": quantidade }
        dados.forEach(item => {
            carrinho[item.produto] = parseInt(item.quantidade);
        });
        
        atualizarCarrinho(); // Atualiza a interface
    } catch (error) {
        console.error("Erro ao carregar carrinho:", error);
    }
}

// ==============================================
// 2. Remove um item do carrinho (no backend)
// ==============================================
async function removerItem(nomeProduto) {
    try {
        // Envia uma requisição para remover o item
        await fetch('http://localhost:3000/carrinho', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                produto: nomeProduto,
                quantidade: 0 // Zera a quantidade = remove
            })
        });

        // Atualiza localmente e na interface
        delete carrinho[nomeProduto];
        atualizarCarrinho();
    } catch (error) {
        console.error("Erro ao remover item:", error);
    }
}

// ==============================================
// 3. Atualiza a exibição do carrinho (igual ao original, mas sem localStorage)
// ==============================================
function atualizarCarrinho() {
    container.innerHTML = "";
    total = 0;

    Object.entries(carrinho).forEach(([nome, qtd]) => {
        if (qtd > 0) {
            const produto = todosProdutos.find(item => item.nome === nome);
            if (produto) {
                const itemTotal = qtd * produto.preco;
                total += itemTotal;
                criarItemCarrinho(produto, qtd, itemTotal);
            }
        }
    });

    totalDiv.textContent = `Total: R$ ${total.toFixed(2)}`;
}

// ==============================================
// 4. Cria um item do carrinho na interface (igual ao original, mas com remoção via backend)
// ==============================================
function criarItemCarrinho(produto, quantidade, itemTotal) {
    const card = document.createElement("div");
    card.className = "item-carrinho";

    card.innerHTML = `
        <img src="${produto.imagem}" alt="${produto.nome}" />
        <div class="card-info">
            <h3>${produto.nome}</h3>
            <p>Preço: R$ ${produto.preco.toFixed(2)}</p>
            <p>Qtd: ${quantidade}</p>
            <p>Total: R$ ${itemTotal.toFixed(2)}</p>
        </div>
        <button class="remover-item">Remover</button>
    `;

    card.querySelector(".remover-item").onclick = () => removerItem(produto.nome);
    container.appendChild(card);
}

// ==============================================
// 5. Finalização do pedido (opcional: pode enviar para o backend)
// ==============================================
function finalizarPedido(tipo) {
    const form = document.getElementById("form-dados");
    const dados = new FormData(form);
    const resultado = Object.fromEntries(dados.entries());
    
    const taxaEntrega = tipo === "entrega" ? 3.50 : 0;
    const precoFinal = total + taxaEntrega;

    // Atualiza o resumo do pedido (igual ao original)
    document.getElementById("nome-usuario").textContent = `Nome: ${resultado.nome}`;
    document.getElementById("telefone-usuario").textContent = `Telefone: ${resultado.telefone}`;
    document.getElementById("endereco-usuario").textContent = `Endereço: ${resultado.endereco || "Retirada no local"}`;
    document.getElementById("bairro-usuario").textContent = `Bairro: ${resultado.bairro || "Retirada no local"}`;
    document.getElementById("modo-entrega").textContent = `Modo de entrega: ${tipo === "entrega" ? "Entrega" : "Retirada"}`;
    document.getElementById("taxa-entrega").textContent = `Taxa de entrega: R$ ${taxaEntrega.toFixed(2)}`;
    document.getElementById("preco-total").textContent = `Preço total: R$ ${precoFinal.toFixed(2)}`;

    // Exibe os itens do pedido (igual ao original)
    const itensPedidoDiv = document.getElementById("itens-pedido");
    itensPedidoDiv.innerHTML = Object.entries(carrinho)
        .filter(([_, qtd]) => qtd > 0)
        .map(([nome, qtd]) => {
            const produto = todosProdutos.find(item => item.nome === nome);
            return produto ? `
                <div>
                    <p>${produto.nome} (x${qtd})</p>
                    <p>R$ ${(qtd * produto.preco).toFixed(2)}</p>
                </div>
            ` : "";
        }).join("");

    // Atualiza a exibição (igual ao original)
    document.getElementById("formulario-entrega").style.display = "none";
    document.getElementById("resumo-pedido").style.display = "flex";
    document.getElementById("botoes-finalizacao").style.marginTop = "30px";

    // (Opcional) Aqui você pode enviar o pedido para o backend
    // await enviarPedidoParaBackend({ dados, carrinho, precoFinal });
}

// ==============================================
// 6. Inicialização (agora carrega do backend)
// ==============================================
document.querySelector(".btn-entrega").onclick = () => criarFormulario("entrega");
document.querySelector(".btn-retirada").onclick = () => criarFormulario("retirada");
carregarCarrinho(); // Carrega os itens do backend