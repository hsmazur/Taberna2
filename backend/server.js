const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const cors = require('cors');
const app = express();

// Configurações
app.use(cors());
app.use(express.json());

// Caminhos dos arquivos
const CSV_PRODUTOS = path.join(__dirname, 'produtos.csv');
const CSV_CARRINHO = path.join(__dirname, 'carrinho.csv');
const CSV_PEDIDOS = path.join(__dirname, 'pedidos.csv'); // Novo arquivo para pedidos

// Inicializa arquivos CSV
function inicializarCSVs() {
  if (!fs.existsSync(CSV_CARRINHO)) {
    fs.writeFileSync(CSV_CARRINHO, 'produtoId,quantidade\n');
  }
  if (!fs.existsSync(CSV_PEDIDOS)) {
    fs.writeFileSync(CSV_PEDIDOS, 'id,metodoPagamento,total,data\n');
  }
}

inicializarCSVs();

// Rotas de Produtos (mantido igual)
app.get('/produtos', (req, res) => {
  const produtos = [];
  fs.createReadStream(CSV_PRODUTOS)
    .pipe(csv.parse({ headers: true }))
    .on('data', (row) => {
      row.id = parseInt(row.id);
      row.preco = parseFloat(row.preco);
      produtos.push(row);
    })
    .on('end', () => res.json(produtos))
    .on('error', (err) => res.status(500).json({ error: "Erro ao ler produtos" }));
});

// Rotas do Carrinho (mantido igual)
app.post('/carrinho', async (req, res) => {
  const { produtoId, quantidade } = req.body;
  try {
    let carrinho = [];
    if (fs.existsSync(CSV_CARRINHO)) {
      carrinho = await lerCSV(CSV_CARRINHO);
    }

    const itemIndex = carrinho.findIndex(item => item.produtoId === produtoId);
    if (itemIndex >= 0) {
      if (quantidade <= 0) {
        carrinho.splice(itemIndex, 1);
      } else {
        carrinho[itemIndex].quantidade = quantidade;
      }
    } else if (quantidade > 0) {
      carrinho.push({ produtoId, quantidade });
    }

    await escreverCSV(CSV_CARRINHO, carrinho);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.get('/carrinho', async (req, res) => {
  try {
    const carrinho = fs.existsSync(CSV_CARRINHO) ? await lerCSV(CSV_CARRINHO) : [];
    res.json(carrinho);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler carrinho' });
  }
});

// Nova Rota: Pedidos (para pagamento.js)
app.post('/pedidos', async (req, res) => {
  const { metodoPagamento, total } = req.body;
  try {
    const pedidos = fs.existsSync(CSV_PEDIDOS) ? await lerCSV(CSV_PEDIDOS) : [];
    const novoPedido = {
      id: pedidos.length + 1,
      metodoPagamento,
      total,
      data: new Date().toISOString()
    };
    pedidos.push(novoPedido);
    await escreverCSV(CSV_PEDIDOS, pedidos);
    res.json({ success: true, pedido: novoPedido });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar pedido' });
  }
});

// Funções auxiliares para CSV
async function lerCSV(arquivo) {
  return new Promise((resolve) => {
    const dados = [];
    fs.createReadStream(arquivo)
      .pipe(csv.parse({ headers: true }))
      .on('data', (row) => dados.push(row))
      .on('end', () => resolve(dados));
  });
}

async function escreverCSV(arquivo, dados) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(arquivo);
    csv.writeToStream(ws, dados, { headers: true })
      .on('finish', resolve)
      .on('error', reject);
  });
}

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')));

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));