// Configurações globais
const API_URL = 'http://localhost:3000';

// Elementos principais
let valorTotalElement, areaFormularios;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    valorTotalElement = document.getElementById('valor-total');
    areaFormularios = document.getElementById('area-formularios');
    
    if (!valorTotalElement || !areaFormularios) {
        showCriticalError();
        return;
    }

    configurarPagamento();
});

// Função principal
async function configurarPagamento() {
    try {
        const total = await calcularTotalCarrinho();
        valorTotalElement.textContent = `Total: R$ ${total.toFixed(2)}`;
        
        const opcoesPagamento = document.querySelectorAll('input[name="pagamento"]');
        opcoesPagamento.forEach(opcao => {
            opcao.onchange = () => mostrarFormularioPagamento(opcao.value);
        });

        const opcaoSelecionada = document.querySelector('input[name="pagamento"]:checked');
        if (opcaoSelecionada) mostrarFormularioPagamento(opcaoSelecionada.value);

    } catch (error) {
        showError(error);
    }
}

// Calcula o total do carrinho
async function calcularTotalCarrinho() {
    try {
        const [produtos, itens] = await Promise.all([
            fetch(`${API_URL}/produtos`).then(res => res.json()),
            fetch(`${API_URL}/carrinho`).then(res => res.json())
        ]);

        return itens.reduce((total, item) => {
            const produto = produtos.find(p => p.id == item.produtoId);
            return total + (produto ? produto.preco * item.quantidade : 0);
        }, 0);
    } catch (error) {
        console.error("Erro ao calcular total:", error);
        throw new Error("Não foi possível carregar o carrinho");
    }
}

// Mostra o formulário de pagamento
function mostrarFormularioPagamento(tipoPagamento) {
    const total = valorTotalElement.textContent.replace('Total: R$ ', '');
    const templates = {
        dinheiro: `
            <div class="formulario">
                <p>Valor a pagar: <span>R$ ${total}</span></p>
                <label><input type="radio" name="troco" value="sim"> Precisa de troco?</label>
                <input type="number" id="valor-troco" placeholder="Troco para quanto?" class="hidden">
                ${criarBotoesFormulario()}
            </div>
        `,
        pix: `
            <div class="formulario">
                <p>Valor a pagar: <span>R$ ${total}</span></p>
                <p>Chave Pix: <strong>taverna@gmail.com</strong></p>
                <button id="gerar-qrcode">Gerar QR Code</button>
                <img id="qr-code" src="img/qrcode.png" alt="QR Code" class="hidden">
                ${criarBotoesFormulario()}
            </div>
        `,
        debito: `
            <div class="formulario">
                <p>Valor a pagar: <span>R$ ${total}</span></p>
                <input type="text" id="numero-cartao" placeholder="Número do cartão" data-mask="card">
                <input type="text" id="validade-cartao" placeholder="MM/AA" data-mask="date">
                <input type="text" id="cvc-cartao" placeholder="CVC" data-mask="cvc">
                ${criarBotoesFormulario()}
            </div>
        `
    };

    areaFormularios.innerHTML = templates[tipoPagamento];
    configurarEventosFormulario(tipoPagamento);
}

// Funções auxiliares
function criarBotoesFormulario() {
    return `
        <div class="botoes-final">
            <a href="carrinho.html" class="botao-voltar">Voltar</a>
            <button class="botao-confirmar">Confirmar Pedido</button>
        </div>
    `;
}

function configurarEventosFormulario(tipoPagamento) {
    // Configura máscaras e eventos específicos
    if (tipoPagamento === 'dinheiro') {
        document.querySelector('input[name="troco"][value="sim"]').onchange = () => {
            document.getElementById('valor-troco').classList.toggle('hidden');
        };
    } else if (tipoPagamento === 'pix') {
        document.getElementById('gerar-qrcode').onclick = () => {
            document.getElementById('qr-code').classList.toggle('hidden');
        };
    }

    // Evento do botão Confirmar
    document.querySelector('.botao-confirmar').onclick = async () => {
        if (validarFormulario(tipoPagamento)) {
            await finalizarPedido(tipoPagamento);
        }
    };
}

async function finalizarPedido(metodoPagamento) {
    try {
        const total = await calcularTotalCarrinho();
        const response = await fetch(`${API_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metodoPagamento, total })
        });

        if (!response.ok) throw new Error("Erro ao finalizar pedido");
        
        alert('Pedido confirmado! Obrigado!');
        window.location.href = 'index.html';
    } catch (error) {
        alert(`Erro: ${error.message}`);
    }
}

// Tratamento de erros
function showCriticalError() {
    document.body.innerHTML = `
        <div class="error">
            <h2>Erro crítico</h2>
            <p>Recarregue a página ou volte mais tarde.</p>
        </div>
    `;
}

function showError(error) {
    valorTotalElement.innerHTML = `<span class="error">Erro: ${error.message}</span>`;
}