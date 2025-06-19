/**
 * Configura o sistema de pagamento na página
 */
async function configurarPagamento() {
    // 1. Busca o valor total do backend (em vez do localStorage)
    const total = await buscarTotalCarrinho();
    document.getElementById('valor-total').textContent = total ? 
        `Total: R$ ${parseFloat(total).toFixed(2)}` : 'Valor não disponível';

    // 2. Referências aos elementos (mantido igual)
    const opcoesPagamento = document.querySelectorAll('input[name="pagamento"]');
    const areaFormularios = document.getElementById('area-formularios');

    // 3. Event listeners para as opções de pagamento (mantido igual)
    opcoesPagamento.forEach(opcao => {
        opcao.onchange = () => mostrarFormularioPagamento(opcao.value);
    });

    // 4. Mostra o formulário inicial se já houver uma opção selecionada (mantido igual)
    const opcaoSelecionada = document.querySelector('input[name="pagamento"]:checked');
    if (opcaoSelecionada) {
        mostrarFormularioPagamento(opcaoSelecionada.value);
    }
}

/**
 * Busca o valor total do carrinho do backend
 */
async function buscarTotalCarrinho() {
    try {
        const response = await fetch('http://localhost:3000/carrinho');
        const dados = await response.json();
        
        // Calcula o total somando (quantidade * preço) de cada item
        let total = 0;
        dados.forEach(item => {
            const produto = produtos.find(p => p.nome === item.produto);
            if (produto) {
                total += produto.preco * parseInt(item.quantidade);
            }
        });

        return total.toFixed(2);
    } catch (error) {
        console.error("Erro ao buscar carrinho:", error);
        return null;
    }
}

/**
 * Mostra o formulário de pagamento correspondente à opção selecionada
 * @param {string} tipoPagamento - Tipo de pagamento ('dinheiro', 'pix' ou 'debito')
 */
function mostrarFormularioPagamento(tipoPagamento) {
    const areaFormularios = document.getElementById('area-formularios');
    const total = document.getElementById('valor-total').textContent.replace('Total: R$ ', '');

    // Templates dos formulários (mantido igual)
    const formularios = {
        dinheiro: `
            <div class="formulario">
                <p>Valor a pagar: <span>R$ ${total}</span></p>
                <p>Precisa de troco?</p>
                <label><input type="radio" name="troco" value="sim"> Sim</label>
                <label><input type="radio" name="troco" value="nao"> Não</label>
                <input type="number" id="valor-troco" placeholder="Troco para quanto?" style="display:none;">
                ${criarBotoesFormulario()}
            </div>
        `,
        pix: `
            <div class="formulario">
                <p>Valor a pagar: <span>R$ ${total}</span></p>
                <p>Chave Pix: <strong>taverna@gmail.com</strong></p>
                <button id="gerar-qrcode">Gerar QR Code</button>
                <img id="qr-code" src="img/qrcode.png" alt="QR Code" style="display: none; width: 200px; margin-top: 10px;">
                <p>Após o pagamento, clique em confirmar.</p>
                ${criarBotoesFormulario()}
            </div>
        `,
        debito: `
            <div class="formulario">
                <p>Valor a pagar: <span>R$ ${total}</span></p>
                <input type="text" id="numero-cartao" placeholder="XXXX XXXX XXXX XXXX" maxlength="19">
                <input type="text" id="validade-cartao" placeholder="MM/AA" maxlength="5">
                <input type="text" id="cvc-cartao" placeholder="XXX" maxlength="3">
                ${criarBotoesFormulario()}
            </div>
        `
    };

    areaFormularios.innerHTML = formularios[tipoPagamento];
    configurarEventosFormulario(tipoPagamento);
}

// ==============================================
// Funções auxiliares (MANTIDAS IGUAIS)
// ==============================================
function criarBotoesFormulario() {
    return `
        <div class="botoes-final">
            <a href="carrinho.html" class="botao_carrinho">Voltar</a>
            <button class="botao_confirmar">Confirmar</button>
        </div>
    `;
}

function configurarEventosFormulario(tipoPagamento) {
    switch (tipoPagamento) {
        case 'dinheiro':
            configurarFormularioDinheiro();
            break;
        case 'pix':
            configurarFormularioPix();
            break;
        case 'debito':
            configurarFormularioDebito();
            break;
    }

    // Configura evento do botão Confirmar
    document.querySelector('.botao_confirmar').onclick = async (event) => {
        event.preventDefault();
        if (validarFormulario(tipoPagamento)) {
            // (Opcional) Envia o pedido para o backend
            await enviarPedidoConfirmado(tipoPagamento);
            alert('Pedido confirmado!');
            window.location.href = 'index.html';
        }
    };
}

function configurarFormularioDinheiro() {
    document.querySelector('input[name="troco"][value="sim"]').onchange = () => {
        document.getElementById('valor-troco').style.display = 'block';
    };
    
    document.querySelector('input[name="troco"][value="nao"]').onchange = () => {
        document.getElementById('valor-troco').style.display = 'none';
    };
}

function configurarFormularioPix() {
    document.getElementById('gerar-qrcode').onclick = () => {
        document.getElementById('qr-code').style.display = 'block';
    };
}

function configurarFormularioDebito() {
    const numeroCartao = document.getElementById('numero-cartao');
    const validadeCartao = document.getElementById('validade-cartao');
    const cvcCartao = document.getElementById('cvc-cartao');

    numeroCartao.oninput = function(e) {
        e.target.value = formatarNumeroCartao(e.target.value);
    };

    validadeCartao.oninput = function(e) {
        e.target.value = formatarValidadeCartao(e.target.value);
    };

    cvcCartao.oninput = function(e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0, 3);
    };
}

function formatarNumeroCartao(value) {
    return value.replace(/\s+/g, '')
                .replace(/[^0-9]/g, '')
                .replace(/(\d{4})/g, '$1 ')
                .trim()
                .substring(0, 19);
}

function formatarValidadeCartao(value) {
    return value.replace(/[^0-9]/g, '')
                .replace(/^(\d{2})/, '$1/')
                .substring(0, 5);
}

function validarFormulario(tipoPagamento) {
    if (tipoPagamento === 'debito') {
        const numeroCartao = document.getElementById('numero-cartao').value.replace(/\s/g, '');
        const validade = document.getElementById('validade-cartao').value;
        const cvc = document.getElementById('cvc-cartao').value;
        
        if (!numeroCartao || numeroCartao.length < 16) {
            alert('Por favor, insira um número de cartão válido');
            return false;
        }
        
        if (!validade || validade.length < 5) {
            alert('Por favor, insira uma data de validade válida');
            return false;
        }
        
        if (!cvc || cvc.length < 3) {
            alert('Por favor, insira um CVC válido');
            return false;
        }
    }
    
    return true;
}

// ==============================================
// (Opcional) Envia o pedido confirmado para o backend
// ==============================================
async function enviarPedidoConfirmado(metodoPagamento) {
    try {
        const total = await buscarTotalCarrinho();
        const response = await fetch('http://localhost:3000/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                metodoPagamento,
                total,
                data: new Date().toISOString()
            })
        });
        console.log("Pedido salvo no backend:", await response.json());
    } catch (error) {
        console.error("Erro ao salvar pedido:", error);
    }
}

// Inicialização (mantido igual)
document.addEventListener('DOMContentLoaded', configurarPagamento);