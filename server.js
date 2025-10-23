const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); 

// ** CORREÇÃO DO ERRO 'dotenv.config is not a function' **
// Importa e configura o dotenv diretamente.
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;
// URL base da FetchBrasil Pro (sem token ou query)
const API_BASE_URL = 'https://api.fetchbrasil.pro/';
// Token da API lido da variável de ambiente no Render
const API_TOKEN = process.env.API_TOKEN; 

// ------------------------------------------------
// Configuração do Middleware
// ------------------------------------------------
app.use(cors()); 
app.use(express.json()); 

// Mock de Usuários para simular o front-end (Mantenha este mock para fins de autenticação do proxy)
const MOCK_USERS_EMAIL = ['admin@nasci15k.com', 'user@nasci15k.com', 'teste@nasci15k.com'];

/**
 * Middleware de Autenticação
 * Verifica se o usuário logado no front-end é válido e se o token da API está configurado.
 */
function authenticateQuery(req, res, next) {
    const authEmail = req.body.auth_email;
    const authHeader = req.headers.authorization;

    if (!authEmail || !authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acesso negado. Credenciais de usuário ausentes.' });
    }

    if (!MOCK_USERS_EMAIL.includes(authEmail)) {
         return res.status(401).json({ error: 'Usuário não autorizado a realizar consultas.' });
    }

    if (!API_TOKEN) {
         return res.status(500).json({ error: 'Erro de Configuração: Token da API não fornecido no servidor.' });
    }

    next();
}

// ------------------------------------------------
// Rotas de Consulta (Proxy)
// ------------------------------------------------
const apiRouter = express.Router();

apiRouter.use(authenticateQuery);

/**
 * Endpoint para Consultar CPF (cpf_basica)
 * Rota: POST /api/v1/query/cpf-basica
 */
apiRouter.post('/cpf-basica', async (req, res) => {
    const { cpf } = req.body;
    
    if (!cpf || cpf.length !== 11) {
        return res.status(400).json({ error: 'CPF deve ter 11 dígitos.' });
    }

    try {
        // Constrói a URL para a consulta CPF da FetchBrasil Pro
        const url = `${API_BASE_URL}?token=${API_TOKEN}&api=cpf_basica&query=${cpf}`;
        
        const response = await fetch(url, {
            method: 'GET', // FetchBrasil Pro usa GET
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        
        if (data.error) {
            console.error('Erro na resposta da API de dados:', data.message);
            // Retorna status 404 para o front-end quando a API externa não encontra dados
            return res.status(404).json({ DADOS: null, error: data.message || "Dados não encontrados ou erro na API externa." });
        }
        
        res.status(response.status || 200).json(data);

    } catch (error) {
        console.error('Erro ao consultar API de CPF:', error);
        res.status(500).json({ error: 'Erro interno ao se comunicar com a API de dados.', details: error.message });
    }
});

/**
 * Endpoint para Consultar Nome (nome_basico)
 * Rota: POST /api/v1/query/nome-basica
 */
apiRouter.post('/nome-basica', async (req, res) => {
    // Certifica-se de que o nome é URI-Encoded (necessário para URLs)
    const nome = encodeURIComponent(req.body.nome.trim());

    if (!nome || nome.length < 5) {
        return res.status(400).json({ error: 'Nome deve ter pelo menos 5 caracteres (após formatação).' });
    }

    try {
        // Constrói a URL para a consulta Nome da FetchBrasil Pro
        const url = `${API_BASE_URL}?token=${API_TOKEN}&api=nome_basico&query=${nome}`;

        const response = await fetch(url, {
            method: 'GET', // FetchBrasil Pro usa GET
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        
        if (data.error) {
            console.error('Erro na resposta da API de dados:', data.message);
             // Retorna status 404 para o front-end quando a API externa não encontra dados
            return res.status(404).json({ RESULTADOS: [], error: data.message || "Dados não encontrados ou erro na API externa." });
        }
        
        res.status(response.status || 200).json(data);

    } catch (error) {
        console.error('Erro ao consultar API de Nome:', error);
        res.status(500).json({ error: 'Erro interno ao se comunicar com a API de dados.', details: error.message });
    }
});

// Define a rota principal para as consultas
app.use('/api/v1/query', apiRouter);

// Rota de saúde/teste
app.get('/', (req, res) => {
  res.send('Nasci15k Data Query Proxy (FetchBrasil Pro) está rodando.');
});

// ------------------------------------------------
// Início do Servidor
// ------------------------------------------------
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
