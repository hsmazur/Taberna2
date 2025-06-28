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
const CSV_USUARIOS = path.join(CSV_DIR, 'usuarios.csv');

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
    fs.writeFileSync(CSV_USUARIOS, 'id,nome,email,senha,tipo\n');
  }
}

inicializarCSVs();

// Rotas de Produtos
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

// Rotas do Carrinho
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

// Rotas de Pedidos
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
      itens: JSON.stringify(itens)
    };
    
    pedidos.push(novoPedido);
    await escreverCSV(CSV_PEDIDOS, pedidos);
    await escreverCSV(CSV_CARRINHO, []);
    
    res.json({ success: true, pedido: novoPedido });
  } catch (error) {
    console.error('Erro ao salvar pedido:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Rota de Cadastro
app.post('/cadastrar', async (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ 
            success: false,
            message: 'Todos os campos são obrigatórios'
        });
    }

    try {
        const usuarios = await lerCSV(CSV_USUARIOS);
        
        const emailExistente = usuarios.some(u => u.email === email);
        if (emailExistente) {
            return res.status(409).json({ 
                success: false,
                message: 'Este email já está cadastrado'
            });
        }

        const novoUsuario = {
            id: usuarios.length + 1,
            nome,
            email,
            senha,
            tipo: 'cliente'
        };

        usuarios.push(novoUsuario);
        await escreverCSV(CSV_USUARIOS, usuarios);

        res.json({ 
            success: true,
            message: 'Cadastro realizado com sucesso!',
            usuario: {
                id: novoUsuario.id,
                nome: novoUsuario.nome,
                tipo: novoUsuario.tipo
            }
        });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno no servidor'
        });
    }
});

// Nova Rota de Login
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ 
            success: false,
            message: 'Email e senha são obrigatórios'
        });
    }

    try {
        const usuarios = await lerCSV(CSV_USUARIOS);
        const usuario = usuarios.find(u => u.email === email);
        
        if (!usuario) {
            return res.status(404).json({ 
                success: false,
                message: 'Email não cadastrado'
            });
        }

        if (usuario.senha !== senha) {
            return res.status(401).json({ 
                success: false,
                message: 'Senha incorreta'
            });
        }
        
        res.json({ 
            success: true,
            message: 'Login realizado com sucesso!',
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno no servidor'
        });
    }
});

// Funções auxiliares
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