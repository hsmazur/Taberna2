let listaUsuario = [];
let oQueEstaFazendo = '';
let usuario = null;

// Inicialização - Carrega usuários do servidor
document.addEventListener('DOMContentLoaded', async () => {
    await carregarUsuarios();
    bloquearAtributos(true);
});

async function carregarUsuarios() {
    try {
        const response = await fetch('http://localhost:3000/usuarios');
        if (!response.ok) throw new Error('Erro ao carregar usuários');
        listaUsuario = await response.json();
        listar();
    } catch (error) {
        mostrarAviso(`Erro: ${error.message}`);
    }
}

function procurePorChavePrimaria(chave) {
    for (let i = 0; i < listaUsuario.length; i++) {
        const usuario = listaUsuario[i];
        if (usuario.id == chave) {
            usuario.posicaoNaLista = i;
            return usuario;
        }
    }
    return null;
}

function procure() {
    const id = document.getElementById("id").value;
    if (isNaN(id) || !Number.isInteger(Number(id))) {
        mostrarAviso("Precisa ser um número inteiro");
        document.getElementById("id").focus();
        return;
    }

    if (id) { 
        usuario = procurePorChavePrimaria(id);
        if (usuario) { 
            mostrarDadosUsuario(usuario);
            visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');
            mostrarAviso("Usuário encontrado, pode alterar ou excluir");
        } else { 
            limparAtributos();
            visibilidadeDosBotoes('inline', 'inline', 'none', 'none', 'none');
            mostrarAviso("Usuário não encontrado, pode inserir");
        }
    } else {
        document.getElementById("id").focus();
        return;
    }
}

function inserir() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'inserindo';
    mostrarAviso("INSERINDO - Digite os dados e clique em Salvar");
    document.getElementById("nome").focus();
}

function alterar() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'alterando';
    mostrarAviso("ALTERANDO - Modifique os dados e clique em Salvar");
    document.getElementById("nome").focus();
}

function excluir() {
    bloquearAtributos(true);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'excluindo';
    mostrarAviso("EXCLUINDO - Clique em Salvar para confirmar");
}

async function salvar() {
    const id = usuario ? usuario.id : parseInt(document.getElementById("id").value);
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const tipo = document.getElementById("tipo").value;

    if (!id || !nome || !email || !senha || !tipo) {
        mostrarAviso("Preencha todos os campos corretamente!");
        return;
    }

    try {
        const novoUsuario = { id, nome, email, senha, tipo };
        let metodo = 'POST';
        let url = 'http://localhost:3000/usuarios';

        switch (oQueEstaFazendo) {
            case 'inserindo':
                await fetch(url, {
                    method: metodo,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novoUsuario)
                });
                mostrarAviso("Usuário inserido com sucesso!");
                break;

            case 'alterando':
                await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novoUsuario)
                });
                mostrarAviso("Usuário alterado com sucesso!");
                break;

            case 'excluindo':
                await fetch(`${url}/${id}`, { method: 'DELETE' });
                mostrarAviso("Usuário excluído com sucesso!");
                break;
        }

        await carregarUsuarios();
        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
        limparAtributos();
        document.getElementById("id").focus();
        
    } catch (error) {
        mostrarAviso(`Erro: ${error.message}`);
    }
}

// Funções auxiliares
function mostrarDadosUsuario(usuario) {
    document.getElementById("nome").value = usuario.nome;
    document.getElementById("email").value = usuario.email;
    document.getElementById("senha").value = usuario.senha;
    document.getElementById("tipo").value = usuario.tipo;
    bloquearAtributos(true);
}

function limparAtributos() {
    document.getElementById("nome").value = "";
    document.getElementById("email").value = "";
    document.getElementById("senha").value = "";
    document.getElementById("tipo").value = "cliente";
    bloquearAtributos(true);
}

function bloquearAtributos(soLeitura) {
    document.getElementById("nome").readOnly = soLeitura;
    document.getElementById("email").readOnly = soLeitura;
    document.getElementById("senha").readOnly = soLeitura;
    document.getElementById("tipo").disabled = soLeitura;
}

function visibilidadeDosBotoes(btProcure, btInserir, btAlterar, btExcluir, btSalvar) {
    document.getElementById("btProcure").style.display = btProcure;
    document.getElementById("btInserir").style.display = btInserir;
    document.getElementById("btAlterar").style.display = btAlterar;
    document.getElementById("btExcluir").style.display = btExcluir;
    document.getElementById("btSalvar").style.display = btSalvar;
    document.getElementById("btCancelar").style.display = btSalvar;
}

function mostrarAviso(mensagem) {
    document.getElementById("divAviso").textContent = mensagem;
}

function listar() {
    let html = "";
    listaUsuario.forEach(usuario => {
        html += `
            <div class="usuario-item">
                <strong>ID: ${usuario.id}</strong> - ${usuario.nome}<br>
                <small>Email: ${usuario.email}</small><br>
                <small>Tipo: </small><span class="tipo">${usuario.tipo}</span>
            </div>
        `;
    });
    document.getElementById("outputSaida").innerHTML = html;
}

function cancelarOperacao() {
    if (usuario) {
        mostrarDadosUsuario(usuario);
    } else {
        limparAtributos();
    }
    bloquearAtributos(true);
    visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
    mostrarAviso("Operação cancelada");
}

// Funções para CSV
function prepararESalvarCSV() {
    let nomeDoArquivoDestino = "usuarios.csv";
    let textoCSV = "id,nome,email,senha,tipo\n";
    
    listaUsuario.forEach(usuario => {
        textoCSV += `${usuario.id},${usuario.nome},${usuario.email},${usuario.senha},${usuario.tipo}\n`;
    });
    
    const blob = new Blob([textoCSV], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nomeDoArquivoDestino;
    link.click();
    mostrarAviso("CSV exportado com sucesso!");
}

function abrirArquivoSalvoEmLocalPermanente() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = async (event) => {
        const arquivo = event.target.files[0];
        if (!arquivo) return;
        
        const leitor = new FileReader();
        leitor.onload = async (e) => {
            try {
                const texto = e.target.result;
                const linhas = texto.split('\n').slice(1); // Ignora cabeçalho
                
                for (const linha of linhas) {
                    if (!linha.trim()) continue;
                    
                    const [id, nome, email, senha, tipo] = linha.split(',');
                    const usuario = {
                        id: parseInt(id),
                        nome,
                        email,
                        senha,
                        tipo
                    };
                    
                    await fetch('http://localhost:3000/usuarios', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(usuario)
                    });
                }
                
                await carregarUsuarios();
                mostrarAviso("CSV importado com sucesso!");
            } catch (error) {
                mostrarAviso(`Erro ao importar CSV: ${error.message}`);
            }
        };
        leitor.readAsText(arquivo);
    };
    input.click();
}