document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-cadastro');
    
    // REMOVA a verificação de login inicial
    // (não queremos redirecionar se estiver na página de cadastro)

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

        try {
            const response = await fetch('http://localhost:3000/cadastrar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nome, email, senha }),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro no cadastro');
            }

            localStorage.setItem('usuario', JSON.stringify({
                nome: data.usuario.nome,
                tipo: data.usuario.tipo
            }));

            alert(`${data.message}\nBem-vindo, ${data.usuario.nome}!`);
            window.location.href = 'index.html';

        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    });
});