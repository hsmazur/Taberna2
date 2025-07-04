// Configurações globais
const API_URL = 'http://localhost:3000';

// Elementos principais
let valorTotalElement, areaFormularios;

// Adicione no início do arquivo, após as constantes:
let usuarioLogado = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verifica se o usuário está logado
        const response = await fetch(`${API_URL}/usuario`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            // Se não estiver logado, redireciona para login
            window.location.href = 'login.html?redirect=pagamento';
            return;
        }
        
        // Se estiver logado, continua o carregamento
        usuarioLogado = await response.json();
        valorTotalElement = document.getElementById('valor-total');
        areaFormularios = document.getElementById('area-formularios');
        
        // Carrega o valor total do carrinho
        await carregarTotalCarrinho();
        
        // Configura os listeners dos radios
        document.querySelectorAll('input[name="pagamento"]').forEach(radio => {
            radio.addEventListener('change', (e) => mostrarFormularioPagamento(e.target.value));
        });
        
        // Mostra o formulário inicial (dinheiro por padrão)
        mostrarFormularioPagamento('dinheiro');
        
    } catch (error) {
        console.error('Erro ao verificar login:', error);
        window.location.href = 'login.html?redirect=pagamento';
    }
});

// Carrega o total do carrinho
async function carregarTotalCarrinho() {
  try {
    // Recupera o total do localStorage
    const totalSalvo = localStorage.getItem('totalPedido');
    const dadosEntrega = JSON.parse(localStorage.getItem('dadosEntrega') || '{"taxaEntrega": 0}');
    
    if (totalSalvo) {
      // Se já tiver o total calculado, usa ele
      valorTotalElement.textContent = `Total: R$ ${parseFloat(totalSalvo).toFixed(2)}`;
      
      // Mostra a taxa de entrega se houver
      if (dadosEntrega.taxaEntrega > 0) {
        const subtotal = parseFloat(totalSalvo) - dadosEntrega.taxaEntrega;
        valorTotalElement.innerHTML = `
          <p>Subtotal: R$ ${subtotal.toFixed(2)}</p>
          <p>Taxa de entrega: R$ ${dadosEntrega.taxaEntrega.toFixed(2)}</p>
          <p><strong>Total: R$ ${totalSalvo}</strong></p>
        `;
      }
    } else {
      // Fallback: calcula o total manualmente (para caso direto no pagamento)
      const response = await fetch(`${API_URL}/carrinho`);
      const itens = await response.json();
      
      const responseProdutos = await fetch(`${API_URL}/produtos`);
      const produtos = await responseProdutos.json();
      
      let total = 0;
      itens.forEach(item => {
        const produto = produtos.find(p => p.id == item.produtoId);
        if (produto) {
          total += produto.preco * item.quantidade;
        }
      });
      
      // Adiciona taxa se houver
      if (dadosEntrega.taxaEntrega > 0) {
        total += dadosEntrega.taxaEntrega;
        valorTotalElement.innerHTML = `
          <p>Subtotal: R$ ${(total - dadosEntrega.taxaEntrega).toFixed(2)}</p>
          <p>Taxa de entrega: R$ ${dadosEntrega.taxaEntrega.toFixed(2)}</p>
          <p><strong>Total: R$ ${total.toFixed(2)}</strong></p>
        `;
      } else {
        valorTotalElement.textContent = `Total: R$ ${total.toFixed(2)}`;
      }
    }
    
  } catch (error) {
    console.error('Erro ao carregar carrinho:', error);
    valorTotalElement.textContent = 'Erro ao carregar valor total';
  }
}

// Mostra o formulário correspondente ao tipo de pagamento
function mostrarFormularioPagamento(tipo) {
    const templates = {
        dinheiro: `
            <div class="formulario-pagamento">
                <h3>Pagamento em Dinheiro</h3>
                <p>Você selecionou pagamento em dinheiro.</p>
                <p>Prepare o troco necessário.</p>
                <div class="grupo-troco">
                    <label>
                        <input type="checkbox" id="precisa-troco"> 
                        <span>Preciso de troco para:</span>
                    </label>
                    <input type="number" id="valor-troco" placeholder="R$ 0,00" min="0" step="0.01" disabled>
                </div>
                <button id="confirmar-pagamento" class="botao-confirmar">Confirmar Pedido</button>
            </div>
        `,
        pix: `
            <div class="formulario-pagamento">
                <h3>Pagamento via PIX</h3>
                <p>Chave PIX: <strong>tabernadragao@email.com</strong></p>
                <div class="qr-code-container">
                    <button id="gerar-qrcode">Mostrar QR Code</button>
                    <img id="qr-code-image" src="img/qrcode.png" alt="QR Code PIX" style="display: none; max-width: 200px; margin: 1rem auto;">
                </div>
                <p>Após o pagamento, clique em confirmar.</p>
                <button id="confirmar-pagamento" class="botao-confirmar">Confirmar Pedido</button>
            </div>
        `,
        debito: `
            <div class="formulario-pagamento">
                <h3>Pagamento com Cartão de Débito</h3>
                <div class="grupo-cartao">
                    <input type="text" id="numero-cartao" placeholder="Número do Cartão" maxlength="19">
                    <span id="erro-numero" class="mensagem-erro"></span>
                    
                    <div class="linha-cartao">
                        <input type="text" id="validade-cartao" placeholder="MM/AA" maxlength="5">
                        <input type="text" id="cvv-cartao" placeholder="CVV" maxlength="3">
                    </div>
                    <span id="erro-validade" class="mensagem-erro"></span>
                    <span id="erro-cvv" class="mensagem-erro"></span>
                    
                    <input type="text" id="nome-cartao" placeholder="Nome no Cartão">
                    <span id="erro-nome" class="mensagem-erro"></span>
                </div>
                <button id="confirmar-pagamento" class="botao-confirmar">Confirmar Pedido</button>
            </div>
        `
    };

    areaFormularios.innerHTML = templates[tipo];
    configurarEventosFormulario(tipo);
}

// Algoritmo de Luhn para validar número do cartão
function validarNumeroCartaoLuhn(numero) {
    // Remove todos os espaços e caracteres não numéricos
    const numeroLimpo = numero.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    
    // Verifica se tem comprimento válido (normalmente 13-19 dígitos)
    if (numeroLimpo.length < 13 || numeroLimpo.length > 19) {
        return false;
    }

    let soma = 0;
    let deveDobrar = false;

    // Percorre os dígitos da direita para a esquerda
    for (let i = numeroLimpo.length - 1; i >= 0; i--) {
        let digito = parseInt(numeroLimpo.charAt(i), 10);

        if (deveDobrar) {
            digito *= 2;
            if (digito > 9) {
                digito = (digito % 10) + 1;
            }
        }

        soma += digito;
        deveDobrar = !deveDobrar;
    }

    // O número é válido se a soma for múltiplo de 10
    return soma % 10 === 0;
}

// Configura os eventos específicos de cada formulário
function configurarEventosFormulario(tipo) {
    switch (tipo) {
        case 'dinheiro':
            document.getElementById('precisa-troco').addEventListener('change', (e) => {
                document.getElementById('valor-troco').disabled = !e.target.checked;
            });
            break;
            
        case 'pix':
            document.getElementById('gerar-qrcode').addEventListener('click', () => {
                const qrCode = document.getElementById('qr-code-image');
                qrCode.style.display = qrCode.style.display === 'none' ? 'block' : 'none';
            });
            break;
            
        case 'debito':
            // Máscara para número do cartão (formato: 0000 0000 0000 0000)
            document.getElementById('numero-cartao').addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/g, '');
                if (value.length > 0) {
                    value = value.match(new RegExp('.{1,4}', 'g')).join(' ');
                }
                e.target.value = value;
                
                // Validação com algoritmo de Luhn
                const erro = document.getElementById('erro-numero');
                if (!validarNumeroCartaoLuhn(value)) {
                    erro.textContent = 'Número do cartão inválido';
                    erro.style.display = 'block';
                } else {
                    erro.style.display = 'none';
                }
            });
            
            // Máscara para validade (MM/AA)
            document.getElementById('validade-cartao').addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                e.target.value = value;
                
                // Validação básica
                const erro = document.getElementById('erro-validade');
                if (value.length !== 5 || !validarDataCartao(value)) {
                    erro.textContent = 'Data inválida (MM/AA)';
                    erro.style.display = 'block';
                } else {
                    erro.style.display = 'none';
                }
            });
            
            // Máscara para CVV (3 dígitos)
            document.getElementById('cvv-cartao').addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0, 3);
                
                // Validação básica
                const erro = document.getElementById('erro-cvv');
                if (e.target.value.length !== 3) {
                    erro.textContent = 'CVV inválido (3 dígitos)';
                    erro.style.display = 'block';
                } else {
                    erro.style.display = 'none';
                }
            });
            
            // Validação do nome no cartão
            document.getElementById('nome-cartao').addEventListener('input', (e) => {
                const erro = document.getElementById('erro-nome');
                if (e.target.value.trim().length < 3) {
                    erro.textContent = 'Nome muito curto';
                    erro.style.display = 'block';
                } else {
                    erro.style.display = 'none';
                }
            });
            break;
    }
    
    // Configura o botão de confirmar pedido
    document.getElementById('confirmar-pagamento').addEventListener('click', () => {
        if (validarFormulario(tipo)) {
            finalizarPedido(tipo);
        }
    });
}

// Valida o formulário antes de enviar
function validarFormulario(tipo) {
    switch (tipo) {
        case 'debito':
            const numero = document.getElementById('numero-cartao').value.replace(/\s/g, '');
            const validade = document.getElementById('validade-cartao').value;
            const cvv = document.getElementById('cvv-cartao').value;
            const nome = document.getElementById('nome-cartao').value.trim();
            
            if (!validarNumeroCartaoLuhn(numero)) {
                alert('Número do cartão inválido!');
                return false;
            }
            
            if (!validarDataCartao(validade)) {
                alert('Data de validade inválida!');
                return false;
            }
            
            if (cvv.length !== 3) {
                alert('CVV inválido!');
                return false;
            }
            
            if (nome.length < 3) {
                alert('Nome no cartão inválido!');
                return false;
            }
            break;
            
        case 'dinheiro':
            const precisaTroco = document.getElementById('precisa-troco').checked;
            const valorTroco = parseFloat(document.getElementById('valor-troco').value);
            
            if (precisaTroco && (isNaN(valorTroco) || valorTroco <= 0)) {
                alert('Informe um valor válido para o troco!');
                return false;
            }
            break;
    }
    
    return true;
}

// Valida a data do cartão (MM/AA)
function validarDataCartao(data) {
    if (data.length !== 5) return false;
    
    const [mes, ano] = data.split('/').map(Number);
    const agora = new Date();
    const anoAtual = agora.getFullYear() % 100;
    const mesAtual = agora.getMonth() + 1;
    
    // Verifica se o mês é válido (1-12)
    if (mes < 1 || mes > 12) return false;
    
    // Verifica se a data não está no passado
    if (ano < anoAtual || (ano === anoAtual && mes < mesAtual)) return false;
    
    return true;
}

// Finaliza o pedido
async function finalizarPedido(metodo) {
    try {
        // Verificação redundante (segurança extra)
        if (!usuarioLogado) {
            window.location.href = 'login.html?redirect=pagamento';
            return;
        }

        // Recupera os dados do pedido
        const total = localStorage.getItem('totalPedido') || '0';
        const dadosEntrega = JSON.parse(localStorage.getItem('dadosEntrega') || '{}');
        
        // Recupera os itens do carrinho
        const response = await fetch(`${API_URL}/carrinho`);
        const itens = await response.json();
        
        // Envia o pedido para o servidor
        const pedidoResponse = await fetch(`${API_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioId: usuarioLogado.id,
                metodoPagamento: metodo,
                total: parseFloat(total),
                itens: itens.filter(item => item.quantidade > 0),
                entrega: dadosEntrega.taxaEntrega > 0 ? dadosEntrega : null
            }),
            credentials: 'include'
        });

        if (!pedidoResponse.ok) {
            throw new Error('Erro ao registrar pedido');
        }
        
        // Limpa o carrinho e os dados temporários
        await fetch(`${API_URL}/carrinho`, {
            method: 'DELETE'
        });
        localStorage.removeItem('totalPedido');
        localStorage.removeItem('dadosEntrega');
        
        // Redireciona para confirmação
        window.location.href = 'confirmacao.html';
        
    } catch (error) {
        console.error('Erro ao finalizar pedido:', error);
        alert('Erro ao processar pagamento. Tente novamente.');
    }
}