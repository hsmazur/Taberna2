document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-cadastro');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;

        // Validação básica no front
        if (senha !== confirmarSenha) {
            alert('As senhas não coincidem!');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/cadastrar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nome, email, senha })
                // O tipo "cliente" será definido no servidor
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro no cadastro');
            }

            alert(`${data.message}\nBem-vindo, ${data.usuario.nome}!`);
            window.location.href = 'index.html'; // Redireciona para a página inicial

        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    });
});