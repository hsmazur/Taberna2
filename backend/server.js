const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const cors = require('cors');
const app = express();
const cookieParser = require('cookie-parser');

// Configurações
app.use(cors());
app.use(express.json());
app.use(cookieParser());

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

// Rotas do Carrinho - Versão Corrigida
app.get('/carrinho', async (req, res) => {
  try {
    if (!fs.existsSync(CSV_CARRINHO)) {
      return res.json([]);
    }

    const carrinho = await lerCSV(CSV_CARRINHO);
    // Garante que as quantidades são números
    const carrinhoFormatado = carrinho.map(item => ({
      produtoId: item.produtoId,
      quantidade: parseInt(item.quantidade) || 0
    }));
    res.json(carrinhoFormatado);
  } catch (error) {
    console.error('Erro ao ler carrinho:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/carrinho', async (req, res) => {
  const { produtoId, quantidade } = req.body;
  
  if (!produtoId || isNaN(quantidade)) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  try {
    // Carrega produtos para validar se o ID existe
    const produtos = await lerCSV(CSV_PRODUTOS);
    const produtoExiste = produtos.some(p => p.id == produtoId);
    if (!produtoExiste) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Carrega carrinho atual
    let carrinho = [];
    if (fs.existsSync(CSV_CARRINHO)) {
      carrinho = await lerCSV(CSV_CARRINHO);
    }

    // Remove itens com quantidade <= 0 (limpeza)
    carrinho = carrinho.filter(item => parseInt(item.quantidade) > 0);

    const itemIndex = carrinho.findIndex(item => item.produtoId == produtoId);
    
    if (quantidade <= 0) {
      // Remove o item se existir
      if (itemIndex >= 0) {
        carrinho.splice(itemIndex, 1);
      }
    } else {
      // Atualiza ou adiciona o item
      if (itemIndex >= 0) {
        carrinho[itemIndex].quantidade = quantidade;
      } else {
        carrinho.push({ produtoId, quantidade });
      }
    }

    // Salva no CSV
    await escreverCSV(CSV_CARRINHO, carrinho);
    
    // Retorna o carrinho atualizado
    const carrinhoAtualizado = await lerCSV(CSV_CARRINHO);
    res.json(carrinhoAtualizado);
  } catch (error) {
    console.error('Erro no carrinho:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Rota para limpar o carrinho
app.delete('/carrinho', async (req, res) => {
    try {
        await escreverCSV(CSV_CARRINHO, []);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao limpar carrinho:', error);
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
        
        res.cookie('usuario', JSON.stringify({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo
        }), { 
            maxAge: 86400000, // 1 dia
            httpOnly: true 
        }).json({ 
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

//Rota de usuário
app.get('/usuario', (req, res) => {
    if (!req.cookies.usuario) {
        return res.status(401).json({ error: 'Não logado' });
    }
    res.json(JSON.parse(req.cookies.usuario));
});

// Adicione uma rota para logout
app.post('/logout', (req, res) => {
    res.clearCookie('usuario').json({ success: true });
});

// Adicione uma rota para verificar o usuário logado
app.get('/usuario', (req, res) => {
    if (!req.cookies.usuario) {
        return res.status(401).json({ error: 'Não logado' });
    }
    res.json(JSON.parse(req.cookies.usuario));
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

// Rotas de Produtos - CRUD Completo
app.post('/produtos', async (req, res) => {
    try {
        const novoProduto = req.body;
        
        // Validação básica
        if (!novoProduto.id || !novoProduto.nome || !novoProduto.preco) {
            return res.status(400).json({ error: "Dados incompletos" });
        }
        
        // Carrega produtos existentes
        let produtos = [];
        if (fs.existsSync(CSV_PRODUTOS)) {
            produtos = await lerCSV(CSV_PRODUTOS);
        }
        
        // Verifica se ID já existe
        if (produtos.some(p => p.id == novoProduto.id)) {
            return res.status(409).json({ error: "ID já existe" });
        }
        
        // Adiciona novo produto
        produtos.push(novoProduto);
        await escreverCSV(CSV_PRODUTOS, produtos);
        
        res.json(novoProduto);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.put('/produtos', async (req, res) => {
    try {
        const produtoAtualizado = req.body;
        
        // Validação básica
        if (!produtoAtualizado.id || !produtoAtualizado.nome || !produtoAtualizado.preco) {
            return res.status(400).json({ error: "Dados incompletos" });
        }
        
        // Carrega produtos existentes
        let produtos = [];
        if (fs.existsSync(CSV_PRODUTOS)) {
            produtos = await lerCSV(CSV_PRODUTOS);
        }
        
        // Encontra e atualiza o produto
        const index = produtos.findIndex(p => p.id == produtoAtualizado.id);
        if (index === -1) {
            return res.status(404).json({ error: "Produto não encontrado" });
        }
        
        produtos[index] = produtoAtualizado;
        await escreverCSV(CSV_PRODUTOS, produtos);
        
        res.json(produtoAtualizado);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.delete('/produtos/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Carrega produtos existentes
        let produtos = [];
        if (fs.existsSync(CSV_PRODUTOS)) {
            produtos = await lerCSV(CSV_PRODUTOS);
        }
        
        // Filtra removendo o produto com o ID especificado
        const novosProdutos = produtos.filter(p => p.id != id);
        
        // Se o tamanho não mudou, produto não existia
        if (novosProdutos.length === produtos.length) {
            return res.status(404).json({ error: "Produto não encontrado" });
        }
        
        await escreverCSV(CSV_PRODUTOS, novosProdutos);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.get('/produtos/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Carrega produtos existentes
        let produtos = [];
        if (fs.existsSync(CSV_PRODUTOS)) {
            produtos = await lerCSV(CSV_PRODUTOS);
        }
        
        // Encontra o produto
        const produto = produtos.find(p => p.id == id);
        if (!produto) {
            return res.status(404).json({ error: "Produto não encontrado" });
        }
        
        res.json(produto);
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Rotas de Usuários - CRUD Completo
app.get('/usuarios', (req, res) => {
  if (!fs.existsSync(CSV_USUARIOS)) {
    return res.status(404).json({ error: "Arquivo de usuários não encontrado" });
  }

  const usuarios = [];
  fs.createReadStream(CSV_USUARIOS)
    .pipe(csv.parse({ 
      headers: true,
      skipLines: 0,
      strictColumnHandling: true
    }))
    .on('data', (row) => {
      try {
        usuarios.push({
          id: parseInt(row.id),
          nome: row.nome,
          email: row.email,
          senha: row.senha,
          tipo: row.tipo
        });
      } catch (error) {
        console.error('Erro ao processar linha:', row);
      }
    })
    .on('end', () => res.json(usuarios))
    .on('error', (err) => {
      console.error("Erro ao ler usuários:", err);
      res.status(500).json({ error: "Erro no servidor" });
    });
});

app.post('/usuarios', async (req, res) => {
    try {
        const novoUsuario = req.body;
        
        // Validação básica
        if (!novoUsuario.id || !novoUsuario.nome || !novoUsuario.email || !novoUsuario.senha || !novoUsuario.tipo) {
            return res.status(400).json({ error: "Dados incompletos" });
        }
        
        // Carrega usuários existentes
        let usuarios = [];
        if (fs.existsSync(CSV_USUARIOS)) {
            usuarios = await lerCSV(CSV_USUARIOS);
        }
        
        // Verifica se ID já existe
        if (usuarios.some(u => u.id == novoUsuario.id)) {
            return res.status(409).json({ error: "ID já existe" });
        }

        // Verifica se email já existe
        if (usuarios.some(u => u.email === novoUsuario.email)) {
            return res.status(409).json({ error: "Email já cadastrado" });
        }
        
        // Adiciona novo usuário
        usuarios.push(novoUsuario);
        await escreverCSV(CSV_USUARIOS, usuarios);
        
        res.json(novoUsuario);
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.put('/usuarios', async (req, res) => {
    try {
        const usuarioAtualizado = req.body;
        
        // Validação básica
        if (!usuarioAtualizado.id || !usuarioAtualizado.nome || !usuarioAtualizado.email || !usuarioAtualizado.senha || !usuarioAtualizado.tipo) {
            return res.status(400).json({ error: "Dados incompletos" });
        }
        
        // Carrega usuários existentes
        let usuarios = [];
        if (fs.existsSync(CSV_USUARIOS)) {
            usuarios = await lerCSV(CSV_USUARIOS);
        }
        
        // Encontra e atualiza o usuário
        const index = usuarios.findIndex(u => u.id == usuarioAtualizado.id);
        if (index === -1) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        // Verifica se o email foi alterado para um que já existe
        if (usuarioAtualizado.email !== usuarios[index].email && 
            usuarios.some(u => u.email === usuarioAtualizado.email)) {
            return res.status(409).json({ error: "Email já está em uso por outro usuário" });
        }
        
        usuarios[index] = usuarioAtualizado;
        await escreverCSV(CSV_USUARIOS, usuarios);
        
        res.json(usuarioAtualizado);
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.delete('/usuarios/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Carrega usuários existentes
        let usuarios = [];
        if (fs.existsSync(CSV_USUARIOS)) {
            usuarios = await lerCSV(CSV_USUARIOS);
        }
        
        // Filtra removendo o usuário com o ID especificado
        const novosUsuarios = usuarios.filter(u => u.id != id);
        
        // Se o tamanho não mudou, usuário não existia
        if (novosUsuarios.length === usuarios.length) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }
        
        await escreverCSV(CSV_USUARIOS, novosUsuarios);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.get('/usuarios/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Carrega usuários existentes
        let usuarios = [];
        if (fs.existsSync(CSV_USUARIOS)) {
            usuarios = await lerCSV(CSV_USUARIOS);
        }
        
        // Encontra o usuário
        const usuario = usuarios.find(u => u.id == id);
        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }
        
        // Remove a senha antes de retornar
        const { senha, ...usuarioSemSenha } = usuario;
        res.json(usuarioSemSenha);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

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