const express = require('express');
const fs = require('fs');
const path = require('path'); // Adicionado
const csv = require('fast-csv');
const cors = require('cors');
const app = express();

// Configurações
app.use(cors());
app.use(express.json());

// Caminhos dos arquivos CSV
const CSV_PRODUTOS = path.join(__dirname, 'produtos.csv');
const CSV_CARRINHO = path.join(__dirname, 'carrinho.csv');

// Verifica e cria arquivos CSV se não existirem
function inicializarCSVs() {
  if (!fs.existsSync(CSV_CARRINHO)) {
    fs.writeFileSync(CSV_CARRINHO, 'produtoId,quantidade\n');
  }
}

inicializarCSVs();

// Rotas de Produtos
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
    .on('error', (err) => {
      console.error("Erro ao ler produtos:", err);
      res.status(500).json({ error: "Erro no servidor" });
    });
});

// Rotas do Carrinho
app.post('/carrinho', express.json(), async (req, res) => {
  const { produtoId, quantidade } = req.body;

  try {
    let carrinho = [];
    
    if (fs.existsSync(CSV_CARRINHO)) {
      carrinho = await new Promise((resolve) => {
        const items = [];
        fs.createReadStream(CSV_CARRINHO)
          .pipe(csv.parse({ headers: true }))
          .on('data', (row) => items.push(row))
          .on('end', () => resolve(items));
      });
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

    const ws = fs.createWriteStream(CSV_CARRINHO);
    csv.writeToStream(ws, carrinho, { headers: true })
      .on('finish', () => res.json({ success: true }));

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

    const carrinho = [];
    fs.createReadStream(CSV_CARRINHO)
      .pipe(csv.parse({ headers: true }))
      .on('data', (row) => carrinho.push(row))
      .on('end', () => res.json(carrinho))
      .on('error', (err) => {
        throw err;
      });
  } catch (error) {
    console.error('Erro ao ler carrinho:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')));

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Endpoints disponíveis:`);
  console.log(`- GET /produtos`);
  console.log(`- GET /carrinho`);
  console.log(`- POST /carrinho`);
});