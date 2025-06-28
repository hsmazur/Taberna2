document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-login');
    const erroEmail = document.getElementById('erro-email');
    const erroSenha = document.getElementById('erro-senha');

    // Verifica se já está logado
    async function verificarLogin() {
        try {
            const response = await fetch('http://localhost:3000/usuario', {
                credentials: 'include' // Importante para enviar cookies
            });
            
            if (response.ok) {
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Erro ao verificar login:', error);
        }
    }
    
    verificarLogin();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;

        // Limpa mensagens de erro
        erroEmail.textContent = '';
        erroSenha.textContent = '';

        if (!email) {
            erroEmail.textContent = 'Por favor, insira seu e-mail';
            return;
        }

        if (!senha) {
            erroSenha.textContent = 'Por favor, insira sua senha';
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, senha }),
                credentials: 'include' // Necessário para cookies
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 404) {
                    erroEmail.textContent = data.message;
                } else if (response.status === 401) {
                    erroSenha.textContent = data.message;
                } else {
                    throw new Error(data.message || 'Erro no login');
                }
                return;
            }

            // Armazena no localStorage apenas o necessário para o frontend
            localStorage.setItem('usuario', JSON.stringify({
                nome: data.usuario.nome,
                tipo: data.usuario.tipo
            }));
            
            alert(`${data.message}\nBem-vindo de volta, ${data.usuario.nome}!`);
            window.location.href = 'index.html';

        } catch (error) {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao tentar fazer login. Por favor, tente novamente.');
        }
    });
});