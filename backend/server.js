const express = require('express');
const fs = require('fs');
const csv = require('fast-csv');
const cors = require('cors');
const app = express();

// Configurações
app.use(cors());
app.use(express.json());

// Arquivos CSV
const CSV_CARRINHO = 'carrinho.csv';
const CSV_PEDIDOS = 'pedidos.csv';
const CSV_PRODUTOS = 'produtos.csv';

// Inicializa arquivos CSV (se não existirem)
if (!fs.existsSync(CSV_CARRINHO)) {
    fs.writeFileSync(CSV_CARRINHO, 'produto,quantidade\n');
}

if (!fs.existsSync(CSV_PEDIDOS)) {
    fs.writeFileSync(CSV_PEDIDOS, 'metodoPagamento,total,data\n');
}

if (!fs.existsSync(CSV_PRODUTOS)) {
    // Popula com os produtos padrão (opcional)
    const produtos = [
        { nome: "Burger do Camponês", preco: 21.90, imagem: "img/lanche1.png", ingredientes: "Pão rústico, hambúrguer bovino, queijo curado" },
        // ... (outros produtos)
    ];
    const ws = fs.createWriteStream(CSV_PRODUTOS);
    csv.writeToStream(ws, produtos, { headers: true });
}

// ==============================================
// Rotas do Carrinho
// ==============================================

// GET /carrinho → Retorna todos os itens
app.get('/carrinho', (req, res) => {
    const dados = [];
    fs.createReadStream(CSV_CARRINHO)
        .pipe(csv.parse({ headers: true }))
        .on('data', (row) => dados.push(row))
        .on('end', () => res.json(dados));
});

// POST /carrinho → Adiciona/atualiza/remove item
app.post('/carrinho', (req, res) => {
    const { produto, quantidade } = req.body;
    const dados = [];

    fs.createReadStream(CSV_CARRINHO)
        .pipe(csv.parse({ headers: true }))
        .on('data', (row) => dados.push(row))
        .on('end', () => {
            // Remove se quantidade <= 0, atualiza ou adiciona
            const novosDados = quantidade <= 0
                ? dados.filter(item => item.produto !== produto)
                : dados.map(item => item.produto === produto ? { produto, quantidade } : item);

            if (quantidade > 0 && !novosDados.some(item => item.produto === produto)) {
                novosDados.push({ produto, quantidade });
            }

            // Reescreve o CSV
            const ws = fs.createWriteStream(CSV_CARRINHO);
            csv.writeToStream(ws, novosDados, { headers: true })
                .on('finish', () => res.json({ success: true }));
        });
});

// DELETE /carrinho → Limpa o carrinho
app.delete('/carrinho', (req, res) => {
    fs.writeFileSync(CSV_CARRINHO, 'produto,quantidade\n');
    res.json({ success: true });
});

// ==============================================
// Rotas de Produtos (opcional)
// ==============================================

// GET /produtos → Retorna o cardápio
app.get('/produtos', (req, res) => {
    const dados = [];
    fs.createReadStream(CSV_PRODUTOS)
        .pipe(csv.parse({ headers: true }))
        .on('data', (row) => dados.push(row))
        .on('end', () => res.json(dados));
});

// ==============================================
// Rotas de Pedidos (opcional)
// ==============================================

// POST /pedidos → Salva um pedido finalizado
app.post('/pedidos', (req, res) => {
    const pedido = req.body;
    const ws = fs.createWriteStream(CSV_PEDIDOS, { flags: 'a' });
    csv.writeToStream(ws, [pedido], { headers: !fs.existsSync(CSV_PEDIDOS) });
    res.json({ success: true });
});

// GET /pedidos → Retorna histórico (opcional)
app.get('/pedidos', (req, res) => {
    const dados = [];
    fs.createReadStream(CSV_PEDIDOS)
        .pipe(csv.parse({ headers: true }))
        .on('data', (row) => dados.push(row))
        .on('end', () => res.json(dados));
});

// ==============================================
// Inicia o servidor
// ==============================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});