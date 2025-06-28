document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-login');
    const erroEmail = document.getElementById('erro-email');
    const erroSenha = document.getElementById('erro-senha');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;

        // Limpa mensagens de erro anteriores
        erroEmail.textContent = '';
        erroSenha.textContent = '';

        // Validação básica no frontend
        if (!email) {
            erroEmail.textContent = 'Por favor, insira seu e-mail';
            return;
        }

        if (!senha) {
            erroSenha.textContent = 'Por favor, insira sua senha';
            return;
        }

        try {
            // Faz a requisição para o servidor
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (!response.ok) {
                // Trata erros específicos do servidor
                if (response.status === 404) {
                    erroEmail.textContent = data.message;
                } else if (response.status === 401) {
                    erroSenha.textContent = data.message;
                } else {
                    throw new Error(data.message || 'Erro no login');
                }
                return;
            }

            // Login bem-sucedido
            alert(`${data.message}\nBem-vindo de volta, ${data.usuario.nome}!`);
            
            // Armazena os dados do usuário no localStorage
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            
            // Redireciona para a página inicial
            window.location.href = 'index.html';

        } catch (error) {
            console.error('Erro:', error);
            // Mostra mensagem genérica para erros inesperados
            alert('Ocorreu um erro ao tentar fazer login. Por favor, tente novamente.');
        }
    });
});