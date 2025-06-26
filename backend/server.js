const express = require('express');
const fs = require('fs');
const csv = require('fast-csv');
const cors = require('cors');
const app = express();

// Configurações
app.use(cors());
app.use(express.json());

// Arquivos CSV
const CSV_PRODUTOS = 'produtos.csv';
const CSV_CARRINHO = 'carrinho.csv';
const CSV_PEDIDOS = 'pedidos.csv';

// Inicializa arquivos CSV se não existirem
const inicializarCSVs = () => {
  if (!fs.existsSync(CSV_PRODUTOS)) {
    const produtos = [
      { imagem: 'img/lanche1.png', nome: 'Burger do Camponês', ingredientes: 'Pão rústico, hambúrguer bovino, queijo curado', preco: 21.90 },
      // ... (adicione todos os 12 lanches aqui)
    ];
    const ws = fs.createWriteStream(CSV_PRODUTOS);
    csv.writeToStream(ws, produtos, { headers: true });
  }

  if (!fs.existsSync(CSV_CARRINHO)) {
    fs.writeFileSync(CSV_CARRINHO, 'produto,quantidade\n');
  }

  if (!fs.existsSync(CSV_PEDIDOS)) {
    fs.writeFileSync(CSV_PEDIDOS, 'data,metodoPagamento,total,itens\n');
  }
};

inicializarCSVs();

// ================== ROTAS ================== //

// 1. Cardápio (GET /produtos)
app.get('/produtos', (req, res) => {
  const produtos = [];
  fs.createReadStream(CSV_PRODUTOS)
    .pipe(csv.parse({ headers: true }))
    .on('data', (row) => produtos.push(row))
    .on('end', () => res.json(produtos));
});

// 2. Carrinho (GET/POST/DELETE /carrinho)
app.get('/carrinho', (req, res) => {
  const itens = [];
  fs.createReadStream(CSV_CARRINHO)
    .pipe(csv.parse({ headers: true }))
    .on('data', (row) => itens.push(row))
    .on('end', () => res.json(itens));
});

app.post('/carrinho', (req, res) => {
  const { produto, quantidade } = req.body;
  let dados = [];

  fs.createReadStream(CSV_CARRINHO)
    .pipe(csv.parse({ headers: true }))
    .on('data', (row) => dados.push(row))
    .on('end', () => {
      // Atualiza ou remove item
      dados = quantidade <= 0
        ? dados.filter(item => item.produto !== produto)
        : dados.map(item => item.produto === produto ? { produto, quantidade } : item);

      // Adiciona novo item se necessário
      if (quantidade > 0 && !dados.some(item => item.produto === produto)) {
        dados.push({ produto, quantidade });
      }

      // Salva no CSV
      const ws = fs.createWriteStream(CSV_CARRINHO);
      csv.writeToStream(ws, dados, { headers: true })
        .on('finish', () => res.json({ success: true }));
    });
});

// 3. Pedidos (POST /pedidos)
app.post('/pedidos', (req, res) => {
  const { metodoPagamento, total, itens } = req.body;
  const novoPedido = {
    data: new Date().toISOString(),
    metodoPagamento,
    total,
    itens: JSON.stringify(itens) // Salva como string
  };

  const ws = fs.createWriteStream(CSV_PEDIDOS, { flags: 'a' });
  csv.writeToStream(ws, [novoPedido], { headers: !fs.existsSync(CSV_PEDIDOS) || fs.statSync(CSV_PEDIDOS).size === 0 })
    .on('finish', () => res.json({ success: true }));
});

// Servir arquivos estáticos (HTML/CSS/JS/IMG)
app.use(express.static('../frontend'));

// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🛡️ Servidor da Taberna rodando em http://localhost:${PORT}`);
  console.log(`📊 Rotas disponíveis:`);
  console.log(`- GET /produtos (Cardápio)`);
  console.log(`- GET/POST /carrinho (Carrinho)`);
  console.log(`- POST /pedidos (Finalização)`);
});
