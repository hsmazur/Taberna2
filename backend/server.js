const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const cors = require('cors');
const app = express();

// Configurações
app.use(cors());
app.use(express.json());

// Caminhos dos arquivos (agora na pasta csv/)
const CSV_DIR = path.join(__dirname, 'csv');
const CSV_PRODUTOS = path.join(CSV_DIR, 'produtos.csv');
const CSV_CARRINHO = path.join(CSV_DIR, 'carrinho.csv');
const CSV_PEDIDOS = path.join(CSV_DIR, 'pedidos.csv');
const CSV_USUARIOS = path.join(CSV_DIR, 'usuarios.csv'); // Novo arquivo para usuários

// Garante que a pasta csv existe
function criarPastaCSV() {
  if (!fs.existsSync(CSV_DIR)) {
    fs.mkdirSync(CSV_DIR);
  }
}

// Inicializa arquivos CSV
function inicializarCSVs() {
  criarPastaCSV();
  
  if (!fs.existsSync(CSV_PRODUTOS)) {
    fs.writeFileSync(CSV_PRODUTOS, 'id,nome,preco,imagem,ingredientes\n');
  }
  
  if (!fs.existsSync(CSV_CARRINHO)) {
    fs.writeFileSync(CSV_CARRINHO, 'produtoId,quantidade\n');
  }
  
  if (!fs.existsSync(CSV_PEDIDOS)) {
    fs.writeFileSync(CSV_PEDIDOS, 'id,usuarioId,metodoPagamento,total,data,itens\n');
  }
  
  if (!fs.existsSync(CSV_USUARIOS)) {
    fs.writeFileSync(CSV_USUARIOS, 'id,nome,email,senha,dataCadastro\n');
  }
}

inicializarCSVs();

// Rotas de Produtos (com tratamento melhorado)
app.get('/produtos', (req, res) => {
  if (!fs.existsSync(CSV_PRODUTOS)) {
    return res.status(404).json({ error: "Arquivo de produtos não encontrado" });
  }

  const produtos = [];
  fs.createReadStream(CSV_PRODUTOS)
    .pipe(csv.parse({ 
      headers: true,
      skipLines: 0,
      strictColumnHandling: true
    }))
    .on('data', (row) => {
      try {
        produtos.push({
          id: parseInt(row.id),
          nome: row.nome,
          preco: parseFloat(row.preco),
          imagem: row.imagem,
          ingredientes: row.ingredientes
        });
      } catch (error) {
        console.error('Erro ao processar linha:', row);
      }
    })
    .on('end', () => res.json(produtos))
    .on('error', (err) => {
      console.error("Erro ao ler produtos:", err);
      res.status(500).json({ error: "Erro no servidor" });
    });
});

// Rotas do Carrinho (com validação)
app.post('/carrinho', async (req, res) => {
  const { produtoId, quantidade } = req.body;
  
  if (!produtoId || isNaN(quantidade)) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  try {
    let carrinho = [];
    if (fs.existsSync(CSV_CARRINHO)) {
      carrinho = await lerCSV(CSV_CARRINHO);
    }

    const itemIndex = carrinho.findIndex(item => item.produtoId === produtoId);
    
    if (itemIndex >= 0) {
      if (quantidade <= 0) {
        carrinho.splice(itemIndex, 1); // Remove item
      } else {
        carrinho[itemIndex].quantidade = quantidade; // Atualiza quantidade
      }
    } else if (quantidade > 0) {
      carrinho.push({ produtoId, quantidade }); // Adiciona novo item
    }

    await escreverCSV(CSV_CARRINHO, carrinho);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro no carrinho:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.get('/carrinho', async (req, res) => {
  try {
    if (!fs.existsSync(CSV_CARRINHO)) {
      return res.json([]);
    }

    const carrinho = await lerCSV(CSV_CARRINHO);
    res.json(carrinho);
  } catch (error) {
    console.error('Erro ao ler carrinho:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Rotas de Pedidos (com mais detalhes)
app.post('/pedidos', async (req, res) => {
  const { usuarioId, metodoPagamento, total, itens } = req.body;
  
  if (!usuarioId || !metodoPagamento || !total || !itens) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  try {
    const pedidos = fs.existsSync(CSV_PEDIDOS) ? await lerCSV(CSV_PEDIDOS) : [];
    const novoPedido = {
      id: pedidos.length + 1,
      usuarioId,
      metodoPagamento,
      total: parseFloat(total).toFixed(2),
      data: new Date().toISOString(),
      itens: JSON.stringify(itens) // Salva itens como string JSON
    };
    
    pedidos.push(novoPedido);
    await escreverCSV(CSV_PEDIDOS, pedidos);
    
    // Limpa o carrinho após finalizar pedido
    await escreverCSV(CSV_CARRINHO, []);
    
    res.json({ success: true, pedido: novoPedido });
  } catch (error) {
    console.error('Erro ao salvar pedido:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Rotas de Usuários (para login/cadastro)
app.post('/usuarios/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  try {
    const usuarios = fs.existsSync(CSV_USUARIOS) ? await lerCSV(CSV_USUARIOS) : [];
    
    // Verifica se email já existe
    if (usuarios.some(u => u.email === email)) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const novoUsuario = {
      id: usuarios.length + 1,
      nome,
      email,
      senha, // Na prática, armazene hash da senha!
      dataCadastro: new Date().toISOString()
    };
    
    usuarios.push(novoUsuario);
    await escreverCSV(CSV_USUARIOS, usuarios);
    
    res.json({ success: true, usuario: { id: novoUsuario.id, nome: novoUsuario.nome } });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/usuarios/login', async (req, res) => {
  const { email, senha } = req.body;
  
  if (!email || !senha) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  try {
    const usuarios = fs.existsSync(CSV_USUARIOS) ? await lerCSV(CSV_USUARIOS) : [];
    const usuario = usuarios.find(u => u.email === email && u.senha === senha);
    
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    res.json({ 
      success: true, 
      usuario: { 
        id: usuario.id, 
        nome: usuario.nome,
        email: usuario.email
      } 
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Funções auxiliares melhoradas
async function lerCSV(arquivo) {
  return new Promise((resolve, reject) => {
    const dados = [];
    fs.createReadStream(arquivo)
      .pipe(csv.parse({ 
        headers: true,
        skipLines: 0
      }))
      .on('data', (row) => dados.push(row))
      .on('end', () => resolve(dados))
      .on('error', reject);
  });
}

async function escreverCSV(arquivo, dados) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(arquivo);
    csv.writeToStream(ws, dados, { 
      headers: true,
      writeHeaders: true
    })
      .on('finish', resolve)
      .on('error', reject);
  });
}

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota padrão para o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Arquivos CSV em: ${CSV_DIR}`);
});