document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-cadastro');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;

        if (senha !== confirmarSenha) {
            alert('As senhas não coincidem!');
            return;
        }

        if (senha.length < 8) {
            alert('A senha deve ter no mínimo 8 caracteres');
            return;
        }

        try {
            // 1. Faz o cadastro
            const cadastroResponse = await fetch('http://localhost:3000/cadastrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha }),
                credentials: 'include'
            });

            const cadastroData = await cadastroResponse.json();

            if (!cadastroResponse.ok) {
                throw new Error(cadastroData.message || 'Erro no cadastro');
            }

            // 2. Faz login automaticamente após o cadastro
            const loginResponse = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha }),
                credentials: 'include'
            });

            const loginData = await loginResponse.json();

            if (!loginResponse.ok) {
                throw new Error('Falha ao autenticar após cadastro');
            }

            // 3. Armazena os dados do usuário
            localStorage.setItem('usuario', JSON.stringify({
                nome: loginData.usuario.nome,
                tipo: loginData.usuario.tipo,
                email: loginData.usuario.email
            }));

            // 4. Redireciona para a página inicial
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            
            alert(`Cadastro realizado com sucesso!\nBem-vindo, ${loginData.usuario.nome}!`);
            window.location.href = redirect ? `${redirect}.html` : 'index.html';

        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    });
});