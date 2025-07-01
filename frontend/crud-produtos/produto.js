class Produto {
   constructor(id, imagem, nome, ingredientes, preco) {
      this.id = id;
      this.imagem = imagem; // Agora será o nome do arquivo ou caminho relativo
      this.nome = nome;
      this.ingredientes = ingredientes;
      this.preco = preco;
      this.posicaoNaLista = null;
   }
}