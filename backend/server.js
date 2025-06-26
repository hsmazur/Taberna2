const express = require('express');
const fs = require('fs');
const csv = require('fast-csv');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Configuração do CSV
const CSV_PRODUTOS = 'produtos.csv';

// Rota dos produtos
app.get('/produtos', (req, res) => {
  const produtos = [];
  fs.createReadStream(CSV_PRODUTOS)
    .pipe(csv.parse({ headers: true }))
    .on('data', (row) => {
      row.id = parseInt(row.id);  // Garante que o ID seja número
      row.preco = parseFloat(row.preco);  // Garante que o preço seja número
      produtos.push(row);
    })
    .on('end', () => {
      res.json(produtos);
    })
    .on('error', (err) => {
      console.error("Erro ao ler CSV:", err);
      res.status(500).send("Erro no servidor");
    });
});

// Servir arquivos estáticos
app.use(express.static('../frontend'));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});